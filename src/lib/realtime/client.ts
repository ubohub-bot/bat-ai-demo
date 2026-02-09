// ============================================
// WebRTC Client for OpenAI Realtime API
// ============================================

import {
  isTranscriptionCompleted,
  isAudioTranscriptDone,
  isFunctionCallDone,
  isResponseDone,
  isRealtimeError,
} from './events'

const REALTIME_URL =
  'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2025-06-03'

export interface RealtimeCallbacks {
  onUserTranscript: (itemId: string, text: string) => void
  onAssistantTranscript: (itemId: string, text: string) => void
  onFunctionCall: (name: string, args: string, callId: string) => void
  onResponseDone: () => void
  onError: (error: { type: string; message: string }) => void
  onConnected: () => void
  onDisconnected: () => void
}

export class RealtimeClient {
  private pc: RTCPeerConnection | null = null
  private dc: RTCDataChannel | null = null
  private audioEl: HTMLAudioElement | null = null
  private localStream: MediaStream | null = null
  private seenItemIds = new Set<string>()
  private callbacks: RealtimeCallbacks

  constructor(callbacks: RealtimeCallbacks) {
    this.callbacks = callbacks
  }

  /** Connect to OpenAI Realtime via WebRTC */
  async connect(clientSecret: string): Promise<void> {
    // Create peer connection
    this.pc = new RTCPeerConnection()

    // Set up remote audio output
    this.audioEl = document.createElement('audio')
    this.audioEl.autoplay = true
    this.pc.ontrack = (event) => {
      if (this.audioEl) {
        this.audioEl.srcObject = event.streams[0]
      }
    }

    // Get microphone with echo cancellation + noise suppression
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })

    // Add mic track to peer connection
    for (const track of this.localStream.getTracks()) {
      this.pc.addTrack(track, this.localStream)
    }

    // Create data channel for events
    this.dc = this.pc.createDataChannel('oai-events')
    this.dc.onopen = () => {
      console.log('[realtime] data channel open')
      this.callbacks.onConnected()
    }
    this.dc.onclose = () => {
      console.log('[realtime] data channel closed')
    }
    this.dc.onmessage = (event) => {
      this.handleMessage(event.data)
    }

    // Create offer with Opus preference
    const offer = await this.pc.createOffer()
    if (offer.sdp) {
      offer.sdp = this.preferOpus(offer.sdp)
    }
    await this.pc.setLocalDescription(offer)

    // Send offer to OpenAI, get answer
    const response = await fetch(REALTIME_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${clientSecret}`,
        'Content-Type': 'application/sdp',
      },
      body: offer.sdp,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Realtime API error: ${response.status} — ${text}`)
    }

    const answerSdp = await response.text()
    await this.pc.setRemoteDescription({
      type: 'answer',
      sdp: answerSdp,
    })

    // Monitor connection state
    this.pc.onconnectionstatechange = () => {
      console.log('[realtime] connection state:', this.pc?.connectionState)
      if (
        this.pc?.connectionState === 'disconnected' ||
        this.pc?.connectionState === 'failed'
      ) {
        this.callbacks.onDisconnected()
      }
    }
  }

  /** Disconnect and clean up */
  disconnect(): void {
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop()
      }
      this.localStream = null
    }
    if (this.dc) {
      this.dc.close()
      this.dc = null
    }
    if (this.pc) {
      this.pc.close()
      this.pc = null
    }
    if (this.audioEl) {
      this.audioEl.srcObject = null
      this.audioEl = null
    }
    this.seenItemIds.clear()
  }

  /** Send an event to the realtime API */
  send(event: Record<string, unknown>): void {
    if (this.dc && this.dc.readyState === 'open') {
      this.dc.send(JSON.stringify(event))
    } else {
      console.warn('[realtime] data channel not open, cannot send')
    }
  }

  /** Inject state as passive context (no response.create) */
  injectState(stateBlock: string): void {
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: stateBlock }],
      },
    })
    // DON'T trigger response.create — this is passive context
  }

  /** Force the model to generate a response immediately */
  triggerResponse(): void {
    this.send({ type: 'response.create' })
  }

  /** Send function call result back to the API */
  sendFunctionResult(callId: string, result: string): void {
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: result,
      },
    })
    this.send({ type: 'response.create' })
  }

  /** Handle incoming data channel messages */
  private handleMessage(data: string): void {
    let event: { type: string; item_id?: string; [key: string]: unknown }
    try {
      event = JSON.parse(data)
    } catch {
      console.warn('[realtime] unparseable message:', data)
      return
    }

    // Skip delta events in debug logging (too noisy)
    if (!event.type.includes('delta')) {
      console.log('[realtime] event:', event.type)
    }

    if (isTranscriptionCompleted(event)) {
      // Deduplicate by item_id
      if (this.seenItemIds.has(`user:${event.item_id}`)) return
      this.seenItemIds.add(`user:${event.item_id}`)
      this.callbacks.onUserTranscript(event.item_id, event.transcript)
      return
    }

    if (isAudioTranscriptDone(event)) {
      // Deduplicate by item_id
      if (this.seenItemIds.has(`assistant:${event.item_id}`)) return
      this.seenItemIds.add(`assistant:${event.item_id}`)
      this.callbacks.onAssistantTranscript(event.item_id, event.transcript)
      return
    }

    if (isFunctionCallDone(event)) {
      this.callbacks.onFunctionCall(event.name, event.arguments, event.call_id)
      return
    }

    if (isResponseDone(event)) {
      this.callbacks.onResponseDone()
      return
    }

    if (isRealtimeError(event)) {
      console.error('[realtime] error:', event.error)
      this.callbacks.onError(event.error)
      return
    }
  }

  /** Reorder SDP to prefer Opus codec */
  private preferOpus(sdp: string): string {
    const lines = sdp.split('\r\n')
    const result: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (line.startsWith('m=audio')) {
        // Find Opus payload type
        let opusPt: string | null = null
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].startsWith('m=')) break
          const match = lines[j].match(
            /^a=rtpmap:(\d+) opus\/48000/i
          )
          if (match) {
            opusPt = match[1]
            break
          }
        }

        if (opusPt) {
          // Reorder payload types to put Opus first
          const parts = line.split(' ')
          const header = parts.slice(0, 3)
          const pts = parts.slice(3)
          const reordered = [
            opusPt,
            ...pts.filter((pt) => pt !== opusPt),
          ]
          result.push([...header, ...reordered].join(' '))
        } else {
          result.push(line)
        }
      } else {
        result.push(line)
      }
    }

    return result.join('\r\n')
  }
}
