import { NextRequest, NextResponse } from "next/server";
import {
  createPresenceSnapshot,
  prunePresenceSessions,
  removePresenceSession,
  upsertPresenceSession
} from "@/lib/presence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

declare global {
  var __elanPresenceSessions: Map<string, number> | undefined;
}

function getPresenceSessions() {
  if (!globalThis.__elanPresenceSessions) {
    globalThis.__elanPresenceSessions = new Map<string, number>();
  }

  return globalThis.__elanPresenceSessions;
}

function withNoStoreHeaders(payload: ReturnType<typeof createPresenceSnapshot>) {
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store, max-age=0"
    }
  });
}

async function readSessionId(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return null;
  }

  const sessionId = (body as { sessionId?: unknown }).sessionId;
  if (typeof sessionId !== "string") {
    return null;
  }

  const normalized = sessionId.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function GET() {
  const sessions = getPresenceSessions();
  prunePresenceSessions(sessions);
  return withNoStoreHeaders(createPresenceSnapshot(sessions.size));
}

export async function POST(request: NextRequest) {
  const sessionId = await readSessionId(request);
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const sessions = getPresenceSessions();
  const activeVisitors = upsertPresenceSession(sessions, sessionId);
  return withNoStoreHeaders(createPresenceSnapshot(activeVisitors));
}

export async function DELETE(request: NextRequest) {
  const sessions = getPresenceSessions();
  const sessionId = await readSessionId(request);
  const activeVisitors = sessionId ? removePresenceSession(sessions, sessionId) : sessions.size;
  return withNoStoreHeaders(createPresenceSnapshot(activeVisitors));
}
