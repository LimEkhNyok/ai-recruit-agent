import client from './client'

export const generateQuiz = (topic, questionType) =>
  client.post('/quiz/generate', { topic, question_type: questionType })

export const judgeQuiz = (data) => client.post('/quiz/judge', data)

export const skipQuiz = (data) => client.post('/quiz/skip', data)

export const getQuizStats = () => client.get('/quiz/stats')
