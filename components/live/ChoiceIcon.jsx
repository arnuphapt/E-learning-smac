"use client";

export function ChoiceIcon({ shape, className = "w-6 h-6" }) {
  switch (shape) {
    case "triangle":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={className}
          aria-hidden="true"
        >
          <path d="M12 3L2 21h20L12 3z" />
        </svg>
      );
    case "diamond":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={className}
          aria-hidden="true"
        >
          <path d="M12 2L2 12l10 10 10-10L12 2z" />
        </svg>
      );
    case "circle":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={className}
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case "square":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={className}
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      );
    default:
      return null;
  }
}
