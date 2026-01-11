import * as THREE from 'three';
import type { RapierRigidBody } from '@react-three/rapier';
import type { ReactNode, MutableRefObject } from 'react';

// ============================================
// Balloon Context Types
// ============================================

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

// ============================================
// Scene Component Types
// ============================================

export interface BalloonData {
    position: [number, number, number];
    color: string;
    id: string;
    spawning?: boolean;
}

export interface BalloonProps {
    position: [number, number, number];
    color: string;
    meshToBodyRef: MutableRefObject<Map<THREE.Mesh, RapierRigidBody>>;
    spawning?: boolean;
    onRemove?: (id: string) => void;
    id: string;
}

export interface ModelProps {
    setModelLoaded: (loaded: boolean) => void;
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
    rapierRef: MutableRefObject<unknown>;
    worldRef: MutableRefObject<import('@dimforge/rapier3d-compat').World | null>;
}

// ============================================
// Hero Component Types
// ============================================

export interface BalloonIconData {
    img: string;
    name: string;
    description: string;
    sceneColor: string;
    nameClassName: string;
    balloonOptions: {
        count: number;
        speed: number;
        size?: number;
        rotation: boolean;
    };
}

// ============================================
// Guide Component Types
// ============================================

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

// ============================================
// Display/GameBoy Component Types
// ============================================

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

export interface RepoMetadata {
    id: number;
    name: string;
    updated_at: string;
    pushed_at: string;
}

export interface CachedReposData {
    repos: Repository[];
    timestamp: number;
}

export interface FetchReposResult {
    repos: Repository[];
    fromCache: boolean;
}

export interface ChangeDetails {
    newRepos: string[];
    updatedRepos: string[];
    deletedRepos: string[];
}

export interface ChangeCheckResult {
    changed: boolean;
    details: ChangeDetails;
}

// ============================================
// Pattern Component Types
// ============================================

export interface PatternProps {
    size?: number;
}

// ============================================
// Loading Component Types
// ============================================

// Loading component doesn't require additional types

// ============================================
// Markdown Component Types
// ============================================

export interface MarkdownCodeProps {
    node?: unknown;
    inline?: boolean;
    className?: string;
    children?: ReactNode;
}

export interface MarkdownLinkProps {
    node?: unknown;
    href?: string;
    children?: ReactNode;
}

export interface MarkdownImageProps {
    node?: unknown;
    src?: string;
    alt?: string;
}

export interface MarkdownBaseProps {
    node?: unknown;
    children?: ReactNode;
}

// ============================================
// Wobble Effect Types (for Balloon)
// ============================================

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

export interface DeformationState {
    x: number;
    y: number;
    z: number;
}

export interface RotationState {
    x: number;
    y: number;
    z: number;
}

// ============================================
// Vector3 Pool Types
// ============================================

export interface IVector3Pool {
    get(): THREE.Vector3;
    release(vec: THREE.Vector3): void;
    releaseAll(): void;
}

// ============================================
// Extended Mesh Type with custom properties
// ============================================

export interface BalloonMesh extends THREE.Mesh {
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
