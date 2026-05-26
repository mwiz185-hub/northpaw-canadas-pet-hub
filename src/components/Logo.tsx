export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="NorthPaw">
      {/* paw pad */}
      <ellipse cx="32" cy="42" rx="14" ry="11" fill="currentColor" />
      {/* toes */}
      <ellipse cx="18" cy="28" rx="5" ry="7" fill="currentColor" />
      <ellipse cx="28" cy="20" rx="5" ry="7" fill="currentColor" />
      <ellipse cx="40" cy="20" rx="5" ry="7" fill="currentColor" />
      <ellipse cx="50" cy="28" rx="5" ry="7" fill="currentColor" />
      {/* maple leaf accent */}
      <path
        d="M32 36l1.6 3.4 3.7-.6-2.4 2.9 2.4 2.9-3.7-.6L32 47.4l-1.6-3.4-3.7.6 2.4-2.9-2.4-2.9 3.7.6L32 36z"
        fill="white"
      />
    </svg>
  );
}
