import { DIST_DIR, CONSOLE_SETTLE_MS, CONSOLE_ALLOWLIST } from './config.ts';
import { startStaticServer } from './static-server.ts';
import { captureConsole } from './capture-console.ts';
import { ensureBuild } from './proc.ts';
import { printResult, isMain, dim, type CheckResult } from './report.ts';

export const name = 'Console clean (production build)';

export async function run(): Promise<CheckResult> {
    ensureBuild();
    const server = await startStaticServer(DIST_DIR);
    try {
        const messages = await captureConsole(server.url, {
            settleMs: CONSOLE_SETTLE_MS,
            allowlist: CONSOLE_ALLOWLIST,
        });
        const pass = messages.length === 0;
        const lines = pass
            ? [dim('no console errors, warnings, or failed requests')]
            : messages.map((m) => `[${m.type}] ${m.text}`);
        return { name, pass, lines };
    } finally {
        await server.close();
    }
}

if (isMain(import.meta.url)) {
    const result = await run();
    printResult(result);
    process.exit(result.pass ? 0 : 1);
}
