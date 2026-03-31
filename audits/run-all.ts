import { buildSite } from './proc.ts';
import { printResult, printSummary, type CheckResult } from './report.ts';
import * as lighthouseCheck from './lighthouse.ts';
import * as consoleProd from './console-prod.ts';
import * as consoleDev from './console-dev.ts';
import * as dependabot from './dependabot.ts';
import * as npmAudit from './npm-audit.ts';

interface Check {
    name: string;
    run: () => Promise<CheckResult>;
}

const checks: Check[] = [lighthouseCheck, consoleProd, consoleDev, dependabot, npmAudit];

buildSite();

const results: CheckResult[] = [];
for (const check of checks) {
    process.stdout.write(`\nRunning: ${check.name}...`);
    try {
        results.push(await check.run());
    } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        results.push({ name: check.name, pass: false, lines: [reason] });
    }
    printResult(results[results.length - 1]);
}

const allPassed = printSummary(results);
process.exit(allPassed ? 0 : 1);
