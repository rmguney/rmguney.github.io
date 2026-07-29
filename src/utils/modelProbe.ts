export interface ModelScreenState {
    x: number;
    y: number;
    radius: number;
    visible: boolean;
}

const state: ModelScreenState = { x: 0, y: 0, radius: 0, visible: false };

export function setModelScreen(x: number, y: number, radius: number, visible: boolean): void {
    state.x = x;
    state.y = y;
    state.radius = radius;
    state.visible = visible;
}

export function getModelScreen(): Readonly<ModelScreenState> {
    return state;
}
