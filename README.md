# Interactive 3D Portfolio

Personal portfolio at [rmguney.github.io](https://rmguney.github.io): a procedurally rigged mascot afloat in a physics balloon field, plus a GitHub projects browser styled as a handheld console.

## Rendering

Three.js **WebGPURenderer** under React Three Fiber, falling back to WebGL2; the classic `WebGLRenderer` is shimmed out of the bundle entirely.

- Hand-written **WGSL and GLSL** kept in lockstep, chosen from the live backend at runtime with no TSL abstraction; a shader generation counter invalidates pooled materials if the backend changes
- Cel shading and rim lighting applied through `material.outputNode`, replacing material output instead of post-processing the frame

## Rigging & Animation

The mascot ships as a single unrigged mesh with no authored clips; rigging and animation are procedural end to end.

- A geodesic watershed over the welded mesh grows a 13-bone skeleton from a seed table; one-hot weights are Laplacian-smoothed to four influences and baked into the glTF offline (`npm run rig`), so the rig costs nothing at load and is reproducible from source
- Every bone drives a world-space particle on a spring-damper with per-limb stiffness, swing clamps, and length constraints, so any body motion produces secondary lag for free
- The procedural idle pose is applied before the spring solve, so limb and ear motion pulls the ragdoll along instead of being overwritten by it
- Pose, springs, nudge, and blink advance on a shared clamped clock, so returning from a background tab cannot snap the rig
- The blink is drawn in the shader: the eyes exist only in a scattered UV atlas, so the eyelid is an ellipsoid test in bind-pose space with a lash band, mixed into base colour before shading so the lid picks up the same cel banding as the face

## Physics

Rapier on a fixed timestep, forces applied in `useBeforePhysicsStep`.

- Near-neutral buoyancy balloons with layered wind and torque; pointer impulses drive impact wobble deformation on top of an idle jiggle
- A kinematic trimesh hull follows the procedurally animated mascot, so balloons bounce off it while nothing in the physics world can displace it
- Balloon impacts on the hull feed back into the mascot's nudge spring and gust, speed-gated so ambient drift never twitches it and capped far below a direct poke

## Adaptive UI

Overlay ink flips between black and white by sampling the scene behind it with zero framebuffer readback: the skybox is reduced once to a luminance map, screen points resolve by analytic ray-sphere intersection, and the sphere's UV convention (sign, offset, flip) is fitted statistically from its geometry rather than assumed. A hysteresis band prevents flicker near mid-grey.

## Assets & Loading

- Progressive skybox: a compressed preview renders immediately while the full asset loads behind it, skipped on mobile
- Draco quantization verified against the uncompressed source so error stays below one screen pixel
- A weighted phase bus aggregates asset, scene, and repo progress into one monotonic loader behind a reveal gate; projects data is prebuilt from the GitHub API at build time

## Tooling

`npm run test:audit`: Lighthouse across WebGPU/WebGL2 on desktop and mobile viewports, console cleanliness on both backends, and dependency checks. Vite + TypeScript SPA on GitHub Pages with a precaching service worker.
