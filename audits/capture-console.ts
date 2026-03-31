import { chromium } from 'playwright';

export interface CapturedMessage {
    type: string;
    text: string;
}

export interface CaptureOptions {
    settleMs?: number;
    allowlist?: RegExp[];
    browserArgs?: string[];
    headed?: boolean;
}

export interface CaptureResult {
    messages: CapturedMessage[];
    webgpuAdapter: boolean;
    activeBackend: string;
}

export async function captureConsole(
    url: string,
    { settleMs = 6000, allowlist = [], browserArgs = [], headed = false }: CaptureOptions = {}
): Promise<CaptureResult> {
    const browser = await chromium.launch({
        headless: !headed,
        args: ['--enable-unsafe-swiftshader', ...browserArgs],
    });
    const page = await browser.newPage();
    const messages: CapturedMessage[] = [];
    const push = (type: string, text: string): void => {
        if (allowlist.some((re) => re.test(text))) return;
        messages.push({ type, text });
    };

    page.on('console', (msg) => {
        const type = msg.type();
        if (type !== 'error' && type !== 'warning') return;
        const { url: srcUrl, lineNumber } = msg.location();
        push(type, srcUrl ? `${msg.text()} (${srcUrl}:${lineNumber})` : msg.text());
    });
    page.on('pageerror', (err) => push('uncaught-exception', err.message));
    page.on('requestfailed', (req) => {
        const reason = req.failure()?.errorText ?? 'failed';
        if (reason === 'net::ERR_ABORTED') return;
        push('request-failed', `${reason} — ${req.url()}`);
    });
    page.on('response', (res) => {
        if (res.status() >= 400) push(`http-${res.status()}`, res.url());
    });

    let webgpuAdapter = false;
    let activeBackend = 'unknown';

    try {
        await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
        webgpuAdapter = await page.evaluate(async () => {
            const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
            if (!gpu) return false;
            try {
                return (await gpu.requestAdapter()) !== null;
            } catch {
                return false;
            }
        }).catch(() => false);
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
        await page.waitForTimeout(settleMs);
        activeBackend = await page.evaluate(() => {
            const c = document.querySelector('canvas');
            if (!c) return 'no-canvas';
            for (const type of ['webgpu', 'webgl2']) {
                try {
                    if (c.getContext(type as '2d') !== null) return type;
                } catch { /* context type unavailable */ }
            }
            return 'unknown';
        }).catch(() => 'unavailable');
        await page.mouse.wheel(0, 10_000).catch(() => {});
        await page.waitForTimeout(Math.ceil(settleMs / 2));
    } finally {
        await browser.close();
    }
    return { messages, webgpuAdapter, activeBackend };
}
