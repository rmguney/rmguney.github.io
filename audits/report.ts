import { pathToFileURL } from 'node:url';

export interface CheckResult {
    name: string;
    pass: boolean;
    lines?: string[];
    skipped?: boolean;
    skippedAlerts?: boolean;
}

const color = (code: number, text: string): string => `\x1b[${code}m${text}\x1b[0m`;

const green = (s: string): string => color(32, s);
const red = (s: string): string => color(31, s);
export const yellow = (s: string): string => color(33, s);
export const dim = (s: string): string => color(2, s);
export const bold = (s: string): string => color(1, s);

export function printResult(result: CheckResult): void {
    const badge = result.skipped
        ? yellow('SKIP')
        : result.pass
            ? green('PASS')
            : red('FAIL');
    console.log(`\n${badge} ${bold(result.name)}`);
    for (const line of result.lines ?? []) {
        console.log(`  ${line}`);
    }
}

export function printSummary(results: CheckResult[]): boolean {
    console.log(`\n${bold('── Summary ──')}`);
    for (const r of results) {
        const badge = r.skipped ? yellow('SKIP') : r.pass ? green('PASS') : red('FAIL');
        console.log(`${badge}  ${r.name}`);
    }
    const failed = results.filter((r) => !r.pass && !r.skipped);
    console.log(
        failed.length === 0
            ? `\n${green('All checks passed.')}`
            : `\n${red(`${failed.length} check(s) failed.`)}`
    );
    return failed.length === 0;
}

export function isMain(importMetaUrl: string): boolean {
    if (!process.argv[1]) return false;
    return importMetaUrl.toLowerCase() === pathToFileURL(process.argv[1]).href.toLowerCase();
}
