import * as THREE from 'three';
import rimShader from '../shaders/rim.glsl?raw';
import celShader from '../shaders/cel.glsl?raw';
import celModelShader from '../shaders/cel-model.glsl?raw';
import celModelVertexShader from '../shaders/cel-model.vert.glsl?raw';

const RIM_COLOR = new THREE.Color('#ffffff');
const BALLOON_RIM_POWER = 2.0;
const BALLOON_RIM_STRENGTH = 1.1;
const MODEL_RIM_POWER = 2.5;
const MODEL_RIM_STRENGTH = 0.45;

const CEL_LEVELS = 5.0;
const CEL_STRENGTH = 0.8;
const CEL_SOFTNESS = 0.35;

const MODEL_CEL_LIGHT_DIR = new THREE.Vector3(10, 10, 10).normalize();

function applyCelShading(shader: THREE.WebGLProgramParametersWithUniforms): void {
    shader.uniforms.celLevels = { value: CEL_LEVELS };
    shader.uniforms.celStrength = { value: CEL_STRENGTH };
    shader.uniforms.celSoftness = { value: CEL_SOFTNESS };
    shader.fragmentShader = shader.fragmentShader
        .replace(
            '#include <common>',
            '#include <common>\nuniform float celLevels;\nuniform float celStrength;\nuniform float celSoftness;'
        )
        .replace('#include <opaque_fragment>', `${celShader}\n#include <opaque_fragment>`);
}

export function applyModelCelShading(shader: THREE.WebGLProgramParametersWithUniforms): void {
    shader.uniforms.celLevels = { value: CEL_LEVELS };
    shader.uniforms.celStrength = { value: CEL_STRENGTH };
    shader.uniforms.celSoftness = { value: CEL_SOFTNESS };
    shader.uniforms.celLightDir = { value: MODEL_CEL_LIGHT_DIR };
    shader.uniforms.rimColor = { value: RIM_COLOR };
    shader.uniforms.rimPower = { value: MODEL_RIM_POWER };
    shader.uniforms.rimStrength = { value: MODEL_RIM_STRENGTH };
    shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vCelNormal;\nvarying vec3 vCelViewDir;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>\n${celModelVertexShader}`);
    shader.fragmentShader = shader.fragmentShader
        .replace(
            '#include <common>',
            '#include <common>\nvarying vec3 vCelNormal;\nvarying vec3 vCelViewDir;\nuniform float celLevels;\nuniform float celStrength;\nuniform float celSoftness;\nuniform vec3 celLightDir;\nuniform vec3 rimColor;\nuniform float rimPower;\nuniform float rimStrength;'
        )
        .replace('#include <opaque_fragment>', `${celModelShader}\n#include <opaque_fragment>`);
}

export function applyBalloonShading(shader: THREE.WebGLProgramParametersWithUniforms): void {
    applyCelShading(shader);
    shader.uniforms.rimColor = { value: RIM_COLOR };
    shader.uniforms.rimPower = { value: BALLOON_RIM_POWER };
    shader.uniforms.rimStrength = { value: BALLOON_RIM_STRENGTH };
    shader.fragmentShader = shader.fragmentShader
        .replace(
            '#include <common>',
            '#include <common>\nuniform vec3 rimColor;\nuniform float rimPower;\nuniform float rimStrength;'
        )
        .replace('#include <opaque_fragment>', `${rimShader}\n#include <opaque_fragment>`);
}
