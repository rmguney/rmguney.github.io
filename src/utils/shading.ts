import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import {
    wgslFn, glslFn, output, normalView, normalWorld, positionViewDirection, positionGeometry,
    vec3, vec4, float, uniform, add, sub, mul, div, dot, abs, length, mix, smoothstep
} from 'three/tsl';
import type { TSLNode } from '../types/three-tsl';
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

const BALLOON_SATURATION = 1.12;
const MODEL_SATURATION = 1.12;

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

interface EyeDef {
    center: [number, number, number];
    radii: [number, number, number];
    skin: string;
}

const EYES: EyeDef[] = [
    { center: [-0.0922, 0.4390, 0.0649], radii: [0.0285, 0.0310, 0.0350], skin: '#efc761' },
    { center: [0.0302, 0.4266, 0.1217], radii: [0.0345, 0.0325, 0.0370], skin: '#edc459' },
];

const LID_EDGE = 0.10;
const LASH_WIDTH = 0.22;
const LASH_STRENGTH = 0.55;
const LASH_COLOR = new THREE.Color('#7a5a24');
const UP_NODE = vec3(0, 1, 0);

export const blinkAmount = uniform(0);

function eyelidBaseColor(base: TSLNode): TSLNode {
    let result = base;
    const lidY = sub(float(1.25), mul(blinkAmount, float(2.5)));
    const lashNode = vec3(LASH_COLOR.r, LASH_COLOR.g, LASH_COLOR.b);

    for (const eye of EYES) {
        const offset = sub(positionGeometry, vec3(...eye.center));
        const q = div(offset, vec3(...eye.radii));
        const inside = sub(float(1), smoothstep(float(0.90), float(1.04), length(q)));
        const qy = dot(q, UP_NODE);

        const covered = smoothstep(sub(lidY, float(LID_EDGE)), add(lidY, float(LID_EDGE)), qy);
        const lid = mul(inside, covered);

        const skin = new THREE.Color(eye.skin);
        result = mix(result, vec3(skin.r, skin.g, skin.b), lid);

        const nearEdge = sub(float(1), smoothstep(float(0), float(LASH_WIDTH), abs(sub(qy, lidY))));
        const lash = mul(mul(inside, nearEdge), float(LASH_STRENGTH));
        result = mix(result, lashNode, lash);
    }

    return result;
}

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
            baseColor: eyelidBaseColor(output.rgb),
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
