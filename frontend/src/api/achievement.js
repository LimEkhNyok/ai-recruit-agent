import client from './client'

export const getAchievements = () => client.get('/achievements')

export const checkAchievements = () => client.post('/achievements/check')
