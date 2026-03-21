import client from './client'

export const generateQuiz = (topic, questionType) =>
  client.post('/quiz/generate', { topic, question_type: questionType })

export const generateByKnowledge = (domainId, topicId, questionType, difficulty) =>
  client.post('/quiz/generate-by-knowledge', {
    domain_id: domainId,
    topic_id: topicId,
    question_type: questionType,
    difficulty,
  })

export const generateVariant = (data) =>
  client.post('/quiz/generate-variant', data)

export const judgeQuiz = (data) => client.post('/quiz/judge', data)

export const skipQuiz = (data) => client.post('/quiz/skip', data)

export const getQuizStats = () => client.get('/quiz/stats')

export const getKnowledgePoints = (type) =>
  client.get('/quiz/knowledge-points', { params: type ? { type } : {} })

export const getKnowledgeStats = () => client.get('/quiz/knowledge-stats')
