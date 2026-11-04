import { MicDeviceInfo } from '../types'

export async function getMicrophoneList(): Promise<MicDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return []
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const audioInputs = devices.filter((d) => d.kind === 'audioinput')
    return audioInputs.map((d, index) => ({
      deviceId: d.deviceId,
      label: d.label || `Microphone ${index + 1}`,
    }))
  } catch (err) {
    console.warn('Error enumerating devices:', err)
    return []
  }
}

export async function requestMicrophonePermission(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('getUserMedia not supported in this browser environment')
  }
  return await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: false,
      autoGainControl: false,
    },
  })
}

export async function getMicStream(deviceId?: string): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    audio: deviceId
      ? { deviceId: { exact: deviceId }, echoCancellation: true }
      : { echoCancellation: true },
  }
  return await navigator.mediaDevices.getUserMedia(constraints)
}

export function calculateDbfs(timeDomainData: Float32Array): number {
  let sumSquares = 0
  for (let i = 0; i < timeDomainData.length; i++) {
    const val = timeDomainData[i]
    sumSquares += val * val
  }
  const rms = Math.sqrt(sumSquares / timeDomainData.length)
  if (rms <= 0.00001) return -60
  const db = 20 * Math.log10(rms)
  return Math.max(-60, Math.min(0, db))
}
