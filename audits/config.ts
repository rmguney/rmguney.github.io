import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ROOT = resolve(__dirname, '..');
export const DIST_DIR = resolve(ROOT, 'dist');
export const REPORT_DIR = resolve(ROOT, '.audit');

export const DEV_SERVER_PORT = 3001;

export const LIGHTHOUSE_THRESHOLDS: Record<'desktop' | 'mobile', Record<string, number>> = {
    desktop: {
        performance: 80,
        accessibility: 95,
        'best-practices': 95,
        seo: 100,
    },
    mobile: {
        performance: 60,
        accessibility: 95,
        'best-practices': 95,
        seo: 100,
    },
};

export const CONSOLE_SETTLE_MS = 6000;

export const CONSOLE_ALLOWLIST: RegExp[] = [
    /GL Driver Message.*GPU stall due to ReadPixels/i,
];

export const DEV_CONSOLE_ALLOWLIST: RegExp[] = [
    /\[vite\] (connecting|connected)/i,
    /Download the React DevTools/i,
];
