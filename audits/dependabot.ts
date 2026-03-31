import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './config.ts';
import { printResult, isMain, dim, yellow, type CheckResult } from './report.ts';

export const name = 'Dependabot';

interface DependabotAlert {
    security_advisory?: { severity?: string; summary?: string };
    dependency?: { package?: { name?: string } };
}

function repoSlug(): string | null {
    const remote = execSync('git remote get-url origin', { cwd: ROOT, encoding: 'utf8' }).trim();
    const match = remote.match(/github\.com[:/]+([^/]+)\/(.+?)(?:\.git)?$/);
    return match ? `${match[1]}/${match[2]}` : null;
}

export async function run(): Promise<CheckResult> {
    const lines: string[] = [];
    let pass = true;

    const configPath = resolve(ROOT, '.github/dependabot.yml');
    if (existsSync(configPath) && readFileSync(configPath, 'utf8').includes('package-ecosystem')) {
        lines.push('✓ .github/dependabot.yml present');
    } else {
        pass = false;
        lines.push('✗ .github/dependabot.yml missing or has no package-ecosystem entries');
    }

    let skippedAlerts = false;
    try {
        const slug = repoSlug();
        if (!slug) throw new Error('origin remote is not a GitHub repo');
        const raw = execSync(`gh api "repos/${slug}/dependabot/alerts?state=open&per_page=100"`, {
            cwd: ROOT,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        const alerts = JSON.parse(raw) as DependabotAlert[];
        if (alerts.length === 0) {
            lines.push('✓ no open Dependabot alerts');
        } else {
            pass = false;
            lines.push(`✗ ${alerts.length} open Dependabot alert(s):`);
            for (const alert of alerts.slice(0, 10)) {
                lines.push(
                    `  ${alert.security_advisory?.severity ?? '?'} — ${alert.dependency?.package?.name ?? '?'}: ${alert.security_advisory?.summary ?? ''}`
                );
            }
        }
    } catch (err) {
        skippedAlerts = true;
        const reason = err instanceof Error ? err.message : String(err);
        lines.push(yellow('~ open-alerts check skipped (gh CLI unavailable, unauthenticated, or alerts disabled)'));
        lines.push(dim(`  ${reason.split('\n')[0]}`));
    }

    return { name, pass, lines, skippedAlerts };
}

if (isMain(import.meta.url)) {
    const result = await run();
    printResult(result);
    process.exit(result.pass ? 0 : 1);
}
