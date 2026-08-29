declare module "@/components/CustomMoviePlayer" {
  import type { ComponentType } from "react";

  const CustomMoviePlayer: ComponentType<{
    tmdbId: string | number;
    mediaType?: "movie" | "tv";
    seasonNumber?: number;
    episodeNumber?: number;
    resumeAt?: number;
    onProgress?: (currentTime: number, duration: number) => void;
  }>;

  export default CustomMoviePlayer;
}
