import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// Hoist mock variables so they're available inside vi.mock factories
const { mockSupabaseClient } = vi.hoisted(() => ({
  mockSupabaseClient: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({ data: null, error: null })),
        })),
        order: vi.fn(async () => ({ data: [], error: null })),
      })),
      insert: vi.fn(async () => ({ error: null })),
    })),
    auth: {
      admin: {
        createUser: vi.fn(),
        deleteUser: vi.fn(),
      },
    },
  },
}));

// Mock next/headers so getSession() sees no cookie → returns null
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => undefined), // no ambo_session cookie
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => []),
  })),
}));

vi.mock("@ambo/database/admin-client", () => ({
  createAdminClient: vi.fn(() => mockSupabaseClient),
  adminClient: mockSupabaseClient,
}));

process.env.SESSION_SECRET = "test-secret-for-api-auth-tests";

import { requireAdmin } from "@/lib/admin";
import { GET, POST } from "@/app/api/admin/users/route";

describe("API Route Protection", () => {
  describe("requireAdmin()", () => {
    it("returns authorized=false when no session cookie is present", async () => {
      const result = await requireAdmin();
      expect(result.authorized).toBe(false);
      expect(result.user).toBeNull();
      expect(result.role).toBeNull();
    });
  });

  describe("GET /api/admin/users", () => {
    it("returns 403 Forbidden without an admin session", async () => {
      const res = await GET(new NextRequest("http://localhost:3000/api/admin/users"));
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.error).toBe("Forbidden");
    });
  });

  describe("POST /api/admin/users", () => {
    it("returns 403 Forbidden without an admin session", async () => {
      const req = new Request("http://localhost:3000/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          first_name: "Test",
          last_name: "User",
          phone: "5551234567",
          email: "test@example.com",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.error).toBe("Forbidden");
    });
  });
});
