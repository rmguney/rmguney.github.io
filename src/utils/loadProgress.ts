type Listener = (value: number) => void;
export type LoadPhase = 'assets' | 'scene' | 'repos';

const WEIGHTS: Record<LoadPhase, number> = {
    assets: 0.6,
    scene: 0.25,
    repos: 0.15,
};

const phases: Record<LoadPhase, number> = {
    assets: 0,
    scene: 0,
    repos: 0,
};

let current = 0;
const listeners = new Set<Listener>();

function emit(): void {
    const total = (Object.keys(WEIGHTS) as LoadPhase[])
        .reduce((sum, phase) => sum + phases[phase] * WEIGHTS[phase], 0) * 100;
    const next = Math.max(current, Math.min(100, total));
    if (next === current) return;
    current = next;
    listeners.forEach((listener) => listener(next));
}

export const loadProgress = {
    get: (): number => current,
    setPhase(phase: LoadPhase, value: number): void {
        phases[phase] = Math.max(0, Math.min(1, value));
        emit();
    },
    subscribe(listener: Listener): () => void {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    },
};
