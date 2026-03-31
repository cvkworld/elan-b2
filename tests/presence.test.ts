import { describe, expect, it } from "vitest";
import {
  PRESENCE_TTL_MS,
  createPresenceSnapshot,
  prunePresenceSessions,
  removePresenceSession,
  upsertPresenceSession
} from "@/lib/presence";

describe("presence helpers", () => {
  it("keeps only recent sessions inside the ttl window", () => {
    const now = 1_700_000_000_000;
    const sessions = new Map<string, number>([
      ["fresh", now - 5_000],
      ["stale", now - PRESENCE_TTL_MS - 1]
    ]);

    prunePresenceSessions(sessions, now);

    expect(Array.from(sessions.keys())).toEqual(["fresh"]);
  });

  it("upserts and removes active sessions", () => {
    const now = 1_700_000_000_000;
    const sessions = new Map<string, number>();

    expect(upsertPresenceSession(sessions, "session-a", now)).toBe(1);
    expect(upsertPresenceSession(sessions, "session-b", now + 100)).toBe(2);
    expect(removePresenceSession(sessions, "session-a", now + 200)).toBe(1);
  });

  it("creates an estimated snapshot payload", () => {
    const snapshot = createPresenceSnapshot(7, 1_700_000_000_000);

    expect(snapshot).toMatchObject({
      activeVisitors: 7,
      estimated: true,
      ttlMs: PRESENCE_TTL_MS
    });
    expect(snapshot.updatedAt).toBe("2023-11-14T22:13:20.000Z");
  });
});
