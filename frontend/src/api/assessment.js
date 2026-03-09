import client from './client'

export const startAssessment = () => client.post('/assessment/start')

export const chat = (assessmentId, message) =>
  client.post('/assessment/chat', { assessment_id: assessmentId, message })

export const finishAssessment = (assessmentId) =>
  client.post('/assessment/finish', { assessment_id: assessmentId })

export const getProfile = () => client.get('/assessment/profile')
