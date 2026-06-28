import { trackEvent } from "@/lib/supabase/db";

type LogLevel = "info" | "warning" | "error";

const LOCAL_ERROR_KEY = "givit-monitoring-errors";
const LOCAL_EVENT_KEY = "givit-analytics-events";

export type MonitoringEntry = {
  id: string;
  level: LogLevel;
  message: string;
  source?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function appendLocal<T>(key: string, entry: T, limit = 250) {
  try {
    const entries = readLocal<T[]>(key, []);
    window.localStorage.setItem(key, JSON.stringify([entry, ...entries].slice(0, limit)));
  } catch {
    // Keep monitoring non-blocking.
  }
}

export function getLocalErrors() {
  return readLocal<MonitoringEntry[]>(LOCAL_ERROR_KEY, []);
}

export function getLocalEvents() {
  return readLocal<Array<{ id: string; eventType: string; metadata?: Record<string, unknown>; createdAt: string }>>(LOCAL_EVENT_KEY, []);
}

export function logError(error: unknown, source?: string, metadata?: Record<string, unknown>) {
  const normalized = error instanceof Error ? error : new Error(String(error));
  const entry: MonitoringEntry = {
    id: crypto.randomUUID(),
    level: "error",
    message: normalized.message,
    source,
    stack: normalized.stack,
    metadata,
    createdAt: new Date().toISOString(),
  };
  appendLocal(LOCAL_ERROR_KEY, entry);
  void trackEvent("client_error", { source, message: entry.message, stack: entry.stack, ...metadata }).catch(() => undefined);
  console.error(`[Givit monitoring] ${source ?? "unknown"}:`, normalized, metadata);
}

export function trackUserEvent(eventType: string, metadata?: Record<string, unknown>) {
  const entry = { id: crypto.randomUUID(), eventType, metadata, createdAt: new Date().toISOString() };
  appendLocal(LOCAL_EVENT_KEY, entry, 500);
  void trackEvent(eventType, metadata).catch((error) => logError(error, "trackUserEvent", { eventType }));
}

export function installGlobalMonitoring() {
  if (typeof window === "undefined") return;
  window.addEventListener("error", (event) => logError(event.error ?? event.message, "window.error", { filename: event.filename, lineno: event.lineno }));
  window.addEventListener("unhandledrejection", (event) => logError(event.reason, "window.unhandledrejection"));
}
