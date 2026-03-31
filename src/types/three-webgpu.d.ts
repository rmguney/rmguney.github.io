import type {
    Scene,
    Camera,
    MeshPhysicalMaterial,
    MeshPhysicalMaterialParameters,
    MeshBasicMaterial,
    MeshBasicMaterialParameters,
} from 'three';
import type { TSLNode } from 'three/tsl';

export interface WebGPURendererParameters {
    canvas?: HTMLCanvasElement;
    antialias?: boolean;
    alpha?: boolean;
    forceWebGL?: boolean;
}

export interface WebGPUBackend {
    isWebGPUBackend?: boolean;
}

export declare class WebGPURenderer {
    constructor(parameters?: WebGPURendererParameters);
    readonly backend?: WebGPUBackend;
    init(): Promise<void>;
    render(scene: Scene, camera: Camera): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    setPixelRatio(value: number): void;
}

export declare class MeshPhysicalNodeMaterial extends MeshPhysicalMaterial {
    constructor(parameters?: MeshPhysicalMaterialParameters);
    outputNode: TSLNode | null;
}

export declare class MeshBasicNodeMaterial extends MeshBasicMaterial {
    constructor(parameters?: MeshBasicMaterialParameters);
    outputNode: TSLNode | null;
}
