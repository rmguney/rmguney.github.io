import * as THREE from 'three';

const MIN_LENGTH = 1e-5;
export const MAX_STEP = 1 / 30;
const GUST_DECAY = 5;
const NUDGE_FORCE_DECAY = 6;
const LOOK_BONE = 'torso';
const tmpPush = new THREE.Vector3();

export interface JiggleTuning {
    stiffness: number;
    maxAngle: number;
    influence: number;
}

export interface IdleTuning {
    swing: number;
    swingSpeed: number;
    roll: number;
    rollSpeed: number;
    phase: number;
}

const DEFAULT_TUNING: JiggleTuning = { stiffness: 130, maxAngle: 0.20, influence: 0.6 };
const NO_IDLE: IdleTuning = { swing: 0, swingSpeed: 0, roll: 0, rollSpeed: 0, phase: 0 };

const TUNING: Array<[RegExp, JiggleTuning]> = [
    [/^torso$/, { stiffness: 240, maxAngle: 0.09, influence: 0.35 }],
    [/^ear_/, { stiffness: 95, maxAngle: 0.30, influence: 1.0 }],
    [/^tail$/, { stiffness: 115, maxAngle: 0.24, influence: 0.8 }],
    [/^arm_/, { stiffness: 145, maxAngle: 0.22, influence: 0.6 }],
    [/^leg_/, { stiffness: 175, maxAngle: 0.18, influence: 0.4 }],
    [/^balloon\d+_lower$/, { stiffness: 62, maxAngle: 0.30, influence: 1.15 }],
    [/^balloon\d+_upper$/, { stiffness: 54, maxAngle: 0.34, influence: 1.35 }],
];

const IDLE: Array<[RegExp, IdleTuning]> = [
    [/^torso$/, { swing: 0.020, swingSpeed: 1.10, roll: 0.014, rollSpeed: 0.74, phase: 0.0 }],
    [/^ear_up$/, { swing: 0.105, swingSpeed: 1.85, roll: 0.070, rollSpeed: 2.60, phase: 0.0 }],
    [/^ear_side$/, { swing: 0.115, swingSpeed: 1.62, roll: 0.075, rollSpeed: 2.35, phase: 1.9 }],
    [/^tail$/, { swing: 0.085, swingSpeed: 1.25, roll: 0.055, rollSpeed: 0.88, phase: 0.7 }],
    [/^arm_l$/, { swing: 0.150, swingSpeed: 2.05, roll: 0.090, rollSpeed: 1.45, phase: 0.0 }],
    [/^arm_r$/, { swing: 0.165, swingSpeed: 2.05, roll: 0.100, rollSpeed: 1.45, phase: Math.PI }],
    [/^leg_l$/, { swing: 0.135, swingSpeed: 1.72, roll: 0.070, rollSpeed: 1.15, phase: Math.PI }],
    [/^leg_r$/, { swing: 0.145, swingSpeed: 1.72, roll: 0.075, rollSpeed: 1.15, phase: 0.0 }],
    [/^balloon\d+_lower$/, { swing: 0.075, swingSpeed: 0.68, roll: 0.055, rollSpeed: 0.49, phase: 0.0 }],
    [/^balloon0_upper$/, { swing: 0.095, swingSpeed: 0.57, roll: 0.070, rollSpeed: 0.41, phase: 1.3 }],
    [/^balloon1_upper$/, { swing: 0.100, swingSpeed: 0.52, roll: 0.075, rollSpeed: 0.44, phase: 3.1 }],
];

export const JIGGLE_DAMPING = 4.6;
export const JIGGLE_GRAVITY = 10;
export const WIND_STRENGTH = 20;
export const WIND_SPEED = 0.31;

function matchTuning<T>(table: Array<[RegExp, T]>, name: string, fallback: T): T {
    for (const [pattern, value] of table) if (pattern.test(name)) return value;
    return fallback;
}

interface JiggleLink {
    bone: THREE.Bone;
    parent: THREE.Object3D;
    restAxis: THREE.Vector3;
    perpA: THREE.Vector3;
    perpB: THREE.Vector3;
    length: number;
    tuning: JiggleTuning;
    idle: IdleTuning;
    particle: THREE.Vector3;
    velocity: THREE.Vector3;
    settled: boolean;
    turbulence: number;
}

const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();
const tmpParentPos = new THREE.Vector3();
const tmpParentQuat = new THREE.Quaternion();
const tmpParentScale = new THREE.Vector3();
const tmpRestDir = new THREE.Vector3();
const tmpRestTip = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const tmpPrev = new THREE.Vector3();
const tmpForce = new THREE.Vector3();
const tmpGust = new THREE.Vector3();
const tmpWind = new THREE.Vector3();
const poseQuat = new THREE.Quaternion();
const swingQuat = new THREE.Quaternion();
const clampQuat = new THREE.Quaternion();

const UP = new THREE.Vector3(0, 1, 0);
const SIDE = new THREE.Vector3(1, 0, 0);

export class JiggleSolver {
    private links: JiggleLink[] = [];
    private gust = new THREE.Vector3();
    private elapsed = 0;
    private lookYaw = 0;
    private lookPitch = 0;

    constructor(bones: THREE.Bone[]) {
        const depthOf = (object: THREE.Object3D): number => {
            let depth = 0;
            let node: THREE.Object3D | null = object;
            while (node) { depth++; node = node.parent; }
            return depth;
        };

        const eligible = bones.filter((bone) => bone.userData?.jiggle === true && bone.parent);
        eligible.sort((a, b) => depthOf(a) - depthOf(b));

        eligible.forEach((bone, index) => {
            const axis = bone.userData.axis as number[] | undefined;
            const length = bone.userData.length as number | undefined;
            if (!axis || axis.length !== 3 || !length || length < MIN_LENGTH) return;

            const restAxis = new THREE.Vector3(axis[0], axis[1], axis[2]).normalize();
            const reference = Math.abs(restAxis.dot(UP)) > 0.9 ? SIDE : UP;
            const perpA = new THREE.Vector3().crossVectors(restAxis, reference).normalize();
            const perpB = new THREE.Vector3().crossVectors(restAxis, perpA).normalize();

            this.links.push({
                bone,
                parent: bone.parent!,
                restAxis,
                perpA,
                perpB,
                length,
                tuning: matchTuning(TUNING, bone.name, DEFAULT_TUNING),
                idle: matchTuning(IDLE, bone.name, NO_IDLE),
                particle: new THREE.Vector3(),
                velocity: new THREE.Vector3(),
                settled: false,
                turbulence: index * 1.37,
            });
        });
    }

    get boneCount(): number {
        return this.links.length;
    }

    reset(): void {
        this.gust.set(0, 0, 0);
        for (const link of this.links) {
            link.settled = false;
            link.velocity.set(0, 0, 0);
        }
    }

    applyGust(direction: THREE.Vector3, strength: number): void {
        tmpGust.copy(direction).multiplyScalar(strength);
        if (tmpGust.lengthSq() > this.gust.lengthSq()) this.gust.copy(tmpGust);
    }

    setLook(yaw: number, pitch: number): void {
        this.lookYaw = yaw;
        this.lookPitch = pitch;
    }

    private windAt(time: number, target: THREE.Vector3): THREE.Vector3 {
        return target.set(
            Math.sin(time * WIND_SPEED + 0.6) + Math.sin(time * WIND_SPEED * 2.11 + 2.4) * 0.35,
            Math.sin(time * WIND_SPEED * 1.43 + 1.7) * 0.22,
            Math.sin(time * WIND_SPEED * 0.83 + 3.1) + Math.sin(time * WIND_SPEED * 1.67) * 0.40
        ).multiplyScalar(WIND_STRENGTH);
    }

    update(delta: number): void {
        const step = Math.min(delta, MAX_STEP);
        if (step <= 0 || !this.links.length) return;
        this.elapsed += step;
        const decay = Math.exp(-JIGGLE_DAMPING * step);
        this.windAt(this.elapsed, tmpWind);

        for (const link of this.links) {
            const { bone, parent, tuning, idle } = link;

            bone.quaternion.identity();
            if (idle.swing !== 0 || idle.roll !== 0) {
                const t = this.elapsed;
                poseQuat.setFromAxisAngle(
                    link.perpA,
                    Math.sin(t * idle.swingSpeed + idle.phase) * idle.swing
                );
                bone.quaternion.copy(poseQuat);
                poseQuat.setFromAxisAngle(
                    link.perpB,
                    Math.sin(t * idle.rollSpeed + idle.phase * 1.7 + 0.9) * idle.roll
                );
                bone.quaternion.multiply(poseQuat);
            }

            bone.updateMatrix();
            bone.matrixWorld.multiplyMatrices(parent.matrixWorld, bone.matrix);
            bone.matrixWorld.decompose(tmpPos, tmpQuat, tmpScale);

            const worldLength = link.length * tmpScale.x;
            if (worldLength < MIN_LENGTH) continue;

            tmpRestDir.copy(link.restAxis).applyQuaternion(tmpQuat).normalize();
            tmpRestTip.copy(tmpPos).addScaledVector(tmpRestDir, worldLength);

            if (!link.settled) {
                link.particle.copy(tmpRestTip);
                link.velocity.set(0, 0, 0);
                link.settled = true;
            }

            tmpPrev.copy(link.particle);

            tmpForce.subVectors(tmpRestTip, link.particle).multiplyScalar(tuning.stiffness);
            tmpForce.y -= JIGGLE_GRAVITY;

            const turbulence = 0.85 + 0.15 * Math.sin(this.elapsed * 0.9 + link.turbulence);
            tmpForce.addScaledVector(tmpWind, tuning.influence * turbulence);
            tmpForce.addScaledVector(this.gust, tuning.influence);

            link.velocity.addScaledVector(tmpForce, step).multiplyScalar(decay);
            link.particle.addScaledVector(link.velocity, step);

            tmpDir.subVectors(link.particle, tmpPos);
            if (tmpDir.lengthSq() < MIN_LENGTH) tmpDir.copy(tmpRestDir);
            tmpDir.normalize();

            swingQuat.setFromUnitVectors(tmpRestDir, tmpDir);
            const angle = 2 * Math.acos(Math.min(1, Math.abs(swingQuat.w)));
            if (angle > tuning.maxAngle) {
                clampQuat.identity().slerp(swingQuat, tuning.maxAngle / angle);
                tmpDir.copy(tmpRestDir).applyQuaternion(clampQuat).normalize();
            }

            link.particle.copy(tmpPos).addScaledVector(tmpDir, worldLength);
            link.velocity.subVectors(link.particle, tmpPrev).divideScalar(step);

            parent.matrixWorld.decompose(tmpParentPos, tmpParentQuat, tmpParentScale);
            tmpDir.applyQuaternion(tmpParentQuat.invert()).normalize();
            bone.quaternion.setFromUnitVectors(link.restAxis, tmpDir);
            if (bone.name === LOOK_BONE && (this.lookYaw !== 0 || this.lookPitch !== 0)) {
                poseQuat.setFromAxisAngle(UP, this.lookYaw);
                bone.quaternion.premultiply(poseQuat);
                poseQuat.setFromAxisAngle(SIDE, this.lookPitch);
                bone.quaternion.premultiply(poseQuat);
            }
            bone.updateMatrix();
            bone.matrixWorld.multiplyMatrices(parent.matrixWorld, bone.matrix);
        }

        this.gust.multiplyScalar(Math.exp(-GUST_DECAY * step));
    }
}

export function createJiggleSolver(root: THREE.Object3D): JiggleSolver | null {
    let skinned: THREE.SkinnedMesh | null = null;
    root.traverse((child) => {
        if (!skinned && (child as THREE.SkinnedMesh).isSkinnedMesh) skinned = child as THREE.SkinnedMesh;
    });
    if (!skinned) return null;

    const mesh = skinned as THREE.SkinnedMesh;
    mesh.frustumCulled = false;
    const solver = new JiggleSolver(mesh.skeleton.bones);
    return solver.boneCount > 0 ? solver : null;
}

export class BodyNudge {
    readonly offset = new THREE.Vector3();
    private velocity = new THREE.Vector3();
    private force = new THREE.Vector3();
    private stiffness: number;
    private damping: number;
    private maxOffset: number;

    constructor(stiffness = 26, damping = 4.2, maxOffset = 14) {
        this.stiffness = stiffness;
        this.damping = damping;
        this.maxOffset = maxOffset;
    }

    push(direction: THREE.Vector3, strength: number): void {
        tmpPush.copy(direction).multiplyScalar(strength);
        if (tmpPush.lengthSq() > this.force.lengthSq()) this.force.copy(tmpPush);
    }

    reset(): void {
        this.offset.set(0, 0, 0);
        this.velocity.set(0, 0, 0);
        this.force.set(0, 0, 0);
    }

    update(delta: number): void {
        const step = Math.min(delta, MAX_STEP);
        if (step <= 0) return;
        this.velocity.addScaledVector(this.force, step);
        this.velocity.addScaledVector(this.offset, -this.stiffness * step);
        this.velocity.multiplyScalar(Math.exp(-this.damping * step));
        this.offset.addScaledVector(this.velocity, step);
        const distance = this.offset.length();
        if (distance > this.maxOffset) {
            this.offset.multiplyScalar(this.maxOffset / distance);
            this.velocity.multiplyScalar(0.5);
        }
        this.force.multiplyScalar(Math.exp(-NUDGE_FORCE_DECAY * step));
    }
}
