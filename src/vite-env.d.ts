/// <reference types="vite/client" />

import '@react-three/fiber';

interface ImportMetaEnv {
    readonly VITE_HUB_TOKEN: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
