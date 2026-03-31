import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, DIST_DIR } from './config.ts';

export function buildSite(): void {
    console.log('Building production bundle...');
    execSync('npm run build', { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] });
}

export function ensureBuild(): void {
    if (!existsSync(resolve(DIST_DIR, 'index.html'))) buildSite();
}

export function startViteDev(port: number): ChildProcess {
    const viteBin = resolve(ROOT, 'node_modules/vite/bin/vite.js');
    return spawn(process.execPath, [viteBin, '--port', String(port), '--strictPort'], {
        cwd: ROOT,
        env: { ...process.env, BROWSER: 'none' },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
}

export async function waitForHttp(url: string, timeoutMs = 30_000): Promise<void> {
    const start = Date.now();
    let lastError: unknown;
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(url);
            if (res.ok) return;
            lastError = new Error(`HTTP ${res.status}`);
        } catch (err) {
            lastError = err;
        }
        await new Promise((r) => setTimeout(r, 300));
    }
    const reason = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(`Timed out waiting for ${url}: ${reason}`);
}

export function killTree(child: ChildProcess): void {
    if (child.exitCode !== null) return;
    if (process.platform === 'win32') {
        try {
            execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
        } catch {
        }
    } else {
        child.kill('SIGTERM');
    }
}
