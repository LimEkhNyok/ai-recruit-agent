import { create } from 'zustand'

const useAchievementStore = create((set, get) => ({
  newlyUnlocked: [],

  addUnlocked: (achievements) =>
    set((state) => ({
      newlyUnlocked: [...state.newlyUnlocked, ...achievements],
    })),

  shiftUnlocked: () => {
    const [, ...rest] = get().newlyUnlocked
    set({ newlyUnlocked: rest })
  },

  clearUnlocked: () => set({ newlyUnlocked: [] }),
}))

export default useAchievementStore
