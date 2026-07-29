import { useEffect, useRef, useState, type RefObject } from 'react';
import { beginSkySampling, skyLumaAtNdc } from '../utils/skyProbe';

const INK_BLACK = '#000000';

const SAMPLE_INTERVAL_MS = 120;
const LUMA_THRESHOLD = 0.5;
const LUMA_HYSTERESIS = 0.06;
const GRID_X = 5;
const GRID_Y = 4;
const TRANSITION_SECONDS = 0.6;

function grayHex(level: number): string {
    const eased = level * level * (3 - 2 * level);
    const value = Math.round(Math.min(1, Math.max(0, eased)) * 255);
    const channel = value.toString(16).padStart(2, '0');
    return `#${channel}${channel}${channel}`;
}

function largestCanvas(): HTMLCanvasElement | null {
    let best: HTMLCanvasElement | null = null;
    let bestArea = 0;
    for (const c of document.querySelectorAll('canvas')) {
        const area = c.width * c.height;
        if (area > bestArea) {
            bestArea = area;
            best = c as HTMLCanvasElement;
        }
    }
    return best;
}

export function useAdaptiveInk(target: RefObject<HTMLElement | null>): string {
    const [ink, setInk] = useState<string>(INK_BLACK);
    const overLight = useRef<boolean>(true);
    const level = useRef<number>(0);
    const raf = useRef<number>(0);

    useEffect(() => {
        const animate = (): void => {
            cancelAnimationFrame(raf.current);
            let last = performance.now();
            const tick = (now: number): void => {
                const dt = Math.min(0.1, (now - last) / 1000);
                last = now;
                const goal = overLight.current ? 0 : 1;
                const direction = Math.sign(goal - level.current);
                const next = level.current + direction * (dt / TRANSITION_SECONDS);
                const arrived = (goal - next) * direction <= 0;
                level.current = arrived ? goal : next;
                setInk(grayHex(level.current));
                if (!arrived) raf.current = requestAnimationFrame(tick);
            };
            raf.current = requestAnimationFrame(tick);
        };

        const sample = (): void => {
            if (document.hidden) return;
            const el = target.current;
            const canvas = largestCanvas();
            if (!el || !canvas || !beginSkySampling()) return;

            const view = canvas.getBoundingClientRect();
            const r = el.getBoundingClientRect();
            if (view.width < 1 || view.height < 1 || r.width < 1 || r.height < 1) return;

            let total = 0;
            let hits = 0;
            for (let iy = 0; iy < GRID_Y; iy++) {
                const cy = r.top + (r.height * (iy + 0.5)) / GRID_Y;
                const ny = -(((cy - view.top) / view.height) * 2 - 1);
                for (let ix = 0; ix < GRID_X; ix++) {
                    const cx = r.left + (r.width * (ix + 0.5)) / GRID_X;
                    const nx = ((cx - view.left) / view.width) * 2 - 1;
                    const luma = skyLumaAtNdc(nx, ny);
                    if (luma !== null) {
                        total += luma;
                        hits++;
                    }
                }
            }
            if (hits === 0) return;

            const luma = total / hits;
            const wasLight = overLight.current;
            const isLight = wasLight
                ? luma > LUMA_THRESHOLD - LUMA_HYSTERESIS
                : luma > LUMA_THRESHOLD + LUMA_HYSTERESIS;

            if (isLight !== wasLight) {
                overLight.current = isLight;
                animate();
            }
        };

        const id = window.setInterval(sample, SAMPLE_INTERVAL_MS);
        sample();
        return () => {
            window.clearInterval(id);
            cancelAnimationFrame(raf.current);
        };
    }, [target]);

    return ink;
}
