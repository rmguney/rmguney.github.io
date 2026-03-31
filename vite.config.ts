import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { rmSync } from 'node:fs'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'sw.ts',
            injectRegister: null,
            manifest: false,
            injectManifest: {
                globPatterns: ['**/*.{js,css,html,ico,svg,png,webp,txt,xml}'],
                globIgnores: ['sw.mjs'],
                maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
            },
        }),
        {
            name: 'remove-sw-build-intermediate',
            closeBundle() {
                rmSync('dist/sw.mjs', { force: true })
            },
        },
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
