import client from './client'

export const generatePlan = () => client.post('/career/generate')

export const getPlan = () => client.get('/career/plan')
