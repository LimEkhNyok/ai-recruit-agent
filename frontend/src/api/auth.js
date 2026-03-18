import client from './client'

export const sendVerifyCode = (email) =>
  client.post('/auth/send-verify-code', { email })

export const register = (name, email, password, code) =>
  client.post('/auth/register', { name, email, password, code })

export const login = (email, password) =>
  client.post('/auth/login', { email, password })

export const getMe = () => client.get('/auth/me')
