import client from './client'

export const startInterview = (jobId, jdContext) =>
  client.post('/interview/start', jobId ? { job_id: jobId } : { jd_context: jdContext })

export const endInterview = (interviewId) =>
  client.post('/interview/end', { interview_id: interviewId })

export const getHistory = () => client.get('/interview/history')

export const getInterviewDetail = (interviewId) =>
  client.get(`/interview/${interviewId}`)

export const deleteInterview = (interviewId) =>
  client.delete(`/interview/${interviewId}`)

export const transcribeAudio = (audioBlob) => {
  const formData = new FormData()
  formData.append('file', audioBlob, 'recording.webm')
  return client.post('/speech/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  })
}

export async function* chatStream(interviewId, message) {
  const token = localStorage.getItem('token')
  const response = await fetch('/api/interview/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ interview_id: interviewId, message }),
  })

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const payload = line.slice(6)
        if (payload === '[DONE]') return
        try {
          const data = JSON.parse(payload)
          if (data.text) yield data.text
        } catch {
          // skip malformed
        }
      }
    }
  }
}
