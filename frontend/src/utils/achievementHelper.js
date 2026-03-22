import { checkAchievements } from '../api/achievement'
import useAchievementStore from '../store/useAchievementStore'

export async function checkAndNotify() {
  try {
    const res = await checkAchievements()
    if (res.data.newly_unlocked && res.data.newly_unlocked.length > 0) {
      useAchievementStore.getState().addUnlocked(res.data.newly_unlocked)
    }
  } catch {
    // silently ignore achievement check failures
  }
}
