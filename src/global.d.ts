// Extend JSX IntrinsicElements with Three.js elements from @react-three/fiber
import type { ThreeElements } from '@react-three/fiber';

declare module 'react' {
    namespace JSX {
        interface IntrinsicElements extends ThreeElements { }
    }
}
