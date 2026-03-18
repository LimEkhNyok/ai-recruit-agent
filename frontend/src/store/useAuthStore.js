import { create } from 'zustand'
import client from '../api/client'

const useAuthStore = create((set) => ({
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),

  login: async (email, password) => {
    const res = await client.post('/auth/login', { email, password })
    const { access_token, refresh_token } = res.data
    localStorage.setItem('token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    const me = await client.get('/auth/me')
    localStorage.setItem('user', JSON.stringify(me.data))
    set({ token: access_token, user: me.data })
  },

  register: async (name, email, password, code) => {
    const res = await client.post('/auth/register', { name, email, password, code })
    const { access_token, refresh_token } = res.data
    localStorage.setItem('token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    const me = await client.get('/auth/me')
    localStorage.setItem('user', JSON.stringify(me.data))
    set({ token: access_token, user: me.data })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    set({ token: null, user: null })
  },
}))

export default useAuthStore
