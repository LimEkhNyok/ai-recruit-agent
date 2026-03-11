import client from './client'

export const getConfig = () => client.get('/model-config')

export const saveConfig = (data) => client.post('/model-config', data)

export const testConfig = (data) => client.post('/model-config/test', data)

export const getFeatures = () => client.get('/model-config/features')
