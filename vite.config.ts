import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'
import { rmSync, readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'

const VERSIONED_ASSETS = [
    './public/models/model.glb',
    './public/models/skybox.glb',
    './public/models/skybox.opt.glb',
]

function assetVersion(): string {
    const hash = createHash('sha256')
    for (const rel of VERSIONED_ASSETS) {
        const path = fileURLToPath(new URL(rel, import.meta.url))
        if (existsSync(path)) hash.update(readFileSync(path))
    }
    return hash.digest('hex').slice(0, 8)
}

export default defineConfig({
    define: {
        __ASSET_VERSION__: JSON.stringify(assetVersion()),
    },
    resolve: {
        alias: [
            { find: /^three$/, replacement: fileURLToPath(new URL('./src/three-shim.ts', import.meta.url)) },
        ],
    },
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
        sourcemap: true,
    },
    server: {
        port: 3000,
        open: true,
    },
})
