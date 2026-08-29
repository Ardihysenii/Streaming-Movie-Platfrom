"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { BackIcon, SearchIcon } from "@/components/Icons";
import { CardSkeletons } from "@/components/Loading";
import { getPopularPeople, getTopHollywoodActors, imageUrl, searchPeople } from "@/lib/tmdb";
import type { PersonCredit } from "@/lib/types";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ActorGrid({ people }: { people: PersonCredit[] }) {
  return (
    <div className="people-grid">
      {people.map((person) => {
        const portrait = person.profile_path ? imageUrl(person.profile_path, "w342") : null;
        return (
          <Link className="actor-card" href={`/person/?id=${person.id}`} key={person.id}>
            <div className="actor-portrait">
              {portrait ? (
                <Image src={portrait} alt={person.name} fill sizes="(max-width: 650px) 42vw, 160px" />
              ) : (
                <span aria-hidden="true">{initials(person.name)}</span>
              )}
            </div>
            <div>
              <h2>{person.name}</h2>
              <p>{person.character || "Actor / creator"}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default function ActorsPage() {
  const [topPeople, setTopPeople] = useState<PersonCredit[]>([]);
  const [otherPeople, setOtherPeople] = useState<PersonCredit[]>([]);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    async function loadPeople() {
      try {
        if (submittedQuery) {
          setTopPeople([]);
          setOtherPeople(await searchPeople(submittedQuery, controller.signal));
          return;
        }

        const [top, secondPage, thirdPage] = await Promise.all([
          getTopHollywoodActors(controller.signal),
          getPopularPeople(2, controller.signal),
          getPopularPeople(3, controller.signal),
        ]);
        const knownIds = new Set(top.map((person) => person.id));
        const rest = [...secondPage, ...thirdPage].filter((person, index, all) => {
          if (knownIds.has(person.id)) return false;
          return all.findIndex((candidate) => candidate.id === person.id) === index;
        });
        setTopPeople(top);
        setOtherPeople(rest);
      } catch (error: unknown) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setTopPeople([]);
          setOtherPeople([]);
        }
      } finally {
        setLoading(false);
      }
    }

    loadPeople();
    return () => controller.abort();
  }, [submittedQuery]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(query.trim());
  }

  return (
    <main className="actors-page">
      <div className="actors-atmosphere" aria-hidden="true">
        <span className="actors-frame actors-frame-one" />
        <span className="actors-frame actors-frame-two" />
        <span className="actors-orbit actors-orbit-one" />
        <span className="actors-orbit actors-orbit-two" />
      </div>
      <Link className="back-link actors-back" href="/">
        <BackIcon /> Back to home
      </Link>

      <header className="actors-header">
        <div>
          <p className="eyebrow">NOVA people</p>
          <h1>Actors</h1>
          <p>Meet the performers and creators behind your favorite stories.</p>
        </div>
        <form className="actor-search" onSubmit={submit} role="search">
          <SearchIcon />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search actors or directors"
            aria-label="Search actors or directors"
          />
          <button type="submit">Search</button>
        </form>
      </header>

      <section aria-live="polite" aria-busy={loading}>
        {loading ? (
          <CardSkeletons count={12} />
        ) : submittedQuery ? (
          otherPeople.length ? (
            <>
              <div className="people-heading">
                <p className="eyebrow">Search results</p>
                <span>{otherPeople.length} profiles</span>
              </div>
              <ActorGrid people={otherPeople} />
            </>
          ) : (
            <div className="empty-state actors-empty">
              <h2>No profiles found</h2>
              <p>Try a different name.</p>
            </div>
          )
        ) : topPeople.length || otherPeople.length ? (
          <>
            <section className="actor-ranking" aria-labelledby="top-actors-heading">
              <div className="people-heading">
                <p className="eyebrow" id="top-actors-heading">Top 20 Hollywood</p>
                <span>{topPeople.length} profiles</span>
              </div>
              <ActorGrid people={topPeople} />
            </section>
            <section className="actor-ranking actor-ranking-rest" aria-labelledby="more-actors-heading">
              <div className="people-heading">
                <p className="eyebrow" id="more-actors-heading">More actors</p>
                <span>{otherPeople.length} profiles</span>
              </div>
              <ActorGrid people={otherPeople} />
            </section>
          </>
        ) : (
          <div className="empty-state actors-empty">
            <h2>No profiles found</h2>
            <p>Try a different name.</p>
          </div>
        )}
      </section>
    </main>
  );
}
