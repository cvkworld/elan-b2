import { StoredCoachState } from "@/lib/types";

const STORAGE_KEY = "elan-b2-state-v1";

export function loadStoredCoachState(): StoredCoachState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredCoachState;
  } catch {
    return null;
  }
}

export function saveStoredCoachState(state: StoredCoachState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
