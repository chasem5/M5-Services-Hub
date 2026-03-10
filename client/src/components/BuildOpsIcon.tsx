export function BuildOpsIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="BuildOps"
    >
      <rect width="24" height="24" rx="5" fill="#F97316" />
      <path
        d="M7 6h5.5C14.4 6 16 7.6 16 9.5c0 1-.4 1.9-1.1 2.5.9.6 1.6 1.6 1.6 2.8C16.5 17 14.8 18 12.5 18H7V6zm2.2 5h3c.9 0 1.6-.6 1.6-1.5S13.1 8 12.2 8H9.2v3zm0 5h3.3c1 0 1.8-.7 1.8-1.7S13.5 13 12.5 13H9.2v3z"
        fill="white"
      />
    </svg>
  );
}
