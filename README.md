# Interactive 3D Portfolio

Personal portfolio website featuring a 3D environment with real-time physics simulation and dynamic GitHub integration.

## Technical Architecture

### 3D Graphics & Physics Engine

Built on **React Three Fiber** (R3F), a React renderer for Three.js that provides declarative 3D scene composition. The physics simulation is powered by **@react-three/rapier**, which wraps the Rapier physics engine to deliver real-time rigid body dynamics.

**Key 3D Features:**

- **Balloon Physics System**: Interactive 3D balloons with realistic physics properties including gravity, collision detection, and momentum transfer
- **GLTF Model Integration**: Animated 3D models loaded via `useGLTF` with automatic shadow casting/receiving and tone mapping disabled for enhanced lighting
- **Real-time Animation Loop**: Leverages `useFrame` for 60fps animation updates, including floating animations and physics step calculations
- **Camera Controls**: Orbital camera system with smooth transitions and responsive interaction boundaries

### State Management & Context Architecture

Implements a custom **React Context** system for managing balloon spawn events across components:

- **BalloonContext**: Centralized state for balloon spawning with queue-based system
- **Event-driven Spawning**: Tech stack icons trigger themed balloon clusters with customizable parameters (color, count, speed, size, rotation)

### GitHub API Integration

Dynamic repository data fetching with comprehensive metadata extraction:

- **REST API Integration**: Fetches user repositories with authentication support via GitHub tokens
- **Language Analysis**: Retrieves and calculates code distribution across programming languages
- **Importance Algorithm**: Custom scoring system based on stars, watchers, forks, and repository size
- **README Processing**: Base64 decoding of README content with UTF-8 text processing
- **Rate Limiting Handling**: Implements proper headers and error handling for API constraints

### GameBoy-Inspired UI System

Custom-built retro gaming interface with modern web technologies:

- **Cartridge Navigation**: 3D-transformed repository cards with perspective effects and hover animations
- **D-pad Controls**: Directional navigation system with keyboard and click event handling
- **Dual Screen Layout**: Separates repository selection from content display, mimicking classic gaming handhelds
- **README Renderer**: Uses `react-markdown` with `remark-gfm` plugin for GitHub Flavored Markdown support

### Animation & Interaction Systems

**Framer Motion** powers sophisticated animation sequences:

- **Staggered Animations**: Sequential element reveals with configurable timing delays
- **Intersection Observer Integration**: Viewport-based animation triggers using `useInView`
- **Transform Effects**: 3D CSS transforms for card rotations, scaling, and perspective effects
- **Gesture Recognition**: Click, drag, and hover interactions with smooth state transitions

### Performance Optimizations

- **Component Lazy Loading**: `Suspense` boundaries for 3D scene initialization
- **Memory Management**: Proper cleanup of animation mixers, physics bodies, and event listeners
- **Pagination System**: Repository data chunking to maintain smooth UI performance
- **Viewport Culling**: Intersection observers to optimize animation triggers

### Build System & Deployment

**Next.js** configuration optimized for static export:

- **Static Generation**: Pre-rendered pages for optimal loading performance
- **Image Optimization**: Configured for static hosting environments
- **Environment Variables**: Secure token management for GitHub API access
- **PostCSS Pipeline**: TailwindCSS processing with custom utility classes

### Responsive Design Strategy

**TailwindCSS** utility-first approach with:

- **Mobile-First Breakpoints**: Adaptive layouts from mobile to desktop
- **Touch-Friendly Interactions**: Optimized button sizes and gesture areas
- **Fluid Typography**: Responsive text scaling across device sizes
- **Grid System**: CSS Grid and Flexbox for complex layout management

### Technical Features

**3D Interaction Model:**

- Click and drag to interact with physics-enabled balloons
- Tech stack icons spawn themed balloon clusters with unique visual properties
- Orbital camera controls for 3D scene exploration

**Portfolio Navigation:**

- GameBoy-style D-pad navigation between repository pages
- A/B button system for quick access to live sites and GitHub repositories
- Integrated README viewer for repositories without live deployments
- Real-time repository metadata display including language distribution and project statistics

## Tech Stack

- **Frontend Framework**: Next.js 15 with React 18
- **3D Graphics**: React Three Fiber + Drei + Rapier Physics
- **Styling**: TailwindCSS with custom utility classes
- **Animation**: Framer Motion with intersection-based triggers
- **API Integration**: GitHub REST API with token authentication
- **Content Processing**: React Markdown with GitHub Flavored Markdown support
- **Build Tools**: PostCSS, ESLint, and Next.js compiler optimizations
