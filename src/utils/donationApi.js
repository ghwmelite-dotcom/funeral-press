import { apiFetch } from './apiClient.js'

const DONATION_API = import.meta.env.VITE_DONATION_API_URL || 'https://donation-api.funeralpress.org'

// Donation rail — separate Cloudflare Worker. Public endpoints (charge, wall,
// totals, approve, reject) bypass auth; family-head and donor-claim endpoints
// require a JWT.
export const donationApi = {
  async initDonation(memorialId, body) {
    return apiFetch(`${DONATION_API}/memorials/${memorialId}/donation/init`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
  async charge(memorialId, body) {
    return apiFetch(`${DONATION_API}/memorials/${memorialId}/donation/charge`, {
      method: 'POST',
      body: JSON.stringify(body),
      auth: false,
    })
  },
  async getWall(memorialId, cursor = null) {
    const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
    return apiFetch(`${DONATION_API}/memorials/${memorialId}/donation/wall${q}`, { auth: false })
  },
  async getTotals(memorialId) {
    return apiFetch(`${DONATION_API}/memorials/${memorialId}/donation/totals`, { auth: false })
  },
  async approve(memorialId, body) {
    return apiFetch(`${DONATION_API}/memorials/${memorialId}/donation/approve`, {
      method: 'POST',
      body: JSON.stringify(body),
      auth: false,
    })
  },
  async reject(memorialId, body) {
    return apiFetch(`${DONATION_API}/memorials/${memorialId}/donation/reject`, {
      method: 'POST',
      body: JSON.stringify(body),
      auth: false,
    })
  },
  async updateSettings(memorialId, body) {
    return apiFetch(`${DONATION_API}/memorials/${memorialId}/donation/settings`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },
  async claim(donationId) {
    return apiFetch(`${DONATION_API}/donations/${donationId}/claim`, { method: 'POST' })
  },
  async adminListDonations({ status, cursor } = {}) {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (cursor) params.set('cursor', cursor)
    const qs = params.toString()
    return apiFetch(`${DONATION_API}/admin/donations${qs ? `?${qs}` : ''}`)
  },
  async adminRefund(donationId) {
    return apiFetch(`${DONATION_API}/admin/donations/${donationId}/refund`, {
      method: 'POST',
    })
  },
}

// Phone-OTP flow — lives in auth-api (relative paths use API_BASE).
export const phoneAuthApi = {
  async sendOtp(phone, purpose) {
    return apiFetch('/auth/phone/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, purpose }),
      auth: false,
    })
  },
  async verify(phone, code, purpose) {
    return apiFetch('/auth/phone/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code, purpose }),
      auth: false,
    })
  },
  async link(phone, code) {
    return apiFetch('/auth/phone/link', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    })
  },
  async unlink() {
    return apiFetch('/auth/phone/unlink', { method: 'POST' })
  },
}
