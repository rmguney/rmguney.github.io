import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import lighthouse from 'lighthouse';
import { launch as launchChrome } from 'chrome-launcher';
import { DIST_DIR, REPORT_DIR, LIGHTHOUSE_THRESHOLDS, LIGHTHOUSE_BACKENDS, type LighthouseBackend } from './config.ts';
import { startStaticServer } from './static-server.ts';
import { ensureBuild } from './proc.ts';
import { printResult, isMain, dim, bold, type CheckResult } from './report.ts';

export const name = 'Lighthouse (production build)';

const FORM_FACTOR_CONFIGS: Record<string, object | undefined> = {
    desktop: {
        extends: 'lighthouse:default',
        settings: {
            formFactor: 'desktop',
            screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
            throttling: {
                rttMs: 40,
                throughputKbps: 10_240,
                cpuSlowdownMultiplier: 1,
                requestLatencyMs: 0,
                downloadThroughputKbps: 0,
                uploadThroughputKbps: 0,
            },
            emulatedUserAgent:
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Chrome-Lighthouse',
        },
    },
    mobile: undefined,
};

const BACKEND_LAUNCH: Record<LighthouseBackend, { flags: string[]; headed: boolean }> = {
    webgpu: { flags: ['--enable-unsafe-webgpu'], headed: true },
    webgl2: { flags: ['--disable-features=WebGPU,WebGPUService'], headed: false },
};

// Probes the adapter inside the very Chrome that Lighthouse will measure, over CDP.
// Launching a separate browser here used to leave the machine busy exactly as the first
// measurement began, and left the measuring Chrome cold; navigating the page here warms it.
async function backendIsActive(port: number, url: string): Promise<boolean> {
    const browser = await chromium.connectOverCDP('http://localhost:' + port);
    try {
        const context = browser.contexts()[0] ?? await browser.newContext();
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        const active = await page.evaluate(async () => {
            if (!navigator.gpu) return false;
            try {
                return !!(await navigator.gpu.requestAdapter());
            } catch {
                return false;
            }
        });
        await page.close();
        return active;
    } finally {
        await browser.close();
    }
}

export async function run(): Promise<CheckResult> {
    ensureBuild();
    mkdirSync(REPORT_DIR, { recursive: true });
    const server = await startStaticServer(DIST_DIR);
    const lines: string[] = [];
    let pass = true;

    try {
        for (const backend of LIGHTHOUSE_BACKENDS) {
            const launch = BACKEND_LAUNCH[backend];
            const flags = [
                ...(launch.headed ? [] : ['--headless=new']),
                '--enable-unsafe-swiftshader',
                ...launch.flags,
            ];
            const chrome = await launchChrome({
                chromePath: chromium.executablePath(),
                chromeFlags: flags,
            });

            try {
                const gpuAvailable = await backendIsActive(chrome.port, server.url);
                const expected = backend === 'webgpu';

                lines.push(bold(backend));
                if (gpuAvailable !== expected) {
                    pass = false;
                    lines.push(`  WebGPU adapter ${gpuAvailable ? 'present' : 'absent'} - this row did NOT exercise ${backend}`);
                } else {
                    lines.push(dim(`  adapter=${gpuAvailable}`));
                }

                for (const [formFactor, thresholds] of Object.entries(LIGHTHOUSE_THRESHOLDS[backend])) {
                    const result = await lighthouse(
                        server.url,
                        {
                            port: chrome.port,
                            output: ['html'],
                            logLevel: 'error',
                            onlyCategories: Object.keys(thresholds),
                        },
                        FORM_FACTOR_CONFIGS[formFactor]
                    );
                    if (!result) throw new Error(`Lighthouse returned no result for ${backend}/${formFactor}`);

                    const reportPath = resolve(REPORT_DIR, `lighthouse-${backend}-${formFactor}.html`);
                    writeFileSync(reportPath, Array.isArray(result.report) ? result.report[0] : result.report);

                    lines.push(`  ${bold(formFactor)}`);
                    for (const [key, threshold] of Object.entries(thresholds)) {
                        const category = result.lhr.categories[key];
                        const score = Math.round((category?.score ?? 0) * 100);
                        const okay = score >= threshold;
                        if (!okay) pass = false;
                        const label = `${category?.title ?? key}: ${score} (min ${threshold})`;
                        lines.push(`    ${okay ? '✓' : '✗'} ${label}`);
                    }
                    lines.push(dim(`    report: ${reportPath}`));
                }
            } finally {
                try {
                    await chrome.kill();
                } catch {
                }
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
