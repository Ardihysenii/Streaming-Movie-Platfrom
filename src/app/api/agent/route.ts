import { NextResponse } from "next/server";
import {
  discoverAnime,
  discoverMovies,
  discoverSeries,
  searchCatalog,
  type SearchScope,
} from "@/lib/tmdb";
import type { Movie } from "@/lib/types";

type AgentTurn = {
  role?: unknown;
  content?: unknown;
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
};
const STOP_WORDS = new Set([
  "a", "an", "and", "find", "for", "me", "movie", "movies", "film", "films",
  "show", "shows", "series", "tv", "anime", "the", "top", "first", "best", "rated",
  "rating", "ratings", "popular", "new", "newest", "latest", "recent", "release",
  "releases", "please", "give", "get", "with", "of", "in", "from", "what", "about",
  "only", "more", "like", "that", "same", "another", "ones", "one", "10",
]);

function isGreeting(prompt: string) {
  return /^(?:hi|hello|hey|good morning|good afternoon|good evening|how are you)\b/i.test(prompt.trim());
}

function recentUserPrompt(history: AgentTurn[]) {
  return history
    .filter((turn) => turn.role === "user" && typeof turn.content === "string")
    .map((turn) => String(turn.content).trim())
    .filter(Boolean)
    .at(-1) ?? "";
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
    .join(" ")
    .trim();

  return {
    scope,
    query,
    sortBy,
    limit,
    page: followUp ? 2 : 1,
  };
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
  const genreId = intent.scope === "movies" ? MOVIE_GENRES[intent.query] : undefined;
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
        message: "Hello! I can help you find movies, TV shows, and anime. Try asking for the top-rated movies, newest shows, or popular anime.",
        results: [],
      });
    }

    const intent = parseIntent(prompt, history);
    const results = await findMedia(intent, request.signal);
    return NextResponse.json({
      message: results.length
        ? `${intent.page > 1 ? "Here are more" : "Here are"} ${titleFor(intent)} I found.`
        : "I could not find matching titles. Try another request.",
      results,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json({ error: "The request was cancelled." }, { status: 499 });
    }
    return NextResponse.json({ error: "The Agent could not load titles right now." }, { status: 502 });
  }
}
