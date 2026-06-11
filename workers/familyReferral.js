// Family referral reward rules — spec §2.5,
// docs/superpowers/specs/2026-06-11-automated-growth-flywheel-design.md

export const FAMILY_REWARD_PESEWAS = 2000 // GHS 20
export const FAMILY_REWARD_CAP_PER_YEAR = 10
export const MIN_CHARGE_PESEWAS = 100 // Paystack will reject charges below ~GHS 1

export function referralTypeFor(referrer) {
  return referrer.is_partner ? 'partner' : 'family'
}

export function initialRewardStatus({ trackIpHash, codeIpHash }) {
  if (trackIpHash && codeIpHash && trackIpHash === codeIpHash) return 'review'
  return 'pending'
}

export function canGrantReward({ grantedLast12Months }) {
  return grantedLast12Months < FAMILY_REWARD_CAP_PER_YEAR
}

export function applyReferralDiscount({ balancePesewas, amountPesewas }) {
  const balance = Math.max(0, balancePesewas || 0)
  if (balance <= 0) return { discount: 0, amount: amountPesewas }
  const discount = Math.min(balance, amountPesewas - MIN_CHARGE_PESEWAS)
  if (discount <= 0) return { discount: 0, amount: amountPesewas }
  return { discount, amount: amountPesewas - discount }
}
