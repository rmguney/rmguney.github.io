type StatKey = 'atk' | 'def' | 'spd';
type StatChange = { target: 'self' | 'foe'; key: StatKey; by: number };

type Move = {
    name: string;
    power: number;
    acc: number;
    pp: number;
    maxPp: number;
    priority?: boolean;
    para?: number;
    recoil?: number;
    stat?: StatChange;
    secondary?: { chance: number; stat: StatChange };
    heal?: number;
    sleepSelf?: number;
    recharge?: boolean;
};

type Mon = {
    name: string;
    level: number;
    hp: number;
    maxHp: number;
    sprite: readonly string[];
    tint: string;
    atk: number;
    def: number;
    spd: number;
    para: boolean;
    asleep: number;
    recharging: boolean;
    moves: Move[];
};

type Battle = { piki: Mon; foe: Mon; wave: number; defeated: number };

const MONO = 'font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.15;';

const INK = {
    piki: '#f6c343',
    foe: '#7fb2e5',
    text: '#d6d6d6',
    dim: '#8b8b8b',
    hit: '#ff6b6b',
    good: '#4dd0e1',
    zap: '#c792ea',
} as const;

const paint = (color: string, weight = 'normal'): string => `${MONO} color: ${color}; font-weight: ${weight};`;
const log = (text: string, color: string = INK.text, weight = 'normal'): void => {
    console.log(`%c${text}`, paint(color, weight));
};

const sleep = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms));
const rand = (a: number, b: number): number => a + Math.random() * (b - a);
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

const hpForLevel = (baseHp: number, level: number): number =>
    Math.floor((2 * baseHp * level) / 100) + level + 10;

function makePlayer(): Mon {
    const hp = hpForLevel(35, 99);
    return {
        name: 'PIKI', level: 99, hp, maxHp: hp,
        sprite: [
            '⠸⣷⣦⠤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⣠⣤⠀⠀⠀',
            '⠀⠙⣿⡄⠈⠑⢄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⠔⠊⠉⣿⡿⠁⠀⠀⠀',
            '⠀⠀⠈⠣⡀⠀⠀⠑⢄⠀⠀⠀⠀⠀⠀⠀⠀⠀⡠⠊⠁⠀⠀⣰⠟⠀⠀⠀⣀⣀',
            '⠀⠀⠀⠀⠈⠢⣄⠀⡈⠒⠊⠉⠁⠀⠈⠉⠑⠚⠀⠀⣀⠔⢊⣠⠤⠒⠊⠉⠀⡜',
            '⠀⠀⠀⠀⠀⠀⠀⡽⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠩⡔⠊⠁⠀⠀⠀⠀⠀⠀⠇',
            '⠀⠀⠀⠀⠀⠀⠀⡇⢠⡤⢄⠀⠀⠀⠀⠀⡠⢤⣄⠀⡇⠀⠀⠀⠀⠀⠀⠀⢰⠀',
            '⠀⠀⠀⠀⠀⠀⢀⠇⠹⠿⠟⠀⠀⠤⠀⠀⠻⠿⠟⠀⣇⠀⠀⡀⠠⠄⠒⠊⠁⠀',
            '⠀⠀⠀⠀⠀⠀⢸⣿⣿⡆⠀⠰⠤⠖⠦⠴⠀⢀⣶⣿⣿⠀⠙⢄⠀⠀⠀⠀⠀⠀',
            '⠀⠀⠀⠀⠀⠀⠀⢻⣿⠃⠀⠀⠀⠀⠀⠀⠀⠈⠿⡿⠛⢄⠀⠀⠱⣄⠀⠀⠀⠀',
            '⠀⠀⠀⠀⠀⠀⠀⢸⠈⠓⠦⠀⣀⣀⣀⠀⡠⠴⠊⠹⡞⣁⠤⠒⠉⠀⠀⠀⠀⠀',
            '⠀⠀⠀⠀⠀⠀⣠⠃⠀⠀⠀⠀⡌⠉⠉⡤⠀⠀⠀⠀⢻⠿⠆⠀⠀⠀⠀⠀⠀⠀',
            '⠀⠀⠀⠀⠀⠰⠁⡀⠀⠀⠀⠀⢸⠀⢰⠃⠀⠀⠀⢠⠀⢣⠀⠀⠀⠀⠀⠀⠀⠀',
            '⠀⠀⠀⢶⣗⠧⡀⢳⠀⠀⠀⠀⢸⣀⣸⠀⠀⠀⢀⡜⠀⣸⢤⣶⠀⠀⠀⠀⠀⠀',
            '⠀⠀⠀⠈⠻⣿⣦⣈⣧⡀⠀⠀⢸⣿⣿⠀⠀⢀⣼⡀⣨⣿⡿⠁⠀⠀⠀⠀⠀⠀',
            '⠀⠀⠀⠀⠀⠈⠻⠿⠿⠓⠄⠤⠘⠉⠙⠤⢀⠾⠿⣿⠟⠋',
        ],
        tint: INK.piki,
        atk: 0, def: 0, spd: 0, para: false, asleep: 0, recharging: false,
        moves: [
            { name: 'VOLT TACKLE', power: 120, acc: 1.0, pp: 15, maxPp: 15, recoil: 1 / 3, para: 0.1 },
            { name: 'QUICK ATTACK', power: 40, acc: 1.0, pp: 30, maxPp: 30, priority: true },
            { name: 'SURF', power: 90, acc: 1.0, pp: 15, maxPp: 15 },
            {
                name: 'PLAY ROUGH', power: 90, acc: 0.9, pp: 10, maxPp: 10,
                secondary: { chance: 0.1, stat: { target: 'foe', key: 'atk', by: -1 } },
            },
        ],
    };
}

function makeEnemy(wave: number): Mon {
    const step = wave - 1;
    const level = 50 + 4 * step;
    const hp = hpForLevel(160, level);
    return {
        name: 'SNORE', level, hp, maxHp: hp,
        sprite: [
            '⠀⠀⠀⠀⠀⠀⠀⣾⣶⣄⡀⡄⣀⣀⣴⣶⡄⠀⠀⠀⠀',
            '⠀⠀⠀⠀⠀⠀⢨⣧⡶⣼⣴⣦⣮⢿⣿⣿⠁⠀⠀⠀⠀',
            '⠀⠀⠀⠀⠀⠀⡁⠙⡿⠛⠉⠈⢿⣿⣿⣿⣧⠀⠀⠀⠀',
            '⠀⠀⠀⠀⢄⣦⠐⠂⠀⠐⠂⠀⠀⣿⣿⣿⣿⢀⡀⠀⠀',
            '⠀⠀⠀⠀⣿⣿⠈⠙⠛⠛⠉⣠⣰⣿⣿⣿⣿⣿⣿⣧⠀',
            '⠀⠀⠀⠀⡻⠋⠀⠀⠀ ⠀⠀⠸⣿⣿⣿⣿⣿⣿⡿⠀',
            '⠀⠀⠀⢀⠁⠀⠀⠀⠀⠀⠀⠀⠀⢹⣿⣿⣿⣿⣿⡅⠀',
            '⠀⠀⠀⡌⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⠀',
            '⠀⠀⠀⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣽⡆',
            '⠠⣰⡀⢴⠀⠀⠀⠀⠀⠀⠀⣰⣰⣿⣿⣿⣿⣿⣿⣯⠇',
            '⠀⢝⠒⣼⢳⣄⠀⡀⢀⣴⣾⣿⣿⡿⠋⠻⠩⢿⣿⠟⠀',
            '⠀⠀⠢⣈⣿⣿⣿⣿⣿⣿⣿⣿⣿⠁⠀⢀⣀⠀⢹⠀⠀',
            '⠀⠀⠀⠀⠉⠉⠁⠀⠉⠉⠙⠛⠛⠢⠴⠿⠿⠣⠁⠀⠀',
        ],
        tint: INK.foe,
        atk: 0, def: 0, spd: -1, para: false, asleep: 0, recharging: false,
        moves: [
            { name: 'BODY SLAM', power: 48, acc: 1.0, pp: 25, maxPp: 25, para: 0.15 },
            { name: 'AMNESIA', power: 0, acc: 1.0, pp: 20, maxPp: 20, stat: { target: 'self', key: 'def', by: 1 } },
            { name: 'REST', power: 0, acc: 1.0, pp: 1, maxPp: 1, heal: 1, sleepSelf: 2 },
            { name: 'HYPER BEAM', power: 75, acc: 0.9, pp: 5, maxPp: 5, recharge: true },
        ],
    };
}

const STRUGGLE: Move = { name: 'STRUGGLE', power: 30, acc: 1.0, pp: Infinity, maxPp: Infinity, recoil: 0.5 };
const stageMul = (s: number): number => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));

function hpBar(mon: Mon): string {
    const width = 20;
    const filled = Math.max(mon.hp > 0 ? 1 : 0, Math.round((mon.hp / mon.maxHp) * width));
    return `[${'|'.repeat(filled)}${'.'.repeat(width - filled)}] ${String(mon.hp).padStart(3)}/${mon.maxHp}`;
}

function statusTag(mon: Mon): string {
    const bits: string[] = [];
    if (mon.para) bits.push('PAR');
    if (mon.asleep > 0) bits.push('SLP');
    for (const key of ['atk', 'def', 'spd'] as const) {
        const v = mon[key];
        if (v !== 0) bits.push(`${key.toUpperCase()}${v > 0 ? '+' : ''}${v}`);
    }
    return bits.length ? `  ${bits.join(' ')}` : '';
}

function card(mon: Mon, label: string): string {
    const head = `${label}  Lv.${mon.level}${statusTag(mon)}`;
    return [head, hpBar(mon), '', ...mon.sprite].join('\n');
}

function scene(b: Battle): void {
    log('', INK.dim);
    log(`WAVE ${b.wave}   defeated: ${b.defeated}`, INK.dim);
    log(card(b.foe, `${b.foe.name} #${b.wave}`), b.foe.tint);
    log(card(b.piki, b.piki.name), b.piki.tint);
}

function menu(b: Battle): void {
    log('What will PIKI do?', INK.text, 'bold');
    b.piki.moves.forEach((m, i) => {
        const detail = m.power
            ? `pow ${String(m.power).padEnd(3)} acc ${`${Math.round(m.acc * 100)}%`.padEnd(4)}`
            : 'status'.padEnd(16);
        const row = `  _${i + 1}   ${m.name.padEnd(15)} ${detail}  PP ${String(m.pp).padStart(2)}/${m.maxPp}`;
        log(row, m.pp > 0 ? INK.text : INK.dim);
    });
    log('type _1 .. _4 + Enter to attack (or press 1-4 on the page), flee to walk away', INK.dim);
}

const landed = (move: Move, user: Mon): boolean => Math.random() < (user.para ? move.acc * 0.95 : move.acc);

function rollDamage(user: Mon, foe: Mon, move: Move): { dmg: number; crit: boolean } {
    const crit = Math.random() < 1 / 16;
    const power = ((2 * user.level) / 5 + 2) * move.power * (stageMul(user.atk) / stageMul(foe.def));
    let dmg = power / 50 + 2;
    dmg *= rand(0.85, 1.0);
    if (crit) dmg *= 1.8;
    return { dmg: Math.max(1, Math.round(dmg)), crit };
}

async function applyStat(user: Mon, foe: Mon, change: StatChange): Promise<void> {
    const t = change.target === 'self' ? user : foe;
    const before = t[change.key];
    t[change.key] = clamp(before + change.by, -6, 6);
    await sleep(260);
    if (t[change.key] === before) {
        log(`${t.name}'s ${change.key.toUpperCase()} won't go any ${change.by > 0 ? 'higher' : 'lower'}!`);
        return;
    }
    log(`${t.name}'s ${change.key.toUpperCase()} ${change.by > 0 ? 'rose' : 'fell'}!`, INK.good);
}

async function useMove(user: Mon, foe: Mon, move: Move): Promise<boolean> {
    log(`${user.name} used ${move.name}!`, user.tint, 'bold');
    if (Number.isFinite(move.pp)) move.pp--;
    await sleep(320);

    if (!landed(move, user)) {
        log(`${user.name}'s attack missed!`, INK.dim);
        return false;
    }

    if (move.heal) {
        const before = user.hp;
        user.hp = Math.min(user.maxHp, Math.round(user.hp + user.maxHp * move.heal));
        if (move.sleepSelf) {
            user.asleep = move.sleepSelf;
            user.para = false;
            log(`${user.name} went to sleep and became healthy!`, INK.good);
            await sleep(260);
        }
        log(`${user.name} restored ${user.hp - before} HP!   ${hpBar(user)}`, INK.good);
        return false;
    }

    if (move.power === 0) {
        if (move.stat) await applyStat(user, foe, move.stat);
        return false;
    }

    const { dmg, crit } = rollDamage(user, foe, move);
    foe.hp = Math.max(0, foe.hp - dmg);
    log(`${foe.name} took ${dmg} damage!   ${hpBar(foe)}`, INK.hit);
    if (crit) {
        await sleep(240);
        log('A critical hit!', INK.piki, 'bold');
    }

    if (move.recharge) user.recharging = true;

    if (move.recoil) {
        const back = Math.max(1, Math.round(dmg * move.recoil));
        user.hp = Math.max(0, user.hp - back);
        await sleep(260);
        log(`${user.name} is hit with recoil! (-${back})`, INK.hit);
    }

    if (foe.hp === 0) return true;

    if (move.secondary && Math.random() < move.secondary.chance) {
        await applyStat(user, foe, move.secondary.stat);
    }
    if (move.para && !foe.para && Math.random() < move.para) {
        foe.para = true;
        foe.spd = clamp(foe.spd - 1, -6, 6);
        await sleep(260);
        log(`${foe.name} is paralyzed! It may be unable to move!`, INK.zap);
    }
    return false;
}

async function takeTurn(user: Mon, foe: Mon, move: Move): Promise<boolean> {
    if (user.asleep > 0) {
        user.asleep--;
        log(`${user.name} is fast asleep!`, INK.dim);
        if (user.asleep === 0) {
            await sleep(260);
            log(`${user.name} woke up!`, INK.text);
        }
        return false;
    }
    if (user.recharging) {
        user.recharging = false;
        log(`${user.name} must recharge!`, INK.dim);
        return false;
    }
    if (user.para && Math.random() < 0.25) {
        log(`${user.name} is fully paralyzed and can't move!`, INK.zap);
        return false;
    }
    return useMove(user, foe, move);
}

function pickEnemyMove(foe: Mon, piki: Mon): Move {
    const [slam, amnesia, rest, beam] = foe.moves;
    if (rest.pp > 0 && foe.hp < foe.maxHp * 0.4) return rest;
    if (beam.pp > 0 && piki.hp < piki.maxHp * 0.5 && Math.random() < 0.45) return beam;
    if (foe.def < 2 && Math.random() < 0.3) return amnesia;
    if (beam.pp > 0 && Math.random() < 0.15) return beam;
    return slam;
}

function chooseMove(piki: Mon, index: number): Move | null {
    const move = piki.moves[index];
    if (move && move.pp > 0) return move;
    if (piki.moves.every((m) => m.pp <= 0)) return STRUGGLE;
    return null;
}

const speedOf = (mon: Mon, base: number, move: Move): number =>
    base * stageMul(mon.spd) + (move.priority ? 10_000 : 0);

type Command = { kind: 'move'; index: number } | { kind: 'flee' };

let awaitingInput: ((c: Command) => void) | null = null;

function submit(c: Command): void {
    if (!awaitingInput) {
        log('Not your turn yet.', INK.dim);
        return;
    }
    const resolve = awaitingInput;
    awaitingInput = null;
    resolve(c);
}

const nextCommand = (): Promise<Command> => new Promise((resolve) => { awaitingInput = resolve; });

function bindInput(): void {
    window.addEventListener('keydown', (e) => {
        if (!awaitingInput || e.ctrlKey || e.metaKey || e.altKey) return;
        const el = e.target as HTMLElement | null;
        if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
        if (e.key >= '1' && e.key <= '4') submit({ kind: 'move', index: Number(e.key) - 1 });
    });
}

async function nextWave(b: Battle): Promise<void> {
    b.defeated++;
    b.wave++;

    const healed = Math.min(b.piki.maxHp - b.piki.hp, Math.round(b.piki.maxHp * 0.15));
    if (healed > 0) {
        b.piki.hp += healed;
        log(`PIKI caught its breath. (+${healed} HP)`, INK.good);
    }
    b.piki.atk = 0;
    b.piki.def = 0;
    b.piki.spd = 0;
    b.piki.recharging = false;
    if (b.piki.para && Math.random() < 0.5) {
        b.piki.para = false;
        log('PIKI shook off its paralysis!', INK.good);
    }

    b.foe = makeEnemy(b.wave);
    await sleep(500);
    log('Another SNORE rolls in, blocking the path!', INK.foe, 'bold');
}

async function play(): Promise<void> {
    const b: Battle = { piki: makePlayer(), foe: makeEnemy(1), wave: 1, defeated: 0 };

    log('', INK.dim);
    log('A wild SNORE is blocking the path!', INK.text);
    log('Go! PIKI!', INK.piki, 'bold');

    for (; ;) {
        scene(b);
        menu(b);

        let move: Move | null = null;
        while (!move) {
            const cmd = await nextCommand();
            if (cmd.kind === 'flee') {
                log(`Got away safely. ${b.defeated} SNORE defeated.`, INK.dim);
                return;
            }
            move = chooseMove(b.piki, cmd.index);
            if (!move) log('No PP left for that move!', INK.hit);
        }

        const enemyMove = pickEnemyMove(b.foe, b.piki);
        const pikiFirst = speedOf(b.piki, 90, move) >= speedOf(b.foe, 30, enemyMove);
        const order: [Mon, Mon, Move][] = pikiFirst
            ? [[b.piki, b.foe, move], [b.foe, b.piki, enemyMove]]
            : [[b.foe, b.piki, enemyMove], [b.piki, b.foe, move]];

        for (const [user, foe, m] of order) {
            if (user.hp === 0 || foe.hp === 0) break;
            const knockedOut = await takeTurn(user, foe, m);
            if (knockedOut || user.hp === 0) break;
        }

        if (b.piki.hp === 0) {
            if (b.foe.hp === 0) b.defeated++;
            await sleep(400);
            log('PIKI fainted!', INK.piki, 'bold');
            log('Y O U   B L A C K E D   O U T', INK.hit, 'bold');
            log(`${b.defeated} SNORE defeated before falling. Final wave: ${b.wave}`, INK.dim);
            log('type again for a rematch', INK.dim);
            return;
        }
        if (b.foe.hp === 0) {
            await sleep(400);
            log('SNORE fainted!', INK.foe, 'bold');
            await nextWave(b);
        }
    }
}

declare global {
    interface Window {
        _1: undefined;
        _2: undefined;
        _3: undefined;
        _4: undefined;
        flee: undefined;
        again: undefined;
        __battleBooted?: boolean;
    }
}

let running = false;

function start(): void {
    if (running) {
        log('A battle is already in progress.', INK.dim);
        return;
    }
    running = true;
    void play().finally(() => { running = false; awaitingInput = null; });
}

function command(name: string, fire: () => void): void {
    Object.defineProperty(window, name, {
        get: (): undefined => { fire(); return undefined; },
        configurable: true,
    });
}

function boot(): void {
    for (let i = 1; i <= 4; i++) command(`_${i}`, () => submit({ kind: 'move', index: i - 1 }));
    command('flee', () => submit({ kind: 'flee' }));
    command('again', start);
    bindInput();
    start();
}

if (!window.__battleBooted) {
    window.__battleBooted = true;
    let armed = false;
    const arm = (): void => {
        if (armed) return;
        armed = true;
        window.setTimeout(boot, 50);
    };

    const elementProbe = document.createElement('img');
    Object.defineProperty(elementProbe, 'id', {
        get(): string { arm(); return 'piki'; },
    });

    const regexProbe = /piki/;
    regexProbe.toString = (): string => { arm(); return '/piki/'; };

    console.log('%c⚡', paint(INK.piki, 'bold'), elementProbe, regexProbe);
}

export { };
