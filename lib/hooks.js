import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

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

/**
 * Hook to manage live quiz session state with Supabase Realtime signals.
 * Subscribes to postgres_changes on live_sessions and (for host) live_players,
 * using realtime events as signals to refetch GET /api/live/[id]/state.
 */
export function useLiveSession(id, { isHost = false } = {}) {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const requestSeqRef = useRef(0);
  const appliedSeqRef = useRef(0);
  const subscribeRef = useRef(null);

  const fetchState = useCallback(async () => {
    if (!id) return null;
    const requestSeq = ++requestSeqRef.current;
    try {
      const res = await fetch(`/api/live/${id}/state`, { cache: "no-store" });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const err = new Error(errJson.error || `HTTP ${res.status}`);
        err.status = res.status;
        if (requestSeq < appliedSeqRef.current) return null;
        appliedSeqRef.current = requestSeq;
        setError(err);
        return null;
      }
      const data = await res.json();
      if (requestSeq < appliedSeqRef.current) return null;
      appliedSeqRef.current = requestSeq;
      setState(data);
      setError(null);
      subscribeRef.current?.();
      return data;
    } catch (e) {
      if (requestSeq < appliedSeqRef.current) return null;
      appliedSeqRef.current = requestSeq;
      setError(e);
      return null;
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    let active = true;
    let channel = null;
    let signalTimer = null;
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
      clearTimeout(signalTimer);
      // Invalidate responses from this subscription after an id change/unmount.
      appliedSeqRef.current = ++requestSeqRef.current;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [id, isHost, fetchState]);

  return { state, error, refresh: fetchState };
}

