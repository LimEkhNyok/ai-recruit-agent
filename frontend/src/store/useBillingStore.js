import { create } from 'zustand'
import { getWallet } from '../api/billing'

const useBillingStore = create((set) => ({
  wallet: null,
  loading: false,

  fetchWallet: async () => {
    set({ loading: true })
    try {
      const res = await getWallet()
      set({ wallet: res.data, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  setWallet: (wallet) => set({ wallet }),

  clear: () => set({ wallet: null }),
}))

export default useBillingStore
