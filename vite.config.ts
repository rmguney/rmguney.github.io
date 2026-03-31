import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'sw.ts',
            injectRegister: null,
            manifest: false,
            injectManifest: {
                globPatterns: ['**/*.{js,css,html,ico,svg,png,webp,txt,xml}'],
                maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
            },
        }),
    ],
    base: '/',
    build: {
        outDir: 'dist',
    },
    server: {
        port: 3000,
        open: true,
    },
})
