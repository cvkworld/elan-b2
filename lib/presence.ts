export const PRESENCE_TTL_MS = 45_000;

export interface PresenceSnapshot {
  activeVisitors: number;
  estimated: boolean;
  ttlMs: number;
  updatedAt: string;
}

export function prunePresenceSessions(sessions: Map<string, number>, now = Date.now()) {
  sessions.forEach((lastSeen, sessionId) => {
    if (now - lastSeen > PRESENCE_TTL_MS) {
      sessions.delete(sessionId);
    }
  });

  return sessions;
}

export function upsertPresenceSession(
  sessions: Map<string, number>,
  sessionId: string,
  now = Date.now()
) {
  prunePresenceSessions(sessions, now);
  sessions.set(sessionId, now);
  return sessions.size;
}

export function removePresenceSession(
  sessions: Map<string, number>,
  sessionId: string,
  now = Date.now()
) {
  sessions.delete(sessionId);
  prunePresenceSessions(sessions, now);
  return sessions.size;
}

export function createPresenceSnapshot(activeVisitors: number, now = Date.now()): PresenceSnapshot {
  return {
    activeVisitors: Math.max(0, activeVisitors),
    estimated: true,
    ttlMs: PRESENCE_TTL_MS,
    updatedAt: new Date(now).toISOString()
  };
}
