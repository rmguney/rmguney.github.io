import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRDracoMeshCompression } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import { fileURLToPath } from 'node:url';

const SOURCE = fileURLToPath(new URL('../../assets/model.source.glb', import.meta.url));
const TARGET = fileURLToPath(new URL('../../public/models/model.glb', import.meta.url));

const ASSET_NAME = 'mascot';

const WELD_PRECISION = 10000;
const SMOOTH_ITERATIONS = 26;
const MAX_INFLUENCES = 4;

const BELLY_CENTER: [number, number, number] = [0.070, 0.200, 0.090];
const BELLY_SMOOTH_FULL = 0.12;
const BELLY_SMOOTH_ZERO = 0.20;
const BELLY_SMOOTH_PASSES = 24;
const TAUBIN_LAMBDA = 0.5;
const TAUBIN_MU = -0.53;

interface SeedDef {
    name: string;
    seed: [number, number, number];
    parent: string | null;
    jiggle: boolean;
    anchors?: [number, number, number][];
}

const RIG: SeedDef[] = [
    {
        name: 'hips', seed: [0.130, 0.180, -0.120], parent: null, jiggle: false,
        anchors: [
            [0.116, 0.278, 0.102],
            [0.080, 0.180, 0.080],
            [0.024, 0.088, 0.025],
            [0.051, 0.252, -0.214],
            [0.068, 0.166, -0.250],
            [0.197, 0.246, -0.060],
            [-0.170, 0.280, -0.040],
            [-0.005, 0.054, -0.145],
            [0.135, 0.056, -0.064],
            [0.080, 0.060, -0.205],
        ],
    },
    {
        name: 'torso', seed: [0.020, 0.400, 0.000], parent: 'hips', jiggle: true,
        anchors: [
            [0.041, 0.375, 0.140],
            [-0.208, 0.369, 0.013],
            [0.160, 0.300, 0.010],
        ],
    },
    { name: 'ear_up', seed: [-0.007, 0.641, -0.196], parent: 'torso', jiggle: true },
    { name: 'ear_side', seed: [0.288, 0.516, -0.034], parent: 'torso', jiggle: true },
    { name: 'arm_l', seed: [-0.196, 0.198, 0.060], parent: 'torso', jiggle: true },
    { name: 'arm_r', seed: [0.190, 0.360, 0.140], parent: 'torso', jiggle: true },
    { name: 'tail', seed: [0.447, 0.503, -0.242], parent: 'hips', jiggle: true },
    { name: 'leg_l', seed: [0.034, 0.000, -0.243], parent: 'hips', jiggle: true },
    { name: 'leg_r', seed: [0.219, 0.018, -0.164], parent: 'hips', jiggle: true },
    { name: 'balloon0_lower', seed: [-0.290, 0.560, 0.120], parent: 'arm_l', jiggle: true },
    { name: 'balloon0_upper', seed: [-0.333, 0.767, 0.138], parent: 'balloon0_lower', jiggle: true },
    { name: 'balloon1_lower', seed: [-0.130, 0.480, 0.070], parent: 'arm_l', jiggle: true },
    { name: 'balloon1_upper', seed: [-0.090, 0.773, 0.096], parent: 'balloon1_lower', jiggle: true },
];

function buildAdjacency(position: Float32Array, indices: Uint32Array) {
    const vertexCount = position.length / 3;
    const weldOf = new Int32Array(vertexCount);
    const lookup = new Map<string, number>();
    const representatives: number[] = [];

    for (let i = 0; i < vertexCount; i++) {
        const key = `${Math.round(position[i * 3] * WELD_PRECISION)},`
            + `${Math.round(position[i * 3 + 1] * WELD_PRECISION)},`
            + `${Math.round(position[i * 3 + 2] * WELD_PRECISION)}`;
        const found = lookup.get(key);
        if (found !== undefined) {
            weldOf[i] = found;
        } else {
            lookup.set(key, representatives.length);
            weldOf[i] = representatives.length;
            representatives.push(i);
        }
    }

    const welded = representatives.length;
    const neighbours: Set<number>[] = Array.from({ length: welded }, () => new Set<number>());
    for (let t = 0; t < indices.length; t += 3) {
        const a = weldOf[indices[t]];
        const b = weldOf[indices[t + 1]];
        const c = weldOf[indices[t + 2]];
        neighbours[a].add(b); neighbours[a].add(c);
        neighbours[b].add(a); neighbours[b].add(c);
        neighbours[c].add(a); neighbours[c].add(b);
    }

    const adjacency = neighbours.map((set) => Int32Array.from(set));
    const weldedPos = new Float32Array(welded * 3);
    for (let i = 0; i < welded; i++) {
        const src = representatives[i] * 3;
        weldedPos[i * 3] = position[src];
        weldedPos[i * 3 + 1] = position[src + 1];
        weldedPos[i * 3 + 2] = position[src + 2];
    }

    return { weldOf, weldedPos, adjacency, welded };
}

class MinHeap {
    private keys: number[] = [];
    private vals: number[] = [];

    push(key: number, val: number): void {
        this.keys.push(key); this.vals.push(val);
        let i = this.keys.length - 1;
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (this.keys[p] <= this.keys[i]) break;
            [this.keys[p], this.keys[i]] = [this.keys[i], this.keys[p]];
            [this.vals[p], this.vals[i]] = [this.vals[i], this.vals[p]];
            i = p;
        }
    }

    pop(): [number, number] | null {
        if (!this.keys.length) return null;
        const top: [number, number] = [this.keys[0], this.vals[0]];
        const lk = this.keys.pop()!, lv = this.vals.pop()!;
        if (this.keys.length) {
            this.keys[0] = lk; this.vals[0] = lv;
            let i = 0;
            for (; ;) {
                const l = 2 * i + 1, r = l + 1;
                let m = i;
                if (l < this.keys.length && this.keys[l] < this.keys[m]) m = l;
                if (r < this.keys.length && this.keys[r] < this.keys[m]) m = r;
                if (m === i) break;
                [this.keys[m], this.keys[i]] = [this.keys[i], this.keys[m]];
                [this.vals[m], this.vals[i]] = [this.vals[i], this.vals[m]];
                i = m;
            }
        }
        return top;
    }

    get size(): number { return this.keys.length; }
}

function edgeLength(pos: Float32Array, a: number, b: number): number {
    return Math.hypot(
        pos[a * 3] - pos[b * 3],
        pos[a * 3 + 1] - pos[b * 3 + 1],
        pos[a * 3 + 2] - pos[b * 3 + 2]
    );
}

function watershed(
    pos: Float32Array,
    adjacency: Int32Array[],
    sources: Array<{ vertex: number; label: number }>
): { label: Int32Array; dist: Float64Array } {
    const n = adjacency.length;
    const dist = new Float64Array(n).fill(Infinity);
    const label = new Int32Array(n).fill(-1);
    const settled = new Uint8Array(n);
    const heap = new MinHeap();

    for (const s of sources) { dist[s.vertex] = 0; label[s.vertex] = s.label; heap.push(0, s.vertex); }

    while (heap.size) {
        const top = heap.pop()!;
        const u = top[1];
        if (settled[u]) continue;
        settled[u] = 1;
        for (const v of adjacency[u]) {
            const nd = top[0] + edgeLength(pos, u, v);
            if (nd < dist[v]) {
                dist[v] = nd;
                label[v] = label[u];
                heap.push(nd, v);
            }
        }
    }
    return { label, dist };
}

function smoothWeights(
    label: Int32Array,
    adjacency: Int32Array[],
    boneCount: number,
    iterations: number
): Float32Array {
    const n = adjacency.length;
    let cur = new Float32Array(n * boneCount);
    for (let i = 0; i < n; i++) if (label[i] >= 0) cur[i * boneCount + label[i]] = 1;
    let next = new Float32Array(n * boneCount);

    for (let it = 0; it < iterations; it++) {
        for (let i = 0; i < n; i++) {
            const nb = adjacency[i];
            const base = i * boneCount;
            const w = 1 / (nb.length + 1);
            for (let b = 0; b < boneCount; b++) next[base + b] = cur[base + b] * w;
            for (const j of nb) {
                const jb = j * boneCount;
                for (let b = 0; b < boneCount; b++) next[base + b] += cur[jb + b] * w;
            }
        }
        [cur, next] = [next, cur];
    }
    return cur;
}

function nearestVertex(pos: Float32Array, count: number, p: number[]): number {
    let best = 0, bd = Infinity;
    for (let i = 0; i < count; i++) {
        const d = (pos[i * 3] - p[0]) ** 2 + (pos[i * 3 + 1] - p[1]) ** 2 + (pos[i * 3 + 2] - p[2]) ** 2;
        if (d < bd) { bd = d; best = i; }
    }
    return best;
}

function maskedRoughness(pos: Float32Array, adjacency: Int32Array[], mask: Float32Array): number {
    let sum = 0, count = 0;
    for (let i = 0; i < adjacency.length; i++) {
        if (mask[i] <= 0 || !adjacency[i].length) continue;
        let ax = 0, ay = 0, az = 0;
        for (const j of adjacency[i]) {
            ax += pos[j * 3]; ay += pos[j * 3 + 1]; az += pos[j * 3 + 2];
        }
        const n = adjacency[i].length;
        sum += Math.hypot(ax / n - pos[i * 3], ay / n - pos[i * 3 + 1], az / n - pos[i * 3 + 2]);
        count++;
    }
    return count ? sum / count : 0;
}

function smoothBelly(
    weldedPos: Float32Array,
    adjacency: Int32Array[],
    label: Int32Array,
    bodyLabels: Set<number>
): { mask: Float32Array; before: number; after: number } {
    const welded = adjacency.length;
    const source = nearestVertex(weldedPos, welded, BELLY_CENTER);
    const { dist } = watershed(weldedPos, adjacency, [{ vertex: source, label: 0 }]);

    const mask = new Float32Array(welded);
    for (let i = 0; i < welded; i++) {
        if (!bodyLabels.has(label[i])) continue;
        const t = (BELLY_SMOOTH_ZERO - dist[i]) / (BELLY_SMOOTH_ZERO - BELLY_SMOOTH_FULL);
        const clamped = Math.max(0, Math.min(1, t));
        mask[i] = clamped * clamped * (3 - 2 * clamped);
    }

    const before = maskedRoughness(weldedPos, adjacency, mask);
    const delta = new Float32Array(welded * 3);
    for (let pass = 0; pass < BELLY_SMOOTH_PASSES; pass++) {
        for (const factor of [TAUBIN_LAMBDA, TAUBIN_MU]) {
            for (let i = 0; i < welded; i++) {
                if (mask[i] <= 0 || !adjacency[i].length) continue;
                let ax = 0, ay = 0, az = 0;
                for (const j of adjacency[i]) {
                    ax += weldedPos[j * 3]; ay += weldedPos[j * 3 + 1]; az += weldedPos[j * 3 + 2];
                }
                const n = adjacency[i].length;
                delta[i * 3] = ax / n - weldedPos[i * 3];
                delta[i * 3 + 1] = ay / n - weldedPos[i * 3 + 1];
                delta[i * 3 + 2] = az / n - weldedPos[i * 3 + 2];
            }
            for (let i = 0; i < welded; i++) {
                if (mask[i] <= 0) continue;
                const w = factor * mask[i];
                weldedPos[i * 3] += w * delta[i * 3];
                weldedPos[i * 3 + 1] += w * delta[i * 3 + 1];
                weldedPos[i * 3 + 2] += w * delta[i * 3 + 2];
            }
        }
    }
    const after = maskedRoughness(weldedPos, adjacency, mask);
    return { mask, before, after };
}

async function main(): Promise<void> {
    const io = new NodeIO()
        .registerExtensions(ALL_EXTENSIONS)
        .registerDependencies({
            'draco3d.decoder': await draco3d.createDecoderModule(),
            'draco3d.encoder': await draco3d.createEncoderModule(),
        });

    const document = await io.read(SOURCE);
    const root = document.getRoot();
    const meshes = root.listMeshes();
    if (meshes.length !== 1) throw new Error(`expected 1 mesh, found ${meshes.length}`);
    const primitives = meshes[0].listPrimitives();
    if (primitives.length !== 1) throw new Error(`expected 1 primitive, found ${primitives.length}`);
    const prim = primitives[0];

    const positionAcc = prim.getAttribute('POSITION')!;
    const position = positionAcc.getArray() as Float32Array;
    const indices = Uint32Array.from(prim.getIndices()!.getArray()!);
    const vertexCount = positionAcc.getCount();

    const { weldOf, weldedPos, adjacency, welded } = buildAdjacency(position, indices);
    console.log(`vertices ${vertexCount} -> welded ${welded}, triangles ${indices.length / 3}`);

    const sources: Array<{ vertex: number; label: number }> = [];
    RIG.forEach((b, k) => {
        sources.push({ vertex: nearestVertex(weldedPos, welded, b.seed), label: k });
        for (const anchor of b.anchors ?? []) {
            sources.push({ vertex: nearestVertex(weldedPos, welded, anchor), label: k });
        }
    });
    const { label } = watershed(weldedPos, adjacency, sources);

    const bodyLabels = new Set([0, 1]);
    const { mask, before, after } = smoothBelly(weldedPos, adjacency, label, bodyLabels);
    console.log(`belly smoothing: roughness ${before.toExponential(3)} -> ${after.toExponential(3)}`);

    for (let i = 0; i < vertexCount; i++) {
        const w = weldOf[i] * 3;
        position[i * 3] = weldedPos[w];
        position[i * 3 + 1] = weldedPos[w + 1];
        position[i * 3 + 2] = weldedPos[w + 2];
    }

    const normalAcc = prim.getAttribute('NORMAL');
    if (normalAcc) {
        const normal = normalAcc.getArray() as Float32Array;
        const accum = new Float32Array(welded * 3);
        for (let t = 0; t < indices.length; t += 3) {
            const a = weldOf[indices[t]], b = weldOf[indices[t + 1]], c = weldOf[indices[t + 2]];
            if (mask[a] <= 0 && mask[b] <= 0 && mask[c] <= 0) continue;
            const ux = weldedPos[b * 3] - weldedPos[a * 3];
            const uy = weldedPos[b * 3 + 1] - weldedPos[a * 3 + 1];
            const uz = weldedPos[b * 3 + 2] - weldedPos[a * 3 + 2];
            const vx = weldedPos[c * 3] - weldedPos[a * 3];
            const vy = weldedPos[c * 3 + 1] - weldedPos[a * 3 + 1];
            const vz = weldedPos[c * 3 + 2] - weldedPos[a * 3 + 2];
            const nx = uy * vz - uz * vy;
            const ny = uz * vx - ux * vz;
            const nz = ux * vy - uy * vx;
            for (const corner of [a, b, c]) {
                accum[corner * 3] += nx;
                accum[corner * 3 + 1] += ny;
                accum[corner * 3 + 2] += nz;
            }
        }
        for (let i = 0; i < vertexCount; i++) {
            const w = weldOf[i];
            const strength = mask[w];
            if (strength <= 0) continue;
            const len = Math.hypot(accum[w * 3], accum[w * 3 + 1], accum[w * 3 + 2]);
            if (len < 1e-10) continue;
            const nx = accum[w * 3] / len;
            const ny = accum[w * 3 + 1] / len;
            const nz = accum[w * 3 + 2] / len;
            const ox = normal[i * 3], oy = normal[i * 3 + 1], oz = normal[i * 3 + 2];
            if (nx * ox + ny * oy + nz * oz < 0) continue;
            const bx = ox + (nx - ox) * strength;
            const by = oy + (ny - oy) * strength;
            const bz = oz + (nz - oz) * strength;
            const bl = Math.hypot(bx, by, bz) || 1;
            normal[i * 3] = bx / bl;
            normal[i * 3 + 1] = by / bl;
            normal[i * 3 + 2] = bz / bl;
        }
    }

    const boneCount = RIG.length;
    const counts = new Array(boneCount).fill(0);
    for (let i = 0; i < welded; i++) if (label[i] >= 0) counts[label[i]]++;
    RIG.forEach((b, k) => console.log(`  ${b.name.padEnd(16)} ${String(counts[k]).padStart(5)} verts`));

    const smooth = smoothWeights(label, adjacency, boneCount, SMOOTH_ITERATIONS);

    const partCentroid = Array.from({ length: boneCount }, () => [0, 0, 0, 0]);
    for (let i = 0; i < welded; i++) {
        const k = label[i];
        if (k < 0) continue;
        partCentroid[k][0] += weldedPos[i * 3];
        partCentroid[k][1] += weldedPos[i * 3 + 1];
        partCentroid[k][2] += weldedPos[i * 3 + 2];
        partCentroid[k][3]++;
    }
    for (const c of partCentroid) if (c[3]) { c[0] /= c[3]; c[1] /= c[3]; c[2] /= c[3]; }

    const indexOfName = new Map(RIG.map((b, k) => [b.name, k]));
    const headPos: number[][] = RIG.map((b, k) => {
        if (b.parent === null) return [partCentroid[k][0], partCentroid[k][1], partCentroid[k][2]];
        const parentIdx = indexOfName.get(b.parent)!;
        const pc = partCentroid[parentIdx];
        let best = -1, bd = Infinity;
        for (let i = 0; i < welded; i++) {
            if (label[i] !== k) continue;
            const d = (weldedPos[i * 3] - pc[0]) ** 2
                + (weldedPos[i * 3 + 1] - pc[1]) ** 2
                + (weldedPos[i * 3 + 2] - pc[2]) ** 2;
            if (d < bd) { bd = d; best = i; }
        }
        if (best < 0) return [pc[0], pc[1], pc[2]];
        return [weldedPos[best * 3], weldedPos[best * 3 + 1], weldedPos[best * 3 + 2]];
    });

    const joints = new Uint8Array(vertexCount * MAX_INFLUENCES);
    const weights = new Float32Array(vertexCount * MAX_INFLUENCES);
    const scratch: { b: number; w: number }[] = [];

    for (let i = 0; i < vertexCount; i++) {
        const w = weldOf[i] * boneCount;
        scratch.length = 0;
        for (let b = 0; b < boneCount; b++) {
            const value = smooth[w + b];
            if (value > 1e-4) scratch.push({ b, w: value });
        }
        scratch.sort((a, c) => c.w - a.w);
        const take = Math.min(MAX_INFLUENCES, scratch.length);
        let total = 0;
        for (let s = 0; s < take; s++) total += scratch[s].w;
        if (total <= 0) { joints[i * MAX_INFLUENCES] = 0; weights[i * MAX_INFLUENCES] = 1; continue; }
        for (let s = 0; s < take; s++) {
            joints[i * MAX_INFLUENCES + s] = scratch[s].b;
            weights[i * MAX_INFLUENCES + s] = scratch[s].w / total;
        }
    }

    const scene = root.listScenes()[0];
    const meshNode = root.listNodes().find((n) => n.getMesh() === meshes[0])!;

    const tipPos: number[][] = RIG.map((_, k) => {
        let best = -1, bd = -1;
        for (let i = 0; i < welded; i++) {
            if (label[i] !== k) continue;
            const d = (weldedPos[i * 3] - headPos[k][0]) ** 2
                + (weldedPos[i * 3 + 1] - headPos[k][1]) ** 2
                + (weldedPos[i * 3 + 2] - headPos[k][2]) ** 2;
            if (d > bd) { bd = d; best = i; }
        }
        if (best < 0) return [headPos[k][0], headPos[k][1] + 0.01, headPos[k][2]];
        return [weldedPos[best * 3], weldedPos[best * 3 + 1], weldedPos[best * 3 + 2]];
    });

    const boneNodes = RIG.map((b, k) => {
        const node = document.createNode(b.name);
        const parentHead = b.parent === null ? [0, 0, 0] : headPos[indexOfName.get(b.parent)!];
        node.setTranslation([
            headPos[k][0] - parentHead[0],
            headPos[k][1] - parentHead[1],
            headPos[k][2] - parentHead[2],
        ]);
        const axis = [
            tipPos[k][0] - headPos[k][0],
            tipPos[k][1] - headPos[k][1],
            tipPos[k][2] - headPos[k][2],
        ];
        const length = Math.hypot(axis[0], axis[1], axis[2]) || 1e-3;
        node.setExtras({
            jiggle: b.jiggle,
            axis: [axis[0] / length, axis[1] / length, axis[2] / length],
            length,
        });
        return node;
    });
    RIG.forEach((b, k) => {
        if (b.parent === null) scene.addChild(boneNodes[k]);
        else boneNodes[indexOfName.get(b.parent)!].addChild(boneNodes[k]);
    });

    const inverseBind = new Float32Array(boneCount * 16);
    RIG.forEach((_, k) => {
        const o = k * 16;
        inverseBind[o] = 1; inverseBind[o + 5] = 1; inverseBind[o + 10] = 1; inverseBind[o + 15] = 1;
        inverseBind[o + 12] = -headPos[k][0];
        inverseBind[o + 13] = -headPos[k][1];
        inverseBind[o + 14] = -headPos[k][2];
    });

    const buffer = root.listBuffers()[0];
    const skin = document.createSkin('mascot_rig')
        .setSkeleton(boneNodes[0])
        .setInverseBindMatrices(
            document.createAccessor('ibm').setType('MAT4').setArray(inverseBind).setBuffer(buffer)
        );
    boneNodes.forEach((n) => skin.addJoint(n));

    prim.setAttribute('JOINTS_0',
        document.createAccessor('joints').setType('VEC4').setArray(joints).setBuffer(buffer));
    prim.setAttribute('WEIGHTS_0',
        document.createAccessor('weights').setType('VEC4').setArray(weights).setBuffer(buffer));

    meshNode.setSkin(skin);
    meshNode.setTranslation([0, 0, 0]);

    const asset = root.getAsset();
    asset.generator = 'rmguney.github.io src/utils/rigModel.ts';
    delete asset.copyright;
    delete asset.extras;

    root.listScenes().forEach((s, i) => s.setName(i === 0 ? ASSET_NAME : `${ASSET_NAME}_${i}`));
    meshes[0].setName(`${ASSET_NAME}_mesh`);
    meshNode.setName(ASSET_NAME);
    root.listMaterials().forEach((m, i) => m.setName(i === 0 ? `${ASSET_NAME}_mat` : `${ASSET_NAME}_mat_${i}`));
    root.listTextures().forEach((t, i) => {
        t.setName(i === 0 ? `${ASSET_NAME}_tex` : `${ASSET_NAME}_tex_${i}`);
        t.setURI('');
    });
    root.listAccessors().forEach((a) => a.setName(''));
    root.listBuffers().forEach((b) => { b.setName(''); b.setURI(''); });

    document.createExtension(KHRDracoMeshCompression)
        .setRequired(true)
        .setEncoderOptions({
            method: KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER,
            encodeSpeed: 0,
            decodeSpeed: 5,
            quantizationBits: {
                POSITION: 14,
                NORMAL: 10,
                COLOR: 8,
                TEX_COORD: 12,
                GENERIC: 16,
            },
        });

    await io.write(TARGET, document);
    console.log(`\nwrote ${TARGET}`);
    console.log(`bones: ${RIG.map((b) => b.name).join(', ')}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
