import * as THREE from 'three';
import type { RapierRigidBody } from '@react-three/rapier';
import type { ReactElement, RefObject } from 'react';

export interface BalloonSpawnRequest {
    color: string;
    count: number;
    speed?: number;
    size?: number;
    rotation?: boolean;
}

export interface BalloonContextValue {
    balloonSpawnQueue: BalloonSpawnRequest[];
    spawnBalloons: (
        color: string,
        count?: number,
        speed?: number,
        size?: number,
        rotation?: boolean
    ) => void;
    clearSpawnQueue: () => void;
}

export interface BalloonData {
    position: [number, number, number];
    color: string;
    id: string;
    spawning?: boolean;
}

export interface BalloonProps {
    position: [number, number, number];
    color: string;
    meshToBodyRef: RefObject<Map<THREE.Object3D, RapierRigidBody>>;
    spawning?: boolean;
    onRemove?: (id: string) => void;
    id: string;
}

export interface ModelPokeHandle {
    center: THREE.Vector3;
    radius: number;
    push: (direction: THREE.Vector3, strength: number) => void;
    look: (yaw: number, pitch: number) => void;
}

export interface ModelColliderShape {
    vertices: Float32Array;
    indices: Uint32Array;
}

export interface ModelColliderHandle {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
}

export interface ModelProps {
    setModelLoaded: (loaded: boolean) => void;
    pokeRef: RefObject<ModelPokeHandle | null>;
    colliderRef: RefObject<ModelColliderHandle | null>;
    setColliderShape: (shape: ModelColliderShape) => void;
}

export interface ModelColliderProps {
    shape: ModelColliderShape;
    handleRef: RefObject<ModelColliderHandle | null>;
    pokeRef: RefObject<ModelPokeHandle | null>;
}

export interface SkyboxProps {
    setSkyboxLoaded: (loaded: boolean) => void;
}

export interface SceneProps {
    setModelLoaded: (loaded: boolean) => void;
    className?: string;
}

export interface Scene3DProps {
    setModelLoaded: (loaded: boolean) => void;
}

export interface RapierProviderProps {
    rapierRef: RefObject<unknown>;
}

export interface BalloonIconData {
    icon: ReactElement;
    color: string;
    name: string;
}

export interface HoveredIcons {
    click: boolean;
    plus: boolean;
    drag: boolean;
}

export interface IconColors {
    click: string;
    plus: string;
    drag: string;
}

export interface RepoLanguages {
    [language: string]: number;
}

export interface Repository {
    id: number;
    name: string;
    description: string;
    url: string;
    githubUrl: string;
    websiteUrl?: string;
    color: string;
    textColor: string;
    language: string;
    size: number;
    stars: number;
    forks: number;
    watchers: number;
    languages: RepoLanguages;
    codeBytes: number;
    importanceFactor: number;
    isGithubPage: boolean;
    isPinned: boolean;
    isPortfolio: boolean;
    hasDeployments: boolean;
    hasPackages: boolean;
    ownerIsWatching?: boolean;
}

export interface LanguageStat {
    name: string;
    bytes: number;
    percentage: number;
}

export interface LanguageGroups {
    [groupName: string]: string[];
}

export interface LanguageColors {
    [language: string]: string;
}

export interface LanguageConfig {
    groups: LanguageGroups;
    colors: LanguageColors;
}

export interface FetchReposResult {
    repos: Repository[];
    fromCache: boolean;
}

export interface PatternProps {
    size?: number;
}

export interface WobbleState {
    x: number;
    y: number;
    z: number;
    intensity: number;
}

export interface LastImpact {
    point: THREE.Vector3;
    time: number;
}

export interface RotationState {
    x: number;
    y: number;
    z: number;
}

export interface IVector3Pool {
    get(): THREE.Vector3;
    release(vec: THREE.Vector3): void;
    releaseAll(): void;
}

export interface BalloonMesh extends THREE.Group {
    userData: {
        balloonId?: string;
    };
    triggerWobble?: (
        impactPoint: THREE.Vector3,
        impactDirection: THREE.Vector3,
        intensity: number,
        currentTime: number
    ) => void;
}

