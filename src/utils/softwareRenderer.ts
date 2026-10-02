import * as THREE from 'three';
import { getSkyMapping } from './skyProbe';
import {
    MODEL_LIGHT_DIR, CEL_LEVELS, CEL_STRENGTH, CEL_SOFTNESS, MODEL_CEL_FLOOR, MODEL_CEL_CEILING,
    MODEL_RIM_POWER, MODEL_RIM_STRENGTH, MODEL_SATURATION,
    BALLOON_RIM_POWER, BALLOON_RIM_STRENGTH, BALLOON_SATURATION,
    EYES, LID_EDGE, LASH_WIDTH, LASH_STRENGTH, LASH_COLOR, blinkAmount,
} from './shading';

// Canvas 2D renderer for browsers that expose no GPU API at all (no WebGPU, no WebGL).
// It draws the same scene graph the GPU renderers do: the sky sphere by ray lookup,
// balloons as shaded sprites and skinned meshes through a z-buffered rasterizer.

export interface BalloonShape {
    radius: number;
    knotY: number;
    knotScale: number;
}

const SKY_SCALE = 2;
const SKY_CELL = 8;
const SKY_TEXTURE_MAX_WIDTH = 4096;
const SKY_SPIN_EPSILON = 2.5e-7;
const SPRITE_SIZE = 128;
const SPRITE_RADIUS = SPRITE_SIZE / 2 - 1;
const LIGHT_EPSILON = 1e-3;
const LUT_SIZE = 1024;
const MODEL_BUFFER_STEP = 128;
const SLOW_FRAME_MS = 30;
const SLOW_FRAME_WINDOW = 30;
const TWO_PI = Math.PI * 2;
const BLINK_EPSILON = 1e-3;
// triangles this far out (in eye radii) can still overlap the eyelid ellipsoid
const EYE_REACH = 2;

const eyeSkins = EYES.map((eye) => new THREE.Color(eye.skin));

const srgbToLinear = new Float32Array(256);
for (let i = 0; i < 256; i++) {
    const c = i / 255;
    srgbToLinear[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

const LINEAR_STEPS = 4095;
const linearToSrgb = new Uint8Array(LINEAR_STEPS + 1);
for (let i = 0; i <= LINEAR_STEPS; i++) {
    const c = i / LINEAR_STEPS;
    const s = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    linearToSrgb[i] = Math.round(s * 255);
}

function encode(value: number): number {
    return linearToSrgb[value >= 1 ? LINEAR_STEPS : value <= 0 ? 0 : (value * LINEAR_STEPS) | 0];
}

function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

// mirrors the cel banding of shaders/model.glsl, indexed by half-lambert
const celLut = new Float32Array(LUT_SIZE + 1);
for (let i = 0; i <= LUT_SIZE; i++) {
    const bandPos = (i / LUT_SIZE) * CEL_LEVELS;
    const bandIndex = Math.floor(bandPos);
    const bandStep = smoothstep(0.5 - CEL_SOFTNESS * 0.5, 0.5 + CEL_SOFTNESS * 0.5, bandPos - bandIndex);
    const banded = Math.min(1, Math.max(0, (bandIndex + bandStep + 0.5) / CEL_LEVELS));
    const shade = MODEL_CEL_FLOOR + (MODEL_CEL_CEILING - MODEL_CEL_FLOOR) * banded;
    celLut[i] = 1 + (shade - 1) * CEL_STRENGTH;
}

function rimLut(power: number, strength: number): Float32Array {
    const lut = new Float32Array(LUT_SIZE + 1);
    for (let i = 0; i <= LUT_SIZE; i++) lut[i] = Math.pow(i / LUT_SIZE, power) * strength;
    return lut;
}

const modelRimLut = rimLut(MODEL_RIM_POWER, MODEL_RIM_STRENGTH);
const balloonRimLut = rimLut(BALLOON_RIM_POWER, BALLOON_RIM_STRENGTH);

function readPixels(image: CanvasImageSource, width: number, height: number): Uint8ClampedArray | null {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    try {
        ctx.drawImage(image, 0, 0, width, height);
        return ctx.getImageData(0, 0, width, height).data;
    } catch {
        return null;
    }
}

interface SkinnedCache {
    count: number;
    position: Float32Array;
    normal: Float32Array;
    uv: Float32Array;
    skinIndex: Uint16Array;
    skinWeight: Float32Array;
    index: Uint32Array;
    rawPosition: Float32Array;
    eyeTriangle: Uint8Array;
    screenX: Float32Array;
    screenY: Float32Array;
    depth: Float32Array;
    lambert: Float32Array;
    fresnel: Float32Array;
    textureSource: unknown;
    texture: Float32Array | null;
    textureWidth: number;
    textureHeight: number;
}

interface ModelRect {
    x: number;
    y: number;
    w: number;
    h: number;
    sw: number;
    sh: number;
    depth: number;
}

interface BalloonDraw {
    depth: number;
    x: number;
    y: number;
    a: number;
    b: number;
    c: number;
    d: number;
    knotX: number;
    knotY: number;
    knotScale: number;
    opacity: number;
    sprite: HTMLCanvasElement;
}

const viewProjection = new THREE.Matrix4();
const skinMatrix = new THREE.Matrix4();
const boneMatrix = new THREE.Matrix4();
const cameraPosition = new THREE.Vector3();
const skyCenter = new THREE.Vector3();
const skyQuat = new THREE.Quaternion();
const skyInvQuat = new THREE.Quaternion();
const skyScale = new THREE.Vector3();
const basisRight = new THREE.Vector3();
const basisUp = new THREE.Vector3();
const basisForward = new THREE.Vector3();
const skyOrigin = new THREE.Vector3();
const scratch = new THREE.Vector3();
const lightView = new THREE.Vector3();

export class SoftwareRenderer {
    readonly isSoftwareRenderer = true;
    readonly domElement: HTMLCanvasElement;
    outputColorSpace: string = THREE.SRGBColorSpace;
    toneMapping: number = THREE.NoToneMapping;

    private ctx: CanvasRenderingContext2D;
    private width = 1;
    private height = 1;

    private skyCanvas: HTMLCanvasElement = document.createElement('canvas');
    private skyCtx: CanvasRenderingContext2D | null = null;
    private skyImage: ImageData | null = null;
    private skyPixels: Uint32Array | null = null;
    private skyGridU = new Float32Array(0);
    private skyGridV = new Float32Array(0);
    private skyTexture: Uint32Array | null = null;
    private skyTextureWidth = 0;
    private skyTextureHeight = 0;
    private skyTextureSource: unknown = null;
    private skyKey = new Float64Array(22);
    private skyValid = false;

    private skinned = new WeakMap<THREE.BufferGeometry, SkinnedCache>();
    private boneWorld = new Float32Array(0);
    private modelCanvas: HTMLCanvasElement = document.createElement('canvas');
    private modelCtx: CanvasRenderingContext2D | null = null;
    private modelImage: ImageData | null = null;
    private modelPixels: Uint32Array | null = null;
    private modelDepth = new Float32Array(0);
    private supersample = 2;
    private slowFrames = 0;
    private frameSamples = 0;

    private sprites = new Map<string, HTMLCanvasElement>();
    private spriteLight = new THREE.Vector3(2, 2, 2);
    private balloons: BalloonDraw[] = [];
    private skinnedMeshes: THREE.SkinnedMesh[] = [];

    constructor(canvas: HTMLCanvasElement) {
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('Canvas 2D context is unavailable');
        this.domElement = canvas;
        this.ctx = ctx;
    }

    // rendering at CSS resolution keeps the per-pixel work affordable on a CPU
    setPixelRatio(): void { }

    setSize(width: number, height: number, updateStyle = true): void {
        const w = Math.max(1, Math.floor(width));
        const h = Math.max(1, Math.floor(height));
        if (w !== this.width || h !== this.height || this.domElement.width !== w || this.domElement.height !== h) {
            this.width = w;
            this.height = h;
            this.domElement.width = w;
            this.domElement.height = h;
            this.skyValid = false;
        }
        if (updateStyle) {
            this.domElement.style.width = `${width}px`;
            this.domElement.style.height = `${height}px`;
        }
    }

    dispose(): void {
        this.sprites.clear();
        this.skyTexture = null;
        this.skyPixels = null;
        this.modelPixels = null;
    }

    render(scene: THREE.Scene, camera: THREE.Camera): void {
        const started = performance.now();
        const ctx = this.ctx;
        const width = this.width;
        const height = this.height;

        scene.updateMatrixWorld();
        if (camera.parent === null) camera.updateMatrixWorld();
        viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        cameraPosition.setFromMatrixPosition(camera.matrixWorld);

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        if (this.drawSky(camera)) {
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(this.skyCanvas, 0, 0, width, height);
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
        }

        this.collect(scene, camera);

        let modelDepth = Infinity;
        let modelRect: ModelRect | null = null;
        for (const mesh of this.skinnedMeshes) {
            const result = this.rasterizeSkinned(mesh);
            if (result) {
                modelDepth = result.depth;
                modelRect = result;
            }
        }

        const balloons = this.balloons;
        balloons.sort((p, q) => q.depth - p.depth);
        let i = 0;
        for (; i < balloons.length && balloons[i].depth > modelDepth; i++) this.drawBalloon(balloons[i]);
        if (modelRect) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalAlpha = 1;
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(this.modelCanvas, 0, 0, modelRect.sw, modelRect.sh, modelRect.x, modelRect.y, modelRect.w, modelRect.h);
        }
        for (; i < balloons.length; i++) this.drawBalloon(balloons[i]);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;

        if (this.supersample > 1) {
            this.frameSamples++;
            if (performance.now() - started > SLOW_FRAME_MS) this.slowFrames++;
            if (this.frameSamples >= SLOW_FRAME_WINDOW) {
                if (this.slowFrames > SLOW_FRAME_WINDOW / 2) this.supersample = 1;
                this.frameSamples = 0;
                this.slowFrames = 0;
            }
        }
    }

    private collect(scene: THREE.Scene, camera: THREE.Camera): void {
        const balloons = this.balloons;
        const skinned = this.skinnedMeshes;
        balloons.length = 0;
        skinned.length = 0;

        const view = camera.matrixWorldInverse.elements;
        const projection = camera.projectionMatrix.elements;
        const focalX = projection[0] * this.width * 0.5;
        const focalY = projection[5] * this.height * 0.5;
        const near = (camera as THREE.PerspectiveCamera).near ?? 0.1;

        lightView.copy(MODEL_LIGHT_DIR).transformDirection(camera.matrixWorldInverse);
        if (lightView.distanceToSquared(this.spriteLight) > LIGHT_EPSILON * LIGHT_EPSILON) {
            this.spriteLight.copy(lightView);
            this.sprites.clear();
        }

        scene.traverseVisible((object) => {
            const mesh = object as THREE.Mesh;
            if (!mesh.isMesh) return;
            if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
                skinned.push(mesh as THREE.SkinnedMesh);
                return;
            }
            const shape = mesh.geometry.userData.balloon as BalloonShape | undefined;
            if (!shape) return;

            const m = mesh.matrixWorld.elements;
            const vx = view[0] * m[12] + view[4] * m[13] + view[8] * m[14] + view[12];
            const vy = view[1] * m[12] + view[5] * m[13] + view[9] * m[14] + view[13];
            const vz = view[2] * m[12] + view[6] * m[13] + view[10] * m[14] + view[14];
            const depth = -vz;
            if (depth <= near + shape.radius) return;

            // rows of (view rotation * world linear part); row 1 is negated for y-down screen space
            const p00 = view[0] * m[0] + view[4] * m[1] + view[8] * m[2];
            const p01 = view[0] * m[4] + view[4] * m[5] + view[8] * m[6];
            const p02 = view[0] * m[8] + view[4] * m[9] + view[8] * m[10];
            const p10 = -(view[1] * m[0] + view[5] * m[1] + view[9] * m[2]);
            const p11 = -(view[1] * m[4] + view[5] * m[5] + view[9] * m[6]);
            const p12 = -(view[1] * m[8] + view[5] * m[9] + view[9] * m[10]);

            // silhouette of the scaled sphere is the ellipse P Pᵀ, its symmetric root keeps
            // the sprite's lighting upright while still showing the wobble stretch
            const q00 = p00 * p00 + p01 * p01 + p02 * p02;
            const q01 = p00 * p10 + p01 * p11 + p02 * p12;
            const q11 = p10 * p10 + p11 * p11 + p12 * p12;
            const det = Math.sqrt(Math.max(0, q00 * q11 - q01 * q01));
            const trace = Math.sqrt(q00 + q11 + 2 * det);
            if (!(trace > 0)) return;

            const pixels = (shape.radius * focalY) / depth / SPRITE_RADIUS;
            const x = this.width * 0.5 + (vx * focalX) / depth;
            const y = this.height * 0.5 - (vy * focalY) / depth;
            const reach = pixels * SPRITE_SIZE * Math.sqrt(Math.max(q00, q11));
            if (x + reach < 0 || x - reach > this.width || y + reach < 0 || y - reach > this.height) return;

            const material = mesh.material as THREE.MeshBasicMaterial;
            const kx = m[4] * shape.knotY;
            const ky = m[5] * shape.knotY;
            const kz = m[6] * shape.knotY;
            const knotDepth = depth - (view[2] * kx + view[6] * ky + view[10] * kz);

            const wa = ((q00 + det) / trace) * pixels;
            const wb = (q01 / trace) * pixels;
            const wd = ((q11 + det) / trace) * pixels;

            // a wide field of view stretches off-axis spheres along the screen radius
            const tx = vx / depth;
            const ty = -vy / depth;
            const tan2 = tx * tx + ty * ty;
            const stretch = tan2 > 1e-8 ? (Math.sqrt(1 + tan2) - 1) / tan2 : 0;
            const s00 = 1 + stretch * tx * tx;
            const s01 = stretch * tx * ty;
            const s11 = 1 + stretch * ty * ty;

            balloons.push({
                depth,
                x,
                y,
                a: s00 * wa + s01 * wb,
                b: s01 * wa + s11 * wb,
                c: s00 * wb + s01 * wd,
                d: s01 * wb + s11 * wd,
                knotX: this.width * 0.5 + ((vx + view[0] * kx + view[4] * ky + view[8] * kz) * focalX) / knotDepth,
                knotY: this.height * 0.5 - ((vy + view[1] * kx + view[5] * ky + view[9] * kz) * focalY) / knotDepth,
                knotScale: shape.knotScale,
                opacity: material.opacity,
                sprite: this.spriteFor(material.color),
            });
        });
    }

    private drawBalloon(balloon: BalloonDraw): void {
        const ctx = this.ctx;
        const half = SPRITE_SIZE / 2;
        const k = balloon.knotScale;
        ctx.globalAlpha = balloon.opacity;
        ctx.setTransform(balloon.a * k, balloon.b * k, balloon.c * k, balloon.d * k, balloon.knotX, balloon.knotY);
        ctx.drawImage(balloon.sprite, -half, -half);
        ctx.setTransform(balloon.a, balloon.b, balloon.c, balloon.d, balloon.x, balloon.y);
        ctx.drawImage(balloon.sprite, -half, -half);
    }

    private spriteFor(color: THREE.Color): HTMLCanvasElement {
        const key = color.getHexString();
        let sprite = this.sprites.get(key);
        if (sprite) return sprite;

        sprite = document.createElement('canvas');
        sprite.width = SPRITE_SIZE;
        sprite.height = SPRITE_SIZE;
        const ctx = sprite.getContext('2d');
        if (ctx) {
            const image = ctx.createImageData(SPRITE_SIZE, SPRITE_SIZE);
            const data = image.data;
            const light = this.spriteLight;
            const center = SPRITE_SIZE / 2;
            for (let y = 0; y < SPRITE_SIZE; y++) {
                for (let x = 0; x < SPRITE_SIZE; x++) {
                    const nx = (x + 0.5 - center) / SPRITE_RADIUS;
                    const ny = -(y + 0.5 - center) / SPRITE_RADIUS;
                    const d2 = nx * nx + ny * ny;
                    const dist = Math.sqrt(d2);
                    const coverage = (1 - dist) * SPRITE_RADIUS + 0.5;
                    if (coverage <= 0) continue;
                    const nz = d2 < 1 ? Math.sqrt(1 - d2) : 0;
                    const scale = d2 < 1 ? 1 : 1 / dist;
                    const lambert = (nx * light.x + ny * light.y) * scale + nz * light.z;
                    const mul = celLut[Math.min(LUT_SIZE, Math.max(0, ((lambert * 0.5 + 0.5) * LUT_SIZE) | 0))];
                    const rim = balloonRimLut[Math.min(LUT_SIZE, Math.max(0, ((1 - nz) * LUT_SIZE) | 0))];
                    let r = color.r * mul + rim;
                    let g = color.g * mul + rim;
                    let b = color.b * mul + rim;
                    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                    r = luma + (r - luma) * BALLOON_SATURATION;
                    g = luma + (g - luma) * BALLOON_SATURATION;
                    b = luma + (b - luma) * BALLOON_SATURATION;
                    const o = (y * SPRITE_SIZE + x) * 4;
                    data[o] = encode(r);
                    data[o + 1] = encode(g);
                    data[o + 2] = encode(b);
                    data[o + 3] = coverage >= 1 ? 255 : coverage * 255;
                }
            }
            ctx.putImageData(image, 0, 0);
        }
        this.sprites.set(key, sprite);
        return sprite;
    }

    private drawSky(camera: THREE.Camera): boolean {
        const mapping = getSkyMapping();
        if (!mapping) return false;
        const mesh = mapping.mesh;
        const image = (mesh.material as THREE.MeshBasicMaterial).map?.image as
            (CanvasImageSource & { width: number; height: number }) | undefined;
        if (!image) return false;

        if (this.skyTextureSource !== image) {
            const tw = Math.min(SKY_TEXTURE_MAX_WIDTH, image.width);
            const th = Math.max(1, Math.round((tw * image.height) / image.width));
            const pixels = readPixels(image, tw, th);
            if (!pixels) return false;
            this.skyTexture = new Uint32Array(pixels.buffer, pixels.byteOffset, tw * th);
            this.skyTextureWidth = tw;
            this.skyTextureHeight = th;
            this.skyTextureSource = image;
            this.skyValid = false;
        }
        const texture = this.skyTexture;
        if (!texture) return false;

        const sw = Math.max(1, Math.ceil(this.width / SKY_SCALE));
        const sh = Math.max(1, Math.ceil(this.height / SKY_SCALE));
        if (!this.skyImage || this.skyImage.width !== sw || this.skyImage.height !== sh) {
            this.skyCanvas.width = sw;
            this.skyCanvas.height = sh;
            this.skyCtx = this.skyCanvas.getContext('2d', { alpha: false });
            if (!this.skyCtx) return false;
            this.skyImage = this.skyCtx.createImageData(sw, sh);
            this.skyPixels = new Uint32Array(this.skyImage.data.buffer);
            this.skyValid = false;
        }

        mesh.matrixWorld.decompose(skyCenter, skyQuat, skyScale);

        // the sky only spins a fraction of a pixel per second, so redraw it when the
        // camera moves or the spin has accumulated to something visible
        const key = this.skyKey;
        const cam = camera.matrixWorld.elements;
        const projection = camera.projectionMatrix.elements;
        let changed = !this.skyValid;
        for (let i = 0; i < 16 && !changed; i++) changed = Math.abs(key[i] - cam[i]) > 1e-5;
        changed = changed || key[16] !== projection[0] || key[17] !== projection[5];
        const spin = key[18] * skyQuat.x + key[19] * skyQuat.y + key[20] * skyQuat.z + key[21] * skyQuat.w;
        changed = changed || 1 - Math.abs(spin) > SKY_SPIN_EPSILON;
        if (!changed) return true;
        for (let i = 0; i < 16; i++) key[i] = cam[i];
        key[16] = projection[0];
        key[17] = projection[5];
        key[18] = skyQuat.x;
        key[19] = skyQuat.y;
        key[20] = skyQuat.z;
        key[21] = skyQuat.w;

        mesh.geometry.computeBoundingSphere();
        const radius = (mesh.geometry.boundingSphere?.radius ?? 0) * Math.max(skyScale.x, skyScale.y, skyScale.z);
        if (!(radius > 0)) return false;

        skyInvQuat.copy(skyQuat).invert();
        basisRight.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(1 / projection[0]).applyQuaternion(skyInvQuat);
        basisUp.setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(1 / projection[5]).applyQuaternion(skyInvQuat);
        basisForward.setFromMatrixColumn(camera.matrixWorld, 2).negate().applyQuaternion(skyInvQuat);
        skyOrigin.copy(cameraPosition).sub(skyCenter).applyQuaternion(skyInvQuat);

        const ox = skyOrigin.x, oy = skyOrigin.y, oz = skyOrigin.z;
        const c = ox * ox + oy * oy + oz * oz - radius * radius;
        const { uSign, uOffset, vFlip } = mapping;

        let hitU = 0;
        let hitV = 0;
        const lookup = (px: number, py: number): void => {
            const nx = (px / sw) * 2 - 1;
            const ny = 1 - (py / sh) * 2;
            const dx = basisForward.x + basisRight.x * nx + basisUp.x * ny;
            const dy = basisForward.y + basisRight.y * nx + basisUp.y * ny;
            const dz = basisForward.z + basisRight.z * nx + basisUp.z * ny;
            const a = dx * dx + dy * dy + dz * dz;
            const b = ox * dx + oy * dy + oz * dz;
            const t = (-b + Math.sqrt(Math.max(0, b * b - a * c))) / a;
            const hx = (ox + dx * t) / radius;
            const hy = (oy + dy * t) / radius;
            const hz = (oz + dz * t) / radius;
            hitU = uSign * (Math.atan2(hz, hx) / TWO_PI) + uOffset;
            const polar = Math.asin(hy > 1 ? 1 : hy < -1 ? -1 : hy) / Math.PI;
            hitV = vFlip ? 0.5 + polar : 0.5 - polar;
        };

        const gw = Math.ceil(sw / SKY_CELL) + 1;
        const gh = Math.ceil(sh / SKY_CELL) + 1;
        if (this.skyGridU.length !== gw * gh) {
            this.skyGridU = new Float32Array(gw * gh);
            this.skyGridV = new Float32Array(gw * gh);
        }
        const gridU = this.skyGridU;
        const gridV = this.skyGridV;
        for (let gy = 0; gy < gh; gy++) {
            for (let gx = 0; gx < gw; gx++) {
                lookup(gx * SKY_CELL, gy * SKY_CELL);
                gridU[gy * gw + gx] = hitU;
                gridV[gy * gw + gx] = hitV;
            }
        }

        const out = this.skyPixels!;
        const tw = this.skyTextureWidth;
        const th = this.skyTextureHeight;
        const inv = 1 / SKY_CELL;
        for (let gy = 0; gy < gh - 1; gy++) {
            const y0 = gy * SKY_CELL;
            const y1 = Math.min(sh, y0 + SKY_CELL);
            for (let gx = 0; gx < gw - 1; gx++) {
                const x0 = gx * SKY_CELL;
                const x1 = Math.min(sw, x0 + SKY_CELL);
                const n = gy * gw + gx;
                const u00 = gridU[n];
                let u10 = gridU[n + 1];
                let u01 = gridU[n + gw];
                let u11 = gridU[n + gw + 1];
                u10 -= Math.round(u10 - u00);
                u01 -= Math.round(u01 - u00);
                u11 -= Math.round(u11 - u00);
                const v00 = gridV[n], v10 = gridV[n + 1], v01 = gridV[n + gw], v11 = gridV[n + gw + 1];
                const spread = Math.max(Math.abs(u10 - u00), Math.abs(u01 - u00), Math.abs(u11 - u00));

                for (let y = y0; y < y1; y++) {
                    const fy = (y - y0) * inv;
                    let row = y * sw + x0;
                    if (spread > 0.05) {
                        // around the poles u swings too fast to interpolate
                        for (let x = x0; x < x1; x++) {
                            lookup(x, y);
                            const tx = ((hitU - Math.floor(hitU)) * tw) | 0;
                            const ty = Math.min(th - 1, Math.max(0, (hitV * th) | 0));
                            out[row++] = texture[ty * tw + tx];
                        }
                        continue;
                    }
                    const ua = u00 + (u01 - u00) * fy;
                    const ub = u10 + (u11 - u10) * fy;
                    const va = v00 + (v01 - v00) * fy;
                    const vb = v10 + (v11 - v10) * fy;
                    const du = (ub - ua) * inv;
                    const dv = (vb - va) * inv;
                    let u = ua;
                    let v = va;
                    for (let x = x0; x < x1; x++) {
                        const tx = ((u - Math.floor(u)) * tw) | 0;
                        const ty = (v * th) | 0;
                        out[row++] = texture[(ty < 0 ? 0 : ty >= th ? th - 1 : ty) * tw + (tx >= tw ? tw - 1 : tx)];
                        u += du;
                        v += dv;
                    }
                }
            }
        }

        this.skyCtx!.putImageData(this.skyImage, 0, 0);
        this.skyValid = true;
        return true;
    }

    private skinnedCache(mesh: THREE.SkinnedMesh): SkinnedCache | null {
        const geometry = mesh.geometry;
        let cache = this.skinned.get(geometry);
        if (!cache) {
            const position = geometry.getAttribute('position');
            const normal = geometry.getAttribute('normal');
            const uv = geometry.getAttribute('uv');
            const skinIndex = geometry.getAttribute('skinIndex');
            const skinWeight = geometry.getAttribute('skinWeight');
            const index = geometry.getIndex();
            if (!position || !normal || !skinIndex || !skinWeight || !index) return null;

            const count = position.count;
            cache = {
                count,
                position: new Float32Array(count * 3),
                normal: new Float32Array(count * 3),
                uv: new Float32Array(count * 2),
                skinIndex: new Uint16Array(count * 4),
                skinWeight: new Float32Array(count * 4),
                index: Uint32Array.from(index.array),
                rawPosition: new Float32Array(count * 3),
                eyeTriangle: new Uint8Array(index.count / 3),
                screenX: new Float32Array(count),
                screenY: new Float32Array(count),
                depth: new Float32Array(count),
                lambert: new Float32Array(count),
                fresnel: new Float32Array(count),
                textureSource: null,
                texture: null,
                textureWidth: 0,
                textureHeight: 0,
            };
            for (let i = 0; i < count; i++) {
                cache.rawPosition[i * 3] = position.getX(i);
                cache.rawPosition[i * 3 + 1] = position.getY(i);
                cache.rawPosition[i * 3 + 2] = position.getZ(i);
                scratch.fromBufferAttribute(position, i).applyMatrix4(mesh.bindMatrix);
                cache.position[i * 3] = scratch.x;
                cache.position[i * 3 + 1] = scratch.y;
                cache.position[i * 3 + 2] = scratch.z;
                scratch.fromBufferAttribute(normal, i).transformDirection(mesh.bindMatrix);
                cache.normal[i * 3] = scratch.x;
                cache.normal[i * 3 + 1] = scratch.y;
                cache.normal[i * 3 + 2] = scratch.z;
                if (uv) {
                    cache.uv[i * 2] = uv.getX(i);
                    cache.uv[i * 2 + 1] = uv.getY(i);
                }
                const w0 = skinWeight.getX(i), w1 = skinWeight.getY(i), w2 = skinWeight.getZ(i), w3 = skinWeight.getW(i);
                const total = w0 + w1 + w2 + w3 || 1;
                cache.skinIndex[i * 4] = skinIndex.getX(i);
                cache.skinIndex[i * 4 + 1] = skinIndex.getY(i);
                cache.skinIndex[i * 4 + 2] = skinIndex.getZ(i);
                cache.skinIndex[i * 4 + 3] = skinIndex.getW(i);
                cache.skinWeight[i * 4] = w0 / total;
                cache.skinWeight[i * 4 + 1] = w1 / total;
                cache.skinWeight[i * 4 + 2] = w2 / total;
                cache.skinWeight[i * 4 + 3] = w3 / total;
            }
            // the eyelids are painted in bind-pose space, like positionGeometry in the shader
            const raw = cache.rawPosition;
            for (let t = 0; t < cache.eyeTriangle.length; t++) {
                for (let e = 0; e < EYES.length && cache.eyeTriangle[t] === 0; e++) {
                    const { center, radii } = EYES[e];
                    for (let k = 0; k < 3; k++) {
                        const v = cache.index[t * 3 + k] * 3;
                        const qx = (raw[v] - center[0]) / radii[0];
                        const qy = (raw[v + 1] - center[1]) / radii[1];
                        const qz = (raw[v + 2] - center[2]) / radii[2];
                        if (qx * qx + qy * qy + qz * qz < EYE_REACH * EYE_REACH) {
                            cache.eyeTriangle[t] = e + 1;
                            break;
                        }
                    }
                }
            }
            this.skinned.set(geometry, cache);
        }

        const map = (mesh.material as THREE.MeshBasicMaterial).map;
        const image = map?.image as (CanvasImageSource & { width: number; height: number }) | undefined;
        if (image && cache.textureSource !== image) {
            cache.textureSource = image;
            const pixels = readPixels(image, image.width, image.height);
            if (pixels) {
                const texture = new Float32Array(image.width * image.height * 3);
                for (let i = 0, o = 0; i < pixels.length; i += 4, o += 3) {
                    texture[o] = srgbToLinear[pixels[i]];
                    texture[o + 1] = srgbToLinear[pixels[i + 1]];
                    texture[o + 2] = srgbToLinear[pixels[i + 2]];
                }
                cache.texture = texture;
                cache.textureWidth = image.width;
                cache.textureHeight = image.height;
            }
        }
        return cache;
    }

    private rasterizeSkinned(mesh: THREE.SkinnedMesh): ModelRect | null {
        const cache = this.skinnedCache(mesh);
        if (!cache) return null;
        const skeleton = mesh.skeleton;
        skeleton.update();

        const bones = skeleton.bones.length;
        if (this.boneWorld.length < bones * 12) this.boneWorld = new Float32Array(bones * 12);
        const boneWorld = this.boneWorld;
        skinMatrix.multiplyMatrices(mesh.matrixWorld, mesh.bindMatrixInverse);
        for (let i = 0; i < bones; i++) {
            boneMatrix.fromArray(skeleton.boneMatrices as Float32Array, i * 16).premultiply(skinMatrix);
            const e = boneMatrix.elements;
            const o = i * 12;
            boneWorld[o] = e[0]; boneWorld[o + 1] = e[4]; boneWorld[o + 2] = e[8]; boneWorld[o + 3] = e[12];
            boneWorld[o + 4] = e[1]; boneWorld[o + 5] = e[5]; boneWorld[o + 6] = e[9]; boneWorld[o + 7] = e[13];
            boneWorld[o + 8] = e[2]; boneWorld[o + 9] = e[6]; boneWorld[o + 10] = e[10]; boneWorld[o + 11] = e[14];
        }

        const ss = this.supersample;
        const halfW = this.width * 0.5 * ss;
        const halfH = this.height * 0.5 * ss;
        const vp = viewProjection.elements;
        const lx = MODEL_LIGHT_DIR.x, ly = MODEL_LIGHT_DIR.y, lz = MODEL_LIGHT_DIR.z;
        const cx = cameraPosition.x, cy = cameraPosition.y, cz = cameraPosition.z;
        const { count, position, normal, skinIndex, skinWeight, screenX, screenY, depth, lambert, fresnel } = cache;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let depthSum = 0;
        let visible = 0;
        for (let i = 0; i < count; i++) {
            const px = position[i * 3], py = position[i * 3 + 1], pz = position[i * 3 + 2];
            const nx = normal[i * 3], ny = normal[i * 3 + 1], nz = normal[i * 3 + 2];
            let wx = 0, wy = 0, wz = 0, wnx = 0, wny = 0, wnz = 0;
            for (let j = 0; j < 4; j++) {
                const weight = skinWeight[i * 4 + j];
                if (weight === 0) continue;
                const o = skinIndex[i * 4 + j] * 12;
                wx += weight * (boneWorld[o] * px + boneWorld[o + 1] * py + boneWorld[o + 2] * pz + boneWorld[o + 3]);
                wy += weight * (boneWorld[o + 4] * px + boneWorld[o + 5] * py + boneWorld[o + 6] * pz + boneWorld[o + 7]);
                wz += weight * (boneWorld[o + 8] * px + boneWorld[o + 9] * py + boneWorld[o + 10] * pz + boneWorld[o + 11]);
                wnx += weight * (boneWorld[o] * nx + boneWorld[o + 1] * ny + boneWorld[o + 2] * nz);
                wny += weight * (boneWorld[o + 4] * nx + boneWorld[o + 5] * ny + boneWorld[o + 6] * nz);
                wnz += weight * (boneWorld[o + 8] * nx + boneWorld[o + 9] * ny + boneWorld[o + 10] * nz);
            }

            const clipW = vp[3] * wx + vp[7] * wy + vp[11] * wz + vp[15];
            if (clipW <= 1e-3) {
                depth[i] = 0;
                continue;
            }
            const invW = 1 / clipW;
            const sx = (vp[0] * wx + vp[4] * wy + vp[8] * wz + vp[12]) * invW * halfW + halfW;
            const sy = halfH - (vp[1] * wx + vp[5] * wy + vp[9] * wz + vp[13]) * invW * halfH;
            screenX[i] = sx;
            screenY[i] = sy;
            depth[i] = invW;
            depthSum += clipW;
            visible++;
            if (sx < minX) minX = sx;
            if (sx > maxX) maxX = sx;
            if (sy < minY) minY = sy;
            if (sy > maxY) maxY = sy;

            const nl = 1 / (Math.sqrt(wnx * wnx + wny * wny + wnz * wnz) || 1);
            wnx *= nl; wny *= nl; wnz *= nl;
            lambert[i] = (wnx * lx + wny * ly + wnz * lz) * 0.5 + 0.5;
            const ex = cx - wx, ey = cy - wy, ez = cz - wz;
            const el = 1 / (Math.sqrt(ex * ex + ey * ey + ez * ez) || 1);
            fresnel[i] = 1 - Math.abs((wnx * ex + wny * ey + wnz * ez) * el);
        }
        if (visible === 0) return null;

        const x0 = Math.max(0, Math.floor(minX));
        const y0 = Math.max(0, Math.floor(minY));
        const x1 = Math.min(this.width * ss, Math.ceil(maxX) + 1);
        const y1 = Math.min(this.height * ss, Math.ceil(maxY) + 1);
        const bw = x1 - x0;
        const bh = y1 - y0;
        if (bw <= 0 || bh <= 0) return null;

        // the model bobs around, so size the buffer in coarse steps instead of per frame
        const stride = Math.ceil(bw / MODEL_BUFFER_STEP) * MODEL_BUFFER_STEP;
        const rows = Math.ceil(bh / MODEL_BUFFER_STEP) * MODEL_BUFFER_STEP;
        if (!this.modelImage || this.modelImage.width !== stride || this.modelImage.height !== rows) {
            this.modelCanvas.width = stride;
            this.modelCanvas.height = rows;
            this.modelCtx = this.modelCanvas.getContext('2d');
            if (!this.modelCtx) return null;
            this.modelImage = this.modelCtx.createImageData(stride, rows);
            this.modelPixels = new Uint32Array(this.modelImage.data.buffer);
            this.modelDepth = new Float32Array(stride * rows);
        }
        const pixels = this.modelPixels!;
        const zbuffer = this.modelDepth;
        pixels.fill(0);
        zbuffer.fill(0);

        const { index, uv, texture, textureWidth: tw, textureHeight: th, rawPosition, eyeTriangle } = cache;
        const blink = blinkAmount.value;
        const blinking = blink > BLINK_EPSILON;
        const lidY = 1.25 - blink * 2.5;
        const tint = (mesh.material as THREE.MeshBasicMaterial).color;
        const tr = tint ? tint.r : 1, tg = tint ? tint.g : 1, tb = tint ? tint.b : 1;

        for (let t = 0; t < index.length; t += 3) {
            const ia = index[t], ib = index[t + 1], ic = index[t + 2];
            const za = depth[ia], zb = depth[ib], zc = depth[ic];
            if (za === 0 || zb === 0 || zc === 0) continue;
            const ax = screenX[ia] - x0, ay = screenY[ia] - y0;
            const bx = screenX[ib] - x0, by = screenY[ib] - y0;
            const cxs = screenX[ic] - x0, cys = screenY[ic] - y0;
            const area = (bx - ax) * (cys - ay) - (cxs - ax) * (by - ay);
            if (area === 0) continue;

            let tx0 = Math.floor(ax < bx ? (ax < cxs ? ax : cxs) : (bx < cxs ? bx : cxs));
            let tx1 = Math.ceil(ax > bx ? (ax > cxs ? ax : cxs) : (bx > cxs ? bx : cxs));
            let ty0 = Math.floor(ay < by ? (ay < cys ? ay : cys) : (by < cys ? by : cys));
            let ty1 = Math.ceil(ay > by ? (ay > cys ? ay : cys) : (by > cys ? by : cys));
            if (tx0 < 0) tx0 = 0;
            if (ty0 < 0) ty0 = 0;
            if (tx1 > bw - 1) tx1 = bw - 1;
            if (ty1 > bh - 1) ty1 = bh - 1;
            if (tx0 > tx1 || ty0 > ty1) continue;

            const inv = 1 / area;
            // barycentric weights as affine functions of the pixel centre
            const e0x = -(cys - by) * inv, e0y = (cxs - bx) * inv;
            const e1x = -(ay - cys) * inv, e1y = (ax - cxs) * inv;
            const startX = tx0 + 0.5, startY = ty0 + 0.5;
            let row0 = ((cxs - bx) * (startY - by) - (cys - by) * (startX - bx)) * inv;
            let row1 = ((ax - cxs) * (startY - cys) - (ay - cys) * (startX - cxs)) * inv;

            const ua = uv[ia * 2], va = uv[ia * 2 + 1];
            const ub = uv[ib * 2], vb = uv[ib * 2 + 1];
            const uc = uv[ic * 2], vc = uv[ic * 2 + 1];
            const la = lambert[ia], lb = lambert[ib], lc = lambert[ic];
            const fa = fresnel[ia], fb = fresnel[ib], fc = fresnel[ic];

            const eye = blinking ? eyeTriangle[t / 3] : 0;
            let qax = 0, qay = 0, qaz = 0, qbx = 0, qby = 0, qbz = 0, qcx = 0, qcy = 0, qcz = 0;
            let skinR = 0, skinG = 0, skinB = 0;
            if (eye) {
                const { center, radii } = EYES[eye - 1];
                qax = (rawPosition[ia * 3] - center[0]) / radii[0];
                qay = (rawPosition[ia * 3 + 1] - center[1]) / radii[1];
                qaz = (rawPosition[ia * 3 + 2] - center[2]) / radii[2];
                qbx = (rawPosition[ib * 3] - center[0]) / radii[0];
                qby = (rawPosition[ib * 3 + 1] - center[1]) / radii[1];
                qbz = (rawPosition[ib * 3 + 2] - center[2]) / radii[2];
                qcx = (rawPosition[ic * 3] - center[0]) / radii[0];
                qcy = (rawPosition[ic * 3 + 1] - center[1]) / radii[1];
                qcz = (rawPosition[ic * 3 + 2] - center[2]) / radii[2];
                const skin = eyeSkins[eye - 1];
                skinR = skin.r;
                skinG = skin.g;
                skinB = skin.b;
            }

            for (let y = ty0; y <= ty1; y++) {
                let w0 = row0;
                let w1 = row1;
                let offset = y * stride + tx0;
                for (let x = tx0; x <= tx1; x++, offset++, w0 += e0x, w1 += e1x) {
                    const w2 = 1 - w0 - w1;
                    if (w0 < 0 || w1 < 0 || w2 < 0) continue;
                    const z = w0 * za + w1 * zb + w2 * zc;
                    if (z <= zbuffer[offset]) continue;
                    zbuffer[offset] = z;

                    let r = tr, g = tg, b = tb;
                    if (texture) {
                        const u = w0 * ua + w1 * ub + w2 * uc;
                        const v = w0 * va + w1 * vb + w2 * vc;
                        let px = ((u - Math.floor(u)) * tw) | 0;
                        let py = ((v - Math.floor(v)) * th) | 0;
                        if (px >= tw) px = tw - 1;
                        if (py >= th) py = th - 1;
                        const o = (py * tw + px) * 3;
                        r *= texture[o];
                        g *= texture[o + 1];
                        b *= texture[o + 2];
                    }

                    if (eye) {
                        const qx = w0 * qax + w1 * qbx + w2 * qcx;
                        const qy = w0 * qay + w1 * qby + w2 * qcy;
                        const qz = w0 * qaz + w1 * qbz + w2 * qcz;
                        const inside = 1 - smoothstep(0.90, 1.04, Math.sqrt(qx * qx + qy * qy + qz * qz));
                        if (inside > 0) {
                            const lid = inside * smoothstep(lidY - LID_EDGE, lidY + LID_EDGE, qy);
                            r += (skinR - r) * lid;
                            g += (skinG - g) * lid;
                            b += (skinB - b) * lid;
                            const lash = inside * (1 - smoothstep(0, LASH_WIDTH, Math.abs(qy - lidY))) * LASH_STRENGTH;
                            r += (LASH_COLOR.r - r) * lash;
                            g += (LASH_COLOR.g - g) * lash;
                            b += (LASH_COLOR.b - b) * lash;
                        }
                    }

                    let li = ((w0 * la + w1 * lb + w2 * lc) * LUT_SIZE) | 0;
                    if (li < 0) li = 0; else if (li > LUT_SIZE) li = LUT_SIZE;
                    let fi = ((w0 * fa + w1 * fb + w2 * fc) * LUT_SIZE) | 0;
                    if (fi < 0) fi = 0; else if (fi > LUT_SIZE) fi = LUT_SIZE;
                    const mul = celLut[li];
                    const rim = modelRimLut[fi];
                    r = r * mul + rim;
                    g = g * mul + rim;
                    b = b * mul + rim;
                    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                    r = luma + (r - luma) * MODEL_SATURATION;
                    g = luma + (g - luma) * MODEL_SATURATION;
                    b = luma + (b - luma) * MODEL_SATURATION;
                    pixels[offset] = 0xff000000 | (encode(b) << 16) | (encode(g) << 8) | encode(r);
                }
                row0 += e0y;
                row1 += e1y;
            }
        }

        this.modelCtx!.putImageData(this.modelImage, 0, 0, 0, 0, bw, bh);
        return { x: x0 / ss, y: y0 / ss, w: bw / ss, h: bh / ss, sw: bw, sh: bh, depth: depthSum / visible };
    }
}
