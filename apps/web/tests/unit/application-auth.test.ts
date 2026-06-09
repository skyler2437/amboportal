import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mutable per-test request context for the next/headers mock
const { cookieStore, headerStore, tableQueues, queryLog } = vi.hoisted(() => ({
  cookieStore: new Map<string, string>(),
  headerStore: new Map<string, string>(),
  // Per-table FIFO queues of { data, error } results returned by the mock
  // admin client, in the order the route queries each table.
  tableQueues: {} as Record<string, Array<{ data: unknown; error: unknown }>>,
  queryLog: [] as Array<{ table: string; method: string; args: unknown[] }>,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      cookieStore.has(name)
        ? { name, value: cookieStore.get(name)! }
        : undefined,
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => []),
  })),
  headers: vi.fn(async () => ({
    get: (name: string) => headerStore.get(name.toLowerCase()) ?? null,
  })),
}));

function nextResult(table: string) {
  const queue = tableQueues[table];
  return queue?.length ? queue.shift()! : { data: null, error: null };
}

// Thenable chainable query builder: every method returns the chain, awaiting
// it (directly or after .single()/.maybeSingle()) resolves the queued result.
function createChain(table: string, result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const method of [
    "select", "eq", "in", "order", "update", "insert", "upsert",
    "delete", "single", "maybeSingle", "limit",
  ]) {
    chain[method] = vi.fn((...args: unknown[]) => {
      queryLog.push({ table, method, args });
      return chain;
    });
  }
  chain.then = (
    resolve: (value: unknown) => unknown,
    reject: (reason?: unknown) => unknown
  ) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

const { mockSupabaseClient } = vi.hoisted(() => ({
  mockSupabaseClient: { from: vi.fn() },
}));

vi.mock("@ambo/database/admin-client", () => ({
  createAdminClient: vi.fn(() => mockSupabaseClient),
  adminClient: mockSupabaseClient,
}));

process.env.SESSION_SECRET = "test-secret-for-application-auth-tests";

import {
  createApplicationToken,
  verifyApplicationToken,
  canAccessApplication,
  APPLICATION_TOKEN_HEADER,
} from "@/lib/application-auth";
import { createSession, verifySessionToken } from "@/lib/session";
import { GET, POST } from "@/app/api/applications/route";

const PHONE = "5551234567";

beforeEach(() => {
  cookieStore.clear();
  headerStore.clear();
  queryLog.length = 0;
  for (const key of Object.keys(tableQueues)) delete tableQueues[key];
  mockSupabaseClient.from.mockImplementation((table: string) =>
    createChain(table, nextResult(table))
  );
});

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new Request(url, init));
}

describe("application tokens", () => {
  it("round-trips the phone claim", async () => {
    const token = await createApplicationToken(PHONE);
    expect(await verifyApplicationToken(token)).toBe(PHONE);
  });

  it("rejects a session JWT (no application scope)", async () => {
    const sessionToken = await createSession({ userId: "u1", role: "student" });
    expect(await verifyApplicationToken(sessionToken)).toBeNull();
  });

  it("is rejected by the session verifier (no userId/role)", async () => {
    const token = await createApplicationToken(PHONE);
    expect(await verifySessionToken(token)).toBeNull();
  });
});

describe("canAccessApplication", () => {
  it("denies anonymous callers", async () => {
    expect(await canAccessApplication(PHONE)).toBe(false);
  });

  it("allows a valid application token in the header", async () => {
    headerStore.set(
      APPLICATION_TOKEN_HEADER,
      await createApplicationToken(PHONE)
    );
    expect(await canAccessApplication(PHONE)).toBe(true);
  });

  it("denies a token scoped to a different phone", async () => {
    headerStore.set(
      APPLICATION_TOKEN_HEADER,
      await createApplicationToken("5550000000")
    );
    expect(await canAccessApplication(PHONE)).toBe(false);
  });
});

describe("GET /api/applications", () => {
  it("returns 404 when no application exists", async () => {
    tableQueues.applications = [{ data: null, error: null }];
    const res = await GET(
      makeRequest(`http://localhost:3000/api/applications?phone=${PHONE}`)
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when the application exists but the caller has no token", async () => {
    tableQueues.applications = [
      { data: { phone_number: PHONE, gpa: 3.9 }, error: null },
    ];
    const res = await GET(
      makeRequest(`http://localhost:3000/api/applications?phone=${PHONE}`)
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.gpa).toBeUndefined();
  });

  it("returns the application with a valid token", async () => {
    tableQueues.applications = [
      { data: { phone_number: PHONE, gpa: 3.9 }, error: null },
    ];
    const token = await createApplicationToken(PHONE);
    // The route reads the token via next/headers, which is mocked from
    // headerStore rather than the literal request object.
    headerStore.set(APPLICATION_TOKEN_HEADER, token);
    const res = await GET(
      makeRequest(`http://localhost:3000/api/applications?phone=${PHONE}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.gpa).toBe(3.9);
  });
});

describe("POST /api/applications", () => {
  it("creates a draft, strips non-whitelisted fields, and mints a token", async () => {
    tableQueues.applications = [
      { data: null, error: null }, // existence lookup
      { data: null, error: null }, // insert
    ];
    const res = await POST(
      makeRequest("http://localhost:3000/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: PHONE,
          first_name: "Test",
          status: "approved", // attacker-controlled: must be ignored
          transcript_url: "https://evil.example/x.pdf", // server-managed
          current_step: 2,
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.application_token).toBeTruthy();
    expect(await verifyApplicationToken(body.application_token)).toBe(PHONE);

    const insert = queryLog.find(
      (q) => q.table === "applications" && q.method === "insert"
    );
    expect(insert).toBeTruthy();
    const payload = insert!.args[0] as Record<string, unknown>;
    expect(payload.first_name).toBe("Test");
    expect(payload.status).toBe("draft"); // not "approved"
    expect(payload.transcript_url).toBeUndefined();
  });

  it("returns 403 when updating an existing application without a token", async () => {
    tableQueues.applications = [
      { data: { id: "app-1" }, error: null }, // existence lookup
    ];
    const res = await POST(
      makeRequest("http://localhost:3000/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: PHONE, first_name: "Mallory" }),
      })
    );
    expect(res.status).toBe(403);
  });

  it("updates an existing application with a valid token", async () => {
    tableQueues.applications = [
      { data: { id: "app-1" }, error: null }, // existence lookup
      { data: null, error: null }, // update
    ];
    const token = await createApplicationToken(PHONE);
    headerStore.set(APPLICATION_TOKEN_HEADER, token);
    const res = await POST(
      makeRequest("http://localhost:3000/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: PHONE, first_name: "Updated" }),
      })
    );
    expect(res.status).toBe(200);
    const update = queryLog.find(
      (q) => q.table === "applications" && q.method === "update"
    );
    expect(update).toBeTruthy();
  });
});
