import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 22, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconCamera = (p: P) => (
  <Base {...p}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
    <circle cx="12" cy="13" r="3.5" />
  </Base>
);
export const IconPaperclip = (p: P) => (
  <Base {...p}>
    <path d="m20 11.5-7.8 7.8a5 5 0 0 1-7-7L13 4.5a3.3 3.3 0 0 1 4.7 4.7l-7.8 7.8a1.7 1.7 0 0 1-2.4-2.4l7.1-7.1" />
  </Base>
);
export const IconSend = (p: P) => (
  <Base {...p}>
    <path d="M12 19V5" />
    <path d="m6 11 6-6 6 6" />
  </Base>
);
export const IconClose = (p: P) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Base>
);
export const IconSidebar = (p: P) => (
  <Base {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <path d="M9.5 4.5v15" />
  </Base>
);
export const IconCompose = (p: P) => (
  <Base {...p}>
    <path d="M12 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V12" />
    <path d="M17.6 3.9a1.8 1.8 0 0 1 2.5 2.5L12 14.5l-3.2.7.7-3.2z" />
  </Base>
);
export const IconTrash = (p: P) => (
  <Base {...p}>
    <path d="M4.5 7h15M10 11v6M14 11v6M6.5 7l.8 11.2a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8L17.5 7M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
  </Base>
);
export const IconUser = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 19.5a7 7 0 0 1 14 0" />
  </Base>
);
export const IconArrowRight = (p: P) => (
  <Base {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Base>
);
export const IconChevronLeft = (p: P) => (
  <Base {...p}>
    <path d="m14.5 6-6 6 6 6" />
  </Base>
);
export const IconPan = (p: P) => (
  <Base {...p}>
    <path d="M3.5 11h13a0 0 0 0 1 0 0 6.5 6.5 0 0 1-13 0 0 0 0 0 1 0 0z" />
    <path d="M16.5 12.5h4M8 7.5c0-1 1-1.5 1-2.5M11.5 7.5c0-1 1-1.5 1-2.5" />
  </Base>
);
export const IconSparkle = (p: P) => (
  <Base {...p}>
    <path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.8 6.8l2.1 2.1M15.1 15.1l2.1 2.1M6.8 17.2l2.1-2.1M15.1 8.9l2.1-2.1" />
  </Base>
);
export const IconShirt = (p: P) => (
  <Base {...p}>
    <path d="M9 4.5 4 7l1.5 4L7.5 10v9.5h9V10l2 1L20 7l-5-2.5a3 3 0 0 1-6 0z" />
  </Base>
);
export const IconWrench = (p: P) => (
  <Base {...p}>
    <path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5a4 4 0 0 1-2-2z" />
    <path d="M14.5 6.5 17 4" />
  </Base>
);
export const IconShield = (p: P) => (
  <Base {...p}>
    <path d="M12 3.5 5 6v5.5c0 4.2 3 7.4 7 9 4-1.6 7-4.8 7-9V6z" />
  </Base>
);
export const IconAlert = (p: P) => (
  <Base {...p}>
    <path d="M12 4 3 19.5h18z" />
    <path d="M12 10v4M12 17h.01" />
  </Base>
);
export const IconPhone = (p: P) => (
  <Base {...p}>
    <path d="M5 4.5h3l1.5 4-2 1.3a10 10 0 0 0 6.7 6.7l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 3 6.7 2 2 0 0 1 5 4.5z" />
  </Base>
);
export const IconMic = (p: P) => (
  <Base {...p}>
    <rect x="9" y="3.5" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
  </Base>
);
export const IconMicOff = (p: P) => (
  <Base {...p}>
    <path d="M15 10V6.5a3 3 0 0 0-5.8-1M9 9v2.5a3 3 0 0 0 4.6 2.5M5.5 11a6.5 6.5 0 0 0 10.3 5.3M18.5 11a6.4 6.4 0 0 1-.6 2.7M12 17.5V21M4 4l16 16" />
  </Base>
);
