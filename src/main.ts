import * as THREE from 'three'
import { HeadTracker } from './head-tracker'
import { YouTubeController } from './youtube'

const canvas    = document.getElementById('canvas')    as HTMLCanvasElement
const setup     = document.getElementById('setup')     as HTMLDivElement
const urlInput  = document.getElementById('url-input') as HTMLInputElement
const startBtn  = document.getElementById('start-btn') as HTMLButtonElement
const errorMsg  = document.getElementById('error-msg') as HTMLSpanElement
const xrOverlay  = document.getElementById('xr-overlay')  as HTMLDivElement
const statusBar  = document.getElementById('status-bar')  as HTMLDivElement
const videoPanel = document.getElementById('video-panel') as HTMLDivElement

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.xr.enabled = true

const scene  = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100)

const tracker = new HeadTracker()
const yt      = new YouTubeController()

function extractVideoId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  )
  return m ? m[1] : null
}

startBtn.addEventListener('click', async () => {
  hideError()
  const videoId = extractVideoId(urlInput.value.trim())
  if (!videoId) { showError('URL inválida. Usá un link de YouTube.'); return }

  startBtn.disabled = true
  startBtn.textContent = 'Cargando...'

  await yt.load('yt-player', videoId)

  if (!navigator.xr) {
    showError('WebXR no disponible. Abrí esta página en el Meta Quest Browser.')
    resetBtn(); return
  }

  const arOk = await navigator.xr.isSessionSupported('immersive-ar')
  const vrOk = await navigator.xr.isSessionSupported('immersive-vr')

  if (!arOk && !vrOk) {
    showError('Este dispositivo no soporta WebXR inmersivo.')
    resetBtn(); return
  }

  try {
    await startXR(arOk ? 'immersive-ar' : 'immersive-vr')
  } catch {
    showError('No se pudo iniciar la sesión XR.')
    resetBtn()
  }
})

async function startXR(mode: 'immersive-ar' | 'immersive-vr') {
  const init: Record<string, unknown> = {
    optionalFeatures: ['local-floor', 'bounded-floor'],
  }
  if (mode === 'immersive-ar') {
    init.requiredFeatures = ['dom-overlay']
    init.domOverlay = { root: xrOverlay }
  }

  const session = await navigator.xr!.requestSession(mode, init as XRSessionInit)
  await renderer.xr.setSession(session)

  setup.style.display = 'none'
  xrOverlay.style.display = 'flex'
  statusBar.textContent = '⏸ Caminá para comenzar'
  tracker.reset()

  const refSpace = await session
    .requestReferenceSpace('local-floor')
    .catch(() => session.requestReferenceSpace('local'))

  let videoPlaying  = false
  let lastMovedAt   = 0
  let videoWidthVw  = 88
  const PAUSE_DELAY = 600
  const SCALE_SPEED = 0.5  // vw per frame at full deflection
  const DEAD_ZONE   = 0.15

  renderer.setAnimationLoop((time, frame) => {
    if (!frame) return

    // Thumbstick Y → resize video panel (up = bigger, down = smaller)
    for (const source of session.inputSources) {
      const gp = source.gamepad
      if (!gp || gp.axes.length < 4) continue
      const thumbY = gp.axes[3] // xr-standard mapping: thumbstick Y
      if (Math.abs(thumbY) > DEAD_ZONE) {
        videoWidthVw = Math.max(20, Math.min(98, videoWidthVw - thumbY * SCALE_SPEED))
        videoPanel.style.width = `${videoWidthVw.toFixed(1)}vw`
      }
    }

    const pose = frame.getViewerPose(refSpace)

    if (pose && tracker.update(pose)) {
      lastMovedAt = time
      if (!videoPlaying) {
        yt.play()
        videoPlaying = true
        statusBar.textContent = '▶ Caminando'
      }
    } else if (videoPlaying && time - lastMovedAt > PAUSE_DELAY) {
      yt.pause()
      videoPlaying = false
      statusBar.textContent = '⏸ Pausado — caminá para continuar'
    }

    renderer.render(scene, camera)
  })

  session.addEventListener('end', () => {
    renderer.setAnimationLoop(null)
    xrOverlay.style.display = 'none'
    setup.style.display = 'flex'
    resetBtn()
  })
}

function showError(msg: string) {
  errorMsg.textContent = msg
  errorMsg.style.display = 'block'
}

function hideError() {
  errorMsg.style.display = 'none'
}

function resetBtn() {
  startBtn.disabled = false
  startBtn.textContent = 'Entrar al VR'
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})
