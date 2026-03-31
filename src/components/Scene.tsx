import { useState, useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree, RootState } from "@react-three/fiber";
import { useGLTF, useProgress, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { applyModelCelShading } from './shading';
import { loadProgress } from '../utils/loadProgress';
import React from 'react';
import type { RapierRigidBody } from "@react-three/rapier";
import type {
    ModelProps,
    SkyboxProps,
    SceneProps,
    Scene3DProps,
    IVector3Pool,
    BalloonMesh
} from '../types';

const BalloonField = React.lazy(() => import('./BalloonField'));

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

const tmpSphere = new THREE.Sphere();

const FORCE_AMOUNT = 250;

const DRACO_DECODER_PATH = '/draco/';

function ProgressForwarder(): null {
    useEffect(
        () => useProgress.subscribe((state) => loadProgress.set(state.progress)),
        []
    );
    return null;
}

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
                        (child.material as THREE.Material).onBeforeCompile = applyModelCelShading;
                        (child.material as THREE.Material).needsUpdate = true;
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


function Scene3D({ setModelLoaded }: Scene3DProps): React.ReactElement {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rapierRef = useRef<any>(null);
    const meshToBodyRef = useRef<Map<THREE.Mesh, RapierRigidBody>>(new Map());
    const { camera, gl } = useThree();
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
            <ProgressForwarder />
            <Suspense>
                <Model setModelLoaded={setModelLoadedState} />
                {loadSkybox && <Skybox setSkyboxLoaded={setSkyboxLoadedState} />}
            </Suspense>
            {(modelLoadedState && skyboxLoadedState) && (
                <Suspense fallback={null}>
                    <BalloonField
                        meshToBodyRef={meshToBodyRef}
                        rapierRef={rapierRef}
                        physicsPaused={physicsPaused}
                    />
                </Suspense>
            )}
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
                shadows={{ type: THREE.PCFShadowMap }}
                gl={{
                    alpha: false
                }}
            >
                <Scene3D setModelLoaded={setModelLoaded} />
            </Canvas>
        </div>
    );
}
