import { useState, useRef, useCallback, useEffect } from 'react'
import { transcribeAudio } from '../api/interview'

const NativeSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

const canUseMediaRecorder =
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices &&
  typeof MediaRecorder !== 'undefined'

export default function useSpeechRecognition({ onError } = {}) {
  const isSupported = !!NativeSpeechRecognition || canUseMediaRecorder

  const [isListening, setIsListening] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')

  const useWhisperRef = useRef(!NativeSpeechRecognition)
  const recognitionRef = useRef(null)
  const isListeningRef = useRef(false)

  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])

  // ========== Whisper 模式：MediaRecorder ==========
  const startWhisperInternal = useCallback(async () => {
    if (!canUseMediaRecorder) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.start(1000)
      setIsListening(true)
      isListeningRef.current = true
      setTranscript('')
      setInterimTranscript('')
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        onError?.('not-allowed')
      } else {
        onError?.('start-failed')
      }
    }
  }, [onError])

  const stopWhisper = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return

    setIsListening(false)
    isListeningRef.current = false

    mediaRecorder.onstop = async () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null

      const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' })
      chunksRef.current = []

      if (blob.size === 0) return

      setTranscribing(true)
      try {
        const res = await transcribeAudio(blob)
        const text = res.data?.data?.text || ''
        if (text) setTranscript(text)
      } catch {
        onError?.('transcribe-failed')
      } finally {
        setTranscribing(false)
      }
    }

    mediaRecorder.stop()
  }, [onError])

  // ========== 原生 SpeechRecognition ==========
  useEffect(() => {
    if (!NativeSpeechRecognition || useWhisperRef.current) return

    const recognition = new NativeSpeechRecognition()
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

      if (event.error === 'not-allowed') {
        setIsListening(false)
        isListeningRef.current = false
        onError?.('not-allowed')
        return
      }

      // 网络错误等 → 静默切换到 Whisper 并自动开始录音
      isListeningRef.current = false
      useWhisperRef.current = true
      startWhisperInternal()
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
  }, [onError, startWhisperInternal])

  // ========== 统一接口 ==========
  const startListening = useCallback(() => {
    if (isListeningRef.current) return

    if (useWhisperRef.current) {
      startWhisperInternal()
      return
    }

    if (!recognitionRef.current) return
    setTranscript('')
    setInterimTranscript('')
    try {
      recognitionRef.current.start()
      setIsListening(true)
      isListeningRef.current = true
    } catch {
      onError?.('start-failed')
    }
  }, [startWhisperInternal, onError])

  const stopListening = useCallback(() => {
    if (useWhisperRef.current) {
      stopWhisper()
      return
    }

    if (!recognitionRef.current) return
    isListeningRef.current = false
    recognitionRef.current.stop()
    setIsListening(false)
    setInterimTranscript('')
  }, [stopWhisper])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
  }, [])

  return {
    isSupported,
    isListening,
    transcribing,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  }
}
