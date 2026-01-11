/// <reference types="vite/client" />

// Global JSX namespace extension for React Three Fiber
import '@react-three/fiber';

interface ImportMetaEnv {
    readonly VITE_HUB_TOKEN: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
