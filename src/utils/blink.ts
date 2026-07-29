const CLOSE_SECONDS = 0.055;
const HOLD_SECONDS = 0.02;
const OPEN_SECONDS = 0.075;
const MIN_GAP = 2.6;
const MAX_GAP = 6.2;
const DOUBLE_BLINK_CHANCE = 0.22;
const DOUBLE_BLINK_GAP = 0.16;

const BLINK_SECONDS = CLOSE_SECONDS + HOLD_SECONDS + OPEN_SECONDS;
const TRIGGER_GAP = 1.1;

export class BlinkController {
    private timer = 0;
    private wait: number;
    private queued = 0;
    private clock = 0;
    private lastBlinkAt = -TRIGGER_GAP;

    constructor() {
        this.wait = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
    }

    trigger(): void {
        if (this.timer >= this.wait) return;
        if (this.clock - this.lastBlinkAt < TRIGGER_GAP) return;
        this.lastBlinkAt = this.clock;
        this.timer = this.wait;
    }

    private schedule(): void {
        if (this.queued > 0) {
            this.queued -= 1;
            this.wait = DOUBLE_BLINK_GAP;
            return;
        }
        this.queued = Math.random() < DOUBLE_BLINK_CHANCE ? 1 : 0;
        this.wait = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
    }

    update(delta: number): number {
        const step = Math.min(delta, 1 / 20);
        this.clock += step;
        const wasIdle = this.timer < this.wait;
        this.timer += step;

        if (this.timer < this.wait) return 0;
        if (wasIdle) this.lastBlinkAt = this.clock;

        const elapsed = this.timer - this.wait;
        if (elapsed >= BLINK_SECONDS) {
            this.timer = 0;
            this.schedule();
            return 0;
        }

        if (elapsed < CLOSE_SECONDS) {
            const t = elapsed / CLOSE_SECONDS;
            return t * t * (3 - 2 * t);
        }
        if (elapsed < CLOSE_SECONDS + HOLD_SECONDS) return 1;

        const t = (elapsed - CLOSE_SECONDS - HOLD_SECONDS) / OPEN_SECONDS;
        const eased = t * t * (3 - 2 * t);
        return 1 - eased;
    }
}
