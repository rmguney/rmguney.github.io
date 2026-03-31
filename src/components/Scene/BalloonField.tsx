import { useState, useRef, useEffect, useMemo, useCallback, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Physics, RigidBody, BallCollider, useRapier, useBeforePhysicsStep, RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useBalloons } from '../../context/BalloonContext';
import { createBalloonMaterial, getShaderGeneration } from '../../utils/shading';
import type { MeshBasicNodeMaterial } from 'three/webgpu';
import { ALL_BALLOON_COLORS, SCENE_BALLOON_COLORS } from '../../constants/palette';
import React from 'react';
import type {
    BalloonData,
    BalloonProps,
    RapierProviderProps,
    WobbleState,
    LastImpact,
    RotationState,
    BalloonMesh
} from '../../types';

const UNIT_SCALE = new THREE.Vector3(1, 1, 1);
const tmpWorldPos = new THREE.Vector3();
const MAX_FRAME_DELTA = 1 / 30;

const PHYSICS_TIME_STEP = 1 / 60;

const simClock = { time: 0 };

const BALLOON_COLLIDER_RADIUS = 1.912;

const BALLOON_GEOMETRY = buildBalloonGeometry();

function buildBalloonGeometry(): THREE.BufferGeometry {
    const body = new THREE.SphereGeometry(2, 24, 16);
    const knot = new THREE.SphereGeometry(0.5, 12, 8);
    knot.scale(0.3, 0.4, 0.3);
    knot.translate(0, -2.1, 0);
    const merged = mergeGeometries([body, knot]);
    body.dispose();
    knot.dispose();
    return merged ?? new THREE.SphereGeometry(2, 24, 16);
}

const JIGGLE_AMOUNT = 0.018;
const JIGGLE_RATE_MIN = 3.2;
const JIGGLE_RATE_MAX = 5.6;

const SPAWN_HALF_EXTENT = 36;
const SPAWN_EXTENT = SPAWN_HALF_EXTENT * 2;

const BALLOON_OPACITY = 0.85;

const SPAWN_TAU = 0.1582;
const SPAWN_SETTLE_SECONDS = 1.5;
const SPAWN_START_SCALE = 0.1;

const materialPool = new Map<string, MeshBasicNodeMaterial>();

function getMaterial(color: string): MeshBasicNodeMaterial {
    const key = `${getShaderGeneration()}:${color}`;
    let material = materialPool.get(key);
    if (!material) {
        material = createBalloonMaterial({ color, opacity: BALLOON_OPACITY });
        materialPool.set(key, material);
    }
    return material;
}

function prewarmMaterials(): void {
    for (const color of ALL_BALLOON_COLORS) getMaterial(color);
}

const Balloon = React.memo(function Balloon({ position, color, meshToBodyRef, spawning, onRemove, id }: BalloonProps): React.ReactElement {
    const mesh = useRef<BalloonMesh>(null);
    const balloonMeshRef = useRef<THREE.Mesh>(null);
    const balloonGroupRef = useRef<THREE.Group>(null);
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const windOffset = useRef<number>(Math.random() * Math.PI * 2);
    const jigglePhase = useRef<number>(Math.random() * Math.PI * 2);
    const jiggleRate = useRef<number>(JIGGLE_RATE_MIN + Math.random() * (JIGGLE_RATE_MAX - JIGGLE_RATE_MIN));
    const baseScale = useRef<THREE.Vector3>(new THREE.Vector3(1, 1, 1));
    const balloonMass = useRef<number>(0.1 + Math.random() * 0.05);
    const spawnPosition = useRef<THREE.Vector3>(new THREE.Vector3(...position));

    const wobbleRef = useRef<WobbleState>({ x: 0, y: 0, z: 0, intensity: 0 });
    const lastImpactRef = useRef<LastImpact>({ point: new THREE.Vector3(), time: 0 });

    const originalRotationRef = useRef<RotationState>({ x: 0, y: 0, z: 0 });

    const material = useMemo(() => getMaterial(color), [color]);

    const spawnStart = useRef<number>(-1);
    const spawnDone = useRef<boolean>(spawning !== true);

    useBeforePhysicsStep(() => {
        if (!rigidBodyRef.current) return;

        const currentTime = simClock.time;

        const buoyancyForce = { x: 0, y: 9.8 * balloonMass.current * 0.1, z: 0 };
        rigidBodyRef.current.applyImpulse(buoyancyForce, true);

        const windForce = {
            x: Math.sin(currentTime * 0.5 + windOffset.current) * 0.08,
            y: Math.sin(currentTime * 0.3) * 0.02,
            z: Math.cos(currentTime * 0.4 + windOffset.current) * 0.08
        };
        rigidBodyRef.current.applyImpulse(windForce, true);

        const torque = {
            x: Math.sin(currentTime * 0.7) * 0.01,
            y: Math.cos(currentTime * 0.5) * 0.015,
            z: Math.sin(currentTime * 0.6) * 0.01
        };
        rigidBodyRef.current.applyTorqueImpulse(torque, true);
    });

    useFrame((state, delta) => {
        const currentTime = state.clock.getElapsedTime();
        const dt = Math.min(delta, MAX_FRAME_DELTA);

        if (balloonMeshRef.current && balloonGroupRef.current) {
            const timeSinceImpact = currentTime - lastImpactRef.current.time;

            if (timeSinceImpact < 2.0) {
                const wobbleDecay = Math.max(0, 1 - timeSinceImpact / 2.0);
                const wobbleFreq = 12 * (1 + wobbleRef.current.intensity);

                const wobbleX = Math.sin(currentTime * wobbleFreq) * wobbleRef.current.x * wobbleDecay * 0.5;
                const wobbleY = Math.sin(currentTime * wobbleFreq * 1.2) * wobbleRef.current.y * wobbleDecay * 0.3;
                const wobbleZ = Math.sin(currentTime * wobbleFreq * 0.8) * wobbleRef.current.z * wobbleDecay * 0.5;

                const deformX = 1 + wobbleX * 0.8;
                const deformY = 1 + wobbleY * 0.6;
                const deformZ = 1 + wobbleZ * 0.8;

                baseScale.current.set(deformX, deformY, deformZ);

                const rotationX = wobbleX * 1;
                const rotationZ = wobbleZ * 1;

                const complementaryRotX = Math.sin(currentTime * wobbleFreq * 0.7) * wobbleRef.current.z * wobbleDecay * 0.2;
                const complementaryRotY = Math.sin(currentTime * wobbleFreq * 0.5) * wobbleRef.current.intensity * wobbleDecay * 0.15;
                const complementaryRotZ = Math.sin(currentTime * wobbleFreq * 0.9) * wobbleRef.current.x * wobbleDecay * 0.2;

                balloonGroupRef.current.rotation.x = originalRotationRef.current.x + rotationX + complementaryRotX;
                balloonGroupRef.current.rotation.y = originalRotationRef.current.y + complementaryRotY;
                balloonGroupRef.current.rotation.z = originalRotationRef.current.z + rotationZ + complementaryRotZ;
            } else {
                const settle = Math.min(1, dt * 5);
                baseScale.current.lerp(UNIT_SCALE, settle);
                balloonGroupRef.current.rotation.x = THREE.MathUtils.lerp(balloonGroupRef.current.rotation.x, originalRotationRef.current.x, settle);
                balloonGroupRef.current.rotation.y = THREE.MathUtils.lerp(balloonGroupRef.current.rotation.y, originalRotationRef.current.y, settle);
                balloonGroupRef.current.rotation.z = THREE.MathUtils.lerp(balloonGroupRef.current.rotation.z, originalRotationRef.current.z, settle);
            }

            const jiggleTime = currentTime * jiggleRate.current + jigglePhase.current;
            balloonMeshRef.current.scale.set(
                baseScale.current.x * (1 + Math.sin(jiggleTime) * JIGGLE_AMOUNT),
                baseScale.current.y * (1 + Math.sin(jiggleTime * 1.37 + 1.3) * JIGGLE_AMOUNT * 1.4),
                baseScale.current.z * (1 + Math.sin(jiggleTime * 0.79 + 2.6) * JIGGLE_AMOUNT)
            );
        }

        if (!spawnDone.current) {
            if (spawnStart.current < 0) spawnStart.current = currentTime;
            const elapsed = currentTime - spawnStart.current;
            const progress = 1 - Math.exp(-elapsed / SPAWN_TAU);

            if (mesh.current) {
                const scale = 1 - (1 - SPAWN_START_SCALE) * (1 - progress);
                mesh.current.scale.set(scale, scale, scale);
            }

            if (elapsed >= SPAWN_SETTLE_SECONDS) {
                spawnDone.current = true;
                mesh.current?.scale.set(1, 1, 1);
            }
        }

        if (mesh.current && onRemove) {
            mesh.current.getWorldPosition(tmpWorldPos);
            if (tmpWorldPos.distanceTo(spawnPosition.current) > 200) {
                onRemove(id);
            }
        }
    });

    const triggerWobble = (impactPoint: THREE.Vector3, _impactDirection: THREE.Vector3, intensity: number = 1, currentTime?: number): void => {
        if (!balloonMeshRef.current) return;

        const balloonPos = new THREE.Vector3();
        balloonMeshRef.current.getWorldPosition(balloonPos);

        const relativeImpact = impactPoint.clone().sub(balloonPos).normalize();

        wobbleRef.current.x = relativeImpact.x * intensity;
        wobbleRef.current.y = relativeImpact.y * intensity * 0.5;
        wobbleRef.current.z = relativeImpact.z * intensity;
        wobbleRef.current.intensity = intensity;

        lastImpactRef.current.point.copy(impactPoint);
        lastImpactRef.current.time = currentTime || performance.now() / 1000;
    };

    useEffect(() => {
        if (mesh.current && spawning) {
            mesh.current.scale.set(SPAWN_START_SCALE, SPAWN_START_SCALE, SPAWN_START_SCALE);
        }

        if (balloonMeshRef.current && originalRotationRef.current.x === 0 && originalRotationRef.current.y === 0 && originalRotationRef.current.z === 0) {
            originalRotationRef.current.x = balloonMeshRef.current.rotation.x;
            originalRotationRef.current.y = balloonMeshRef.current.rotation.y;
            originalRotationRef.current.z = balloonMeshRef.current.rotation.z;
        }
    }, [spawning]);

    useEffect(() => {
        if (mesh.current && rigidBodyRef.current) {
            mesh.current.userData = { balloonId: id };
            meshToBodyRef.current.set(mesh.current as unknown as THREE.Object3D, rigidBodyRef.current);
            mesh.current.triggerWobble = triggerWobble;

            if (balloonGroupRef.current) {
                originalRotationRef.current = {
                    x: balloonGroupRef.current.rotation.x,
                    y: balloonGroupRef.current.rotation.y,
                    z: balloonGroupRef.current.rotation.z
                };
            }
        }
        return () => {
            if (mesh.current) {
                meshToBodyRef.current.delete(mesh.current as unknown as THREE.Object3D);
            }
        };
    }, [meshToBodyRef, id]);

    return (
        <RigidBody
            ref={rigidBodyRef}
            gravityScale={0.02}
            linearDamping={1.5}
            angularDamping={1.0}
            mass={balloonMass.current}
            restitution={0.8}
            friction={0.1}
            colliders={false}
        >
            <BallCollider args={[BALLOON_COLLIDER_RADIUS]} position={position} />
            <group
                ref={mesh as React.RefObject<THREE.Group>}
                position={position}
            >
                <group ref={balloonGroupRef}>
                    <mesh ref={balloonMeshRef} geometry={BALLOON_GEOMETRY} material={material} />
                </group>
            </group>
        </RigidBody>
    );
});

function getRandomPosition(): [number, number, number] {
    return [
        Math.random() * SPAWN_EXTENT - SPAWN_HALF_EXTENT,
        Math.random() * SPAWN_EXTENT - SPAWN_HALF_EXTENT,
        Math.random() * SPAWN_EXTENT - SPAWN_HALF_EXTENT,
    ];
}

function getRandomColor(): string {
    return SCENE_BALLOON_COLORS[Math.floor(Math.random() * SCENE_BALLOON_COLORS.length)];
}

function SimClock(): null {
    useBeforePhysicsStep(() => {
        simClock.time += PHYSICS_TIME_STEP;
    });
    return null;
}

function ReadySignal({ onReady }: { onReady: () => void }): null {
    const frames = useRef<number>(0);
    const signaled = useRef<boolean>(false);

    useFrame(() => {
        if (signaled.current) return;
        frames.current += 1;
        if (frames.current >= 3) {
            signaled.current = true;
            onReady();
        }
    });

    return null;
}

function RapierProvider({ rapierRef }: RapierProviderProps): null {
    const { rapier } = useRapier();
    useEffect(() => {
        rapierRef.current = rapier;
    }, [rapier, rapierRef]);
    return null;
}

interface BalloonFieldProps {
    meshToBodyRef: RefObject<Map<THREE.Object3D, RapierRigidBody>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rapierRef: RefObject<any>;
    physicsPaused: boolean;
    onReady: () => void;
}

export default function BalloonField({ meshToBodyRef, rapierRef, physicsPaused, onReady }: BalloonFieldProps): React.ReactElement {

    const { balloonSpawnQueue, clearSpawnQueue } = useBalloons();
    const [balloons, setBalloons] = useState<BalloonData[]>([]);

    useMemo(prewarmMaterials, []);

    const [initialBalloons, setInitialBalloons] = useState<BalloonData[]>(() =>
        Array.from({ length: 60 }).map((_, index) => {
            const color = getRandomColor();
            return {
                position: getRandomPosition(),
                color,
                id: `initial-${index}`,
            };
        })
    );

    const removeBalloon = useCallback((balloonId: string): void => {
        meshToBodyRef.current.forEach((_body, mesh) => {
            if ((mesh as unknown as BalloonMesh).userData?.balloonId === balloonId) {
                meshToBodyRef.current.delete(mesh);
            }
        });

        if (balloonId.startsWith('initial-')) {
            setInitialBalloons(prev => prev.filter(balloon => balloon.id !== balloonId));
        } else {
            setBalloons(prev => prev.filter(balloon => balloon.id !== balloonId));
        }
    }, [meshToBodyRef]);

    useEffect(() => {
        if (balloonSpawnQueue.length > 0) {
            balloonSpawnQueue.forEach(({ color, count }) => {
                const currentTotalBalloons = initialBalloons.length + balloons.length;
                const maxNewBalloons = Math.max(0, 400 - currentTotalBalloons);
                const actualCount = Math.min(count, maxNewBalloons);

                if (actualCount > 0) {
                    const newBalloons: BalloonData[] = Array.from({ length: actualCount }).map(() => ({
                        position: getRandomPosition(),
                        color: color,
                        id: Math.random().toString(36).slice(2, 11),
                        spawning: true,
                    }));
                    setBalloons(prev => [...prev, ...newBalloons]);
                }
            });
            clearSpawnQueue();
        }
    }, [balloonSpawnQueue, clearSpawnQueue, initialBalloons.length, balloons.length]);

    return (
        <Physics paused={physicsPaused} timeStep={PHYSICS_TIME_STEP}>
            <SimClock />
            <ReadySignal onReady={onReady} />
            {initialBalloons.map((data) => (
                <Balloon
                    key={data.id}
                    id={data.id}
                    position={data.position}
                    color={data.color}
                    meshToBodyRef={meshToBodyRef}
                    onRemove={removeBalloon}
                />
            ))}
            {balloons.map((data) => (
                <Balloon
                    key={data.id}
                    id={data.id}
                    position={data.position}
                    color={data.color}
                    meshToBodyRef={meshToBodyRef}
                    spawning={data.spawning}
                    onRemove={removeBalloon}
                />
            ))}
            <RapierProvider rapierRef={rapierRef} />
        </Physics>
    );
}
