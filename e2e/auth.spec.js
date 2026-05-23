import { expect, test } from '@playwright/test'
import {
  TEST_PIN,
  uiLogin,
  uiSignup,
  uniqueEmail,
  uniqueGhPhone,
  uniqueName,
} from './helpers/auth.js'

test.describe('Phone + PIN auth', () => {
  test('signup creates an account and shows the verify-email confirmation', async ({ page }) => {
    const phone = uniqueGhPhone()
    const email = uniqueEmail()
    const name = uniqueName()

    await page.goto('/')
    await uiSignup(page, { phone, email, name })

    await expect(page.getByText('Check your email to verify your account.')).toBeVisible()
  })

  test('signup → login flips the navbar from "Sign in" to the user menu', async ({ page }) => {
    const phone = uniqueGhPhone()
    const email = uniqueEmail()
    const name = uniqueName()

    await page.goto('/')
    await uiSignup(page, { phone, email, name })

    // Reload to reset all popover/dialog state (the SignInPopover wrapper is
    // itself role="dialog" and lingers after the signup dialog auto-closes).
    await page.goto('/')
    await uiLogin(page, { phone })

    // After login, the "Sign in" trigger button is replaced by UserMenu.
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toHaveCount(0)
  })

  test('reset-pin page rejects a missing token', async ({ page }) => {
    await page.goto('/auth/reset-pin')

    await expect(page.getByText(/Reset link is missing or invalid\./i)).toBeVisible()
  })

  test('reset-pin page surfaces an invalid-token error and unmounts the form', async ({ page }) => {
    await page.goto('/auth/reset-pin?token=invalid-stub-token')

    const pin = TEST_PIN
    // exact:true: "New PIN digit 1" substring-matches "Confirm new PIN digit 1".
    for (let i = 0; i < pin.length; i++) {
      await page.getByLabel(`New PIN digit ${i + 1}`, { exact: true }).fill(pin[i])
    }
    for (let i = 0; i < pin.length; i++) {
      await page.getByLabel(`Confirm new PIN digit ${i + 1}`, { exact: true }).fill(pin[i])
    }

    await page.getByRole('button', { name: 'Reset PIN' }).click()

    // On 401/400 the page replaces the form with an error view containing a
    // "Back to home" link — a more reliable assertion than string-matching.
    await expect(page.getByRole('link', { name: 'Back to home' })).toBeVisible({ timeout: 15_000 })
  })
})
