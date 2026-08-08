/**
 * E2E Global Setup — runs once before all tests.
 *
 * Initializes the Clerk testing environment by fetching a testing token
 * from the Clerk Backend API using CLERK_SECRET_KEY.
 *
 * This file must be referenced in playwright.config.ts via the `globalSetup` property.
 * See F0-report.md for the handoff requirement to Team Alpha.
 */
import { clerkSetup } from "@clerk/testing/playwright";

export default async function globalSetup() {
  await clerkSetup();
}
