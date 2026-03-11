import client from './client'

export const getWallet = () => client.get('/billing/wallet')

export const recharge = (tier) => client.post('/billing/recharge', { tier })

export const subscribe = (planType) => client.post('/billing/subscribe', { plan_type: planType })

export const getBillingRecords = () => client.get('/billing/records')

export const getPricing = () => client.get('/billing/pricing')
