import { useState, useEffect, useCallback, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * Custom React Hook to detect if the viewport is mobile or tablet size (<= 1024px).
 * SSR-safe: Defaults to false on the server side to avoid hydration mismatch.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(max-width: 1024px)");

    // Set initial value on mount
    setIsMobile(media.matches);

    const listener = (e: MediaQueryListEvent) => {
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

export interface LiveSessionState extends Record<string, unknown> {
  id: string;
  title: string;
  pin?: string;
  phase: string;
  total: number;
  current_index: number;
  team_mode: boolean;
  restrict_to_course: boolean;
  me: {
    userId: string;
    isHost: boolean;
    [key: string]: unknown;
  };
}

export type LiveSessionError = Error & { status?: number };

export interface UseLiveSessionOptions {
  isHost?: boolean;
}

export interface UseLiveSessionResult {
  state: LiveSessionState | null;
  error: LiveSessionError | null;
  refresh: () => Promise<LiveSessionState | null>;
}

/**
 * Hook to manage live quiz session state with Supabase Realtime signals.
 * Subscribes to postgres_changes on live_sessions and (for host) live_players,
 * using realtime events as signals to refetch GET /api/live/[id]/state.
 */
export function useLiveSession(
  id: string | string[] | null | undefined,
  { isHost = false }: UseLiveSessionOptions = {}
): UseLiveSessionResult {
  const [state, setState] = useState<LiveSessionState | null>(null);
  const [error, setError] = useState<LiveSessionError | null>(null);
  const requestSeqRef = useRef(0);
  const appliedSeqRef = useRef(0);
  const subscribeRef = useRef<(() => void) | null>(null);

  const fetchState = useCallback(async (): Promise<LiveSessionState | null> => {
    if (!id) return null;
    const requestSeq = ++requestSeqRef.current;
    try {
      const res = await fetch(`/api/live/${id}/state`, { cache: "no-store" });
      if (!res.ok) {
        const errJson: unknown = await res.json().catch(() => ({}));
        const errMsg =
          typeof errJson === "object" &&
          errJson !== null &&
          "error" in errJson &&
          typeof (errJson as { error: unknown }).error === "string"
            ? (errJson as { error: string }).error
            : `HTTP ${res.status}`;
        const err: LiveSessionError = new Error(errMsg);
        err.status = res.status;
        if (requestSeq < appliedSeqRef.current) return null;
        appliedSeqRef.current = requestSeq;
        setError(err);
        return null;
      }
      const data = (await res.json()) as LiveSessionState;
      if (requestSeq < appliedSeqRef.current) return null;
      appliedSeqRef.current = requestSeq;
      setState(data);
      setError(null);
      subscribeRef.current?.();
      return data;
    } catch (e) {
      if (requestSeq < appliedSeqRef.current) return null;
      appliedSeqRef.current = requestSeq;
      setError(e instanceof Error ? e : new Error(String(e)));
      return null;
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    let active = true;
    let channel: RealtimeChannel | null = null;
    let signalTimer: ReturnType<typeof setTimeout> | null = null;
    let lastSignalFetch = Date.now();

    // Keep a trailing refetch during bursts without starving a continuous stream.
    const scheduleRefetch = () => {
      if (!active || signalTimer !== null) return;
      const delay = Math.max(0, 200 - (Date.now() - lastSignalFetch));
      signalTimer = setTimeout(() => {
        signalTimer = null;
        if (!active) return;
        lastSignalFetch = Date.now();
        fetchState();
      }, delay);
    };

    // Subscribe on the first successful fetch, including manual retries.
    // (RLS on live_sessions requires host_id = me or membership in live_players)
    subscribeRef.current = () => {
      if (!active || channel) return;

      let announced = false;
      const ch = supabase.channel(`public:live_session_${id}`);
      ch.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_sessions",
          filter: `id=eq.${id}`,
        },
        scheduleRefetch
      );
      ch.on(
        "broadcast",
        {
          event: "players-changed",
        },
        scheduleRefetch
      );

      if (isHost) {
        ch.on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "live_players",
            filter: `session_id=eq.${id}`,
          },
          scheduleRefetch
        );
        ch.on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "live_players",
            filter: `session_id=eq.${id}`,
          },
          scheduleRefetch
        );
        ch.on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "live_answers",
            filter: `session_id=eq.${id}`,
          },
          scheduleRefetch
        );
      }

      channel = ch;
      ch.subscribe((status) => {
        if (!active || status !== "SUBSCRIBED") return;
        fetchState();
        if (!isHost && !announced) {
          announced = true;
          ch.send({
            type: "broadcast",
            event: "players-changed",
            payload: {},
          });
        }
      });
    };

    fetchState();

    return () => {
      active = false;
      subscribeRef.current = null;
      if (signalTimer !== null) clearTimeout(signalTimer);
      // Invalidate responses from this subscription after an id change/unmount.
      appliedSeqRef.current = ++requestSeqRef.current;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [id, isHost, fetchState]);

  return { state, error, refresh: fetchState };
}
