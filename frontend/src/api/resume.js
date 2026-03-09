import client from './client'

export const uploadResume = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return client.post('/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const analyzeResume = (resumeId) =>
  client.post('/resume/analyze', { resume_id: resumeId })
