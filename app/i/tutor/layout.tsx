import type { ReactNode } from "react";

// Everything under /i/tutor wears the tutor identity (see .tutor in globals.css).
export default function TutorLayout({ children }: { children: ReactNode }) {
  return <div className="tutor">{children}</div>;
}
