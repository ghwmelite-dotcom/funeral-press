// Helpers for e2e auth flows against the Phone+PIN signup/login API.
//
// Phone numbers: backend PHONE_E164_REGEX is permissive (/^\+[1-9]\d{6,14}$/),
// but the PhoneInput UI uses libphonenumber-js and only emits a value when
// `parsed.isValid()`. So we must produce numbers libphonenumber accepts for
// Ghana — MTN prefix 24 + 7 trailing digits. We derive the trailing digits
// from `Date.now()` for collision avoidance: even across rapid back-to-back
// runs, two milliseconds rarely share the same mod-10⁷ value, and the cycle
// is ~115 days.

const TEST_PIN = '4242'

/**
 * Generate a unique, libphonenumber-valid GH mobile number per run.
 * Returns local-format digits (what a user would type into PhoneInput
 * with GH selected) plus the expected E.164 form for direct API calls.
 */
function uniqueGhPhone() {
  const tail = String(Date.now() % 10_000_000).padStart(7, '0')
  const local = `24${tail}`              // 9 local digits, typed into PhoneInput
  const e164 = `+233${local}`            // What libphonenumber emits and the API stores
  return { local, e164 }
}

function uniqueEmail() {
  const slug = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `e2e-${slug}@e2e.funeralpress.test`
}

function uniqueName() {
  return `E2E Test ${Date.now().toString(36).slice(-5)}`
}

/**
 * Open the Sign in popover from the visible navbar and complete the signup
 * dialog. Leaves the dialog in its success state (auto-closes after 3s).
 */
async function uiSignup(page, { phone, email, name, pin = TEST_PIN }) {
  // The LandingPage renders SignInPopover multiple times (navbar + hero CTAs).
  // Click the first visible "Sign in" trigger.
  await page.getByRole('button', { name: 'Sign in', exact: true }).first().click()
  await page.getByRole('button', { name: 'Sign up' }).click()

  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Full name').fill(name)

  // PhoneInput: country defaults to GH; just type local digits into the tel input.
  await dialog.getByLabel('Phone number').fill(phone.local)
  await dialog.getByLabel('Email').fill(email)

  // PinInput renders 4 boxes labelled "PIN digit 1..4" — same for "Confirm PIN".
  // exact:true is required: "PIN digit 1" substring-matches "Confirm PIN digit 1".
  for (let i = 0; i < pin.length; i++) {
    await dialog.getByLabel(`PIN digit ${i + 1}`, { exact: true }).fill(pin[i])
  }
  for (let i = 0; i < pin.length; i++) {
    await dialog.getByLabel(`Confirm PIN digit ${i + 1}`, { exact: true }).fill(pin[i])
  }

  await dialog.getByRole('button', { name: 'Create account' }).click()
  await dialog.getByText('Almost there').waitFor({ timeout: 15_000 })
}

/**
 * Open the Sign in popover and complete the login dialog.
 */
async function uiLogin(page, { phone, pin = TEST_PIN }) {
  await page.getByRole('button', { name: 'Sign in', exact: true }).first().click()
  await page.getByRole('button', { name: 'Continue with phone' }).click()

  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Phone number').fill(phone.local)
  for (let i = 0; i < pin.length; i++) {
    await dialog.getByLabel(`PIN digit ${i + 1}`, { exact: true }).fill(pin[i])
  }
  await dialog.getByRole('button', { name: /^Sign in$/ }).click()

  // Login closes the dialog and the "Sign in" trigger is replaced by UserMenu.
  await dialog.waitFor({ state: 'detached', timeout: 15_000 })
}

export { TEST_PIN, uniqueGhPhone, uniqueEmail, uniqueName, uiSignup, uiLogin }
