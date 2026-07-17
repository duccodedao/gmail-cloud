import { logError } from "../lib/firebase";

/**
 * Hook or helper to intercept global errors
 */
export function initGlobalErrorLogging() {
  if (typeof window !== "undefined") {
    window.onerror = (message, source, lineno, colno, error) => {
      logError(error || message, "client_global", { source, lineno, colno });
    };

    window.onunhandledrejection = (event) => {
      logError(event.reason, "client_unhandled_rejection");
    };
  }
}

export { logError };
