# Core and Arrival Sequence — demo foundation

The guest homepage now owns the living Core. A single mounted procedural canvas
grows from a point, shifts right and stays in the Hero. The three-second sequence
reveals navigation, copy, telemetry and search with light beams and clipped reveals.
The left copy column has a stable final position.

The renderer uses 240 depth-projected spherical nodes, 22 precomputed orbit paths,
moving light packets with fading tails, additive glow and a breathing nucleus.
Glow sprites are painted once and reused, avoiding per-node canvas shadow blur.
Node identities remain stable during depth sorting so colors and flares do not
flicker. Pointer movement eases the viewing angle back to neutral on pointer leave;
demo search smoothly increases rotation speed and nucleus energy.
Geometry is initialized once, canvas resolution is capped
at 2×, and animation stops when hidden or outside the viewport. Reduced-motion
visitors get a still sphere and an immediate interface. All observers, listeners
and animation/timer handles are cleaned up on unmount.

First-visit playback uses the versioned `dss:arrival:v1` localStorage key. Storage
failure does not block the page. Replay is available for reviewing the demo; Escape
finishes the sequence, as does the visible Skip arrival button. Light beams originate
at the settled nucleus; an expanding ring accompanies the interface assembly.
The page remains usable without waiting for the animation.
Server-rendered content stays visible if JavaScript fails.

All telemetry is illustrative. Search is a local, explicitly labelled simulation
with three prewritten examples; it makes no AI or search API requests. Source chips
name illustrative modules and are not actual citations. There are no profile settings
or live integrations in this package.

This renderer is a dependency-free Canvas 2D projection of 3D geometry, not a WebGL
scene. It establishes the working composition and lifecycle. Further art direction,
potential WebGL bloom remain subject to visual review;
this package does not claim final pixel parity with the reference artwork.

Acceptance: desktop visual review, existing landing/shell E2E, arrival replay and
return visits, reduced motion, storage failure, mobile overflow and local demo search.
