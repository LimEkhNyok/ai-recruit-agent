import client from './client'

export const triggerMatch = () => client.post('/matching/match')

export const getResults = () => client.get('/matching/results')
