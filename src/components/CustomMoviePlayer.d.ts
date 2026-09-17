declare module "@/components/CustomMoviePlayer" {
  import type { ComponentType } from "react";

  const CustomMoviePlayer: ComponentType<{
    tmdbId: string | number;
    imdbId?: string | number;
    mediaType?: "movie" | "tv";
    seasonNumber?: number;
    episodeNumber?: number;
    resumeAt?: number;
    onProgress?: (currentTime: number, duration: number) => void;
    title?: string;
    overview?: string;
    releaseYear?: string;
    runtimeMinutes?: number;
    rating?: number;
    backdropUrl?: string;
    posterUrl?: string;
    logoUrl?: string;
    logoWidth?: number;
    logoHeight?: number;
  }>;

  export default CustomMoviePlayer;
}

