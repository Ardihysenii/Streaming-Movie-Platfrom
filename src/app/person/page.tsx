"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BackIcon } from "@/components/Icons";
import { MovieGrid } from "@/components/MovieCard";
import { PageLoader } from "@/components/Loading";
import { getPerson, imageUrl } from "@/lib/tmdb";
import type { PersonDetails } from "@/lib/types";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function PersonPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading profile" />}>
      <PersonPageContent />
    </Suspense>
  );
}

function PersonPageContent() {
  const router = useRouter();
  const [person, setPerson] = useState<PersonDetails | null>(null);
  const [id, setId] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setId(params.get("id")?.trim() || null);
  }, []);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setPerson(null);
    setError(false);
    getPerson(id, controller.signal)
      .then(setPerson)
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(true);
      });
    return () => controller.abort();
  }, [id]);

  if (id === undefined) return <PageLoader label="Loading profile" />;
  if (!id || error) {
    return (
      <main className="message-page">
        <p className="eyebrow">Profile unavailable</p>
        <h1>We couldn’t find that cast or crew profile.</h1>
        <Link className="primary-button" href="/movies/">Browse movies</Link>
      </main>
    );
  }
  if (!person) return <PageLoader label="Loading profile" />;

  const born = person.birthday
    ? `Born: ${person.birthday}${person.place_of_birth ? ` in ${person.place_of_birth}` : ""}`
    : person.place_of_birth
      ? `Born in ${person.place_of_birth}`
      : "Birth details unavailable";
  const portrait = person.profile_path ? imageUrl(person.profile_path, "w780") : null;

  return (
    <main className="person-page">
      <div className="person-atmosphere" aria-hidden="true">
        <span className="person-frame person-frame-one" />
        <span className="person-frame person-frame-two" />
        <span className="person-orbit person-orbit-one" />
        <span className="person-orbit person-orbit-two" />
      </div>
      <button
        className="back-link person-back"
        type="button"
        onClick={() => window.history.length > 1 ? window.history.back() : router.push("/actors/")}
      >
        <BackIcon /> Back to actors
      </button>

      <section className="person-profile" aria-labelledby="person-name">
        <div className="person-portrait">
          {portrait ? (
            <Image src={portrait} alt={person.name} fill priority sizes="(max-width: 760px) 78vw, 380px" />
          ) : (
            <span aria-hidden="true">{initials(person.name)}</span>
          )}
        </div>
        <div className="person-copy">
          <p className="eyebrow">{person.known_for_department || "Cast & direction"}</p>
          <h1 id="person-name">{person.name}</h1>
          <p className="person-born">{born}</p>
          <section className="person-biography" aria-labelledby="biography-title">
            <h2 id="biography-title">Biography</h2>
            <p>{person.biography}</p>
          </section>
        </div>
      </section>

      <section className="person-known-for" aria-labelledby="known-for-title">
        <header className="section-heading">
          <div>
            <p className="eyebrow">Filmography</p>
            <h2 id="known-for-title">Known For</h2>
          </div>
        </header>
        {person.known_for.length ? (
          <MovieGrid movies={person.known_for} />
        ) : (
          <p className="person-empty">No credited films are available yet.</p>
        )}
      </section>
    </main>
  );
}
