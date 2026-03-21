import { useState, useRef, useCallback, useEffect } from 'react'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

export default function useSpeechRecognition({ onError } = {}) {
  const isSupported = !!SpeechRecognition

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')

  const recognitionRef = useRef(null)
  const isListeningRef = useRef(false)

  useEffect(() => {
    if (!isSupported) return

    const recognition = new SpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript
        } else {
          interimText += result[0].transcript
        }
      }

      setTranscript(finalText)
      setInterimTranscript(interimText)
    }

    recognition.onerror = (event) => {
      if (event.error === 'aborted') return
      if (event.error === 'no-speech') return

      setIsListening(false)
      isListeningRef.current = false
      onError?.(event.error)
    }

    recognition.onend = () => {
      if (isListeningRef.current) {
        try {
          recognition.start()
        } catch {
          setIsListening(false)
          isListeningRef.current = false
        }
      }
    }

    recognitionRef.current = recognition

    return () => {
      isListeningRef.current = false
      recognition.stop()
    }
  }, [isSupported, onError])

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListeningRef.current) return
    setTranscript('')
    setInterimTranscript('')
    try {
      recognitionRef.current.start()
      setIsListening(true)
      isListeningRef.current = true
    } catch {
      onError?.('start-failed')
    }
  }, [onError])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return
    isListeningRef.current = false
    recognitionRef.current.stop()
    setIsListening(false)
    setInterimTranscript('')
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
  }, [])

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  }
}
