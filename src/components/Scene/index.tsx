import { useState, useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree, RootState } from "@react-three/fiber";
import { useGLTF, useProgress, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { WebGPURenderer } from 'three/webgpu';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { createModelMaterial, setShaderBackend } from '../../utils/shading';
import { loadProgress } from '../../utils/loadProgress';
import { setSkyProbeMesh, setSkyProbeCamera } from '../../utils/skyProbe';
import React from 'react';
import type { RapierRigidBody } from "@react-three/rapier";
import type {
    ModelProps,
    SkyboxProps,
    SceneProps,
    Scene3DProps,
    IVector3Pool,
    BalloonMesh
} from '../../types';

const BalloonField = React.lazy(() => import('./BalloonField'));

THREE.setConsoleFunction((type: 'log' | 'warn' | 'error', message: string, ...params: unknown[]) => {
    if (type === 'warn' && message.startsWith('THREE.Clock: This module has been deprecated')) return;
    console[type](message, ...params);
});

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
const ASSET_QUERY = `?v=${__ASSET_VERSION__}`;
const MODEL_URL = `/models/model.glb${ASSET_QUERY}`;
const SKYBOX_PREVIEW_URL = `/models/skybox.opt.glb${ASSET_QUERY}`;
const SKYBOX_FULL_URL = `/models/skybox.glb${ASSET_QUERY}`;
const MOBILE_BREAKPOINT = 768;
const DPR_RANGE: [number, number] = [1, 2];
const LAYOUT_WAIT_FRAMES = 40;

function isUnlaidOut({ w, h }: { w: number; h: number }): boolean {
    return w === 0 || h === 0 || (w === 300 && h === 150);
}
const SKYBOX_RADIUS = 1000;
const tmpSkyboxSize = new THREE.Vector3();
const FORCE_WEBGL = import.meta.env.VITE_FORCE_WEBGL === '1';

function ProgressForwarder(): null {
    useEffect(
        () => useProgress.subscribe((state) =>
            loadProgress.setPhase('assets', state.progress / 100)
        ),
        []
    );
    return null;
}

function Model({ setModelLoaded }: ModelProps): React.ReactElement {
    const group = useRef<THREE.Group>(null);
    const { scene, animations } = useGLTF(MODEL_URL, DRACO_DECODER_PATH);
    const mixer = useRef<THREE.AnimationMixer | null>(null);

    useEffect(() => {
        if (scene) {
            scene.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = false;
                    child.receiveShadow = false;
                    if (child.material && !(child.material as THREE.Material).userData.celShaded) {
                        const shaded = createModelMaterial(child.material as THREE.Material);
                        shaded.userData.celShaded = true;
                        child.material = shaded;
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
    const { scene: previewScene } = useGLTF(SKYBOX_PREVIEW_URL, DRACO_DECODER_PATH);
    const [fullScene, setFullScene] = useState<THREE.Group | null>(null);

    useEffect(() => {
        if (window.innerWidth <= MOBILE_BREAKPOINT) return;

        let cancelled = false;
        const draco = new DRACOLoader();
        draco.setDecoderPath(DRACO_DECODER_PATH);
        const loader = new GLTFLoader(new THREE.LoadingManager());
        loader.setDRACOLoader(draco);

        loader.load(SKYBOX_FULL_URL, (gltf) => {
            if (cancelled) {
                gltf.scene.traverse((child) => {
                    if (child instanceof THREE.Mesh) child.geometry.dispose();
                });
                return;
            }
            setFullScene(gltf.scene);
        });

        return () => {
            cancelled = true;
            draco.dispose();
        };
    }, []);

    const scene = fullScene ?? previewScene;

    useEffect(() => {
        if (scene) {
            scene.scale.setScalar(1);
            scene.updateMatrixWorld(true);
            new THREE.Box3().setFromObject(scene).getSize(tmpSkyboxSize);
            const radius = Math.max(tmpSkyboxSize.x, tmpSkyboxSize.y, tmpSkyboxSize.z) / 2;
            if (radius > 0) scene.scale.setScalar(SKYBOX_RADIUS / radius);

            let probeMesh: THREE.Mesh | null = null;
            scene.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = false;
                    child.receiveShadow = false;
                    child.frustumCulled = false;
                    if (!probeMesh) probeMesh = child;
                    if (child.material) {
                        (child.material as THREE.Material).toneMapped = false;
                        (child.material as THREE.Material).depthWrite = false;
                    }
                }
            });
            if (probeMesh) setSkyProbeMesh(probeMesh);
            setSkyboxLoaded(true);
        }
    }, [scene, setSkyboxLoaded]);

    useFrame((state) => {
        if (skyboxGroupRef.current) {
            skyboxGroupRef.current.rotation.y = (Math.PI / 2.6) - state.clock.getElapsedTime() * 0.001;
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
    const meshToBodyRef = useRef<Map<THREE.Object3D, RapierRigidBody>>(new Map());
    const { camera, gl } = useThree();
    const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
    const pointerRef = useRef<THREE.Vector2>(new THREE.Vector2());
    const clockTimeRef = useRef<number>(0);

    const [modelLoadedState, setModelLoadedState] = useState<boolean>(false);
    const [skyboxLoadedState, setSkyboxLoadedState] = useState<boolean>(false);
    const [sceneReady, setSceneReady] = useState<boolean>(false);
    const [physicsPaused, setPhysicsPaused] = useState<boolean>(false);

    const assetsReady = modelLoadedState && skyboxLoadedState;

    useEffect(() => {
        const handleVisibility = (): void => setPhysicsPaused(document.hidden);
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    useEffect(() => {
        void import('./BalloonField');
    }, []);

    useEffect(() => {
        const canvas = gl.domElement;
        const target = canvas.parentElement ?? canvas;
        const observer = new ResizeObserver(() => {
            const width = canvas.clientWidth || target.clientWidth || 0;
            const height = canvas.clientHeight || target.clientHeight || 0;
            if (width <= 0 || height <= 0) return;
            gl.setPixelRatio(
                Math.min(Math.max(window.devicePixelRatio || 1, DPR_RANGE[0]), DPR_RANGE[1])
            );
            gl.setSize(width, height, false);
        });
        observer.observe(target);
        return () => observer.disconnect();
    }, [gl]);

    useEffect(() => {
        setSkyProbeCamera(camera);
    }, [camera]);

    useEffect(() => {
        if (!sceneReady) return;
        loadProgress.setPhase('scene', 1);
        setModelLoaded(true);
    }, [sceneReady, setModelLoaded]);

    useEffect(() => {
        if (!assetsReady || sceneReady) return;
        const start = performance.now();
        let raf = 0;
        const tick = (): void => {
            const elapsed = (performance.now() - start) / 1000;
            loadProgress.setPhase('scene', 0.96 * (1 - Math.exp(-elapsed / 1.2)));
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [assetsReady, sceneReady]);

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

                                if ((mesh as unknown as BalloonMesh).triggerWobble) {
                                    const wobblePoint = intersectionPoint.clone();
                                    const wobbleDir = pushDirection.clone();
                                    (mesh as unknown as BalloonMesh).triggerWobble!(wobblePoint, wobbleDir, forceIntensity, clockTimeRef.current);
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
            <PerspectiveCamera makeDefault fov={75} />
            <ProgressForwarder />
            <Suspense>
                <Model setModelLoaded={setModelLoadedState} />
                <Skybox setSkyboxLoaded={setSkyboxLoadedState} />
            </Suspense>
            {assetsReady && (
                <Suspense fallback={null}>
                    <BalloonField
                        meshToBodyRef={meshToBodyRef}
                        rapierRef={rapierRef}
                        physicsPaused={physicsPaused}
                        onReady={() => setSceneReady(true)}
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
                flat
                dpr={DPR_RANGE}
                gl={async (props) => {
                    const canvas = props.canvas as HTMLCanvasElement;
                    const pixelRatio = Math.min(
                        Math.max(window.devicePixelRatio || 1, DPR_RANGE[0]),
                        DPR_RANGE[1]
                    );

                    const measure = (): { w: number; h: number } => {
                        const parent = canvas.parentElement;
                        return {
                            w: canvas.clientWidth || parent?.clientWidth || 0,
                            h: canvas.clientHeight || parent?.clientHeight || 0,
                        };
                    };

                    let size = measure();
                    for (let i = 0; i < LAYOUT_WAIT_FRAMES && isUnlaidOut(size); i++) {
                        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
                        size = measure();
                    }

                    const width = size.w || window.innerWidth;
                    const height = size.h || window.innerHeight;

                    canvas.width = Math.max(1, Math.floor(width * pixelRatio));
                    canvas.height = Math.max(1, Math.floor(height * pixelRatio));

                    const renderer = new WebGPURenderer({
                        canvas,
                        antialias: true,
                        alpha: false,
                        forceWebGL: FORCE_WEBGL,
                    });

                    renderer.setPixelRatio(pixelRatio);
                    renderer.setSize(width, height, false);

                    await renderer.init();

                    renderer.setPixelRatio(pixelRatio);
                    renderer.setSize(width, height, false);

                    setShaderBackend(renderer.backend?.isWebGPUBackend === true);
                    return renderer;
                }}
            >
                <Scene3D setModelLoaded={setModelLoaded} />
            </Canvas>
        </div>
    );
}
