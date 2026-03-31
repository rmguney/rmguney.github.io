import { DEV_SERVER_PORT, CONSOLE_SETTLE_MS, CONSOLE_ALLOWLIST, DEV_CONSOLE_ALLOWLIST } from './config.ts';
import { captureConsole } from './capture-console.ts';
import { startViteDev, waitForHttp, killTree } from './proc.ts';
import { printResult, isMain, dim, type CheckResult } from './report.ts';

export const name = 'Console clean (dev server)';

export async function run(): Promise<CheckResult> {
    const dev = startViteDev(DEV_SERVER_PORT);
    const url = `http://localhost:${DEV_SERVER_PORT}/`;
    try {
        await waitForHttp(url);
        const messages = await captureConsole(url, {
            settleMs: CONSOLE_SETTLE_MS,
            allowlist: [...CONSOLE_ALLOWLIST, ...DEV_CONSOLE_ALLOWLIST],
        });
        const pass = messages.length === 0;
        const lines = pass
            ? [dim('no console errors, warnings, or failed requests')]
            : messages.map((m) => `[${m.type}] ${m.text}`);
        return { name, pass, lines };
    } finally {
        killTree(dev);
    }
}

if (isMain(import.meta.url)) {
    const result = await run();
    printResult(result);
    process.exit(result.pass ? 0 : 1);
}
