import Image from "next/image";
import Link from "next/link";
import { imageUrl } from "@/lib/tmdb";
import type { PersonCredit } from "@/lib/types";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Person({ person, role }: { person: PersonCredit; role: string }) {
  const portrait = person.profile_url ?? (person.profile_path ? imageUrl(person.profile_path, "w342") : null);

  return (
    <Link className="credit-person" href={`/person/?id=${person.id}`} aria-label={`Open profile for ${person.name}`}>
      <div className="credit-portrait">
        {portrait ? (
          <Image
            src={portrait}
            alt={person.name}
            fill
            sizes="96px"
          />
        ) : (
          <span aria-hidden="true">{initials(person.name)}</span>
        )}
      </div>
      <div>
        <h3>{person.name}</h3>
        <p>{role}</p>
      </div>
    </Link>
  );
}

export function Credits({
  cast,
  directors,
  heading = "Cast & Direction",
  primaryLabel,
  primaryRole = "Director",
}: {
  cast: PersonCredit[];
  directors: PersonCredit[];
  heading?: string;
  primaryLabel?: string;
  primaryRole?: string;
}) {
  if (!cast.length && !directors.length) return null;

  return (
    <section className="credits-section" aria-labelledby="credits-title">
      <header className="credits-heading">
        <p className="eyebrow">Behind the frame</p>
        <h2 id="credits-title">{heading}</h2>
      </header>
      <div className="credits-layout">
        {directors.length ? (
          <div className="credit-group credit-directors">
            <p className="credit-label">
              {primaryLabel ?? (directors.length === 1 ? "Director" : "Directors")}
            </p>
            <div className="credit-people">
              {directors.map((director) => (
                <Person key={`director-${director.id}-${director.name}`} person={director} role={primaryRole} />
              ))}
            </div>
          </div>
        ) : null}
        {cast.length ? (
          <div className="credit-group">
            <p className="credit-label">Principal cast</p>
            <div className="credit-people credit-cast">
              {cast.map((actor) => (
                <Person
                  key={`cast-${actor.id}-${actor.name}`}
                  person={actor}
                  role={actor.character ? `as ${actor.character}` : "Cast"}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
