# Core and Arrival Sequence — demo foundation

## Review checkpoint — 2026-09-15

Status: functional demo ready for visual review. This is not approval of final
art direction, production readiness, or completion of the full Universe Landing.

Verified at this checkpoint:

- Formatting and web lint passed; production build and TypeScript passed.
- Web unit checks: 13 files, 22 tests passed.
- Chromium E2E: 13 scenarios passed, including replay, visibility pause, keyboard,
  no-script fallback, source selection, cancellation and narrow-screen controls.
- All three prepared topics were exercised with source previews in a separate
  browser run: no runtime errors or POST requests were observed.
- Obsolete fixed-angle beam styles were removed after the measured construction
  paths replaced them.

Still open for product/design review:

- How closely the Canvas sphere matches the reference energy, density and glow.
- Whether the three-second construction sequence conveys the desired arrival.
- Final wording, language, module naming and the long-term Core identity.

Deliberate demo boundaries: guest homepage only; authenticated visitors keep their
existing Command Deck. Data and sources are fixtures. Real AI, live events, profile
preferences and full landing-page modules are not implemented here. Frame timings
reported during development are local Chromium samples, not a cross-device SLA.

## Implementation

The guest homepage now owns the living Core. A single mounted procedural canvas
grows from a point, shifts right and stays in the Hero. The three-second sequence
reveals navigation, copy, telemetry and search with light beams and clipped reveals.
The left copy column has a stable final position.
Desktop construction now measures the actual Core and interface bounds before each
playback. Four light paths travel to the navbar, copy, telemetry and composer,
trace their outlines and precede content reveals within the three-second scene.
Telemetry counts up during its reveal using the same visible-time clock; skipping
restores exact values immediately. Screen readers receive stable final numbers,
while the decorative animated values are hidden from accessibility announcements.
The copy reveals vertically to preserve whole letter shapes. A resize during
playback completes the scene; replay measures the new layout. Compact screens
retain simpler reveals, and reduced-motion visitors skip construction effects.
Laptop viewports at least 1101px wide and no more than 900px tall use a compact
composition with matching arrival-beam coordinates. The initial composer was
verified inside the first screen at 1280×720, 1366×768 and 1440×1050.

The renderer uses 240 depth-projected spherical nodes, 22 precomputed orbit paths,
moving light packets with fading tails, additive glow and a breathing nucleus.
Glow sprites are painted once and reused, avoiding per-node canvas shadow blur.
A counter-rotating inner lattice surrounds the nucleus; a low-opacity atmospheric
rim separates the outer shell from the background without per-frame blur filters.
Node identities remain stable during depth sorting so colors and flares do not
flicker. Pointer movement eases the viewing angle back to neutral on pointer leave;
demo search smoothly increases rotation speed and nucleus energy.
Geometry is initialized once, canvas resolution is capped
at 2×, and animation stops when hidden or outside the viewport. Reduced-motion
visitors get a still sphere and an immediate interface. All observers, listeners
and animation/timer handles are cleaned up on unmount.

First-visit playback uses the versioned `dss:arrival:v1` localStorage key. The timer
and CSS playback pause together while the document is hidden: only visible arrival
time counts toward completion. Returning to the tab resumes the remaining time.
Storage failure does not block the page. Replay is available for reviewing the demo; Escape
finishes the sequence, as does the visible Skip arrival button. Light beams originate
at the settled nucleus; an expanding ring accompanies the interface assembly.
The page remains usable without waiting for the animation.
Server-rendered content stays visible if JavaScript fails.
Keyboard focus on interface controls completes the arrival, so hidden animated
controls never trap a keyboard user. Cancelling or resetting search returns focus
to its input. With JavaScript disabled, the page supplies a static SVG Core and
hides controls requiring hydration while retaining ordinary navigation.

All telemetry is illustrative. Search is a local, explicitly labelled simulation
with three prewritten examples; it makes no AI or search API requests. Source chips
open topic-specific illustrative excerpts and are not actual citations. Four
interactive module markers around Core launch prepared searches, highlight the
currently explored module and connect visually to the nucleus. Source previews
support keyboard activation and explicitly identify unpublished demo content.
There are no profile settings
or live integrations in this package.

The ambient storyboard advances every 6.5 seconds while visible and outside the
arrival sequence. Each event updates the activity card, bounded telemetry and Core
signal together. The sequence loops after five events; it is not cumulative real
community activity. Hidden tabs and offscreen scenes suspend the timer. A pause
control freezes ambient events and Core rendering; explicit search remains usable.
Search marks four modules in sequence, supports cancellation and offers prepared
examples for unsupported input instead of fabricating a matching response.

This renderer is a dependency-free Canvas 2D projection of 3D geometry, not a WebGL
scene. It establishes the working composition and lifecycle. Further art direction,
potential WebGL bloom remain subject to visual review;
this package does not claim final pixel parity with the reference artwork.

Acceptance: desktop visual review, existing landing/shell E2E, arrival replay and
return visits, reduced motion, storage failure, mobile overflow and local demo search.
