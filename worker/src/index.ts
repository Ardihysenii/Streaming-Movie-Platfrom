interface KVNamespace {
  get<T = unknown>(key: string, type: "json"): Promise<T | null>;
}


type WorkerHandler<Environment> = {
  fetch(request: Request, env: Environment): Promise<Response>;
};


type StreamSource = {
  url: string;
  type: "hls" | "mp4";
  label: string;
  quality?: string;
};


type SubtitleTrack = {
  url: string;
  label: string;
  language: string;
  default?: boolean;
};


type PlaybackManifest = {
  movieId: string;
  sources: StreamSource[];
  subtitles: SubtitleTrack[];
  expiresAt?: string;
};


interface Env {
  STREAM_CATALOG?: KVNamespace;
  SOURCE_API_BASE_URL?: string;
  SOURCE_API_TOKEN?: string;
  SUBDL_API_KEY?: string;
  SUBDL_API_KEY_2?: string;
  SUBDL_API_KEY_3?: string;
  OPEN_SUBTITLES_API_KEY?: string;
  OPEN_SUBTITLES_USERNAME?: string;
  OPEN_SUBTITLES_PASSWORD?: string;
  OPEN_SUBTITLES_USER_AGENT?: string;
  ALLOWED_ORIGINS?: string;
}


function json(body: unknown, status: number, origin: string | null, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Accept, Authorization, Content-Type",
      Vary: "Origin",
      ...headers,
    },
  });
}


function allowedOrigin(request: Request, env: Env) {
  const origin = request.headers.get("Origin");
  if (!origin) return "*";
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}


function isSecureMediaUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}


function normalizeManifest(value: unknown, movieId: string): PlaybackManifest | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const rawSources = Array.isArray(record.sources) ? record.sources : [];
  const sources = rawSources.flatMap((entry, index): StreamSource[] => {
    if (!entry || typeof entry !== "object") return [];
    const source = entry as Record<string, unknown>;
    if (!isSecureMediaUrl(source.url)) return [];
    const type = source.type === "mp4" || /\.mp4(?:$|\?)/i.test(source.url) ? "mp4" : "hls";
    const quality = typeof source.quality === "string" ? source.quality : undefined;
    return [{
      url: source.url,
      type,
      label: typeof source.label === "string" ? source.label : quality || `Source ${index + 1}`,
      quality,
    }];
  });
  if (!sources.length) return null;


  const rawSubtitles = Array.isArray(record.subtitles) ? record.subtitles : [];
  const subtitles = rawSubtitles.flatMap((entry): SubtitleTrack[] => {
    if (!entry || typeof entry !== "object") return [];
    const subtitle = entry as Record<string, unknown>;
    const subtitleUrl = subtitle.url ?? subtitle.file;
    if (!isSecureMediaUrl(subtitleUrl)) return [];
    const language = typeof subtitle.language === "string"
      ? subtitle.language
      : typeof subtitle.lang === "string"
        ? subtitle.lang
        : "und";
    return [{
      url: subtitleUrl,
      language,
      label: typeof subtitle.label === "string" ? subtitle.label : language.toUpperCase(),
      default: subtitle.default === true,
    }];
  });


  return {
    movieId,
    sources,
    subtitles,
    expiresAt: typeof record.expiresAt === "string" ? record.expiresAt : undefined,
  };
}


async function readCatalog(env: Env, movieId: string, imdbId: string | null) {
  if (!env.STREAM_CATALOG) return null;
  const keys = [`movie:${movieId}`];
  if (imdbId) keys.push(`movie:imdb:${imdbId}`);
  for (const key of keys) {
    const manifest = await env.STREAM_CATALOG.get<unknown>(key, "json");
    if (manifest) return manifest;
  }
  return null;
}


async function readAuthorizedUpstream(env: Env, movieId: string, imdbId: string | null) {
  if (!env.SOURCE_API_BASE_URL) return null;
  const endpoint = new URL(`/v1/movie/${encodeURIComponent(movieId)}`, env.SOURCE_API_BASE_URL);
  if (imdbId) endpoint.searchParams.set("imdbId", imdbId);
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      ...(env.SOURCE_API_TOKEN ? { Authorization: `Bearer ${env.SOURCE_API_TOKEN}` } : {}),
    },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Authorized source provider returned ${response.status}.`);
  return response.json();
}


function toWebVtt(value: string) {
  const normalized = value.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (/^WEBVTT(?:\s|$)/i.test(normalized)) return normalized + "\n";
  const converted = normalized.replace(/(^|\n)(\d{1,2}:\d{2}:\d{2}),([0-9]{3})\s+-->\s+(\d{1,2}:\d{2}:\d{2}),([0-9]{3})/g,"$1$2.$3 --> $4.$5");
  return "WEBVTT\n\n" + converted + "\n";
}


function subtitleDownloadUrl(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  try {
    return new URL(value, "https://dl.subdl.com/").toString();
  } catch {
    return null;
  }
}


let openSubtitlesSession: { token: string; baseUrl: string; expiresAt: number } | null = null;

function openSubtitlesBaseUrl(value?: string) {
  const raw = (value || "https://api.opensubtitles.com/api/v1").trim().replace(/\/+$/, "");
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withScheme);
    if (!parsed.pathname || parsed.pathname === "/") parsed.pathname = "/api/v1";
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return "https://api.opensubtitles.com/api/v1";
  }
}
function openSubtitlesUserAgent(env: Env) {
  return env.OPEN_SUBTITLES_USER_AGENT?.trim() || "MONTANA Subtitle Service/1.0 (https://streaming-movie-platfrom.vercel.app)";
}
function openSubtitlesHeaders(env: Env, token?: string) {
  return { Accept: "application/json", "Api-Key": env.OPEN_SUBTITLES_API_KEY?.trim() || "", "User-Agent": openSubtitlesUserAgent(env), ...(token ? { Authorization: "Bearer " + token } : {}) };
}
async function openSubtitlesLogin(env: Env) {
  const apiKey=env.OPEN_SUBTITLES_API_KEY?.trim(), username=env.OPEN_SUBTITLES_USERNAME?.trim(), password=env.OPEN_SUBTITLES_PASSWORD;
  if(!apiKey||!username||!password)throw new Error("OpenSubtitles is not configured for downloads.");
  if(openSubtitlesSession&&openSubtitlesSession.expiresAt>Date.now()+60000)return openSubtitlesSession;
  const response=await fetch(openSubtitlesBaseUrl()+"/login",{method:"POST",headers:{...openSubtitlesHeaders(env),"Content-Type":"application/json"},body:JSON.stringify({username,password})});
  if(!response.ok)throw new Error("OpenSubtitles login failed ("+response.status+").");
  const payload=await response.json() as {token?:string;base_url?:string};
  if(!payload.token)throw new Error("OpenSubtitles did not return a session token.");
  openSubtitlesSession={token:payload.token,baseUrl:openSubtitlesBaseUrl(payload.base_url),expiresAt:Date.now()+25*60*1000};
  return openSubtitlesSession;
}
function openSubtitleCandidates(payload: unknown,language:string,type:string,season:number,episode:number){
  const rows=payload&&typeof payload==="object"&&Array.isArray((payload as Record<string,unknown>).data)?(payload as Record<string,unknown>).data as Array<Record<string,unknown>>:[];
  return rows.flatMap(row=>{const a=row.attributes&&typeof row.attributes==="object"?row.attributes as Record<string,unknown>:{};const lang=String(a.language||"").trim().toLowerCase();const s=Number(a.season_number||0),e=Number(a.episode_number||0);if(lang&&lang!==language.toLowerCase())return [];if(type==="tv"&&((s&&s!==season)||(e&&e!==episode)))return [];const files=Array.isArray(a.files)?a.files:[];return files.flatMap(file=>{if(!file||typeof file!=="object")return [];const r=file as Record<string,unknown>;const fileId=Number(r.file_id||0),name=String(r.file_name||""),format=String(r.format||name.split(".").pop()||"srt").toLowerCase();if(!fileId||/^(ass|ssa)$/.test(format)||/\.(ass|ssa)$/i.test(name))return [];return [{fileId,language:lang||language.toLowerCase(),format}];});});
}
async function readOpenSubtitles(request:Request,env:Env){
  const apiKey=env.OPEN_SUBTITLES_API_KEY?.trim();if(!apiKey)throw new Error("OpenSubtitles is not configured on the server.");
  const u=new URL(request.url),tmdbId=u.searchParams.get("tmdbId")?.trim(),imdbId=u.searchParams.get("imdbId")?.trim(),type=u.searchParams.get("type")==="tv"?"tv":"movie",language=(u.searchParams.get("language")||"en").trim().toLowerCase(),season=Number(u.searchParams.get("season")||1),episode=Number(u.searchParams.get("episode")||1);
  if(!tmdbId&&!imdbId)throw new Error("A title identifier is required.");
  const endpoint=new URL(openSubtitlesBaseUrl()+"/subtitles");
  if(type==="tv"){if(tmdbId)endpoint.searchParams.set("parent_tmdb_id",tmdbId);if(imdbId)endpoint.searchParams.set("parent_imdb_id",imdbId.replace(/^tt/i,""));endpoint.searchParams.set("season_number",String(season));endpoint.searchParams.set("episode_number",String(episode));}else{if(tmdbId)endpoint.searchParams.set("tmdb_id",tmdbId);if(imdbId)endpoint.searchParams.set("imdb_id",imdbId.replace(/^tt/i,""));}
  endpoint.searchParams.set("languages",language);endpoint.searchParams.set("order_by","download_count");endpoint.searchParams.set("order_direction","desc");
  const searchResponse=await fetch(endpoint,{headers:openSubtitlesHeaders(env)});if(!searchResponse.ok)throw new Error("OpenSubtitles search failed ("+searchResponse.status+").");
  const selected=openSubtitleCandidates(await searchResponse.json(),language,type,season,episode)[0];if(!selected)throw new Error("No OpenSubtitles track is available.");
  let session=await openSubtitlesLogin(env);const body=JSON.stringify({file_id:selected.fileId,sub_format:"srt"});
  let downloadResponse=await fetch(session.baseUrl+"/download",{method:"POST",headers:{...openSubtitlesHeaders(env,session.token),"Content-Type":"application/json"},body});
  if(downloadResponse.status===401){openSubtitlesSession=null;session=await openSubtitlesLogin(env);downloadResponse=await fetch(session.baseUrl+"/download",{method:"POST",headers:{...openSubtitlesHeaders(env,session.token),"Content-Type":"application/json"},body});}
  if(!downloadResponse.ok)throw new Error("OpenSubtitles download failed ("+downloadResponse.status+").");
  const downloaded=await downloadResponse.json() as {link?:string};if(!downloaded.link)throw new Error("OpenSubtitles did not return a subtitle link.");
  const fileResponse=await fetch(downloaded.link,{headers:{"Api-Key":apiKey,"User-Agent":openSubtitlesUserAgent(env)} });if(!fileResponse.ok)throw new Error("OpenSubtitles file download failed ("+fileResponse.status+").");
  const text=await fileResponse.text();if(/\[Script Info\]|^\s*\[V4 Styles\]/i.test(text.slice(0,500)))throw new Error("OpenSubtitles returned an unsupported subtitle format.");
  return new Response(toWebVtt(text),{headers:{"Cache-Control":"public, max-age=300","Content-Type":"text/vtt; charset=utf-8","X-Subtitle-Source":"opensubtitles","Access-Control-Expose-Headers":"X-Subtitle-Source"}});
}
async function readSubdl(request:Request,env:Env){
  const keys=[env.SUBDL_API_KEY,env.SUBDL_API_KEY_2,env.SUBDL_API_KEY_3].map(v=>v?.trim()).filter((v):v is string=>Boolean(v));if(!keys.length)throw new Error("SubDL is not configured on the server.");
  const u=new URL(request.url),tmdbId=u.searchParams.get("tmdbId")?.trim(),imdbId=u.searchParams.get("imdbId")?.trim(),type=u.searchParams.get("type")==="tv"?"tv":"movie",language=(u.searchParams.get("language")||"en").trim().toUpperCase(),season=Number(u.searchParams.get("season")||1),episode=Number(u.searchParams.get("episode")||1);if(!tmdbId&&!imdbId)throw new Error("A title identifier is required.");
  const endpoint=new URL("https://api.subdl.com/api/v1/subtitles");if(tmdbId)endpoint.searchParams.set("tmdb_id",tmdbId);if(imdbId)endpoint.searchParams.set("imdb_id",imdbId);endpoint.searchParams.set("type",type);endpoint.searchParams.set("languages",language);endpoint.searchParams.set("subs_per_page","30");endpoint.searchParams.set("unpack","1");endpoint.searchParams.set("client","custom_integration");if(type==="tv"){endpoint.searchParams.set("season_number",String(season));endpoint.searchParams.set("episode_number",String(episode));}
  const quota=new Set([401,402,403,429]);
  for(const apiKey of keys){endpoint.searchParams.set("api_key",apiKey);const searchResponse=await fetch(endpoint,{headers:{Accept:"application/json"}});if(!searchResponse.ok){if(quota.has(searchResponse.status))continue;throw new Error("SubDL search failed ("+searchResponse.status+").");}const payload=await searchResponse.json() as {subtitles?:Array<Record<string,unknown>>;status?:boolean;message?:string};const msg=String(payload.message||"").toLowerCase();if(payload.status===false&&/(limit|quota|credit|rate)/i.test(msg))continue;const candidates=(payload.subtitles||[]).flatMap(sub=>{const unpack=Array.isArray(sub.unpack_files)?sub.unpack_files:[];return(unpack.length?unpack:[sub]).map(file=>({...sub,...file as Record<string,unknown>}));});const selected=candidates.find(x=>{const lang=String(x.language||x.lang||"").toUpperCase().replace(/[-_].*$/,""),s=Number(x.season||0),e=Number(x.episode||0);return lang===language&&(type==="movie"||((!s||s===season)&&(!e||e===episode)));});const url=subtitleDownloadUrl(selected?.url);if(!url)throw new Error("No SubDL track is available.");let file=await fetch(url);if(!file.ok)file=await fetch(url,{headers:{"x-api-key":apiKey}});if(!file.ok){if(quota.has(file.status))continue;throw new Error("SubDL download failed ("+file.status+").");}const text=await file.text();if(/\.ass\b|\.ssa\b|\[Script Info\]/i.test(String(selected?.format||"")+text.slice(0,300)))throw new Error("SubDL returned an unsupported subtitle format.");return new Response(toWebVtt(text),{headers:{"Cache-Control":"public, max-age=300","Content-Type":"text/vtt; charset=utf-8","X-Subtitle-Source":"subdl","Access-Control-Expose-Headers":"X-Subtitle-Source"}});}
  throw new Error("All configured SubDL API keys are exhausted.");
}
async function readSubtitle(request:Request,env:Env){const selected=(new URL(request.url).searchParams.get("provider")||"auto").trim().toLowerCase();const providers=selected==="subdl"?["subdl"]:selected==="opensubtitles"?["opensubtitles"]:["subdl","opensubtitles"];const errors:string[]=[];for(const provider of providers){try{return provider==="opensubtitles"?await readOpenSubtitles(request,env):await readSubdl(request,env);}catch(error){errors.push(error instanceof Error?error.message:provider+" subtitle provider failed.");}}throw new Error(errors.join(" "));}


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = allowedOrigin(request, env);
    if (!origin) return json({ error: "Origin is not allowed." }, 403, null);
    if (request.method === "OPTIONS") return json(null, 204, origin);
    if (request.method !== "GET") return json({ error: "Method not allowed." }, 405, origin);


    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return json({ status: "UP", catalog: Boolean(env.STREAM_CATALOG), upstream: Boolean(env.SOURCE_API_BASE_URL), subtitles: Boolean(env.SUBDL_API_KEY || env.SUBDL_API_KEY_2 || env.OPEN_SUBTITLES_API_KEY), subtitleProviders: { subdl: Boolean(env.SUBDL_API_KEY || env.SUBDL_API_KEY_2 || env.SUBDL_API_KEY_3), opensubtitles: Boolean(env.OPEN_SUBTITLES_API_KEY && env.OPEN_SUBTITLES_USERNAME && env.OPEN_SUBTITLES_PASSWORD) } }, 200, origin);
    }


    if (url.pathname === "/v1/subtitles") {
      try {
        const response = await readSubtitle(request, env);
        response.headers.set("Access-Control-Allow-Origin", origin || "*");
        response.headers.set("Vary", "Origin");
        return response;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Subtitle provider failed.";
        if (url.searchParams.get("debug") === "1") {
          return json({ error: message }, 502, origin);
        }
        return new Response("Subtitle service unavailable.", {
          status: 502,
          headers: { "Access-Control-Allow-Origin": origin || "*", Vary: "Origin" },
        });
      }
    }


    const match = url.pathname.match(/^\/v1\/movie\/([^/]+)$/);
    if (!match) return json({ error: "Route not found." }, 404, origin);


    const movieId = decodeURIComponent(match[1]);
    const imdbId = url.searchParams.get("imdbId");
    try {
      const rawManifest = await readCatalog(env, movieId, imdbId)
        ?? await readAuthorizedUpstream(env, movieId, imdbId);
      if (!rawManifest) {
        return json({ error: "No licensed stream is configured for this movie." }, 404, origin);
      }
      const manifest = normalizeManifest(rawManifest, movieId);
      if (!manifest) {
        return json({ error: "The configured source manifest is invalid or contains no HTTPS media URL." }, 502, origin);
      }
      return json(manifest, 200, origin);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The source resolver failed.";
      return json({ error: message }, 502, origin);
    }
  },
} satisfies WorkerHandler<Env>;
