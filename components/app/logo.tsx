export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`logo ${light ? "light" : ""}`}>
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden>
        <defs><linearGradient id={light ? "lg-l" : "lg-d"} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7c6cff" /><stop offset="1" stopColor="#22d3ee" /></linearGradient></defs>
        <path d="M9.5 24a6.5 6.5 0 0 1-.9-12.94A8 8 0 0 1 24 11.6 6.2 6.2 0 0 1 23 24H9.5Z" fill={`url(#${light ? "lg-l" : "lg-d"})`} />
        <path d="M12 19.5c1.2-1.6 2.6-2.4 4-2.4s2.8.8 4 2.4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity=".9" />
      </svg>
      <b>MEGHAM</b>
    </span>
  );
}
