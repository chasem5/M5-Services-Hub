export function BuildOpsIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 33.34 33.83"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="BuildOps"
    >
      <path d="M0 6.67V0L16.67 7.78L33.33 0V6.67L16.66 14.44L0 6.67Z" fill="#00AF66" />
      <path d="M0 16.06V9.39L16.67 17.17L33.34 9.39V16.06L16.67 23.84L0 16.06Z" fill="#00AF66" />
      <path d="M0 25.56V18.89L16.67 26.67L33.34 18.89V25.56L16.67 33.33L0 25.56Z" fill="#00AF66" />
    </svg>
  );
}
