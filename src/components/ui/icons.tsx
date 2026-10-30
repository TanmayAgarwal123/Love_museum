type P = { className?: string; size?: number };

const base = (size = 18) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const HeartFill = ({ className, size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
    <path fill="currentColor" d="M12 21.4S2.3 15.5 2.3 8.7C2.3 5.6 4.7 3.4 7.5 3.4c1.9 0 3.6 1 4.5 2.7.9-1.7 2.6-2.7 4.5-2.7 2.8 0 5.2 2.2 5.2 5.3 0 6.8-9.7 12.7-9.7 12.7z" />
  </svg>
);
export const Play = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none" /></svg>
);
export const Pause = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M8 5v14M16 5v14" strokeWidth={3} /></svg>
);
export const Music = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg>
);
export const MapIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" /></svg>
);
export const Grid = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
);
export const Share = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M12 15V3M7 8l5-5 5 5M5 13v7h14v-7" /></svg>
);
export const Close = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const Eye = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const Volume = ({ className, size, muted }: P & { muted?: boolean }) => (
  <svg {...base(size)} className={className}>
    <path d="M4 9v6h4l5 4V5L8 9H4z" />
    {muted ? <path d="M17 9l5 6M22 9l-5 6" /> : <path d="M17 8.5a5 5 0 010 7M19.5 6a8.5 8.5 0 010 12" />}
  </svg>
);
export const ArrowLeft = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M15 18l-6-6 6-6" /></svg>
);
export const ArrowRight = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M9 18l6-6-6-6" /></svg>
);
export const Download = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
);
export const Copy = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><rect x="9" y="9" width="11" height="11" rx="1.5" /><path d="M5 15V5a1 1 0 011-1h9" /></svg>
);
export const Help = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 015 .3c0 1.7-2.5 2-2.5 3.7M12 17h.01" /></svg>
);
