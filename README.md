# Interactive 3D Portfolio

Personal portfolio website featuring an immersive 3D environment with physics-based balloon interactions and open source projects showcase.

## Technical Architecture

### Rendering Pipeline

Built on **React Three Fiber** over **Three.js**, rendering through **WebGPURenderer** with automatic WebGL2 fallback. The classic `WebGLRenderer` is excluded from the bundle via a module shim, so only one renderer ships.

- **Dual Shader Sources**: Hand-written **WGSL** and **GLSL** kept in lockstep, selected at runtime from the active backend, no TSL abstraction layer
- **Cel Shading**: Lambert quantization into discrete bands with a symmetric smoothstep edge, applied through `material.outputNode` so it replaces material output rather than post-processing the frame
- **Rim Lighting**: Fresnel term with independent power and strength per surface type

### Physics & Interaction

Physics is powered by **@react-three/rapier** wrapping the Rapier engine.

- **Framerate-Independent Simulation**: Fixed-timestep accumulator with impulses applied in `useBeforePhysicsStep`
- **Balloon Dynamics**: Buoyancy, layered wind forces, and torque, with explicit `BallCollider` sizing so spawn animations cannot alter mass
- **Mouse Interaction**: Proximity-based force application with impact-driven wobble deformation
- **Idle Jiggle**: Per-balloon deformation on incommensurate axis frequencies, composed over the wobble rather than accumulated into it
- **Camera**: Orbital controls with responsive positioning and constrained polar angles

### Adaptive UI

Overlay text and icons sample the scene behind them and switch between pure black and white.

- **Zero-Readback Sampling**: The skybox texture is reduced to a luminance map once at load; screen positions are resolved by analytic ray–sphere intersection against the fitted UV convention, so no framebuffer readback is ever performed
- **Hysteresis**: A threshold band prevents oscillation when the backdrop sits near mid-grey
- **Independent Regions**: Hero and guide sample their own screen areas and flip separately

### Asset Pipeline

- **Progressive Skybox**: A compressed preview renders immediately while the full-resolution asset loads behind it on its own `LoadingManager`, so the upgrade never re-enters the loading gate
- **Mobile Budget**: Small viewports skip the full-resolution upgrade entirely
- **Draco + WebP**: Geometry and texture compression throughout, with meshoptimizer decimation on the main model
- **Cache Busting**: A build-time asset version is appended to model URLs so replaced binaries can never be served stale

### Loading

- **Weighted Phase Bus**: Monotonic progress aggregated across assets, scene readiness, and repository fetch
- **Reveal Gate**: The projects view stays hidden until every phase completes
- **Lazy Boundaries**: Scene and projects are separate code-split chunks behind `Suspense`

### State Management

**React Context** for global state:

- **Framework Showcase**: Balloon spawning triggered by tech icon interactions
- **Material Pooling**: Materials are pre-warmed per palette colour after backend selection, so spawning compiles no shaders

### Animation

**Framer Motion** powers the interface animations:

- **Staggered Reveals**: Sequential element entry with intersection observer triggers
- **Interactive Text**: Hover animations with spring physics
- **Icon Grid**: Individual hover effects with brand-coloured feedback

### Audit Suite

TypeScript checks run directly through Node with `npm run test:audit`, or individually:

| Command | Coverage |
| --- | --- |
| `test:lighthouse` | Performance, accessibility, best practices, SEO across WebGPU/WebGL2 × desktop/mobile |
| `test:console` | Production console cleanliness on both backends |
| `test:console:dev` | Dev server console cleanliness |
| `test:dependabot` | Dependabot config and open alerts |
| `test:npm-audit` | Dependency vulnerabilities |

### Build & Deployment

**Vite** with **TypeScript** and **TailwindCSS 4** (via its Vite plugin, no PostCSS pipeline):

- **Client-Rendered SPA**: Static bundle output, deployed to GitHub Pages
- **PWA**: Service worker with precache manifest via `injectManifest`
- **GitHub Actions**: Push-to-deploy with npm caching
- **Source Maps**: Emitted for production debugging

### Responsive Design

- **Mobile-First Breakpoints**: Adaptive layouts from mobile to desktop
- **Responsive Camera**: Position adjusts across breakpoints to preserve framing
- **Touch-Friendly Interactions**: Balloon interactions tuned for mobile
- **Stable Scrollbar Gutter**: Reserved to prevent canvas resize jitter

### Usage and Interaction

**3D Environment:**

- Hover over balloons to apply physics forces and trigger wobble
- Drag to orbit the camera
- Click tech icons to spawn colour-matched balloons

**Portfolio Navigation:**

- Dynamic API fetched GitHub projects browser with language filtering and pagination
- GitHub repository and deployment access via animated links
- All consolidated to an interactive game console interface with navigation and action buttons
