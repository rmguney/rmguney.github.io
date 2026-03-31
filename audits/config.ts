import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ROOT = resolve(__dirname, '..');
export const DIST_DIR = resolve(ROOT, 'dist');
export const REPORT_DIR = resolve(ROOT, '.audit');

export const DEV_SERVER_PORT = 3001;

export const LIGHTHOUSE_BACKENDS = ['webgpu', 'webgl2'] as const;
export type LighthouseBackend = typeof LIGHTHOUSE_BACKENDS[number];

export type LighthouseFormFactor = 'desktop' | 'mobile';

export const LIGHTHOUSE_THRESHOLDS: Record<
    LighthouseBackend,
    Record<LighthouseFormFactor, Record<string, number>>
> = {
    webgpu: {
        desktop: {
            performance: 40,
            accessibility: 100,
            'best-practices': 100,
            seo: 100,
        },
        mobile: {
            performance: 30,
            accessibility: 100,
            'best-practices': 100,
            seo: 100,
        },
    },
    webgl2: {
        desktop: {
            performance: 80,
            accessibility: 100,
            'best-practices': 100,
            seo: 100,
        },
        mobile: {
            performance: 60,
            accessibility: 100,
            'best-practices': 100,
            seo: 100,
        },
    },
};

export const CONSOLE_SETTLE_MS = 6000;

export const CONSOLE_ALLOWLIST: RegExp[] = [
    /GL Driver Message.*GPU stall due to ReadPixels/i,
    /No available adapters/i,
    /WebGPU is not available, running under WebGL2 backend/i,
    /using deprecated parameters for the initialization function/i,
    /Failed to create WebGPU Context Provider/i,
];

export const DEV_CONSOLE_ALLOWLIST: RegExp[] = [
    /\[vite\] (connecting|connected)/i,
    /Download the React DevTools/i,
];
