import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </IconBase>
);

export const HomeIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m3 11 9-8 9 8" />
    <path d="M5 10v10h14V10M9 20v-6h6v6" />
  </IconBase>
);

export const CompassIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z" />
  </IconBase>
);

export const GridIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </IconBase>
);

export const SettingsIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
  </IconBase>
);

export const ArrowLeftIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m15 18-6-6 6-6" />
  </IconBase>
);

export const ArrowRightIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m9 18 6-6-6-6" />
  </IconBase>
);

export const PlayIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M7.6 4.8c0-1.1 1.2-1.8 2.2-1.2l9.3 6c.9.6.9 2 0 2.6l-9.3 6c-1 .6-2.2-.1-2.2-1.2V4.8Z" />
  </svg>
);

export const StarIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="m12 2.6 2.82 5.72 6.31.92-4.56 4.45 1.08 6.28L12 17l-5.65 2.97 1.08-6.28-4.56-4.45 6.31-.92L12 2.6Z" />
  </svg>
);

export const InfoIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </IconBase>
);

export const CloseIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </IconBase>
);

export const TrashIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" />
  </IconBase>
);

export const HistoryIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 5v4h4" />
    <path d="M12 7v5l3 2" />
  </IconBase>
);

export const BookmarkIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V21l-6-3.7L6 21V4.5Z" />
  </IconBase>
);

export const ChevronDownIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m6 9 6 6 6-6" />
  </IconBase>
);

export const BackIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m15 18-6-6 6-6" />
    <path d="M9 12h11" />
  </IconBase>
);

export const FullscreenIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" />
  </IconBase>
);

export const MinimizeIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M8 8H3V3M16 8h5V3M21 16h-5v5M3 16h5v5" />
  </IconBase>
);

export const PauseIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

export const VolumeIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M5 9H2v6h3l5 4V5L5 9Z" />
    <path d="M14 9a4 4 0 0 1 0 6M17 6a8 8 0 0 1 0 12" />
  </IconBase>
);

export const MutedIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M5 9H2v6h3l5 4V5L5 9Z" />
    <path d="m15 9 6 6M21 9l-6 6" />
  </IconBase>
);

export const RewindIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M9 7 4 12l5 5" />
    <path d="M5 12h8a6 6 0 1 1-5.2 9" />
    <text x="12.6" y="15.5" fill="currentColor" stroke="none" fontSize="7" fontWeight="700">10</text>
  </IconBase>
);

export const ForwardIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m15 7 5 5-5 5" />
    <path d="M19 12h-8a6 6 0 1 0 5.2 9" />
    <text x="4.4" y="15.5" fill="currentColor" stroke="none" fontSize="7" fontWeight="700">10</text>
  </IconBase>
);

export const CaptionsIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="2.5" y="5" width="19" height="14" rx="2" />
    <path d="M10 10a3 3 0 1 0 0 4M18 10a3 3 0 1 0 0 4" />
  </IconBase>
);

export const PictureInPictureIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="2.5" y="4" width="19" height="16" rx="2" />
    <rect x="12" y="11" width="7" height="6" rx="1" />
  </IconBase>
);
