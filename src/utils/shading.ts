import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { wgslFn, glslFn, output, normalView, normalWorld, positionViewDirection, vec3, vec4, float } from 'three/tsl';
import modelWgsl from '../shaders/model.wgsl?raw';
import modelGlsl from '../shaders/model.glsl?raw';
import saturationWgsl from '../shaders/saturation.wgsl?raw';
import saturationGlsl from '../shaders/saturation.glsl?raw';

const RIM_COLOR = new THREE.Color('#ffffff');
const BALLOON_RIM_POWER = 2.0;
const BALLOON_RIM_STRENGTH = 0.65;
const MODEL_RIM_POWER = 2.5;
const MODEL_RIM_STRENGTH = 0.45;

const CEL_LEVELS = 4.0;
const CEL_STRENGTH = 0.9;
const CEL_SOFTNESS = 0.45;

const MODEL_CEL_FLOOR = 0.66;
const MODEL_CEL_CEILING = 1.10;

const BALLOON_SATURATION = 1.3;
const MODEL_SATURATION = 1.35;

const MODEL_LIGHT_DIR = new THREE.Vector3(-10, 10, 5).normalize();

let useWgsl = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let modelFn: any = null;

let shaderGeneration = 0;

export function setShaderBackend(isWebGPU: boolean): void {
    if (modelFn !== null && useWgsl === isWebGPU) return;
    useWgsl = isWebGPU;
    modelFn = null;
    shaderGeneration += 1;
}

export function getShaderGeneration(): number {
    return shaderGeneration;
}

function getModelFn(): unknown {
    if (!modelFn) {
        modelFn = useWgsl
            ? wgslFn(modelWgsl, [wgslFn(saturationWgsl)])
            : glslFn(modelGlsl, [glslFn(saturationGlsl)]);
    }
    return modelFn;
}

const rimColorNode = vec3(RIM_COLOR.r, RIM_COLOR.g, RIM_COLOR.b);
const modelLightNode = vec3(MODEL_LIGHT_DIR.x, MODEL_LIGHT_DIR.y, MODEL_LIGHT_DIR.z);

export interface BalloonMaterialOptions {
    color: string;
    opacity: number;
}

export function createBalloonMaterial(options: BalloonMaterialOptions): MeshBasicNodeMaterial {
    const material = new MeshBasicNodeMaterial({
        color: new THREE.Color(options.color),
        transparent: true,
        opacity: options.opacity,
    });
    material.toneMapped = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shade = getModelFn() as any;
    material.outputNode = vec4(
        shade({
            baseColor: output.rgb,
            worldNormal: normalWorld,
            viewNormal: normalView,
            viewDir: positionViewDirection,
            lightDir: modelLightNode,
            celLevels: float(CEL_LEVELS),
            celStrength: float(CEL_STRENGTH),
            celSoftness: float(CEL_SOFTNESS),
            celFloor: float(MODEL_CEL_FLOOR),
            celCeiling: float(MODEL_CEL_CEILING),
            rimColor: rimColorNode,
            rimPower: float(BALLOON_RIM_POWER),
            rimStrength: float(BALLOON_RIM_STRENGTH),
            saturation: float(BALLOON_SATURATION),
        }),
        output.a
    );

    return material;
}

export function createModelMaterial(source: THREE.Material): MeshBasicNodeMaterial {
    const basic = source as THREE.MeshBasicMaterial;
    const material = new MeshBasicNodeMaterial();

    if (basic.map) material.map = basic.map;
    if (basic.color) material.color = basic.color;
    material.side = basic.side;
    material.transparent = basic.transparent;
    material.opacity = basic.opacity;
    material.alphaTest = basic.alphaTest;
    material.toneMapped = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shade = getModelFn() as any;
    material.outputNode = vec4(
        shade({
            baseColor: output.rgb,
            worldNormal: normalWorld,
            viewNormal: normalView,
            viewDir: positionViewDirection,
            lightDir: modelLightNode,
            celLevels: float(CEL_LEVELS),
            celStrength: float(CEL_STRENGTH),
            celSoftness: float(CEL_SOFTNESS),
            celFloor: float(MODEL_CEL_FLOOR),
            celCeiling: float(MODEL_CEL_CEILING),
            rimColor: rimColorNode,
            rimPower: float(MODEL_RIM_POWER),
            rimStrength: float(MODEL_RIM_STRENGTH),
            saturation: float(MODEL_SATURATION),
        }),
        output.a
    );

    return material;
}
