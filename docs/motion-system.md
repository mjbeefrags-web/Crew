# Motion and 3D System

The active showroom uses CSS for editorial transitions and direct Three.js for one isolated, optional product visualization. No GSAP, Motion, React Three Fiber or Drei dependency is installed.

## Current motion

- Product cards transition into an inspection overlay from their visible card bounds; close, browser Back and Escape return to the collection.
- Hover/focus imagery changes and button feedback are CSS-only and do not block input.
- The hoodie viewer rotates in response to drag, explicit rotate controls, or the new scroll-driven `scrollYaw` prop used by `DropObjectStage`. The old explicit rotate/reset controls and auto-spin still work; reduced motion disables scroll rotation.
- The district scene has bounded pointer parallax and a subtle scroll-driven dolly while the hero is in view. Storefront hover changes its sign treatment; raycast and DOM activations use the same collection route. Reduced motion disables camera pointer/scroll travel.
- Scene rendering updates on setup, resize and user input. The pixel ratio is capped at 1.5. Scene geometry, materials and textures are disposed on unmount or selected fabric-color change.
- Global reduced-motion CSS disables nonessential transitions/scroll smoothing; the studio uses an immediate close when reduced motion is requested.

## Three.js hoodie prototype

`src/scenes/CrewwwWorld.tsx` and `src/components/HoodieViewer.tsx` are both dynamically imported by the showroom, keeping Three.js out of the shared shell/design-system route. The world uses procedural storefront/building geometry and local hoodie photos as window posters. The product viewer builds a simple hoodie silhouette and generated Crewww mark procedurally. If WebGL creation is not supported, CSS campaign fallbacks and ordinary DOM navigation remain available.

The model communicates shape and interaction only. It is not a faithful garment pattern, drape simulation, production model, or accurate view of each reference design. Real 3D product presentation needs product-owner-approved GLB/GLTF assets, validated model maps, variants and hotspot definitions.

## Global experience layer

`src/components/ExperienceLayer.tsx` is mounted in `SiteLayout`. One rAF-throttled scroll loop publishes scroll progress, velocity, pointer position and active chapter as CSS variables; CSS uses them for reveal drifts, tilt, route curtain and fixed HUD labels. It also throttles chapter detection to 250 ms and diffs HUD text, so scrolling stays smooth.

## Speed and memory passes

- Lazy-load `DropObjectStage` and its Three.js viewer; the drop page has no WebGL until the section is active.
- `content-visibility: auto` + intrinsic sizes on the long `.drop-object` chapter reduce layout work below the fold.
- The object section is sticky only on non-reduced-motion, non-touch surfaces where user scrolling occurs.
- Reduced motion disables scroll rotation, tilt, parallax and the route curtain animations.

## QA still required

Browser automation verifies desktop Chromium behavior and screenshots at five CSS viewport widths. Physical iOS/Android WebGL performance, GPU/memory use, color management across devices, and assistive-technology review have not been completed. The shared Three.js chunk is approximately 570 kB minified (about 143 kB gzip) and loads through the showroom-only dynamic scene imports; Vite warns about that chunk threshold. Consider a simpler renderer or further code-splitting if device tests show the cost is too high.
