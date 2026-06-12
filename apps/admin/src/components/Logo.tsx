/** Sanad mark: a tow hook curling out of a road chevron. Hand-drawn SVG. */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="Sanad">
      <rect x="1" y="1" width="30" height="30" rx="4" fill="#FFB400" />
      <path
        d="M7 22 L14 15 L7 8"
        stroke="#0A0D11"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 8 v8 a4.5 4.5 0 0 1 -9 0 v-1"
        stroke="#0A0D11"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="24" cy="6.5" r="1.8" fill="#0A0D11" />
    </svg>
  );
}
