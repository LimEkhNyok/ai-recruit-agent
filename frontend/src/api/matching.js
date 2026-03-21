import client from './client'

export const triggerMatch = () => client.post('/matching/match')

export const getResults = () => client.get('/matching/results')

export const analyzeJD = (jdText) =>
  client.post('/matching/analyze-jd', { jd_text: jdText })
