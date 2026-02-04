/**
 * Unit tests: RBAC can(), getDefaultRoute(), canAccessRoute().
 */
import { can, getDefaultRoute, canAccessRoute } from "@/lib/auth/rbac";
import type { Role } from "@/lib/contracts/auth";

describe("RBAC can()", () => {
  it("ADMIN can users:read and users:write", () => {
    expect(can("ADMIN", "users:read")).toBe(true);
    expect(can("ADMIN", "users:write")).toBe(true);
  });

  it("RECEPTION can users:read but not users:write", () => {
    expect(can("RECEPTION", "users:read")).toBe(true);
    expect(can("RECEPTION", "users:write")).toBe(false);
  });

  it("EMPLOYEE can appointments:read and reports:write", () => {
    expect(can("EMPLOYEE", "appointments:read")).toBe(true);
    expect(can("EMPLOYEE", "reports:write")).toBe(true);
  });

  it("CLIENT can client:dashboard and appointments:cancel, not appointments:write", () => {
    expect(can("CLIENT", "client:dashboard")).toBe(true);
    expect(can("CLIENT", "appointments:cancel")).toBe(true);
    expect(can("CLIENT", "appointments:write")).toBe(false);
  });

  it("CLIENT cannot access settings:write or billing", () => {
    expect(can("CLIENT", "settings:write")).toBe(false);
    expect(can("CLIENT", "billing:read")).toBe(false);
  });
});

describe("RBAC getDefaultRoute()", () => {
  it("returns role-specific default routes", () => {
    expect(getDefaultRoute("ADMIN")).toBe("/admin/users");
    expect(getDefaultRoute("RECEPTION")).toBe("/reception/calendar");
    expect(getDefaultRoute("EMPLOYEE")).toBe("/employee/calendar");
    expect(getDefaultRoute("CLIENT")).toBe("/client/dashboard");
  });

  it("returns / for unknown role", () => {
    expect(getDefaultRoute("UNKNOWN" as Role)).toBe("/");
  });
});

describe("RBAC canAccessRoute()", () => {
  it("allows ADMIN only on /admin paths", () => {
    expect(canAccessRoute("ADMIN", "/admin/users")).toBe(true);
    expect(canAccessRoute("ADMIN", "/admin/settings")).toBe(true);
    expect(canAccessRoute("ADMIN", "/reception/calendar")).toBe(false);
    expect(canAccessRoute("ADMIN", "/client/dashboard")).toBe(false);
  });

  it("allows RECEPTION only on /reception paths", () => {
    expect(canAccessRoute("RECEPTION", "/reception/calendar")).toBe(true);
    expect(canAccessRoute("RECEPTION", "/reception/appointments")).toBe(true);
    expect(canAccessRoute("RECEPTION", "/admin/users")).toBe(false);
  });

  it("allows CLIENT only on /client paths", () => {
    expect(canAccessRoute("CLIENT", "/client/dashboard")).toBe(true);
    expect(canAccessRoute("CLIENT", "/client/book")).toBe(true);
    expect(canAccessRoute("CLIENT", "/admin/users")).toBe(false);
  });

  it("allows any role on /notifications", () => {
    expect(canAccessRoute("ADMIN", "/notifications")).toBe(true);
    expect(canAccessRoute("RECEPTION", "/notifications")).toBe(true);
    expect(canAccessRoute("CLIENT", "/notifications")).toBe(true);
  });

  it("denies unrelated paths", () => {
    expect(canAccessRoute("CLIENT", "/")).toBe(false);
    expect(canAccessRoute("ADMIN", "/login")).toBe(false);
  });
});
