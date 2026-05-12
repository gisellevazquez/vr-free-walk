import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig(async ({ mode }) => {
  const isQuest = mode === 'quest'
  const isDesktopDev = mode === 'development'

  const plugins: any[] = [mkcert()]

  if (isDesktopDev) {
    const { iwsdkDev } = await import('@iwsdk/vite-plugin-dev')
    plugins.push(iwsdkDev({
      emulator: { device: 'metaQuest3', environment: 'living_room' },
      ai: { tools: ['claude'] },
    }))
  }

  return {
    plugins,
    server: {
      host: '0.0.0.0',
      port: isQuest ? 8082 : 8081,
      open: !isQuest,
    },
    build: {
      outDir: 'dist',
      target: 'esnext',
      rollupOptions: { input: './index.html' },
    },
    esbuild: { target: 'esnext' },
    base: './',
  }
})
