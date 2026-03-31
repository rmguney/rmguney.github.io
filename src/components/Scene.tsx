import { useState, useRef, useEffect, Suspense, useCallback, MutableRefObject } from "react";
import { Canvas, useFrame, useThree, RootState } from "@react-three/fiber";
import { Physics, RigidBody, useRapier, RapierRigidBody } from "@react-three/rapier";
import { useGLTF, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { useBalloons } from '../context/BalloonContext';
import React from 'react';
import type {
    BalloonData,
    BalloonProps,
    ModelProps,
    SkyboxProps,
    SceneProps,
    Scene3DProps,
    RapierProviderProps,
    WobbleState,
    LastImpact,
    RotationState,
    IVector3Pool,
    BalloonMesh
} from '../types';

class Vector3Pool implements IVector3Pool {
    private pool: THREE.Vector3[] = [];
    private active: Set<THREE.Vector3> = new Set();

    constructor(initialSize: number = 50) {
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(new THREE.Vector3());
        }
    }

    get(): THREE.Vector3 {
        const vec = this.pool.pop() || new THREE.Vector3();
        this.active.add(vec);
        return vec;
    }

    release(vec: THREE.Vector3): void {
        if (this.active.has(vec)) {
            this.active.delete(vec);
            vec.set(0, 0, 0);
            this.pool.push(vec);
        }
    }

    releaseAll(): void {
        this.active.forEach(vec => {
            vec.set(0, 0, 0);
            this.pool.push(vec);
        });
        this.active.clear();
    }
}

const vector3Pool = new Vector3Pool(100);

const UNIT_SCALE = new THREE.Vector3(1, 1, 1);
const tmpWorldPos = new THREE.Vector3();
const tmpSphere = new THREE.Sphere();

const FORCE_AMOUNT = 250;
const MAX_FRAME_DELTA = 1 / 30;

const BALLOON_GEOMETRY = new THREE.SphereGeometry(2, 32, 32);
const KNOT_GEOMETRY = new THREE.SphereGeometry(0.5, 16, 16);

const DRACO_DECODER_PATH = '/draco/';

function Model({ setModelLoaded }: ModelProps): React.ReactElement {
    const group = useRef<THREE.Group>(null);
    const { scene, animations } = useGLTF("/models/model.glb", DRACO_DECODER_PATH);
    const mixer = useRef<THREE.AnimationMixer | null>(null);

    useEffect(() => {
        if (scene) {
            scene.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = false;
                    child.receiveShadow = false;
                    if (child.material) {
                        (child.material as THREE.Material).toneMapped = false;
                    }
                }
            });
            if (animations && animations.length) {
                mixer.current = new THREE.AnimationMixer(scene);
                animations.forEach((clip) => mixer.current!.clipAction(clip).play());
            }
            setModelLoaded(true);
        }
    }, [scene, animations, setModelLoaded]);

    useFrame((state, delta) => {
        if (group.current) {
            group.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.5 - 8;
        }
        mixer.current?.update(delta);
    });

    return (
        <group ref={group} scale={[2, 2, 2]} position={[17, -5, 0]}>
            <primitive object={scene} />
        </group>
    );
}

function Skybox({ setSkyboxLoaded }: SkyboxProps): React.ReactElement {
    const skyboxGroupRef = useRef<THREE.Group>(null);
    const { scene } = useGLTF("/models/skybox.glb", DRACO_DECODER_PATH);

    useEffect(() => {
        if (scene) {
            scene.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = false;
                    child.receiveShadow = false;
                    if (child.material) {
                        (child.material as THREE.Material).toneMapped = false;
                        (child.material as THREE.Material).depthWrite = false;
                    }
                }
            });
            setSkyboxLoaded(true);
        }
    }, [scene, setSkyboxLoaded]);

    useFrame((state) => {
        if (skyboxGroupRef.current) {
            skyboxGroupRef.current.rotation.y = (Math.PI / 1.25) + state.clock.getElapsedTime() * 0.001;
        }
    });

    return (
        <group ref={skyboxGroupRef} position={[-50, 0, 0]}>
            <primitive object={scene} />
        </group>
    );
}

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

function RapierProvider({ rapierRef, worldRef }: RapierProviderProps): null {
    const { rapier, world } = useRapier();
    useEffect(() => {
        rapierRef.current = rapier;
        worldRef.current = world;
    }, [rapier, world, rapierRef, worldRef]);
    return null;
}

function Scene3D({ setModelLoaded }: Scene3DProps): React.ReactElement {
    const rapierRef = useRef<any>(null);
    const worldRef = useRef<import('@dimforge/rapier3d-compat').World | null>(null);
    const meshToBodyRef = useRef<Map<THREE.Mesh, RapierRigidBody>>(new Map());
    const { camera, gl } = useThree();
    const { balloonSpawnQueue, clearSpawnQueue } = useBalloons();
    const [balloons, setBalloons] = useState<BalloonData[]>([]);
    const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
    const pointerRef = useRef<THREE.Vector2>(new THREE.Vector2());
    const clockTimeRef = useRef<number>(0);

    const [modelLoadedState, setModelLoadedState] = useState<boolean>(false);
    const [skyboxLoadedState, setSkyboxLoadedState] = useState<boolean>(false);
    const [loadSkybox, setLoadSkybox] = useState<boolean>(false);
    const [physicsPaused, setPhysicsPaused] = useState<boolean>(false);

    useEffect(() => {
        const handleVisibility = (): void => setPhysicsPaused(document.hidden);
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    useEffect(() => {
        const allLoaded = modelLoadedState && skyboxLoadedState;
        setModelLoaded(allLoaded);
    }, [modelLoadedState, skyboxLoadedState, setModelLoaded]);

    useEffect(() => {
        if (modelLoadedState && !loadSkybox) {
            const timer = setTimeout(() => setLoadSkybox(true), 100);
            return () => clearTimeout(timer);
        }
    }, [modelLoadedState, loadSkybox]);

    useFrame((state: RootState) => {
        clockTimeRef.current = state.clock.getElapsedTime();
    });

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
    }, []);

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

    useEffect(() => {
        const handleResize = (): void => {
            const { innerWidth: width } = window;
            if (width <= 768) {
                camera.position.set(60, -15, 30);
            } else if (width <= 1024) {
                camera.position.set(55, -5, 30);
            } else {
                camera.position.set(40, -5, 30);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, [camera]);

    useEffect(() => {
        let rafId: number | null = null;
        let lastEvent: PointerEvent | null = null;

        const handleGlobalPointerMove = (event: PointerEvent): void => {
            lastEvent = event;

            if (rafId !== null) return;

            rafId = requestAnimationFrame(() => {
                rafId = null;

                if (!lastEvent) return;
                const evt = lastEvent;
                lastEvent = null;

                const rapier = rapierRef.current;

                if (rapier) {
                    const rect = gl.domElement.getBoundingClientRect();

                    if (evt.clientX < rect.left || evt.clientX > rect.right ||
                        evt.clientY < rect.top || evt.clientY > rect.bottom) {
                        return;
                    }

                    const x = evt.clientX - rect.left;
                    const y = evt.clientY - rect.top;

                    pointerRef.current.set(
                        (x / rect.width) * 2 - 1,
                        -(y / rect.height) * 2 + 1
                    );

                    raycasterRef.current.setFromCamera(pointerRef.current, camera);

                    const meshes = Array.from(meshToBodyRef.current.keys());

                    meshes.forEach(mesh => {
                        if (!mesh || !mesh.position) return;

                        const balloonWorldPos = vector3Pool.get();
                        mesh.getWorldPosition(balloonWorldPos);

                        tmpSphere.center.copy(balloonWorldPos);
                        tmpSphere.radius = 3.0;
                        const intersectionPoint = vector3Pool.get();

                        if (raycasterRef.current.ray.intersectSphere(tmpSphere, intersectionPoint)) {
                            const rigidBody = meshToBodyRef.current.get(mesh);

                            if (rigidBody && rigidBody.isValid && rigidBody.isValid()) {
                                const pushDirection = vector3Pool.get();
                                pushDirection.subVectors(balloonWorldPos, intersectionPoint);

                                if (pushDirection.length() < 0.1) {
                                    pushDirection.copy(raycasterRef.current.ray.direction);
                                    pushDirection.negate();
                                }

                                const distanceFromCenter = intersectionPoint.distanceTo(balloonWorldPos);
                                const forceIntensity = Math.max(0.3, 1 - distanceFromCenter / 3.0);

                                pushDirection.normalize();
                                const adjustedForceAmount = FORCE_AMOUNT * forceIntensity;
                                pushDirection.multiplyScalar(adjustedForceAmount);

                                pushDirection.y += adjustedForceAmount * 0.3;

                                const impulse = new rapier.Vector3(
                                    pushDirection.x,
                                    pushDirection.y,
                                    pushDirection.z
                                );

                                rigidBody.applyImpulse(impulse, true);

                                const torqueDirection = vector3Pool.get();
                                const tempVec1 = vector3Pool.get();
                                const tempVec2 = vector3Pool.get();

                                tempVec1.copy(intersectionPoint).sub(balloonWorldPos);
                                tempVec2.copy(pushDirection).normalize();
                                torqueDirection.crossVectors(tempVec1, tempVec2);

                                const torque = new rapier.Vector3(
                                    torqueDirection.x * forceIntensity * 2,
                                    torqueDirection.y * forceIntensity * 2,
                                    torqueDirection.z * forceIntensity * 2
                                );
                                rigidBody.applyTorqueImpulse(torque, true);

                                if ((mesh as BalloonMesh).triggerWobble) {
                                    const wobblePoint = intersectionPoint.clone();
                                    const wobbleDir = pushDirection.clone();
                                    (mesh as BalloonMesh).triggerWobble!(wobblePoint, wobbleDir, forceIntensity, clockTimeRef.current);
                                }

                                vector3Pool.release(torqueDirection);
                                vector3Pool.release(tempVec1);
                                vector3Pool.release(tempVec2);
                                vector3Pool.release(pushDirection);
                            }
                        }

                        vector3Pool.release(balloonWorldPos);
                        vector3Pool.release(intersectionPoint);
                    });
                }
            });
        };

        window.addEventListener('pointermove', handleGlobalPointerMove);
        return () => {
            window.removeEventListener('pointermove', handleGlobalPointerMove);
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
        };
    }, [camera, gl]);

    return (
        <>
            <PerspectiveCamera makeDefault />
            <ambientLight intensity={5} />
            <directionalLight
                position={[10, 10, 10]}
                intensity={1.5}
                castShadow
            />
            <directionalLight
                position={[-10, -10, -10]}
                intensity={0.5}
            />
            <Physics paused={physicsPaused}>
                <Suspense>
                    <Model setModelLoaded={setModelLoadedState} />
                    {loadSkybox && <Skybox setSkyboxLoaded={setSkyboxLoadedState} />}
                </Suspense>
                {(modelLoadedState && skyboxLoadedState) && (
                    <>
                        {initialBalloons.map((data) => (
                            <Balloon
                                key={data.id}
                                id={data.id}
                                position={data.position}
                                color={data.color}
                                meshToBodyRef={meshToBodyRef as MutableRefObject<Map<THREE.Mesh, RapierRigidBody>>}
                                onRemove={removeBalloon}
                            />
                        ))}
                        {balloons.map((data) => (
                            <Balloon
                                key={data.id}
                                id={data.id}
                                position={data.position}
                                color={data.color}
                                meshToBodyRef={meshToBodyRef as MutableRefObject<Map<THREE.Mesh, RapierRigidBody>>}
                                spawning={data.spawning}
                                onRemove={removeBalloon}
                            />
                        ))}
                    </>
                )}
                <RapierProvider rapierRef={rapierRef} worldRef={worldRef} />
            </Physics>
            <OrbitControls
                makeDefault
                enablePan={false}
                enableZoom={false}
                minPolarAngle={Math.PI / 6}
                maxPolarAngle={Math.PI - Math.PI / 6}
            />
        </>
    );
}

export default function Scene({ setModelLoaded }: SceneProps): React.ReactElement {
    return (
        <div style={{
            width: '100%',
            height: '100%',
        }}>
            <Canvas
                shadows
                gl={{
                    alpha: false
                }}
            >
                <Scene3D setModelLoaded={setModelLoaded} />
            </Canvas>
        </div>
    );
}
