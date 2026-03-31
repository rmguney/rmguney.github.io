export * from 'three/webgpu';
export { UniformsLib } from 'three/src/renderers/shaders/UniformsLib.js';
export { UniformsUtils } from 'three/src/renderers/shaders/UniformsUtils.js';
export { ShaderChunk } from 'three/src/renderers/shaders/ShaderChunk.js';
export { ShaderLib } from 'three/src/renderers/shaders/ShaderLib.js';

const unavailable = (name: string): never => {
    throw new Error(`${name} is not bundled: rendering through WebGPURenderer.`);
};

export class WebGLRenderer {
    constructor() {
        unavailable('WebGLRenderer');
    }
}

export class WebGLCubeRenderTarget {
    constructor() {
        unavailable('WebGLCubeRenderTarget');
    }
}
