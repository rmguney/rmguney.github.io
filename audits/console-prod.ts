import { DIST_DIR, CONSOLE_SETTLE_MS, CONSOLE_ALLOWLIST, LIGHTHOUSE_BACKENDS } from './config.ts';
import { startStaticServer } from './static-server.ts';
import { captureConsole } from './capture-console.ts';
import { ensureBuild } from './proc.ts';
import { printResult, isMain, dim, bold, type CheckResult } from './report.ts';

export const name = 'Console clean (production build)';

const BACKEND_LAUNCH: Record<string, { args: string[]; headed: boolean }> = {
    webgpu: { args: ['--enable-unsafe-webgpu'], headed: true },
    webgl2: { args: ['--disable-features=WebGPU,WebGPUService'], headed: false },
};

export async function run(): Promise<CheckResult> {
    ensureBuild();
    const server = await startStaticServer(DIST_DIR);
    const lines: string[] = [];
    let pass = true;

    try {
        for (const backend of LIGHTHOUSE_BACKENDS) {
            const launch = BACKEND_LAUNCH[backend];
            const { messages, webgpuAdapter, activeBackend } = await captureConsole(server.url, {
                settleMs: CONSOLE_SETTLE_MS,
                allowlist: CONSOLE_ALLOWLIST,
                browserArgs: launch.args,
                headed: launch.headed,
            });

            lines.push(bold(backend));

            if (backend === 'webgpu' && !webgpuAdapter) {
                pass = false;
                lines.push('  no WebGPU adapter — this run did NOT exercise WebGPU');
            } else {
                lines.push(dim(`  adapter=${webgpuAdapter} canvasContext=${activeBackend}`));
            }

            if (messages.length === 0) {
                lines.push(dim('  no console errors, warnings, or failed requests'));
            } else {
                pass = false;
                for (const m of messages) lines.push(`  [${m.type}] ${m.text}`);
            }
        }
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
