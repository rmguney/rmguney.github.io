import { chromium } from 'playwright';

export interface CapturedMessage {
    type: string;
    text: string;
}

export interface CaptureOptions {
    settleMs?: number;
    allowlist?: RegExp[];
}

export async function captureConsole(
    url: string,
    { settleMs = 6000, allowlist = [] }: CaptureOptions = {}
): Promise<CapturedMessage[]> {
    const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
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

    try {
        await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
        await page.waitForTimeout(settleMs);
        await page.mouse.wheel(0, 10_000);
        await page.waitForTimeout(Math.ceil(settleMs / 2));
    } finally {
        await browser.close();
    }
    return messages;
}
