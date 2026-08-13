"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

// Module-level external store for the theme. Using useSyncExternalStore avoids
// calling setState inside useEffect (which would trigger cascading renders and
// is flagged by react-hooks/set-state-in-effect), and also avoids SSR/client
// hydration mismatches: the server always snapshots "light" + mounted=false,
// then the client initializes from localStorage / system preference on first
// subscribe.
let currentTheme: Theme = "light";
const listeners = new Set<() => void>();

let initialized = false;
function ensureInitialized() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  const saved = localStorage.getItem("verifscan-theme") as Theme | null;
  const system = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  currentTheme = saved || system;
  document.documentElement.classList.toggle("dark", currentTheme === "dark");
}

function subscribe(listener: () => void) {
  ensureInitialized();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Theme {
  return currentTheme;
}

function getServerSnapshot(): Theme {
  return "light";
}

function applyTheme(next: Theme) {
  currentTheme = next;
  if (typeof window !== "undefined") {
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("verifscan-theme", next);
  }
  listeners.forEach((l) => l());
}

const noopSubscribe = () => () => {};

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const toggle = () => applyTheme(theme === "light" ? "dark" : "light");
  return { theme, toggle, mounted };
}
