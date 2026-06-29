import { useState, useEffect } from "react";

/**
 * Custom hook to poll OpenRouter health status endpoint.
 * Returns the connection status and available models.
 */
export function useOpenRouterHealth(pollIntervalMs = 10000) {
  const [isOpenRouterOnline, setIsOpenRouterOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const checkOpenRouterHealth = async () => {
      try {
        const res = await fetch("/api/openrouter/health");
        if (res.ok) {
          const data = await res.json();
          setIsOpenRouterOnline(data.status === "ok");
        } else {
          setIsOpenRouterOnline(false);
        }
      } catch (err) {
        setIsOpenRouterOnline(false);
      }
    };
    checkOpenRouterHealth();
    const interval = setInterval(checkOpenRouterHealth, pollIntervalMs);
    return () => clearInterval(interval);
  }, [pollIntervalMs]);

  return { isOpenRouterOnline };
}
