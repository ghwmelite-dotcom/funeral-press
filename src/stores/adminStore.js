import { create } from 'zustand'
import { apiFetch } from '../utils/apiClient'

export const useAdminStore = create((set, get) => ({
  overview: null,
  analytics: null,
  analyticsRevenue: null,
  analyticsTemplates: null,
  analyticsFunnel: null,
  analyticsLoading: false,
  users: { data: [], total: 0, page: 1, totalPages: 0 },
  orders: { data: [], total: 0, page: 1, totalPages: 0 },
  partners: [],
  designs: {},
  printOrders: { data: [], total: 0, page: 1, totalPages: 0 },
  isLoading: false,
  activeTab: 'overview',

  setActiveTab: (tab) => set({ activeTab: tab }),

  fetchAnalytics: async (days = 30) => {
    set({ analyticsLoading: true })
    try {
      const [overviewData, revenueData, templatesData] = await Promise.all([
        apiFetch(`/admin/analytics/overview?days=${days}`),
        apiFetch(`/admin/analytics/revenue?days=${days}`),
        apiFetch(`/admin/analytics/templates?limit=10`),
      ])
      set({
        analytics: overviewData,
        analyticsRevenue: revenueData.data || [],
        analyticsTemplates: templatesData.data || [],
        analyticsLoading: false,
      })
    } catch {
      set({ analyticsLoading: false })
    }
  },

  fetchFunnel: async (days = 30) => {
    try {
      const data = await apiFetch(`/admin/analytics/funnel?days=${days}`)
      set({ analyticsFunnel: data })
    } catch (err) {
      console.error('fetchFunnel failed:', err)
      set({ analyticsFunnel: null })
    }
  },

  fetchOverview: async () => {
    set({ isLoading: true })
    try {
      const data = await apiFetch('/admin/overview')
      set({ overview: data, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  fetchUsers: async (params = {}) => {
    set({ isLoading: true })
    try {
      const qs = new URLSearchParams()
      if (params.search) qs.set('search', params.search)
      if (params.page) qs.set('page', params.page)
      if (params.per_page) qs.set('per_page', params.per_page)
      if (params.filter) qs.set('filter', params.filter)
      const data = await apiFetch(`/admin/users?${qs}`)
      set({ users: { data: data.users, total: data.total, page: data.page, totalPages: data.totalPages }, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  grantCredits: async (userId, credits, reason) => {
    const data = await apiFetch('/admin/users/grant-credits', {
      method: 'POST',
      body: JSON.stringify({ userId, credits, reason }),
    })
    // Refresh user list to reflect changes
    const { users } = get()
    set({
      users: {
        ...users,
        data: users.data.map(u => u.id === userId ? { ...u, credits_remaining: data.user.credits_remaining } : u),
      },
    })
    return data
  },

  grantAdmin: async (userId) => {
    const data = await apiFetch(`/admin/users/${userId}/grant-admin`, { method: 'POST' })
    // Optimistically update local user list to reflect the new role
    const { users } = get()
    set({
      users: {
        ...users,
        data: users.data.map(u => u.id === userId ? { ...u, is_admin: true } : u),
      },
    })
    return data
  },

  revokeAdmin: async (userId) => {
    const data = await apiFetch(`/admin/users/${userId}/revoke-admin`, { method: 'POST' })
    const { users } = get()
    set({
      users: {
        ...users,
        data: users.data.map(u => u.id === userId ? { ...u, is_admin: false } : u),
      },
    })
    return data
  },

  fetchOrders: async (params = {}) => {
    set({ isLoading: true })
    try {
      const qs = new URLSearchParams()
      if (params.page) qs.set('page', params.page)
      if (params.per_page) qs.set('per_page', params.per_page)
      if (params.status) qs.set('status', params.status)
      if (params.plan) qs.set('plan', params.plan)
      if (params.days) qs.set('days', params.days)
      const data = await apiFetch(`/admin/orders?${qs}`)
      set({ orders: { data: data.orders, total: data.total, page: data.page, totalPages: data.totalPages }, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  fetchPartners: async () => {
    set({ isLoading: true })
    try {
      const data = await apiFetch('/admin/partners')
      set({ partners: data.partners, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  promotePartner: async (userId, partnerName) => {
    const data = await apiFetch('/admin/partners/promote', {
      method: 'POST',
      body: JSON.stringify({ userId, partnerName }),
    })
    // Refresh partners list
    get().fetchPartners()
    return data
  },

  demotePartner: async (userId) => {
    await apiFetch('/admin/partners/demote', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    })
    // Refresh partners list
    get().fetchPartners()
  },

  setPartnerType: async (userId, partnerType) => {
    await apiFetch('/admin/partners/set-type', {
      method: 'POST',
      body: JSON.stringify({ userId, partnerType }),
    })
    const { partners } = get()
    set({
      partners: partners.map(p =>
        p.id === userId ? { ...p, partner_type: partnerType } : p
      ),
    })
  },

  setCommissionOverride: async (userId, commissionRate) => {
    const data = await apiFetch('/admin/partners/commission-override', {
      method: 'POST',
      body: JSON.stringify({ userId, commissionRate }),
    })
    // Update partner in local state
    const { partners } = get()
    set({
      partners: partners.map(p =>
        p.id === userId ? { ...p, partner_commission_override: commissionRate } : p
      ),
    })
    return data
  },

  fetchDesigns: async () => {
    set({ isLoading: true })
    try {
      const data = await apiFetch('/admin/designs')
      set({ designs: data.designs, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  fetchPrintOrders: async (params = {}) => {
    set({ isLoading: true })
    try {
      const qs = new URLSearchParams()
      if (params.page) qs.set('page', params.page)
      if (params.per_page) qs.set('per_page', params.per_page)
      if (params.fulfillment && params.fulfillment !== 'all') qs.set('fulfillment', params.fulfillment)
      if (params.payment && params.payment !== 'all') qs.set('payment', params.payment)
      const data = await apiFetch(`/admin/print-orders?${qs}`)
      set({ printOrders: { data: data.orders, total: data.total, page: data.page, totalPages: data.totalPages }, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  updatePrintOrder: async (orderId, updates) => {
    await apiFetch(`/admin/print-orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
    // Refresh the list to reflect changes
    const { printOrders } = get()
    set({
      printOrders: {
        ...printOrders,
        data: printOrders.data.map(o =>
          o.id === orderId ? { ...o, ...updates } : o
        ),
      },
    })
  },
}))
