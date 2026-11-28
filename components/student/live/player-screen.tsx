import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { poppins } from "@/components/dragon/dragon-base-theme";
import "@/components/dragon/dragon-base.css";
import { cn } from "@/lib/utils";

/** Full-screen layer of the live room (covers the app shell, safe-area aware); `bgUrl` is the optional faint backdrop. */
export function PlayerScreen({ children, bgUrl, className }: { children: ReactNode; bgUrl?: string | null; className?: string }) {
  return createPortal(
    <div
      className={cn(
        "dragon-base db-world fixed inset-0 z-[100] flex w-full max-w-full flex-col overflow-x-hidden overflow-y-auto",
        "pt-[calc(env(safe-area-inset-top,0px)+12px)] pr-[calc(env(safe-area-inset-right,0px)+16px)] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pl-[calc(env(safe-area-inset-left,0px)+16px)]",
        poppins.variable,
        className,
      )}
    >
      {bgUrl && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url(${bgUrl})` }}
        >
          <div className="absolute inset-0 bg-[#061416]/75 backdrop-blur-[1px]" />
        </div>
      )}
      {children}
    </div>,
    document.body,
  );
}
