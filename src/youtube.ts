interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  getPlayerState(): number
}

declare global {
  interface Window {
    YT: { Player: new (id: string, opts: object) => YTPlayer }
    onYouTubeIframeAPIReady: () => void
  }
}

export class YouTubeController {
  private player: YTPlayer | null = null
  private playing = false

  load(elementId: string, videoId: string): Promise<void> {
    return new Promise((resolve) => {
      const createPlayer = () => {
        this.player = new window.YT.Player(elementId, {
          videoId,
          playerVars: { rel: 0, playsinline: 1, controls: 1 },
          events: { onReady: () => resolve() },
        })
      }

      if (window.YT?.Player) {
        createPlayer()
      } else {
        window.onYouTubeIframeAPIReady = createPlayer
        const script = document.createElement('script')
        script.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(script)
      }
    })
  }

  play() {
    if (!this.playing) {
      this.player?.playVideo()
      this.playing = true
    }
  }

  pause() {
    if (this.playing) {
      this.player?.pauseVideo()
      this.playing = false
    }
  }
}
