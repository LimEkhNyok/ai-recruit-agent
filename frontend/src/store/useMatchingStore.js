import { create } from 'zustand'

const useMatchingStore = create((set) => ({
  results: null,
  setResults: (results) => set({ results }),
  clearResults: () => set({ results: null }),
}))

export default useMatchingStore
