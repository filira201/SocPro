import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";

import { useDebouncedValue } from "@/shared/lib/react/use-debounced-value";

const DEBOUNCE_MS = 400;
const MAX_Q = 200;

function parseQFromSearchParams(searchParams: URLSearchParams): string {
  const raw = searchParams.get("q") ?? "";

  return raw.trim().slice(0, MAX_Q);
}

export function useFollowListSearchUrl() {
  const [searchParams, setSearchParams] = useSearchParams();
  const qFromUrl = useMemo(
    () => parseQFromSearchParams(searchParams),
    [searchParams]
  );

  const [queryInput, setQueryInput] = useState(qFromUrl);
  const skipNextUrlToInputSync = useRef(false);

  useEffect(() => {
    if (skipNextUrlToInputSync.current) {
      skipNextUrlToInputSync.current = false;

      return;
    }

    setQueryInput(qFromUrl);
  }, [qFromUrl]);

  const debouncedQuery = useDebouncedValue(queryInput, DEBOUNCE_MS);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    const currentQ = qFromUrl;

    if (trimmed === currentQ) {
      return;
    }

    skipNextUrlToInputSync.current = true;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);

        if (trimmed) {
          next.set("q", trimmed);
        } else {
          next.delete("q");
        }

        return next;
      },
      { replace: true }
    );
  }, [debouncedQuery, qFromUrl, setSearchParams]);

  const listResetKey = useMemo(() => qFromUrl, [qFromUrl]);

  return {
    qFromUrl,
    queryInput,
    setQueryInput,
    listResetKey,
  };
}
