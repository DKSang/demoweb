import { useState, useEffect } from "react";

/**
 * Custom hook to poll Ollama health status endpoint.
 * Returns the connection status and available models.
 */
export function useOllamaHealth(pollIntervalMs = 10000) {
  const [isOllamaOnline, setIsOllamaOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const checkOllamaHealth = async () => {
      try {
        const res = await fetch("/api/ollama/health");
        if (res.ok) {
          const data = await res.json();
          setIsOllamaOnline(data.status === "ok");
        } else {
          setIsOllamaOnline(false);
        }
      } catch (err) {
        setIsOllamaOnline(false);
      }
    };
    checkOllamaHealth();
    const interval = setInterval(checkOllamaHealth, pollIntervalMs);
    return () => clearInterval(interval);
  }, [pollIntervalMs]);

  return { isOllamaOnline };
}
