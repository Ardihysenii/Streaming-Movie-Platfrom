import type { Movie, PersonCredit } from "./types";

const overview = {
  dune2:
    "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
  oppenheimer:
    "The story of J. Robert Oppenheimer and the world-changing project that forced him to confront the consequences of invention.",
  interstellar:
    "Explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
  batman:
    "A masked vigilante follows a trail of cryptic clues into Gotham's underworld and uncovers corruption connected to his own family.",
  wick:
    "John Wick uncovers a path to defeating the High Table, but first faces a new enemy with powerful alliances.",
  maverick:
    "After decades as a naval aviator, Maverick trains an elite group of graduates for a mission that demands the ultimate sacrifice.",
  spiderverse:
    "Miles Morales is launched across the multiverse, where he encounters a team charged with protecting its very existence.",
  bladerunner:
    "A young blade runner unearths a long-buried secret that leads him to track down a former officer missing for thirty years.",
  dune:
    "A gifted young man must travel to the most dangerous planet in the universe to ensure the future of his family and people.",
  fightclub:
    "A disillusioned office worker and a charismatic soap maker form an underground club that grows into something far more dangerous.",
};

export const FALLBACK_MOVIES: Movie[] = [
  {
    id: 693134,
    title: "Dune: Part Two",
    overview: overview.dune2,
    poster_path: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    backdrop_path: "/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    release_date: "2024-02-27",
    vote_average: 8.2,
    genre_ids: [878, 12],
  },
  {
    id: 872585,
    title: "Oppenheimer",
    overview: overview.oppenheimer,
    poster_path: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    backdrop_path: "/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
    release_date: "2023-07-19",
    vote_average: 8.1,
    genre_ids: [18, 36],
  },
  {
    id: 157336,
    title: "Interstellar",
    overview: overview.interstellar,
    poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdrop_path: "/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
    release_date: "2014-11-05",
    vote_average: 8.5,
    genre_ids: [12, 18, 878],
  },
  {
    id: 414906,
    title: "The Batman",
    overview: overview.batman,
    poster_path: "/74xTEgt7R36Fpooo50r9T25onhq.jpg",
    backdrop_path: "/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg",
    release_date: "2022-03-01",
    vote_average: 7.7,
    genre_ids: [80, 9648, 53],
  },
  {
    id: 603692,
    title: "John Wick: Chapter 4",
    overview: overview.wick,
    poster_path: "/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg",
    backdrop_path: "/i8dshLvq4LE3s0v8PrkDdUyb1ae.jpg",
    release_date: "2023-03-22",
    vote_average: 7.7,
    genre_ids: [28, 53, 80],
  },
  {
    id: 361743,
    title: "Top Gun: Maverick",
    overview: overview.maverick,
    poster_path: "/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
    backdrop_path: "/AaV1YIdWKnjAIAOe8UUKBFm327v.jpg",
    release_date: "2022-05-24",
    vote_average: 8.2,
    genre_ids: [28, 18],
  },
  {
    id: 569094,
    title: "Spider-Man: Across the Spider-Verse",
    overview: overview.spiderverse,
    poster_path: "/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    backdrop_path: "/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg",
    release_date: "2023-05-31",
    vote_average: 8.4,
    genre_ids: [16, 28, 12],
  },
  {
    id: 335984,
    title: "Blade Runner 2049",
    overview: overview.bladerunner,
    poster_path: "/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
    backdrop_path: "/ilRyazdMJwN05exqhwK4tMKBYZs.jpg",
    release_date: "2017-10-04",
    vote_average: 7.6,
    genre_ids: [878, 18],
  },
  {
    id: 438631,
    title: "Dune",
    overview: overview.dune,
    poster_path: "/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
    backdrop_path: "/jYEW5xZkZk2WTrdbMGAPFuBqbDc.jpg",
    release_date: "2021-09-15",
    vote_average: 7.8,
    genre_ids: [878, 12],
  },
  {
    id: 550,
    title: "Fight Club",
    overview: overview.fightclub,
    poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    backdrop_path: "/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
    release_date: "1999-10-15",
    vote_average: 8.4,
    genre_ids: [18],
  },
];

type FallbackCredits = {
  cast: PersonCredit[];
  directors: PersonCredit[];
};

const person = (id: number, name: string, character?: string): PersonCredit => ({
  id,
  name,
  character,
  profile_path: null,
});

export const FALLBACK_CREDITS: Record<number, FallbackCredits> = {
  693134: {
    directors: [person(1, "Denis Villeneuve")],
    cast: [
      person(2, "Timothée Chalamet", "Paul Atreides"),
      person(3, "Zendaya", "Chani"),
      person(4, "Rebecca Ferguson", "Lady Jessica"),
      person(5, "Javier Bardem", "Stilgar"),
      person(6, "Josh Brolin", "Gurney Halleck"),
    ],
  },
  872585: {
    directors: [person(7, "Christopher Nolan")],
    cast: [
      person(8, "Cillian Murphy", "J. Robert Oppenheimer"),
      person(9, "Emily Blunt", "Kitty Oppenheimer"),
      person(10, "Matt Damon", "Leslie Groves"),
      person(11, "Robert Downey Jr.", "Lewis Strauss"),
      person(12, "Florence Pugh", "Jean Tatlock"),
    ],
  },
  157336: {
    directors: [person(13, "Christopher Nolan")],
    cast: [
      person(14, "Matthew McConaughey", "Cooper"),
      person(15, "Anne Hathaway", "Brand"),
      person(16, "Jessica Chastain", "Murph"),
      person(17, "Michael Caine", "Professor Brand"),
      person(18, "Mackenzie Foy", "Young Murph"),
    ],
  },
  414906: {
    directors: [person(19, "Matt Reeves")],
    cast: [
      person(20, "Robert Pattinson", "Bruce Wayne / Batman"),
      person(21, "Zoë Kravitz", "Selina Kyle"),
      person(22, "Paul Dano", "The Riddler"),
      person(23, "Jeffrey Wright", "James Gordon"),
      person(24, "Colin Farrell", "The Penguin"),
    ],
  },
  603692: {
    directors: [person(25, "Chad Stahelski")],
    cast: [
      person(26, "Keanu Reeves", "John Wick"),
      person(27, "Donnie Yen", "Caine"),
      person(28, "Bill Skarsgård", "Marquis"),
      person(29, "Laurence Fishburne", "Bowery King"),
      person(30, "Hiroyuki Sanada", "Shimazu"),
    ],
  },
  361743: {
    directors: [person(31, "Joseph Kosinski")],
    cast: [
      person(32, "Tom Cruise", "Maverick"),
      person(33, "Miles Teller", "Rooster"),
      person(34, "Jennifer Connelly", "Penny Benjamin"),
      person(35, "Jon Hamm", "Cyclone"),
      person(36, "Glen Powell", "Hangman"),
    ],
  },
  569094: {
    directors: [
      person(37, "Joaquim Dos Santos"),
      person(38, "Kemp Powers"),
      person(39, "Justin K. Thompson"),
    ],
    cast: [
      person(40, "Shameik Moore", "Miles Morales"),
      person(41, "Hailee Steinfeld", "Gwen Stacy"),
      person(42, "Brian Tyree Henry", "Jeff Morales"),
      person(43, "Luna Lauren Vélez", "Rio Morales"),
      person(44, "Jake Johnson", "Peter B. Parker"),
    ],
  },
  335984: {
    directors: [person(45, "Denis Villeneuve")],
    cast: [
      person(46, "Ryan Gosling", "K"),
      person(47, "Harrison Ford", "Rick Deckard"),
      person(48, "Ana de Armas", "Joi"),
      person(49, "Sylvia Hoeks", "Luv"),
      person(50, "Robin Wright", "Lieutenant Joshi"),
    ],
  },
  438631: {
    directors: [person(51, "Denis Villeneuve")],
    cast: [
      person(52, "Timothée Chalamet", "Paul Atreides"),
      person(53, "Rebecca Ferguson", "Lady Jessica"),
      person(54, "Oscar Isaac", "Duke Leto Atreides"),
      person(55, "Josh Brolin", "Gurney Halleck"),
      person(56, "Zendaya", "Chani"),
    ],
  },
  550: {
    directors: [person(57, "David Fincher")],
    cast: [
      person(58, "Edward Norton", "The Narrator"),
      person(59, "Brad Pitt", "Tyler Durden"),
      person(60, "Helena Bonham Carter", "Marla Singer"),
      person(61, "Meat Loaf", "Robert Paulson"),
      person(62, "Jared Leto", "Angel Face"),
    ],
  },
};

export const FALLBACK_GENRES = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 18, name: "Drama" },
  { id: 27, name: "Horror" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Science Fiction" },
  { id: 53, name: "Thriller" },
];
