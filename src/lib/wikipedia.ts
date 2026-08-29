import type { PersonCredit } from "./types";

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";

type WikipediaPage = {
  title: string;
  thumbnail?: {
    source: string;
  };
};

type WikipediaResponse = {
  query?: {
    normalized?: Array<{ from: string; to: string }>;
    redirects?: Array<{ from: string; to: string }>;
    pages?: WikipediaPage[];
  };
};

function normalizedName(name: string) {
  return name.trim().toLocaleLowerCase("en-US");
}

export async function withWikipediaPortraits(
  people: PersonCredit[],
  signal?: AbortSignal,
): Promise<PersonCredit[]> {
  const missingPortraits = people.filter((person) => !person.profile_path && !person.profile_url);
  if (!missingPortraits.length) return people;

  try {
    const url = new URL(WIKIPEDIA_API);
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("formatversion", "2");
    url.searchParams.set("origin", "*");
    url.searchParams.set("redirects", "1");
    url.searchParams.set("prop", "pageimages");
    url.searchParams.set("piprop", "thumbnail");
    url.searchParams.set("pithumbsize", "480");
    url.searchParams.set("pilicense", "free");
    url.searchParams.set("titles", missingPortraits.map((person) => person.name).join("|"));

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal,
    });
    if (!response.ok) return people;

    const data = (await response.json()) as WikipediaResponse;
    const aliases = new Map<string, string>();
    for (const item of [...(data.query?.normalized ?? []), ...(data.query?.redirects ?? [])]) {
      aliases.set(normalizedName(item.from), item.to);
    }
    const pages = new Map(
      (data.query?.pages ?? []).map((page) => [normalizedName(page.title), page]),
    );

    return people.map((person) => {
      if (person.profile_path || person.profile_url) return person;
      const alias = aliases.get(normalizedName(person.name)) ?? person.name;
      const page = pages.get(normalizedName(alias));
      return page?.thumbnail?.source
        ? { ...person, profile_url: page.thumbnail.source.replace(/^http:/, "https:") }
        : person;
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return people;
  }
}
