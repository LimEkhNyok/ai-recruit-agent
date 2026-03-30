import client from './client'

export const sendVerifyCode = (email) =>
  client.post('/auth/send-verify-code', { email })

export const register = (name, email, password, code) =>
  client.post('/auth/register', { name, email, password, code })

export const login = (email, password) =>
  client.post('/auth/login', { email, password })

export const sendResetCode = (email) =>
  client.post('/auth/send-reset-code', { email })

export const resetPassword = (email, code, new_password) =>
  client.post('/auth/reset-password', { email, code, new_password })

export const getMe = () => client.get('/auth/me')

export const getOAuthProviders = () => client.get('/auth/oauth/providers')

export const oauthBindRegister = (data) =>
  client.post('/auth/oauth/bindwithregister', data)
