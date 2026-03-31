import * as THREE from 'three';

const LUMA_W = 256;
const LUMA_H = 128;
const TWO_PI = Math.PI * 2;

let lumaMap: Float32Array | null = null;
let skyMesh: THREE.Mesh | null = null;
let probeCamera: THREE.Camera | null = null;

let uSign = 1;
let uOffset = 0;
let vFlip = false;

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const center = new THREE.Vector3();
const invQuat = new THREE.Quaternion();
const oc = new THREE.Vector3();
const hit = new THREE.Vector3();
const scratchVec = new THREE.Vector3();
let radius = 0;

function buildLumaMap(mesh: THREE.Mesh): void {
    const material = mesh.material as THREE.MeshBasicMaterial;
    const image = material.map?.image as CanvasImageSource | undefined;
    if (!image) return;

    const canvas = document.createElement('canvas');
    canvas.width = LUMA_W;
    canvas.height = LUMA_H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    try {
        ctx.drawImage(image, 0, 0, LUMA_W, LUMA_H);
    } catch {
        return;
    }

    const data = ctx.getImageData(0, 0, LUMA_W, LUMA_H).data;
    const map = new Float32Array(LUMA_W * LUMA_H);
    for (let i = 0; i < map.length; i++) {
        const o = i * 4;
        map[i] = (0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]) / 255;
    }
    lumaMap = map;
}

function fitUvConvention(mesh: THREE.Mesh): void {
    const position = mesh.geometry.getAttribute('position');
    const uv = mesh.geometry.getAttribute('uv');
    if (!position || !uv) return;

    const step = Math.max(1, Math.floor(position.count / 400));
    let bestScore = -Infinity;

    for (const sign of [1, -1]) {
        for (const flip of [false, true]) {
            let sumSin = 0;
            let sumCos = 0;
            let vError = 0;
            let n = 0;

            for (let i = 0; i < position.count; i += step) {
                scratchVec.set(position.getX(i), position.getY(i), position.getZ(i)).normalize();
                const theta = Math.atan2(scratchVec.z, scratchVec.x) / TWO_PI;
                const delta = (uv.getX(i) - sign * theta) * TWO_PI;
                sumSin += Math.sin(delta);
                sumCos += Math.cos(delta);

                const polar = Math.asin(THREE.MathUtils.clamp(scratchVec.y, -1, 1)) / Math.PI;
                const predicted = flip ? 0.5 + polar : 0.5 - polar;
                vError += Math.abs(predicted - uv.getY(i));
                n++;
            }

            if (n === 0) continue;
            const concentration = Math.hypot(sumSin, sumCos) / n;
            const score = concentration - vError / n;

            if (score > bestScore) {
                bestScore = score;
                uSign = sign;
                vFlip = flip;
                uOffset = Math.atan2(sumSin, sumCos) / TWO_PI;
            }
        }
    }
}

export function setSkyProbeMesh(mesh: THREE.Mesh): void {
    skyMesh = mesh;
    buildLumaMap(mesh);
    fitUvConvention(mesh);
}

export function setSkyProbeCamera(camera: THREE.Camera): void {
    probeCamera = camera;
}

export function beginSkySampling(): boolean {
    if (!lumaMap || !skyMesh || !probeCamera) return false;

    skyMesh.updateWorldMatrix(true, false);
    skyMesh.getWorldPosition(center);
    skyMesh.getWorldQuaternion(invQuat);
    invQuat.invert();

    if (!skyMesh.geometry.boundingSphere) skyMesh.geometry.computeBoundingSphere();
    const localRadius = skyMesh.geometry.boundingSphere?.radius ?? 0;
    skyMesh.getWorldScale(scratchVec);
    radius = localRadius * Math.max(scratchVec.x, scratchVec.y, scratchVec.z);

    return radius > 0;
}

export function skyLumaAtNdc(x: number, y: number): number | null {
    if (!lumaMap || !probeCamera || radius <= 0) return null;

    ndc.set(x, y);
    raycaster.setFromCamera(ndc, probeCamera);
    const ray = raycaster.ray;

    oc.copy(ray.origin).sub(center);
    const b = oc.dot(ray.direction);
    const c = oc.lengthSq() - radius * radius;
    const disc = b * b - c;
    if (disc < 0) return null;

    const t = -b + Math.sqrt(disc);
    if (t <= 0) return null;

    hit.copy(ray.direction).multiplyScalar(t).add(ray.origin).sub(center).normalize();
    hit.applyQuaternion(invQuat);

    let u = uSign * (Math.atan2(hit.z, hit.x) / TWO_PI) + uOffset;
    u -= Math.floor(u);

    const polar = Math.asin(THREE.MathUtils.clamp(hit.y, -1, 1)) / Math.PI;
    const v = vFlip ? 0.5 + polar : 0.5 - polar;

    const px = Math.min(LUMA_W - 1, Math.max(0, Math.floor(u * LUMA_W)));
    const py = Math.min(LUMA_H - 1, Math.max(0, Math.floor(v * LUMA_H)));
    return lumaMap[py * LUMA_W + px];
}
