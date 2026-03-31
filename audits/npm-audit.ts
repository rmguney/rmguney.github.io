import { execSync } from 'node:child_process';
import { ROOT } from './config.ts';
import { printResult, isMain, dim, type CheckResult } from './report.ts';

export const name = 'npm audit';

interface AuditReport {
    metadata?: { vulnerabilities?: Record<string, number> };
    vulnerabilities?: Record<string, { name: string; severity: string }>;
}

export async function run(): Promise<CheckResult> {
    let stdout: string | undefined;
    try {
        stdout = execSync('npm audit --json', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
        stdout = (err as { stdout?: string }).stdout;
        if (!stdout) throw err;
    }
    const report = JSON.parse(stdout) as AuditReport;
    const counts = report.metadata?.vulnerabilities ?? {};
    const total = counts.total ?? 0;
    if (total === 0) {
        return { name, pass: true, lines: [dim('0 vulnerabilities')] };
    }
    const breakdown = ['critical', 'high', 'moderate', 'low', 'info']
        .filter((sev) => (counts[sev] ?? 0) > 0)
        .map((sev) => `${counts[sev]} ${sev}`)
        .join(', ');
    const offenders = Object.values(report.vulnerabilities ?? {})
        .map((v) => `${v.name} (${v.severity})`)
        .slice(0, 10);
    return { name, pass: false, lines: [`${total} vulnerabilities: ${breakdown}`, ...offenders] };
}

if (isMain(import.meta.url)) {
    const result = await run();
    printResult(result);
    process.exit(result.pass ? 0 : 1);
}
