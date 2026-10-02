const params = new URLSearchParams(window.location.search);

export const DEBUG = params.has('debug');
export const RENDERER_OVERRIDE = params.get('renderer');

const start = performance.now();
let panel: HTMLPreElement | null = null;

function describe(value: unknown): string {
    if (value instanceof Error) return `${value.name}: ${value.message}`;
    if (typeof value === 'string') return value;
    try {
        return JSON.stringify(value) ?? String(value);
    } catch {
        return String(value);
    }
}

export function diag(...parts: unknown[]): void {
    if (!panel) return;
    const time = ((performance.now() - start) / 1000).toFixed(2).padStart(6);
    panel.textContent += `${time}s  ${parts.map(describe).join(' ').slice(0, 400)}\n`;
    panel.scrollTop = panel.scrollHeight;
}

function describeWebGL(type: 'webgl2' | 'webgl'): void {
    try {
        const gl = document.createElement('canvas').getContext(type) as WebGLRenderingContext | null;
        if (!gl) {
            diag(`${type}: unavailable (null context)`);
            return;
        }
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        diag(`${type}: ok,`, ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
    } catch (error) {
        diag(`${type} threw:`, error);
    }
}

async function describeGpu(): Promise<void> {
    const gpu = (navigator as Navigator & {
        gpu?: { requestAdapter(options?: object): Promise<{ info?: Record<string, unknown>; features: Set<string> } | null> };
    }).gpu;
    if (!gpu) {
        diag('navigator.gpu: missing');
        return;
    }
    for (const [label, options] of [['gpu adapter', {}], ['gpu software adapter', { forceFallbackAdapter: true }]] as const) {
        try {
            const adapter = await gpu.requestAdapter(options);
            if (!adapter) {
                diag(`${label}: null`);
                continue;
            }
            const info = adapter.info ?? {};
            diag(`${label}:`, {
                vendor: info.vendor,
                architecture: info.architecture,
                device: info.device,
                description: info.description,
                features: adapter.features.size,
            });
        } catch (error) {
            diag(`${label} threw:`, error);
        }
    }
}

if (DEBUG) {
    panel = document.createElement('pre');
    panel.style.cssText = [
        'position:fixed', 'left:0', 'right:0', 'bottom:0', 'max-height:55vh', 'overflow:auto',
        'margin:0', 'padding:8px 10px', 'z-index:2147483647', 'background:rgba(0,0,0,0.88)',
        'color:#7CFC8A', 'font:11px/1.35 ui-monospace,Menlo,Consolas,monospace',
        'white-space:pre-wrap', 'word-break:break-word', 'user-select:text',
    ].join(';');
    document.documentElement.appendChild(panel);

    diag(navigator.userAgent);
    diag('viewport', `${window.innerWidth}x${window.innerHeight}`, 'dpr', window.devicePixelRatio,
        'renderer override:', RENDERER_OVERRIDE ?? 'none');

    for (const level of ['warn', 'error'] as const) {
        const forward = console[level].bind(console);
        console[level] = (...args: unknown[]): void => {
            diag(`[${level}]`, ...args);
            forward(...args);
        };
    }
    window.addEventListener('error', (event) => {
        diag('[window error]', event.message, `${event.filename}:${event.lineno}`);
    });
    window.addEventListener('unhandledrejection', (event) => {
        diag('[unhandled rejection]', event.reason);
    });

    describeWebGL('webgl2');
    describeWebGL('webgl');
    void describeGpu();
}
