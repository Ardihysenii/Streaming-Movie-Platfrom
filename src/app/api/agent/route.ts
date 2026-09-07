import { NextResponse } from "next/server";
import {
  discoverAnime,
  discoverMovies,
  discoverSeries,
  getMovie,
  getPerson,
  getSeries,
  getSimilarMovies,
  getSimilarSeries,
  searchCatalog,
  searchPeople,
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

type TmdbMultiResult = {
  id: number;
  title?: string;
  name?: string;
  media_type?: "movie" | "tv" | "person";
  poster_path?: string | null;
  popularity?: number;
  adult?: boolean;
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
  "tell", "explain", "mean", "means", "does", "do", "is", "are", "was", "were", "about",
  "worth", "review", "reviews", "story", "plot", "synopsis", "cast", "character", "characters",
]);
const DESCRIPTION_WORDS = new Set([
  "dog", "dogs", "infected", "infection", "virus", "zombie", "zombies", "disease",
  "outbreak", "apocalypse", "survivors", "survivor", "world", "future", "space",
  "alien", "aliens", "killer", "detective", "school", "family", "father", "mother",
  "son", "daughter", "island", "war", "prison", "superhero", "robot", "robots",
  "funny", "scary", "romantic", "dark", "lighthearted", "emotional", "inspiring",
  "mind-bending", "mysterious", "mystery", "violent", "feel-good", "heartwarming",
  "action", "thriller", "horror", "comedy", "drama", "fantasy", "romance", "documentary",
  "fighting", "fight", "battle", "combat", "artificial", "intelligence", "machine", "machines",
  "technology", "future", "android", "cyborg", "robot", "robots", "ai",
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
  "mind-bending": "science fiction",
  futuristic: "science fiction",
  mysterious: "mystery",
  "sci fi": "science fiction",
  "sci-fi": "science fiction",
  scifi: "science fiction",
  "science-fiction": "science fiction",
  sf: "science fiction",
  adventure: "adventure",
  animated: "animation",
  cartoons: "animation",
  crime: "mystery",
  suspense: "thriller",
};

function canonicalGenre(value: string) {
  const normalized = value.toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
  const aliases = Object.keys(GENRE_ALIASES).sort((left, right) => right.length - left.length);
  const alias = aliases.find((candidate) => normalized.includes(candidate));
  if (alias) return GENRE_ALIASES[alias];
  return Object.keys(MOVIE_GENRES).find((genre) => normalized.includes(genre));
}
const SYNONYMS: Record<string, string[]> = {
  ai: ["artificial intelligence", "ai", "robot", "robots", "android", "machine", "machines", "cybernetic"],
  dog: ["dog", "dogs", "canine", "animal", "pet"],
  infected: ["infected", "infection", "virus", "disease", "outbreak", "zombie", "plague", "contagion"],
  people: ["people", "humanity", "humans", "survivors", "population", "community"],
  world: ["world", "earth", "humanity", "society", "civilization"],
  fighting: ["fight", "fighting", "combat", "battle", "war", "martial"],
  fight: ["fight", "fighting", "combat", "battle", "war", "martial"],
  battle: ["fight", "fighting", "combat", "battle", "war"],
  artificial: ["artificial", "intelligence", "android", "robot", "machine", "technology"],
  intelligence: ["artificial intelligence", "ai", "android", "robot", "machine"],
  machine: ["machine", "machines", "robot", "android", "artificial intelligence"],
  robot: ["robot", "robots", "android", "machine", "artificial intelligence"],
  future: ["future", "futuristic", "technology", "science fiction"],
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
  const match = prompt.match(/\b(?:actor|actress|starring|played by|with|of|featuring)\b\s+(?:the\s+)?(.+?)(?=\s+(?:in|is|are|who|that|for|please|movie|movies|film|films|show|shows|series|action|thriller|horror|comedy|drama|fantasy|romance|mystery|sci[- ]?fi|science fiction)\b|[?.!,]|$)/i);
  const candidate = match?.[1]?.trim().replace(/^(?:an?|the)\s+(?:actor|actress)\s+/i, "");
  return candidate && candidate.split(/\s+/).length <= 4 ? candidate : null;
}

function descriptionTokens(prompt: string) {
  const words = prompt.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter(Boolean);
  return words
    .filter((word) => (word.length > 3 || word === "ai") && !STOP_WORDS.has(word) && (DESCRIPTION_WORDS.has(word) || Boolean(GENRE_ALIASES[word])))
    .map((word) => GENRE_ALIASES[word] || word);
}

function isMediaRequest(prompt: string, history: AgentTurn[]) {
  const text = `${recentUserPrompt(history)} ${prompt}`.toLowerCase();
  return /\b(?:movie|movies|film|films|show|shows|series|tv|anime|watch|watching|find|search|suggest|recommend|recommendation|actor|actress|starring|similar|genre|rated|newest|latest|release|horror|comedy|action|drama|romance|thriller|mystery|fantasy|sci-fi|science fiction|plot|story|cast|trailer|worth|about)\b/.test(text)
    || /\b(?:what(?:'s| is)|who(?:'s| is)|tell me about|explain|is there|do you know)\b/.test(text)
    || Boolean(canonicalGenre(prompt))
    || descriptionTokens(prompt).length > 0
    || history.some((turn) => turn.role === "assistant" && Array.isArray(turn.results) && turn.results.length > 0);
}

function conversationalReply(prompt: string) {
  const normalized = prompt.toLowerCase();
  if (/\b(?:what can you do|help|how do you work|what are you)\b/.test(normalized)) {
    return "I’m Jarvis, NOVA’s movie assistant. I can understand descriptions, moods, actors, genres, release years, ratings, and follow-up requests, then search the catalog and take you to the title you choose.";
  }
  if (/\b(?:who are you|your name)\b/.test(normalized)) {
    return "I’m Jarvis—the assistant Ardi created for NOVA. Tell me what kind of movie, TV show, or anime you feel like watching, even if you only remember part of the story.";
  }
  if (/\b(?:bored|can’t decide|can't decide|surprise me|anything good|nothing to watch)\b/.test(normalized)) {
    return "No problem—I can choose for you. Tell me a mood, genre, actor, or one detail you remember, and I’ll narrow it down instead of making you browse everything.";
  }
  if (/\b(?:good morning|good afternoon|good evening|good night)\b/.test(normalized)) {
    return "Hello to you as well! I’m Jarvis, and I’m ready to help you find something great to watch.";
  }
  return "Tell me a title, actor, genre, mood, release year, or a story detail you remember. I’ll search NOVA’s live catalog and give you a useful result.";
}

function noResultReply(prompt: string) {
  const clues = descriptionTokens(prompt).filter((clue, index, all) => all.indexOf(clue) === index).slice(0, 3);
  return clues.length
    ? `I searched NOVA’s catalog for ${clues.join(", ")}, but there is no strong match yet. Add one more clue—an actor, year, language, or character—and I’ll narrow it down.`
    : "I couldn’t find a strong catalog match for that request. Add a title fragment, actor, genre, year, or story detail and I’ll search again.";
}

function asksForTitleExplanation(prompt: string) {
  return /\b(?:what(?:'s| is)|tell me about|explain|plot|story|synopsis|cast|characters?|worth watching|review)\b/i.test(prompt);
}

async function formatCatalogAnswer(prompt: string, results: Movie[], signal: AbortSignal) {
  const first = results[0];
  if (!first) return "I couldn’t find a matching title in NOVA’s catalog.";
  if (!asksForTitleExplanation(prompt)) {
    return `${results.length === 1 ? "I found" : "I found these"} ${results.length === 1 ? first.title : "matches"} in NOVA’s catalog.`;
  }

  const wantsCast = /\b(?:cast|characters?|who(?:'s| is) in|actors?|actresses?)\b/i.test(prompt);
  const wantsTrailer = /\btrailer\b/i.test(prompt);
  let details: Movie | null = null;
  if (wantsCast || wantsTrailer) {
    try {
      details = first.media_type === "tv"
        ? await getSeries(first.tmdb_id ?? first.id, signal)
        : await getMovie(first.tmdb_id ?? first.id, signal);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
    }
  }

  const year = first.release_date?.slice(0, 4);
  const rating = first.vote_average > 0 ? ` It is rated ${first.vote_average.toFixed(1)}/10.` : "";
  if (wantsCast && details && "cast" in details) {
    const castPeople = (details as Movie & { cast?: Array<{ name: string }> }).cast ?? [];
    const cast = castPeople.slice(0, 6).map((person) => person.name).join(", ");
    return cast ? `${first.title}${year ? ` (${year})` : ""} features ${cast}.${rating}` : `${first.title} is in the catalog, but cast data is unavailable right now.${rating}`;
  }
  if (wantsTrailer && details?.trailer_key) {
    return `${first.title} has a trailer available on NOVA. I found the title and its official trailer.${rating}`;
  }
  const overview = first.overview && first.overview !== "Description unavailable."
    ? ` ${first.overview}`
    : " I found the title, but TMDB does not have a description available for it.";
  return `${first.title}${year ? ` (${year})` : ""}.${rating}${overview}`;
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

function requestedGenreId(prompt: string) {
  const genre = canonicalGenre(prompt);
  return genre ? MOVIE_GENRES[genre] : undefined;
}

async function findDescribedMovie(prompt: string, signal: AbortSignal) {
  const actorName = extractActorName(prompt);
  const tokens = descriptionTokens(prompt);
  const genreId = requestedGenreId(prompt);
  if (!actorName || tokens.length < 1) return null;

  const people = await agentTmdbRequest<TmdbPersonSearch>("/search/person", { query: actorName, page: 1, include_adult: false }, signal);
  const person = people?.results?.[0];
  if (!person) return null;
  const credits = await agentTmdbRequest<{ cast?: TmdbCredit[] }>(`/person/${person.id}/movie_credits`, { include_adult: false }, signal);
  const candidates = (credits?.cast ?? [])
    .filter((movie) => movie.id && movie.poster_path && !movie.adult)
    .filter((movie) => !genreId || movie.genre_ids?.includes(genreId))
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, 24);
  if (!candidates.length) return null;

  const details = await Promise.all(candidates.map(async (candidate) => (
    await agentTmdbRequest<TmdbMovieDetails>(`/movie/${candidate.id}`, { append_to_response: "keywords" }, signal)
  )));
  const plotTokens = tokens.filter((token) => !Object.prototype.hasOwnProperty.call(MOVIE_GENRES, token));
  const scored = details
    .filter((movie): movie is TmdbMovieDetails => Boolean(movie))
    .map((movie) => {
      const searchable = [
        movie.title,
        movie.overview,
        movie.tagline,
        ...(movie.keywords?.keywords ?? []).map((keyword) => keyword.name),
      ].join(" ").toLowerCase();
      const score = plotTokens.length === 0 ? 1 : plotTokens.reduce((total, token) => {
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

async function findPersonFilmography(prompt: string, signal: AbortSignal) {
  if (!/\b(?:movies?|films?|shows?|series|filmography|acted|starring|with)\b/i.test(prompt)) return null;
  const actorName = extractActorName(prompt);
  if (!actorName) return null;
  const people = await searchPeople(actorName, signal);
  const person = people[0];
  if (!person) return null;
  const details = await getPerson(person.id, signal);
  const results = details.known_for.slice(0, MAX_RESULTS);
  return { person: details.name, results };
}

const KEYWORD_ALIASES: Record<string, string[]> = {
  ai: ["artificial intelligence", "robot", "android", "machine"],
  fighting: ["fighting", "martial arts", "combat", "battle"],
  fight: ["fighting", "martial arts", "combat", "battle"],
  battle: ["battle", "combat", "war"],
  infected: ["infection", "infected", "virus", "outbreak", "zombie"],
  dog: ["dog", "dogs", "animal", "pet"],
};

async function findKeywordMatches(intent: AgentIntent, prompt: string, signal: AbortSignal): Promise<Movie[]> {
  const tokens = [...new Set(descriptionTokens(prompt))].slice(0, 4);
  if (!TMDB_API_KEY || !tokens.length) return [];

  const idsByToken = await Promise.all(tokens.map(async (token) => {
    const queries = KEYWORD_ALIASES[token] ?? [token];
    const responses = await Promise.all(queries.map((query) => agentTmdbRequest<TmdbKeywordSearch>("/search/keyword", { query, page: 1 }, signal)));
    for (let index = 0; index < responses.length; index += 1) {
      const response = responses[index];
      const exact = response?.results?.find((keyword) => keyword.name?.toLowerCase() === queries[index].toLowerCase());
      if (exact?.id) return exact.id;
    }
    return responses[0]?.results?.[0]?.id ?? null;
  }));
  const priority = ["ai", "artificial", "infected", "zombie", "robot", "alien", "dog", "future", "fighting", "fight", "battle"];
  const tokenIds = tokens
    .map((token, index) => ({ token, id: idsByToken[index] }))
    .filter((entry): entry is { token: string; id: number } => typeof entry.id === "number")
    .sort((left, right) => (priority.indexOf(left.token) === -1 ? 99 : priority.indexOf(left.token)) - (priority.indexOf(right.token) === -1 ? 99 : priority.indexOf(right.token)))
    .map((entry) => entry.id);
  if (!tokenIds.length) return [];

  const combinations = [tokenIds, ...tokenIds.map((id) => [id])]
    .map((ids) => [...new Set(ids)])
    .filter((ids, index, all) => ids.length && all.findIndex((candidate) => candidate.join(",") === ids.join(",")) === index)
    .slice(0, 5);
  const paths = intent.scope === "movies"
    ? ["/discover/movie"]
    : intent.scope === "series"
      ? ["/discover/tv"]
      : ["/discover/movie", "/discover/tv"];
  const requests = combinations.flatMap((ids) => paths.map((path) => agentTmdbRequest<{
    results?: Array<{ id: number; poster_path?: string | null; genre_ids?: number[]; original_language?: string }>
  }>(path, {
    with_keywords: ids.join(","),
    sort_by: intent.sortBy,
    page: 1,
    include_adult: false,
    include_video: false,
    "vote_count.gte": intent.sortBy === "vote_average.desc" ? 50 : undefined,
    "primary_release_date.lte": intent.sortBy === "primary_release_date.desc"
      ? new Date().toISOString().slice(0, 10)
      : undefined,
  }, signal)));
  const pages = await Promise.all(requests);
  const candidates = pages.flatMap((page, index) => {
    const path = paths[index % paths.length];
    return (page?.results ?? []).map((item) => ({
      ...item,
      media_type: path === "/discover/tv" ? "tv" as const : "movie" as const,
    }));
  }).filter((item) => item.poster_path)
    .filter((item, index, all) => all.findIndex((candidate) => `${candidate.media_type}:${candidate.id}` === `${item.media_type}:${item.id}`) === index)
    .slice(0, 18);

  const details = await Promise.all(candidates.map(async (candidate) => {
    try {
      return candidate.media_type === "tv"
        ? await getSeries(candidate.id, signal)
        : await getMovie(candidate.id, signal);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      return null;
    }
  }));
  const validTokens = tokens.filter((token) => token !== "about");
  const needsAi = validTokens.includes("ai") || validTokens.includes("artificial");
  const needsCombat = validTokens.some((token) => ["fighting", "fight", "battle", "combat"].includes(token));
  const requiredAnchors = Number(needsAi) + Number(needsCombat);
  const scored = details
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .map((item) => {
      const candidate = item as NonNullable<typeof item> & {
        keywords?: { keywords?: Array<{ name: string }> };
        genres?: Array<{ name: string }>;
        tagline?: string;
        popularity?: number;
      };
      const searchable = [
        candidate.title,
        candidate.overview,
        candidate.tagline,
        ...(candidate.keywords?.keywords ?? []).map((keyword) => keyword.name),
        ...(candidate.genres ?? []).map((genre) => genre.name),
      ].join(" ").toLowerCase();
      const matchedTokens = validTokens.filter((token) =>
        (SYNONYMS[token] ?? [token]).some((term) => searchable.includes(term)),
      );
      const hasAiConcept = /artificial intelligence|robot|android|machine|cyber|technology|sentient|consciousness|autonomous|program/.test(searchable);
      const hasCombatConcept = /fight|fighting|combat|battle|war|martial/.test(searchable);
      const anchorCount = Number(!needsAi || hasAiConcept) + Number(!needsCombat || hasCombatConcept);
      return { item, score: matchedTokens.length + anchorCount, anchorCount, popularity: candidate.popularity ?? 0 };
    })
    .filter((entry) => entry.anchorCount === requiredAnchors)
    .filter((entry) => entry.score >= Math.max(1, Math.min(validTokens.length, 2)))
    .sort((a, b) => b.score - a.score || b.popularity - a.popularity);
  return scored.slice(0, intent.limit).map((entry) => entry.item as Movie);
}

function likelyTitleQueries(prompt: string, query: string) {
  const queries = [query.trim()];
  const patterns = [
    /\b(?:something|a movie|a show)\s+like\s+["“]?([^"”?.!,]+)["”]?/i,
    /\b(?:like|similar to|called|named|titled)\s+["“]?([^"”?.!,]+)["”]?/i,
  ];
  patterns.forEach((pattern) => {
    const match = prompt.match(pattern);
    let extracted = match?.[1]?.trim() || "";
    const nested = extracted.match(/^(.+?)\s+like\s+(.+)$/i);
    if (nested) extracted = nested[2].trim();
    extracted = extracted
      .replace(/\s+(?:it|that|which)\s+(?:just\s+)?(?:came|comes|is|was)\b.*$/i, "")
      .replace(/\b(?:please|for me|right now)$/i, "")
      .trim();
    if (extracted && extracted.length >= 3) queries.unshift(extracted);
  });
  return [...new Set(queries.filter(Boolean))].slice(0, 3);
}

function normaliseTitle(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function titleSimilarity(left: string, right: string) {
  const a = normaliseTitle(left);
  const b = normaliseTitle(right);
  if (!a || !b) return 0;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= b.length; column += 1) {
      const above = previous[column];
      previous[column] = a[row - 1] === b[column - 1]
        ? diagonal
        : 1 + Math.min(diagonal, previous[column], previous[column - 1]);
      diagonal = above;
    }
  }
  return 1 - previous[b.length] / Math.max(a.length, b.length);
}

async function findClosestTitles(intent: AgentIntent, prompt: string, signal: AbortSignal): Promise<Movie[]> {
  const queries = likelyTitleQueries(prompt, intent.query);
  const query = queries[0] || "";
  if (!TMDB_API_KEY || query.length < 3 || descriptionTokens(prompt).length > 0) return [];

  const requestedType = intent.scope === "movies" ? "movie" : intent.scope === "series" ? "tv" : null;
  const multiPages = await Promise.all(queries.map((candidate) => agentTmdbRequest<{ results?: TmdbMultiResult[] }>("/search/multi", {
    query: candidate,
    page: 1,
    include_adult: false,
  }, signal)));
  const fallbackRequests = [
    agentTmdbRequest<{ results?: TmdbMultiResult[] }>("/trending/all/week", {}, signal),
    ...Array.from({ length: 5 }, (_, index) => agentTmdbRequest<{ results?: TmdbMultiResult[] }>("/movie/top_rated", { page: index + 1 }, signal)),
    ...Array.from({ length: 3 }, (_, index) => agentTmdbRequest<{ results?: TmdbMultiResult[] }>("/tv/top_rated", { page: index + 1 }, signal)),
    ...Array.from({ length: 3 }, (_, index) => agentTmdbRequest<{ results?: TmdbMultiResult[] }>("/movie/popular", { page: index + 1 }, signal)),
  ];
  const fallbackPages = await Promise.all(fallbackRequests);
  const candidates = [
    ...multiPages.flatMap((page) => page?.results ?? []),
    ...fallbackPages.flatMap((page) => page?.results ?? []),
  ]
    .filter((item) => item.media_type !== "person" && item.id && item.poster_path)
    .filter((item) => !requestedType || item.media_type === requestedType)
    .map((item) => ({
      item,
      title: item.title || item.name || "",
      score: Math.max(...queries.map((candidate) => titleSimilarity(candidate, item.title || item.name || ""))),
    }))
    .filter((entry) => entry.title && entry.score >= 0.58)
    .sort((a, b) => b.score - a.score || (b.item.popularity ?? 0) - (a.item.popularity ?? 0))
    .filter((entry, index, all) => all.findIndex((candidate) => `${candidate.item.media_type}:${candidate.item.id}` === `${entry.item.media_type}:${entry.item.id}`) === index)
    .slice(0, 3);

  const details = await Promise.all(candidates.map(async ({ item }) => {
    try {
      return item.media_type === "tv"
        ? await getSeries(item.id, signal)
        : await getMovie(item.id, signal);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      return null;
    }
  }));
  return details.filter((item) => item !== null).slice(0, intent.limit) as Movie[];
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
  const canonical = canonicalGenre(context);
  const query = canonical
    ?? context
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
    if (!prompt || prompt.length > 600) {
      return NextResponse.json({ error: "Please keep the request under 600 characters so I can search it accurately." }, { status: 400 });
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

    const filmography = await findPersonFilmography(prompt, request.signal);
    if (filmography?.results.length) {
      return NextResponse.json({
        message: `Here are ${filmography.person}’s strongest catalog matches in NOVA.`,
        results: filmography.results,
      });
    }

    const described = await findDescribedMovie(prompt, request.signal);
    if (described) {
      return NextResponse.json({
        message: `I found ${described.movie.title}, starring ${described.actorName}. The plot and keyword match fit your description.`,
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
        message: `I matched the story clues against NOVA’s catalog and found these ${intent.scope === "series" ? "TV shows" : intent.scope === "anime" ? "anime titles" : "titles"}.`,
        results: keywordResults,
      });
    }

    const results = await findMedia(intent, request.signal);
    if (results.length) {
      return NextResponse.json({
        message: intent.page > 1
          ? `Here are more ${titleFor(intent)} from NOVA’s catalog.`
          : await formatCatalogAnswer(prompt, results, request.signal),
        results,
      });
    }
    const closeMatches = await findClosestTitles(intent, prompt, request.signal);
    return NextResponse.json({
      message: closeMatches.length
        ? `I think you mean one of these. Here are the closest matches I found:`
        : noResultReply(prompt),
      results: closeMatches,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json({ error: "The request was cancelled." }, { status: 499 });
    }
    return NextResponse.json({
      message: "I’m still here. I couldn’t reach the catalog just now, but you can ask me again or describe the kind of movie, show, or anime you want.",
      results: [],
    });
  }
}
