import { useState, useEffect } from 'react'
import { getFeatures } from '../api/modelConfig'

const FEATURE_LABELS = {
  assessment: '职业测评',
  matching: '岗位匹配',
  interview: '模拟面试',
  career: '职业规划',
  resume: '简历分析',
  quiz: '刷题练习',
}

export default function useFeatureGuard(featureName) {
  const [available, setAvailable] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await getFeatures()
        setAvailable(res.data[featureName] ?? false)
      } catch {
        setAvailable(true)
      } finally {
        setLoading(false)
      }
    }
    check()
  }, [featureName])

  return {
    loading,
    available,
    featureLabel: FEATURE_LABELS[featureName] || featureName,
  }
}
