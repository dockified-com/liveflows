/**
 * Clerk authentication helpers for E2E tests.
 *
 * Provides signInAsUser() which uses Clerk's ticket-based sign-in
 * (via clerk.signIn with emailAddress) and saves storageState for reuse.
 *
 * Requires:
 * - The app to be running with ClerkProvider (not yet available — see F0 report)
 * - CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in env
 * - Test users to exist in the Clerk test instance
 */
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'
import { type Page } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'

const STORAGE_DIR = path.join(__dirname, '..', '.clerk')

/**
 * Signs in a test user using Clerk's email-based ticket strategy.
 *
 * Prerequisites:
 * - Page must be navigated to a route that loads Clerk
 * - The user must exist in the Clerk test instance
 *
 * @returns The path to the saved storage state file
 */
export async function signInAsUser(
  page: Page,
  opts: { email: string; storageLabel: string },
): Promise<string> {
  // Ensure storage directory exists
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true })
  }

  const storagePath = path.join(STORAGE_DIR, `${opts.storageLabel}.json`)

  // setupClerkTestingToken bypasses Clerk's bot detection
  await setupClerkTestingToken({ page })

  // Navigate to root — must be a page that loads Clerk
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')

  // Sign in using email-based ticket strategy (no password needed)
  await clerk.signIn({
    page,
    emailAddress: opts.email,
  })

  // Save storage state for reuse by other tests
  await page.context().storageState({ path: storagePath })
  return storagePath
}

/**
 * Returns the expected storage state file path for a given label.
 * Does NOT create or sign in — use signInAsUser for that.
 */
export function storagePathFor(label: string): string {
  return path.join(STORAGE_DIR, `${label}.json`)
}
