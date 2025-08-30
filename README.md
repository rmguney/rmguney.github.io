# Interactive 3D Portfolio

Personal portfolio website featuring an immersive 3D environment with physics-based balloon interactions and professional background showcase.

## Technical Architecture

### 3D Graphics & Physics Engine

Built on **React Three Fiber** (R3F), a React renderer for Three.js that provides declarative 3D scene composition. The physics simulation is powered by **@react-three/rapier**, which wraps the Rapier physics engine to deliver real-time rigid body dynamics.

**Key 3D Features:**

- **GLTF Model Integration**: Dual model system with main scene model and rotating skybox, featuring automatic shadow casting/receiving and tone mapping optimization
- **Interactive Balloon Physics**: Physics-enabled balloons with realistic buoyancy, wind forces, and collision detection
- **Mouse Interaction System**: Real-time balloon manipulation with proximity-based force application and visual deformation
- **Camera Controls**: Orbital camera system with responsive positioning and interaction boundaries

### State Management & Context Architecture

**React Context** system for global state management:

- **BalloonContext**: Manages balloon spawning queue and color-coded interactions
- **Loading State Management**: Synchronized loading tracking for multiple 3D assets
- **Certificate Integration**: Dynamic balloon spawning triggered by professional credential interactions

### Animation & Interaction Systems

**Framer Motion** powers sophisticated animation sequences:

- **Staggered Component Loading**: Sequential element reveals with intersection observer triggers
- **Interactive Text Elements**: Hover animations for LinkedIn integration with spring physics
- **Certificate Showcase**: Grid-based certification display with individual hover effects and balloon spawning
- **Wobble Physics**: Advanced balloon deformation system with impact-based animations

### Performance Optimizations

- **Distance Culling**: Automatic balloon cleanup system preventing performance degradation
- **Dual Model Loading**: Coordinated loading system for main model and skybox assets
- **Component Lazy Loading**: `Suspense` boundaries for 3D scene initialization
- **Memory Management**: Proper cleanup of physics bodies, animation loops, and event listeners
- **Conditional Rendering**: All scene components only appear after complete scene loading

### Build System & Deployment

**Next.js** configuration optimized for static export with automated CI/CD:

- **Static Generation**: Pre-rendered pages for optimal loading performance
- **Asset Optimization**: GLTF model loading with automatic caching
- **PostCSS Pipeline**: TailwindCSS processing with custom utility classes
- **Environment Configuration**: Development and production build optimization
- **GitHub Actions**: Automated CI/CD with npm caching and GitHub Pages deployment
- **Build Validation**: Automated testing and deployment pipeline with artifact management
- **Deployment Automation**: Push-to-deploy workflow with automated static site generation

### Responsive Design Strategy

**TailwindCSS** utility-first approach with:

- **Mobile-First Breakpoints**: Adaptive layouts from mobile to desktop
- **Touch-Friendly Interactions**: Optimized balloon interactions for mobile devices
- **Fluid Typography**: Responsive text scaling with professional typography
- **Grid System**: CSS Grid and Flexbox for complex certification layout

### Usage and Interaction

**3D Environment Interaction:**

- Hover over balloons to apply physics forces and trigger wobble animations
- Orbital camera controls for 3D scene exploration
- Interactive balloon spawning via credential showcase

**Professional Portfolio Navigation:**

- Certificate hover effects with color-coded balloon spawning
- LinkedIn profile integration with hover animations
- GitHub repository access via animated social links
