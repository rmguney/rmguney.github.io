import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import lighthouse from 'lighthouse';
import { launch as launchChrome } from 'chrome-launcher';
import { DIST_DIR, REPORT_DIR, LIGHTHOUSE_THRESHOLDS } from './config.ts';
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

export async function run(): Promise<CheckResult> {
    ensureBuild();
    mkdirSync(REPORT_DIR, { recursive: true });
    const server = await startStaticServer(DIST_DIR);
    const headed = process.env.AUDIT_HEADED === '1';
    const chrome = await launchChrome({
        chromePath: chromium.executablePath(),
        chromeFlags: [...(headed ? [] : ['--headless=new']), '--enable-unsafe-swiftshader'],
    });
    const lines: string[] = [];
    let pass = true;
    try {
        for (const [formFactor, thresholds] of Object.entries(LIGHTHOUSE_THRESHOLDS)) {
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
            if (!result) throw new Error(`Lighthouse returned no result for ${formFactor}`);

            const reportPath = resolve(REPORT_DIR, `lighthouse-${formFactor}.html`);
            writeFileSync(reportPath, Array.isArray(result.report) ? result.report[0] : result.report);

            lines.push(bold(formFactor));
            for (const [key, threshold] of Object.entries(thresholds)) {
                const category = result.lhr.categories[key];
                const score = Math.round((category?.score ?? 0) * 100);
                const okay = score >= threshold;
                if (!okay) pass = false;
                lines.push(`  ${okay ? '✓' : '✗'} ${category?.title ?? key}: ${score} (min ${threshold})`);
            }
            lines.push(dim(`  report: ${reportPath}`));
        }
        return { name, pass, lines };
    } finally {
        try {
            await chrome.kill();
        } catch {
        }
        await server.close();
    }
}

if (isMain(import.meta.url)) {
    const result = await run();
    printResult(result);
    process.exit(result.pass ? 0 : 1);
}
