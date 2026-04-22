import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

type RealtimeMessage = { type: "invalidate"; method: string; path: string; ts: number };

const isApiQueryKey = (queryKey: unknown) =>
  Array.isArray(queryKey) &&
  typeof queryKey[0] === "string" &&
  (queryKey[0] as string).startsWith("/api");

export function RealtimeInvalidation() {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  const flushTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const flush = () => {
      flushTimerRef.current = null;
      queryClient.invalidateQueries({
        predicate: (q) => isApiQueryKey(q.queryKey),
      });
      queryClient.refetchQueries({
        type: "active",
        predicate: (q) => isApiQueryKey(q.queryKey),
      });
    };

    const scheduleFlush = () => {
      if (flushTimerRef.current !== null) return;
      flushTimerRef.current = window.setTimeout(flush, 75);
    };

    const es = new EventSource("/api/realtime/stream");
    esRef.current = es;

    const onInvalidate = (evt: MessageEvent) => {
      try {
        const msg = JSON.parse(String(evt.data)) as RealtimeMessage;
        if (msg?.type === "invalidate") {
          scheduleFlush();
        }
      } catch {
        scheduleFlush();
      }
    };

    es.addEventListener("invalidate", onInvalidate as any);

    return () => {
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      esRef.current?.close();
    };
  }, [queryClient]);

  return null;
}
