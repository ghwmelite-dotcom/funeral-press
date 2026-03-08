// GA4 custom event tracking — events defined per Stream 6 marketing playbook

export function trackEvent(eventName, params = {}) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params)
  }
}

export const events = {
  brochureStarted: () => trackEvent('brochure_started'),
  brochureCompleted: (format) => trackEvent('brochure_completed', { format }),
  memorialPageCreated: () => trackEvent('memorial_page_created'),
  memorialPageShared: (method) => trackEvent('memorial_page_shared', { method }),
  obituaryCreated: () => trackEvent('obituary_created'),
  budgetPlannerUsed: () => trackEvent('budget_planner_used'),
  qrCodeGenerated: () => trackEvent('qr_code_generated'),
  signupCompleted: (method) => trackEvent('signup_completed', { method }),
  referralLinkShared: (method) => trackEvent('referral_link_shared', { method }),
  themeSelected: (theme) => trackEvent('theme_selected', { theme }),
}
