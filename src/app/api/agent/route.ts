import { NextResponse } from "next/server";
import {
  discoverAnime,
  discoverMovies,
  discoverSeries,
  getMovie,
  getSeries,
  getSimilarMovies,
  getSimilarSeries,
  searchCatalog,
  type SearchScope,
} from "@/lib/tmdb";
import type { Movie } from "@/lib/types";

type AgentTurn = {
  role?: unknown;
  content?: unknown;
  results?: Array<{ id?: string | number; tmdb_id?: number; media_type?: "movie" | "tv"; title?: string }>;
};

type AgentRequest = {
  prompt?: unknown;
  history?: unknown;
};

type AgentIntent = {
  scope: SearchScope;
  query: string;
  sortBy: string;
  limit: number;
  page: number;
};

type TmdbPersonSearch = {
  results?: Array<{ id: number; name?: string }>;
};

type TmdbKeywordSearch = {
  results?: Array<{ id: number; name?: string }>;
};

type TmdbCredit = {
  id: number;
  title?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genre_ids?: number[];
  adult?: boolean;
};

type TmdbMovieDetails = TmdbCredit & {
  tagline?: string;
  keywords?: { keywords?: Array<{ name?: string }> };
};

const MAX_RESULTS = 10;
const MOVIE_GENRES: Record<string, number> = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  drama: 18,
  fantasy: 14,
  horror: 27,
  romance: 10749,
  "science fiction": 878,
  thriller: 53,
  mystery: 9648,
  documentary: 99,
};
const COMMON_ACTORS = [
  "will smith", "tom hanks", "tom cruise", "brad pitt", "leonardo dicaprio",
  "dwayne johnson", "keanu reeves", "robert downey jr", "chris hemsworth",
  "chris evans", "ryan reynolds", "morgan freeman", "johnny depp", "jason statham",
  "denzel washington", "willem dafoe", "emma stone", "scarlett johansson",
  "angelina jolie", "matt damon", "jennifer lawrence", "sandra bullock",
];
const STOP_WORDS = new Set([
  "a", "an", "and", "find", "for", "me", "movie", "movies", "film", "films",
  "show", "shows", "series", "tv", "anime", "the", "top", "first", "best", "rated",
  "rating", "ratings", "popular", "new", "newest", "latest", "recent", "release",
  "releases", "please", "give", "get", "with", "of", "in", "from", "what", "about",
  "only", "more", "like", "that", "same", "another", "ones", "one", "10", "actor",
  "actress", "starring", "played", "plays", "people", "person", "movie", "called",
  "named", "something", "something", "whose", "where", "there", "this", "is",
  "i", "im", "i’m", "me", "my", "you", "your", "can", "could", "would", "should",
  "want", "wants", "looking", "look", "watch", "watching", "feel", "feeling", "find",
]);
const DESCRIPTION_WORDS = new Set([
  "dog", "dogs", "infected", "infection", "virus", "zombie", "zombies", "disease",
  "outbreak", "apocalypse", "survivors", "survivor", "world", "future", "space",
  "alien", "aliens", "killer", "detective", "school", "family", "father", "mother",
  "son", "daughter", "island", "war", "prison", "superhero", "robot", "robots",
  "funny", "scary", "romantic", "dark", "lighthearted", "emotional", "inspiring",
  "mind-bending", "mysterious", "mystery", "violent", "feel-good", "heartwarming",
]);
const GENRE_ALIASES: Record<string, string> = {
  funny: "comedy",
  hilarious: "comedy",
  lighthearted: "comedy",
  scary: "horror",
  frightening: "horror",
  romantic: "romance",
  love: "romance",
  emotional: "drama",
  dramatic: "drama",
  mind-bending: "science fiction",
  futuristic: "science fiction",
  mysterious: "mystery",
};
const SYNONYMS: Record<string, string[]> = {
  dog: ["dog", "dogs", "canine", "animal"],
  infected: ["infected", "infection", "virus", "disease", "outbreak", "zombie"],
  people: ["people", "humanity", "humans", "survivors", "population"],
  world: ["world", "earth", "humanity", "society"],
};
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY?.trim();

function isGreeting(prompt: string) {
  return /^(?:hi|hello|hey|good morning|good afternoon|good evening|how are you)\b/i.test(prompt.trim());
}

function isThankYou(prompt: string) {
  return /\b(?:thank you|thanks|thx|thankyou)\b/i.test(prompt.trim()) && prompt.trim().length <= 160;
}

function recentUserPrompt(history: AgentTurn[]) {
  return history
    .filter((turn) => turn.role === "user" && typeof turn.content === "string")
    .map((turn) => String(turn.content).trim())
    .filter(Boolean)
    .at(-1) ?? "";
}

function previousResult(history: AgentTurn[]) {
  return history
    .filter((turn) => turn.role === "assistant" && Array.isArray(turn.results) && turn.results.length)
    .flatMap((turn) => turn.results ?? [])
    .at(-1) ?? null;
}

function extractActorName(prompt: string) {
  const normalized = prompt.toLowerCase().replace(/[^a-z0-9.\s]/g, " ").replace(/\s+/g, " ").trim();
  const known = COMMON_ACTORS.find((name) => normalized.includes(name));
  if (known) return known;
  const match = prompt.match(/\b(?:actor|actress|starring|played by|with)\b.*?\b(?:is|named|called)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/);
  return match?.[1]?.trim() || null;
}

function descriptionTokens(prompt: string) {
  const words = prompt.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter(Boolean);
  return words
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word) && (DESCRIPTION_WORDS.has(word) || Boolean(GENRE_ALIASES[word])))
    .map((word) => GENRE_ALIASES[word] || word);
}

function isMediaRequest(prompt: string, history: AgentTurn[]) {
  const text = `${recentUserPrompt(history)} ${prompt}`.toLowerCase();
  return /\b(?:movie|movies|film|films|show|shows|series|tv|anime|watch|watching|find|search|suggest|recommend|recommendation|actor|actress|starring|similar|genre|rated|newest|latest|release|horror|comedy|action|drama|romance|thriller|mystery|fantasy|sci-fi|science fiction)\b/.test(text)
    || descriptionTokens(prompt).length > 0;
}

function conversationalReply(prompt: string) {
  const normalized = prompt.toLowerCase();
  if (/\b(?:what can you do|help|how do you work|what are you)\b/.test(normalized)) {
    return "I’m Jarvis, NOVA’s movie assistant. I can understand descriptions, moods, actors, genres, release years, ratings, and follow-up requests, then search the catalog and take you to the title you choose.";
  }
  if (/\b(?:who are you|your name)\b/.test(normalized)) {
    return "I’m Jarvis—the assistant Ardi created for NOVA. Tell me what kind of movie, TV show, or anime you feel like watching, even if you only remember part of the story.";
  }
  if (/\b(?:good morning|good afternoon|good evening|good night)\b/.test(normalized)) {
    return "Hello to you as well! I’m Jarvis, and I’m ready to help you find something great to watch.";
  }
  return "I understand you. I’m Jarvis, NOVA’s Assistant. You can ask me naturally—describe a story, name an actor, tell me a mood, ask for something similar, or just tell me what kind of watch you want.";
}

async function agentTmdbRequest<T>(path: string, params: Record<string, string | number | boolean | undefined>, signal: AbortSignal) {
  if (!TMDB_API_KEY) return null;
  const endpoint = new URL(`${TMDB_BASE}${path}`);
  endpoint.searchParams.set("api_key", TMDB_API_KEY);
  endpoint.searchParams.set("language", "en-US");
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") endpoint.searchParams.set(key, String(value));
  });
  const response = await fetch(endpoint, { headers: { Accept: "application/json" }, signal });
  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

async function findDescribedMovie(prompt: string, signal: AbortSignal) {
  const actorName = extractActorName(prompt);
  const tokens = descriptionTokens(prompt);
  if (!actorName || tokens.length < 1) return null;

  const people = await agentTmdbRequest<TmdbPersonSearch>("/search/person", { query: actorName, page: 1, include_adult: false }, signal);
  const person = people?.results?.[0];
  if (!person) return null;
  const credits = await agentTmdbRequest<{ cast?: TmdbCredit[] }>(`/person/${person.id}/movie_credits`, { include_adult: false }, signal);
  const candidates = (credits?.cast ?? [])
    .filter((movie) => movie.id && movie.poster_path && !movie.adult)
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, 24);
  if (!candidates.length) return null;

  const details = await Promise.all(candidates.map(async (candidate) => (
    await agentTmdbRequest<TmdbMovieDetails>(`/movie/${candidate.id}`, { append_to_response: "keywords" }, signal)
  )));
  const scored = details
    .filter((movie): movie is TmdbMovieDetails => Boolean(movie))
    .map((movie) => {
      const searchable = [
        movie.title,
        movie.overview,
        movie.tagline,
        ...(movie.keywords?.keywords ?? []).map((keyword) => keyword.name),
      ].join(" ").toLowerCase();
      const score = tokens.reduce((total, token) => {
        const terms = SYNONYMS[token] ?? [token];
        return total + (terms.some((term) => searchable.includes(term)) ? 1 : 0);
      }, 0);
      return { movie, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || (b.movie.popularity ?? 0) - (a.movie.popularity ?? 0));
  const best = scored[0];
  if (!best) return null;
  const resolved = await getMovie(best.movie.id, signal);
  return { actorName: person.name || actorName, movie: resolved, score: best.score };
}

async function findKeywordMatches(intent: AgentIntent, prompt: string, signal: AbortSignal): Promise<Movie[]> {
  const tokens = [...new Set(descriptionTokens(prompt))].slice(0, 3);
  if (!TMDB_API_KEY || !tokens.length) return [];

  const keywordIds = await Promise.all(tokens.map(async (token) => {
    const response = await agentTmdbRequest<TmdbKeywordSearch>("/search/keyword", { query: token, page: 1 }, signal);
    const exact = response?.results?.find((keyword) => keyword.name?.toLowerCase() === token);
    return exact?.id ?? response?.results?.[0]?.id ?? null;
  }));
  const ids = keywordIds.filter((id): id is number => typeof id === "number");
  if (!ids.length) return [];

  const discoverParams = {
    with_keywords: ids.join(","),
    sort_by: intent.sortBy,
    page: 1,
    include_adult: false,
    include_video: false,
    "vote_count.gte": intent.sortBy === "vote_average.desc" ? 50 : undefined,
    "primary_release_date.lte": intent.sortBy === "primary_release_date.desc"
      ? new Date().toISOString().slice(0, 10)
      : undefined,
  };
  const paths = intent.scope === "movies"
    ? ["/discover/movie"]
    : intent.scope === "series"
      ? ["/discover/tv"]
      : ["/discover/movie", "/discover/tv"];
  const pages = await Promise.all(paths.map((path) => (
    agentTmdbRequest<{ results?: Array<{ id: number; poster_path?: string | null; genre_ids?: number[]; original_language?: string }> }>(path, discoverParams, signal)
  )));
  const candidates = pages.flatMap((page, index) => (page?.results ?? []).map((item) => ({
    ...item,
    media_type: paths[index] === "/discover/tv" ? "tv" as const : "movie" as const,
  }))).filter((item) => item.poster_path);
  const details = await Promise.all(candidates.slice(0, 8).map(async (candidate) => {
    try {
      return candidate.media_type === "tv"
        ? await getSeries(candidate.id, signal)
        : await getMovie(candidate.id, signal);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      return null;
    }
  }));
  return details.filter((item): item is Movie => Boolean(item)).slice(0, intent.limit);
}

function parseIntent(prompt: string, history: AgentTurn[]): AgentIntent {
  const normalized = prompt.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
  const previous = recentUserPrompt(history).toLowerCase();
  const followUp = /\b(?:more|again|another|next)\b/.test(normalized);
  const context = followUp ? `${previous} ${normalized}` : normalized;
  const limitMatch = context.match(/\b(?:top|first)\s+(\d{1,2})\b/);
  const limit = Math.min(MAX_RESULTS, Math.max(1, Number(limitMatch?.[1] ?? 10)));
  const scopeSource = /\b(?:anime|tv|television|series|shows|movies?|films?)\b/.test(normalized)
    ? normalized
    : previous || normalized;
  const scope: SearchScope = /\banime\b/.test(scopeSource)
    ? "anime"
    : /\b(?:tv|television|series|shows)\b/.test(scopeSource)
      ? "series"
      : /\b(?:movie|movies|film|films)\b/.test(scopeSource)
        ? "movies"
        : "all";
  const sortBy = /\b(?:top(?:\s+\d+)?[- ]?rated|highest[- ]?rated|best|critically acclaimed)\b/.test(context)
    ? "vote_average.desc"
    : /\b(?:new|newest|latest|recent|releases?)\b/.test(context)
      ? "primary_release_date.desc"
      : "popularity.desc";
  const query = context
    .replace(/\b(?:top|first)\s+\d{1,2}\b/g, "")
    .split(" ")
    .filter((word) => !STOP_WORDS.has(word))
    .map((word) => GENRE_ALIASES[word] || word)
    .join(" ")
    .trim();

  return { scope, query, sortBy, limit, page: followUp ? 2 : 1 };
}

function titleFor(intent: AgentIntent) {
  const kind = intent.scope === "series" ? "TV shows" : intent.scope === "anime" ? "anime" : "movies";
  const description = intent.sortBy === "vote_average.desc"
    ? "top-rated"
    : intent.sortBy === "primary_release_date.desc"
      ? "newest"
      : "most popular";
  return `${description} ${kind}`;
}

async function findMedia(intent: AgentIntent, signal: AbortSignal): Promise<Movie[]> {
  const genreEntry = Object.entries(MOVIE_GENRES).find(([genre]) => intent.query === genre || intent.query.includes(genre));
  const genreId = intent.scope === "movies" ? genreEntry?.[1] : undefined;
  if (genreId) {
    return (await discoverMovies(intent.page, genreId, intent.sortBy, signal)).results.slice(0, intent.limit);
  }
  if (intent.query) {
    return (await searchCatalog(intent.query, signal, intent.scope)).slice(0, intent.limit);
  }

  if (intent.scope === "movies") {
    return (await discoverMovies(intent.page, undefined, intent.sortBy, signal)).results.slice(0, intent.limit);
  }
  if (intent.scope === "series") {
    const sortBy = intent.sortBy === "primary_release_date.desc" ? "first_air_date.desc" : intent.sortBy;
    return (await discoverSeries(intent.page, undefined, sortBy, signal)).results.slice(0, intent.limit);
  }
  if (intent.scope === "anime") {
    return (await discoverAnime(intent.page, intent.sortBy, signal)).results.slice(0, intent.limit);
  }

  const [movies, series] = await Promise.all([
    discoverMovies(intent.page, undefined, intent.sortBy, signal),
    discoverSeries(intent.page, undefined, intent.sortBy, signal),
  ]);
  return [...movies.results, ...series.results]
    .sort((a, b) => {
      if (intent.sortBy === "vote_average.desc") return b.vote_average - a.vote_average;
      if (intent.sortBy === "primary_release_date.desc") return b.release_date.localeCompare(a.release_date);
      return (b.popularity ?? 0) - (a.popularity ?? 0);
    })
    .slice(0, intent.limit);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as AgentRequest;
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt || prompt.length > 240) {
      return NextResponse.json({ error: "Please enter a short movie, TV-show, or anime request." }, { status: 400 });
    }

    const history = Array.isArray(body.history)
      ? body.history.slice(-12).filter((turn): turn is AgentTurn => Boolean(turn) && typeof turn === "object")
      : [];
    if (isGreeting(prompt)) {
      return NextResponse.json({
        message: "Hello to you as well! I am Jarvis—Ardi named me. He is my master. Thank you for choosing his space to watch movies; he put a lot of effort into it. I am the platform's Assistant, and I can help you find movies, TV shows, and anime.",
        results: [],
      });
    }
    if (isThankYou(prompt)) {
      return NextResponse.json({
        message: "I am glad I could help! Enjoy your movie, show, or anime.",
        results: [],
      });
    }

    const prior = previousResult(history);
    if (prior && /\b(?:similar|like that|like it|more like|show me more|another one)\b/i.test(prompt)) {
      const id = prior.tmdb_id ?? prior.id;
      const related = prior.media_type === "tv"
        ? await getSimilarSeries(id ?? "", request.signal)
        : await getSimilarMovies(id ?? "", request.signal);
      return NextResponse.json({
        message: related.length ? `Here are more titles similar to ${prior.title || "that one"}.` : "I could not find similar titles right now.",
        results: related.slice(0, MAX_RESULTS),
      });
    }

    const described = await findDescribedMovie(prompt, request.signal);
    if (described) {
      return NextResponse.json({
        message: `I think you may be looking for ${described.movie.title}, starring ${described.actorName}. I matched your description against the movie's plot and keywords.`,
        results: [described.movie],
      });
    }

    const intent = parseIntent(prompt, history);
    if (!isMediaRequest(prompt, history)) {
      return NextResponse.json({ message: conversationalReply(prompt), results: [] });
    }
    const keywordResults = await findKeywordMatches(intent, prompt, request.signal);
    if (keywordResults.length) {
      return NextResponse.json({
        message: `I understood the clues in your description and found these ${intent.scope === "series" ? "TV shows" : intent.scope === "anime" ? "anime titles" : "titles"}.`,
        results: keywordResults,
      });
    }

    const results = await findMedia(intent, request.signal);
    return NextResponse.json({
      message: results.length
        ? `${intent.page > 1 ? "Here are more" : "Here are"} ${titleFor(intent)} I found.`
        : "I could not find a close match yet. Try adding an actor, genre, year, mood, or one more detail about the story.",
      results,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json({ error: "The request was cancelled." }, { status: 499 });
    }
    return NextResponse.json({ error: "The Agent could not load titles right now." }, { status: 502 });
  }
}
