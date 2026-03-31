type Listener = (value: number) => void;

let current = 0;
const listeners = new Set<Listener>();

export const loadProgress = {
    get: (): number => current,
    set(value: number): void {
        current = value;
        listeners.forEach((listener) => listener(value));
    },
    subscribe(listener: Listener): () => void {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    },
};
