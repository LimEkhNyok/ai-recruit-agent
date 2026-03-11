import client from './client'

export const getStats = () => client.get('/usage/stats')

export const getRecent = (limit = 20) => client.get(`/usage/recent?limit=${limit}`)
