import { useState, useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree, RootState } from "@react-three/fiber";
import { useGLTF, useProgress, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { WebGPURenderer } from 'three/webgpu';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { createModelMaterial, setShaderBackend, blinkAmount } from '../../utils/shading';
import { BlinkController } from '../../utils/blink';
import { loadProgress } from '../../utils/loadProgress';
import { setSkyProbeMesh, setSkyProbeCamera } from '../../utils/skyProbe';
import { setModelScreen } from '../../utils/modelProbe';
import { createJiggleSolver, JiggleSolver, BodyNudge, MAX_STEP } from '../../utils/jiggleRig';
import { prefetchAssets } from '../../utils/assetPrefetch';
import React from 'react';
import type { RapierRigidBody } from "@react-three/rapier";
import type {
    ModelProps,
    ModelPokeHandle,
    ModelColliderHandle,
    ModelColliderShape,
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
const modelSphere = new THREE.Sphere();

const FORCE_AMOUNT = 250;

const DRACO_DECODER_PATH = '/draco/';
const ASSET_QUERY = `?v=${__ASSET_VERSION__}`;
const MODEL_URL = `/models/model.glb${ASSET_QUERY}`;
const SKYBOX_PREVIEW_URL = `/models/skybox.opt.glb${ASSET_QUERY}`;
const SKYBOX_FULL_URL = `/models/skybox.glb${ASSET_QUERY}`;
const assetPrefetch = prefetchAssets([MODEL_URL, SKYBOX_PREVIEW_URL]);
const MOBILE_BREAKPOINT = 768;
const DPR_RANGE: [number, number] = [1, 2];
const LAYOUT_WAIT_FRAMES = 40;

function isUnlaidOut({ w, h }: { w: number; h: number }): boolean {
    return w === 0 || h === 0 || (w === 300 && h === 150);
}
const SKYBOX_RADIUS = 1000;
const tmpSkyboxSize = new THREE.Vector3();
const tmpModelSize = new THREE.Vector3();
const tmpModelCenter = new THREE.Vector3();
const modelWorldCenter = new THREE.Vector3();
const modelWorldQuat = new THREE.Quaternion();
const modelHitPoint = new THREE.Vector3();
const modelPushDir = new THREE.Vector3();
const modelLateral = new THREE.Vector3();
const MODEL_FIT_HEIGHT = 9;
const MODEL_GROUP_SCALE = 2;
const MODEL_YAW = 0.65;
const MODEL_SWAY = 0.05;
const MODEL_NUDGE_STRENGTH = 340;
const MODEL_GUST_STRENGTH = 120;
const MODEL_NUDGE_TILT = 0.055;
const MODEL_NUDGE_DEPTH = 0.4;
const MODEL_LOOK_YAW_GAIN = 0.30;
const MODEL_LOOK_PITCH_GAIN = 0.24;
const MODEL_LOOK_MAX_YAW = 0.19;
const MODEL_LOOK_MAX_PITCH = 0.12;
const MODEL_LOOK_SMOOTHING = 4.5;
const MODEL_BREATH_SPEED = 2.1;
const MODEL_BREATH_AMOUNT = 0.032;
const MODEL_BREATH_BONE = 'hips';
const modelNdc = { x: 0, y: 0 };
const MODEL_BASE_X = 17;
const MODEL_BASE_Y = 0;
const MODEL_BASE_Z = 0;
const MODEL_FLOAT_AMPLITUDE = 0.95;
const MODEL_FLOAT_SPEED = 1.05;
const MODEL_DRIFT_AMPLITUDE = 0.85;
const MODEL_DRIFT_SPEED = 0.37;
const FORCE_WEBGL = import.meta.env.VITE_FORCE_WEBGL === '1';

const tmpMeasureBox = new THREE.Box3();

// must measure detached: after the first rendered frame the parent chain's
// world transforms (group scale/position/rotation) leak into setFromObject
function measureLocalBounds(object: THREE.Object3D): THREE.Box3 {
    const parent = object.parent;
    object.parent = null;
    object.updateMatrixWorld(true);
    tmpMeasureBox.setFromObject(object);
    object.parent = parent;
    return tmpMeasureBox;
}

const tmpProjected = new THREE.Vector3();
const tmpEdge = new THREE.Vector3();
const tmpCameraRight = new THREE.Vector3();
const canvasRect = { left: 0, top: 0, width: 1, height: 1, stale: true };

function markCanvasRectStale(): void {
    canvasRect.stale = true;
}

function publishScreenPosition(state: RootState): void {
    const canvas = state.gl.domElement as HTMLCanvasElement;
    if (canvasRect.stale) {
        const r = canvas.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;
        canvasRect.left = r.left;
        canvasRect.top = r.top;
        canvasRect.width = r.width;
        canvasRect.height = r.height;
        canvasRect.stale = false;
    }

    const camera = state.camera;
    tmpProjected.copy(modelWorldCenter).project(camera);
    const behind = tmpProjected.z > 1;
    modelNdc.x = tmpProjected.x;
    modelNdc.y = tmpProjected.y;

    tmpCameraRight.setFromMatrixColumn(camera.matrixWorld, 0);
    tmpEdge.copy(modelWorldCenter).addScaledVector(tmpCameraRight, MODEL_FIT_HEIGHT);
    tmpEdge.project(camera);

    const x = canvasRect.left + (tmpProjected.x * 0.5 + 0.5) * canvasRect.width;
    const y = canvasRect.top + (-tmpProjected.y * 0.5 + 0.5) * canvasRect.height;
    const edgeX = canvasRect.left + (tmpEdge.x * 0.5 + 0.5) * canvasRect.width;

    setModelScreen(x, y, Math.abs(edgeX - x), !behind);
}

function ProgressForwarder(): null {
    useEffect(
        () => useProgress.subscribe((state) =>
            loadProgress.setPhase('assets', state.progress / 100)
        ),
        []
    );
    return null;
}

function Model({ setModelLoaded, pokeRef, colliderRef, setColliderShape }: ModelProps): React.ReactElement {
    const group = useRef<THREE.Group>(null);
    const fit = useRef<THREE.Group>(null);
    const { scene, animations } = useGLTF(MODEL_URL, DRACO_DECODER_PATH);
    const mixer = useRef<THREE.AnimationMixer | null>(null);
    const solvers = useRef<JiggleSolver[]>([]);
    const nudge = useRef<BodyNudge>(new BodyNudge());
    const blink = useRef<BlinkController>(new BlinkController());
    const animTime = useRef<number>(0);
    const lookTarget = useRef<{ yaw: number; pitch: number }>({ yaw: 0, pitch: 0 });
    const lookCurrent = useRef<{ yaw: number; pitch: number }>({ yaw: 0, pitch: 0 });
    const breathBone = useRef<THREE.Bone | null>(null);
    const breathSiblings = useRef<THREE.Bone[]>([]);
    const matricesSynced = useRef<boolean>(false);

    useEffect(() => {
        if (!scene) return;

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

        const solver = createJiggleSolver(scene);
        if (solver) solver.reset();
        solvers.current = solver ? [solver] : [];
        matricesSynced.current = false;

        let hips: THREE.Bone | null = null;
        scene.traverse((child) => {
            if (!hips && (child as THREE.Bone).isBone && child.name === MODEL_BREATH_BONE) {
                hips = child as THREE.Bone;
            }
        });
        breathBone.current = hips;
        breathSiblings.current = hips
            ? (hips as THREE.Bone).children.filter((c): c is THREE.Bone => (c as THREE.Bone).isBone)
            : [];

        if (animations && animations.length) {
            mixer.current = new THREE.AnimationMixer(scene);
            animations.forEach((clip) => mixer.current!.clipAction(clip).play());
        }
        setModelLoaded(true);
    }, [scene, animations, setModelLoaded]);

    useEffect(() => {
        if (!scene || !fit.current) return;
        scene.position.set(0, 0, 0);
        scene.scale.setScalar(1);
        const bounds = measureLocalBounds(scene);
        bounds.getSize(tmpModelSize);
        bounds.getCenter(tmpModelCenter);
        const height = Math.max(tmpModelSize.x, tmpModelSize.y, tmpModelSize.z);
        if (height <= 0) return;
        const scale = MODEL_FIT_HEIGHT / height;
        fit.current.scale.setScalar(scale);
        fit.current.position.set(
            -tmpModelCenter.x * scale,
            -tmpModelCenter.y * scale,
            -tmpModelCenter.z * scale
        );

        let source: THREE.Mesh | null = null;
        scene.traverse((child) => {
            if (!source && (child as THREE.Mesh).isMesh) source = child as THREE.Mesh;
        });
        if (!source) return;
        const geometry = (source as THREE.Mesh).geometry;
        const position = geometry.getAttribute('position');
        const index = geometry.getIndex();
        if (!position || !index) return;

        const collider = scale * MODEL_GROUP_SCALE;
        const vertices = new Float32Array(position.count * 3);
        for (let i = 0; i < position.count; i++) {
            vertices[i * 3] = (position.getX(i) - tmpModelCenter.x) * collider;
            vertices[i * 3 + 1] = (position.getY(i) - tmpModelCenter.y) * collider;
            vertices[i * 3 + 2] = (position.getZ(i) - tmpModelCenter.z) * collider;
        }
        setColliderShape({ vertices, indices: Uint32Array.from(index.array) });
    }, [scene, setColliderShape]);

    useFrame((state, delta) => {
        const step = Math.min(delta, MAX_STEP);
        animTime.current += step;
        const time = animTime.current;
        if (group.current) {
            const float = Math.sin(time * MODEL_FLOAT_SPEED)
                + Math.sin(time * MODEL_FLOAT_SPEED * 1.73 + 0.9) * 0.3;
            const driftX = Math.sin(time * MODEL_DRIFT_SPEED + 0.6)
                + Math.sin(time * MODEL_DRIFT_SPEED * 2.11 + 2.4) * 0.35;
            const driftZ = Math.sin(time * MODEL_DRIFT_SPEED * 0.83 + 3.1)
                + Math.sin(time * MODEL_DRIFT_SPEED * 1.67) * 0.4;
            nudge.current.update(step);
            const offset = nudge.current.offset;

            group.current.position.set(
                MODEL_BASE_X + driftX * MODEL_DRIFT_AMPLITUDE + offset.x,
                MODEL_BASE_Y + float * MODEL_FLOAT_AMPLITUDE + offset.y,
                MODEL_BASE_Z + driftZ * MODEL_DRIFT_AMPLITUDE * 0.8 + offset.z
            );
            group.current.rotation.z = Math.sin(time * 0.62) * MODEL_SWAY
                + driftX * MODEL_SWAY * 0.5
                - offset.x * MODEL_NUDGE_TILT;
            group.current.rotation.x = Math.sin(time * 0.41 + 1.3) * MODEL_SWAY * 0.7
                + driftZ * MODEL_SWAY * 0.4
                + offset.z * MODEL_NUDGE_TILT;
            group.current.rotation.y = MODEL_YAW + Math.sin(time * 0.27) * MODEL_SWAY * 1.4;
            group.current.getWorldPosition(modelWorldCenter);

            if (colliderRef) {
                group.current.getWorldQuaternion(modelWorldQuat);
                colliderRef.current = {
                    position: modelWorldCenter,
                    quaternion: modelWorldQuat,
                };
            }

            publishScreenPosition(state);
        }
        if (breathBone.current) {
            const breath = 1 + Math.sin(time * MODEL_BREATH_SPEED) * MODEL_BREATH_AMOUNT;
            breathBone.current.scale.setScalar(breath);
            const counter = 1 / breath;
            for (let i = 0; i < breathSiblings.current.length; i++) {
                breathSiblings.current[i].scale.setScalar(counter);
            }
        }
        const look = lookCurrent.current;
        const lookBlend = 1 - Math.exp(-MODEL_LOOK_SMOOTHING * step);
        look.yaw += (lookTarget.current.yaw - look.yaw) * lookBlend;
        look.pitch += (lookTarget.current.pitch - look.pitch) * lookBlend;
        if (!matricesSynced.current && group.current) {
            group.current.updateWorldMatrix(true, true);
            matricesSynced.current = true;
        }
        for (let i = 0; i < solvers.current.length; i++) {
            solvers.current[i].setLook(look.yaw, look.pitch);
            solvers.current[i].update(step);
        }
        blinkAmount.value = blink.current.update(step);
        mixer.current?.update(step);
        if (pokeRef) {
            pokeRef.current = {
                center: modelWorldCenter,
                radius: MODEL_FIT_HEIGHT,
                push: (direction, strength) => {
                    nudge.current.push(direction, strength * MODEL_NUDGE_STRENGTH);
                    for (let i = 0; i < solvers.current.length; i++) {
                        solvers.current[i].applyGust(direction, strength * MODEL_GUST_STRENGTH);
                    }
                    blink.current.trigger();
                },
                look: (yaw, pitch) => {
                    lookTarget.current.yaw = yaw;
                    lookTarget.current.pitch = pitch;
                },
            };
        }
    });

    return (
        <group
            ref={group}
            scale={[MODEL_GROUP_SCALE, MODEL_GROUP_SCALE, MODEL_GROUP_SCALE]}
            position={[MODEL_BASE_X, MODEL_BASE_Y, MODEL_BASE_Z]}
        >
            <group ref={fit}>
                <primitive object={scene} />
            </group>
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
            measureLocalBounds(scene).getSize(tmpSkyboxSize);
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
    const modelPokeRef = useRef<ModelPokeHandle | null>(null);
    const modelColliderRef = useRef<ModelColliderHandle | null>(null);
    const [modelColliderShape, setModelColliderShape] = useState<ModelColliderShape | null>(null);

    const [modelLoadedState, setModelLoadedState] = useState<boolean>(false);
    const [skyboxLoadedState, setSkyboxLoadedState] = useState<boolean>(false);
    const [sceneReady, setSceneReady] = useState<boolean>(false);
    const [physicsPaused, setPhysicsPaused] = useState<boolean>(false);
    const [assetsFetched, setAssetsFetched] = useState<boolean>(false);

    useEffect(() => {
        void assetPrefetch.then(() => setAssetsFetched(true));
    }, []);

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
            markCanvasRectStale();
            const width = canvas.clientWidth || target.clientWidth || 0;
            const height = canvas.clientHeight || target.clientHeight || 0;
            if (width <= 0 || height <= 0) return;
            gl.setPixelRatio(
                Math.min(Math.max(window.devicePixelRatio || 1, DPR_RANGE[0]), DPR_RANGE[1])
            );
            gl.setSize(width, height, false);
        });
        observer.observe(target);
        window.addEventListener('scroll', markCanvasRectStale, { passive: true });
        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', markCanvasRectStale);
        };
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
        let lastBucket = -1;
        const handleResize = (): void => {
            const { innerWidth: width } = window;
            const bucket = width <= 768 ? 0 : width <= 1024 ? 1 : 2;
            if (bucket === lastBucket) return;
            lastBucket = bucket;
            if (bucket === 0) {
                camera.position.set(60, -15, 30);
            } else if (bucket === 1) {
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

                const poke = modelPokeRef.current;
                if (poke) {
                    poke.look(
                        THREE.MathUtils.clamp(
                            (pointerRef.current.x - modelNdc.x) * MODEL_LOOK_YAW_GAIN,
                            -MODEL_LOOK_MAX_YAW, MODEL_LOOK_MAX_YAW
                        ),
                        THREE.MathUtils.clamp(
                            -(pointerRef.current.y - modelNdc.y) * MODEL_LOOK_PITCH_GAIN,
                            -MODEL_LOOK_MAX_PITCH, MODEL_LOOK_MAX_PITCH
                        )
                    );
                    modelSphere.center.copy(poke.center);
                    modelSphere.radius = poke.radius;
                    if (raycasterRef.current.ray.intersectSphere(modelSphere, modelHitPoint)) {
                        const rayDir = raycasterRef.current.ray.direction;
                        modelPushDir.subVectors(poke.center, modelHitPoint);
                        modelLateral.copy(modelPushDir)
                            .addScaledVector(rayDir, -modelPushDir.dot(rayDir));
                        const lateral = modelLateral.length();
                        if (lateral > 1e-4) {
                            modelPushDir.copy(modelLateral).divideScalar(lateral)
                                .addScaledVector(rayDir, MODEL_NUDGE_DEPTH);
                        } else {
                            modelPushDir.copy(rayDir);
                        }
                        modelPushDir.normalize();

                        const missDistance = raycasterRef.current.ray.distanceToPoint(poke.center);
                        const forceIntensity = Math.max(0.25, 1 - missDistance / poke.radius);
                        poke.push(modelPushDir, forceIntensity);
                    }
                }

                const rapier = rapierRef.current;

                if (rapier) {
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
            {assetsFetched && (
                <Suspense>
                    <Model
                        setModelLoaded={setModelLoadedState}
                        pokeRef={modelPokeRef}
                        colliderRef={modelColliderRef}
                        setColliderShape={setModelColliderShape}
                    />
                    <Skybox setSkyboxLoaded={setSkyboxLoadedState} />
                </Suspense>
            )}
            {assetsReady && (
                <Suspense fallback={null}>
                    <BalloonField
                        meshToBodyRef={meshToBodyRef}
                        rapierRef={rapierRef}
                        physicsPaused={physicsPaused}
                        onReady={() => setSceneReady(true)}
                        modelCollider={modelColliderShape}
                        modelColliderRef={modelColliderRef}
                        modelPokeRef={modelPokeRef}
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

const rendererPromises = new WeakMap<HTMLCanvasElement, Promise<WebGPURenderer>>();

async function createRenderer(canvas: HTMLCanvasElement): Promise<WebGPURenderer> {
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

    const build = async (forceWebGL: boolean): Promise<WebGPURenderer> => {
        const renderer = new WebGPURenderer({
            canvas,
            antialias: true,
            alpha: false,
            forceWebGL,
        });

        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height, false);

        await renderer.init();

        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height, false);
        return renderer;
    };

    let renderer: WebGPURenderer;
    try {
        renderer = await build(FORCE_WEBGL);
    } catch (error) {
        if (FORCE_WEBGL) throw error;
        console.warn('WebGPU init failed, retrying with WebGL2 backend', error);
        renderer = await build(true);
    }

    setShaderBackend(renderer.backend?.isWebGPUBackend === true);
    return renderer;
}

function acquireRenderer(props: unknown): Promise<WebGPURenderer> {
    const canvas = (props as { canvas: HTMLCanvasElement }).canvas;
    let promise = rendererPromises.get(canvas);
    if (!promise) {
        promise = createRenderer(canvas);
        rendererPromises.set(canvas, promise);
    }
    return promise;
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
                gl={acquireRenderer}
            >
                <Scene3D setModelLoaded={setModelLoaded} />
            </Canvas>
        </div>
    );
}
