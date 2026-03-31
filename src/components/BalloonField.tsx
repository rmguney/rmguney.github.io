import { useState, useRef, useEffect, useCallback, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Physics, RigidBody, useRapier, RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useBalloons } from '../context/BalloonContext';
import { applyBalloonShading } from './shading';
import React from 'react';
import type {
    BalloonData,
    BalloonProps,
    RapierProviderProps,
    WobbleState,
    LastImpact,
    RotationState,
    BalloonMesh
} from '../types';

const UNIT_SCALE = new THREE.Vector3(1, 1, 1);
const tmpWorldPos = new THREE.Vector3();
const MAX_FRAME_DELTA = 1 / 30;

const BALLOON_GEOMETRY = new THREE.SphereGeometry(2, 32, 32);
const KNOT_GEOMETRY = new THREE.SphereGeometry(0.5, 16, 16);

const Balloon = React.memo(function Balloon({ position, color, meshToBodyRef, spawning, onRemove, id }: BalloonProps): React.ReactElement {
    const mesh = useRef<BalloonMesh>(null);
    const balloonMeshRef = useRef<THREE.Mesh>(null);
    const balloonGroupRef = useRef<THREE.Group>(null);
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);
    const knotMaterialRef = useRef<THREE.MeshPhysicalMaterial>(null);
    const windOffset = useRef<number>(Math.random() * Math.PI * 2);
    const balloonMass = useRef<number>(0.1 + Math.random() * 0.05);
    const spawnPosition = useRef<THREE.Vector3>(new THREE.Vector3(...position));

    const wobbleRef = useRef<WobbleState>({ x: 0, y: 0, z: 0, intensity: 0 });
    const lastImpactRef = useRef<LastImpact>({ point: new THREE.Vector3(), time: 0 });

    const originalRotationRef = useRef<RotationState>({ x: 0, y: 0, z: 0 });

    useFrame((state, delta) => {
        const currentTime = state.clock.getElapsedTime();
        const dt = Math.min(delta, MAX_FRAME_DELTA);

        if (rigidBodyRef.current) {
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
        }

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

                balloonMeshRef.current.scale.set(deformX, deformY, deformZ);

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
                balloonMeshRef.current.scale.lerp(UNIT_SCALE, settle);
                balloonGroupRef.current.rotation.x = THREE.MathUtils.lerp(balloonGroupRef.current.rotation.x, originalRotationRef.current.x, settle);
                balloonGroupRef.current.rotation.y = THREE.MathUtils.lerp(balloonGroupRef.current.rotation.y, originalRotationRef.current.y, settle);
                balloonGroupRef.current.rotation.z = THREE.MathUtils.lerp(balloonGroupRef.current.rotation.z, originalRotationRef.current.z, settle);
            }
        }

        if (spawning && materialRef.current && knotMaterialRef.current) {
            materialRef.current.opacity = THREE.MathUtils.lerp(
                materialRef.current.opacity,
                0.85,
                0.1
            );

            knotMaterialRef.current.opacity = THREE.MathUtils.lerp(
                knotMaterialRef.current.opacity,
                0.9,
                0.1
            );

            if (mesh.current) {
                mesh.current.scale.x = mesh.current.scale.y = mesh.current.scale.z = THREE.MathUtils.lerp(
                    mesh.current.scale.x,
                    1,
                    0.1
                );
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
            mesh.current.scale.set(0.1, 0.1, 0.1);
            if (materialRef.current) {
                materialRef.current.opacity = 0;
            }
            if (knotMaterialRef.current) {
                knotMaterialRef.current.opacity = 0;
            }
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
            meshToBodyRef.current.set(mesh.current as unknown as THREE.Mesh, rigidBodyRef.current);
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
                meshToBodyRef.current.delete(mesh.current as unknown as THREE.Mesh);
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
            colliders="ball"
        >
            <mesh
                ref={mesh as React.RefObject<THREE.Mesh>}
                position={position}
            >
                <group ref={balloonGroupRef}>
                    <mesh ref={balloonMeshRef} geometry={BALLOON_GEOMETRY}>
                        <meshPhysicalMaterial
                            ref={materialRef}
                            onBeforeCompile={applyBalloonShading}
                            color={color}
                            transparent={true}
                            opacity={spawning ? 0 : 0.85}
                            roughness={0.1}
                            metalness={0.0}
                            clearcoat={0.8}
                            clearcoatRoughness={0.1}
                            transmission={0.1}
                            thickness={0.5}
                        />
                    </mesh>
                    <mesh position={[0, -2.1, 0]} scale={[0.3, 0.4, 0.3]} geometry={KNOT_GEOMETRY}>
                        <meshPhysicalMaterial
                            ref={knotMaterialRef}
                            onBeforeCompile={applyBalloonShading}
                            color={color}
                            transparent={true}
                            opacity={spawning ? 0 : 0.9}
                            roughness={0.8}
                            metalness={0.0}
                        />
                    </mesh>
                </group>
            </mesh>
        </RigidBody>
    );
});

function getRandomPosition(): [number, number, number] {
    return [
        Math.random() * 50 - 25,
        Math.random() * 50 - 25,
        Math.random() * 50 - 25,
    ];
}

function getRandomColor(): string {
    const colors = ["#fdaea4", "#67e8f9", "#fef08a"];
    return colors[Math.floor(Math.random() * colors.length)];
}

function RapierProvider({ rapierRef }: RapierProviderProps): null {
    const { rapier } = useRapier();
    useEffect(() => {
        rapierRef.current = rapier;
    }, [rapier, rapierRef]);
    return null;
}

interface BalloonFieldProps {
    meshToBodyRef: RefObject<Map<THREE.Mesh, RapierRigidBody>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rapierRef: RefObject<any>;
    physicsPaused: boolean;
}

export default function BalloonField({ meshToBodyRef, rapierRef, physicsPaused }: BalloonFieldProps): React.ReactElement {
    const { balloonSpawnQueue, clearSpawnQueue } = useBalloons();
    const [balloons, setBalloons] = useState<BalloonData[]>([]);

    const [initialBalloons, setInitialBalloons] = useState<BalloonData[]>(() =>
        Array.from({ length: 60 }).map((_, index) => ({
            position: getRandomPosition(),
            color: getRandomColor(),
            id: `initial-${index}`
        }))
    );

    const removeBalloon = useCallback((balloonId: string): void => {
        meshToBodyRef.current.forEach((_body, mesh) => {
            if ((mesh as BalloonMesh).userData?.balloonId === balloonId) {
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
                        spawning: true
                    }));
                    setBalloons(prev => [...prev, ...newBalloons]);
                }
            });
            clearSpawnQueue();
        }
    }, [balloonSpawnQueue, clearSpawnQueue, initialBalloons.length, balloons.length]);

    return (
        <Physics paused={physicsPaused}>
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
