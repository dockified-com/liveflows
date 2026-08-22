import { describe, expect, it } from "vitest";

/**
 * Unit tests for proxy route matching logic.
 *
 * These replicate the matcher patterns and public route patterns from
 * src/proxy.ts to verify correctness independently of the Clerk runtime.
 *
 * NOTE: We test the regex patterns directly rather than invoking
 * clerkMiddleware, which would require mocking Clerk's backend SDK.
 */

// Replicate the matcher patterns from proxy.ts config.matcher
const matchers = [
  /^\/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)$/,
  /^\/(api|trpc)(.*)$/,
];

function matchesProxy(pathname: string): boolean {
  return matchers.some((re) => re.test(pathname));
}

// Public route patterns (replicated from proxy.ts createRouteMatcher)
const publicPatterns = [/^\/$/, /^\/sign-in/, /^\/sign-up/, /^\/api\/webhooks/];

function isPublicRoute(pathname: string): boolean {
  return publicPatterns.some((re) => re.test(pathname));
}

describe("proxy config.matcher", () => {
  it("matches app routes", () => {
    expect(matchesProxy("/w/my-org")).toBe(true);
    expect(matchesProxy("/w/my-org/p/proj123")).toBe(true);
    expect(matchesProxy("/dashboard")).toBe(true);
  });

  it("matches API routes", () => {
    expect(matchesProxy("/api/webhooks/clerk")).toBe(true);
    expect(matchesProxy("/api/mcp")).toBe(true);
    expect(matchesProxy("/trpc/something")).toBe(true);
  });

  it("matches session-tasks route", () => {
    expect(matchesProxy("/session-tasks/choose-organization")).toBe(true);
  });

  it("excludes Next.js internals", () => {
    expect(matchesProxy("/_next/static/chunk.js")).toBe(false);
    expect(matchesProxy("/_next/image")).toBe(false);
  });

  it("excludes static assets by extension", () => {
    expect(matchesProxy("/favicon.ico")).toBe(false);
    expect(matchesProxy("/logo.png")).toBe(false);
    expect(matchesProxy("/fonts/geist.woff2")).toBe(false);
    expect(matchesProxy("/file.svg")).toBe(false);
  });

  it("does NOT exclude .json files (API responses use .json)", () => {
    expect(matchesProxy("/data.json")).toBe(true);
  });
});

describe("public route classification", () => {
  it("landing page is public", () => {
    expect(isPublicRoute("/")).toBe(true);
  });

  it("sign-in routes are public (multi-step)", () => {
    expect(isPublicRoute("/sign-in")).toBe(true);
    expect(isPublicRoute("/sign-in/factor-one")).toBe(true);
    expect(isPublicRoute("/sign-in/sso-callback")).toBe(true);
  });

  it("sign-up routes are public", () => {
    expect(isPublicRoute("/sign-up")).toBe(true);
    expect(isPublicRoute("/sign-up/continue")).toBe(true);
  });

  it("webhook routes are public (critical — Clerk returns 401 otherwise)", () => {
    expect(isPublicRoute("/api/webhooks/clerk")).toBe(true);
  });

  it("app routes are NOT public (requires authentication)", () => {
    expect(isPublicRoute("/w/my-org")).toBe(false);
    expect(isPublicRoute("/w/my-org/p/proj123")).toBe(false);
    expect(isPublicRoute("/dashboard")).toBe(false);
    expect(isPublicRoute("/api/mcp")).toBe(false);
  });

  it("session-tasks route is NOT public (user must be authenticated)", () => {
    expect(isPublicRoute("/session-tasks/choose-organization")).toBe(false);
  });
});
