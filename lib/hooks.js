import { useState, useEffect } from "react";

/**
 * Custom React Hook to detect if the viewport is mobile or tablet size (<= 1024px).
 * SSR-safe: Defaults to false on the server side to avoid hydration mismatch.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(max-width: 1024px)");
    
    // Set initial value on mount
    setIsMobile(media.matches);

    const listener = (e) => {
      setIsMobile(e.matches);
    };

    // Support both modern addEventListener and legacy addListener
    if (media.addEventListener) {
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    } else {
      media.addListener(listener);
      return () => media.removeListener(listener);
    }
  }, []);

  return isMobile;
}
