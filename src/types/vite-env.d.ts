/// <reference types="vite/client" />

import '@react-three/fiber';

interface ImportMetaEnv {
    readonly VITE_FORCE_WEBGL?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
