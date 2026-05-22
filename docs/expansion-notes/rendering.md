# Rendering Research

## Current Three.js Version

`index.html:676` imports Three.js from `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`.

This is the non-module global build, so runtime code uses the global `THREE` namespace. Recommendations below target Three.js r128 APIs.

## Three.js LOD API

Three.js r128 includes `THREE.LOD`.

Basic usage:

```js
const lod = new THREE.LOD();
lod.addLevel(highMesh, 0);
lod.addLevel(midMesh, 8000);
lod.addLevel(lowMesh, 20000);
lod.addLevel(impostorMesh, 36000);
scene.add(lod);
```

How it works:

1. `new THREE.LOD()` creates an `Object3D` container with a sorted `levels` array.
2. `lod.addLevel(object, distance)` adds a child object and activates it when camera distance reaches that threshold.
3. Distances are measured from the camera world position to the LOD object's world position, divided by camera zoom.
4. Level `0` is visible from distance `0` until the next threshold. Each later threshold replaces the previous visible level.
5. `lod.update(camera)` performs the visibility switch. WebGLRenderer updates LOD objects during rendering in normal scene traversal, but explicit updates are also available.
6. `lod.getObjectForDistance(distance)` can be used for debugging or manual selection.

For a `500u` radius planet viewed at `40,000u`, apparent size is small but still visible: projected radius is about `11.7px` on a 1080px-tall viewport with a 60 degree camera FOV, or about `23px` diameter. That is enough for a sphere silhouette, color, and atmosphere glow, but not enough for high-frequency surface geometry.

## Planet LOD Thresholds

Assumptions:

1. Planet radius: `500u`.
2. Camera vertical FOV: current `PerspectiveCamera(60, ...)` from `js/engine/renderer.js`.
3. Target system shell: up to roughly `50,000u`, matching `docs/expansion-notes/world-scale.md`.
4. Planets need to read as landmarks, not terrain bodies.

| LOD | Camera distance | Approx. planet diameter at 1080p | Recommended geometry | Notes |
|---|---:|---:|---|---|
| Near | `0-6,000u` | `156px+` at `6,000u` | `SphereGeometry(500, 64, 32)` | Use only near landing/orbit approach where silhouette and lighting are noticeable. |
| Mid | `6,000-18,000u` | `52-156px` | `SphereGeometry(500, 32, 16)` | Best default for navigation approach; enough curvature without wasting triangles. |
| Far | `18,000-36,000u` | `26-52px` | `SphereGeometry(500, 16, 8)` | Sphere outline still reads; surface detail should be material/color, not mesh. |
| Extreme | `36,000u+` | `<26px`; about `23px` at `40,000u` | `SphereGeometry(500, 12, 6)` or billboard sprite | Use a tiny sphere if lighting/parallax matters; sprite if many planets are visible. |

Recommended `THREE.LOD` thresholds:

| `addLevel()` distance | Mesh |
|---:|---|
| `0` | Near: `64 x 32` sphere |
| `6_000` | Mid: `32 x 16` sphere |
| `18_000` | Far: `16 x 8` sphere |
| `36_000` | Extreme: `12 x 6` sphere or sprite impostor |

Do not use high-segment planets at system-map distances. At `40,000u`, a `64 x 32` sphere spends thousands of vertices on a body that occupies only about two dozen pixels across.

## Planet Atmosphere Glow

Use cheap layered primitives, not post-processing.

Recommended stack:

1. Planet body: normal front-side sphere with `MeshStandardMaterial`, `MeshLambertMaterial`, or `MeshPhongMaterial` depending on the existing lighting target.
2. Atmosphere shell: second `SphereGeometry` scaled to `1.025-1.06` of planet radius, rendered with `THREE.BackSide` so the rim reads around the silhouette.
3. Material: `MeshBasicMaterial` with `transparent: true`, low `opacity`, `blending: THREE.AdditiveBlending`, `depthWrite: false`, and `color` matching the planet atmosphere.
4. Optional outer halo: one camera-facing `THREE.Sprite` using an existing generated radial glow canvas texture, additive blending, and `depthWrite: false`.

Suggested atmosphere shell values for a `500u` planet:

```js
const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(530, 32, 16),
  new THREE.MeshBasicMaterial({
    color: 0x66ccff,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false
  })
);
```

This is shader-free and compatible with r128. It will not produce true Fresnel falloff, but for small system-scale planets it is much cheaper and visually sufficient. The generated radial glow texture pattern already exists in `js/engine/starfield.js:createRadialGlowTexture()`, so a sprite halo can reuse that technique if a stronger glow is needed.

## Star Field Backdrop

Recommended cheapest option: `THREE.Points` geometry attached to or recentered around the camera.

Reasoning:

1. The current code already uses `THREE.BufferGeometry` plus `THREE.PointsMaterial` for stars in `js/engine/starfield.js`.
2. Points are cheap, easy to color per vertex, and can use generated canvas textures instead of external assets.
3. To keep the backdrop from translating with player travel, either parent the star field to the camera or copy the camera position to the star field each frame while leaving rotation independent.
4. A cube skybox is also cheap, but needs six textures or a generated cube material and is less flexible for dense colored stars and nebula bands.
5. A separate background scene is more complexity than needed unless the renderer later needs independent depth/camera rules for multiple background layers.

Implementation recommendation:

1. Keep a large `THREE.Points` sphere or shell for stars.
2. Set `depthWrite: false`, `fog: false`, and additive or normal transparent blending depending on brightness.
3. Each frame, set `starField.position.copy(camera.position)` so it does not show translational parallax.
4. For optional depth, maintain separate near nebula/dust layers with small parallax, but keep the base stars locked to the camera.

## Primitive Space Station Recipes

Use only Three.js primitives: `BoxGeometry`, `CylinderGeometry`, `SphereGeometry`, `TorusGeometry`, `ConeGeometry`, `CapsuleGeometry` if available, and simple groups. In r128, avoid depending on newer helpers; boxes, cylinders, spheres, cones, and torus are safe.

### Outpost

Role: small remote utility station, low silhouette complexity.

Geometry recipe:

1. Core habitat: `CylinderGeometry(45, 45, 120, 12)` rotated 90 degrees on Z or X.
2. End caps: two `SphereGeometry(46, 12, 8)` or short cylinders at each end.
3. Docking collar: `TorusGeometry(58, 5, 8, 24)` around one end.
4. Solar panels: two or four `BoxGeometry(160, 4, 55)` panels on thin `BoxGeometry(90, 3, 3)` booms.
5. Antenna: `CylinderGeometry(2, 2, 70, 6)` plus `ConeGeometry(10, 24, 8)`.

LOD notes:

1. Near: full station with panels, antenna, collar.
2. Mid: core cylinder, panels, collar only.
3. Far: one low-segment cylinder plus two flat panel boxes.

### Trading Hub

Role: readable civilian landmark with ring/docking silhouette.

Geometry recipe:

1. Central hub: `SphereGeometry(80, 24, 12)` or `CylinderGeometry(70, 70, 90, 16)`.
2. Trade ring: `TorusGeometry(180, 14, 8, 48)` around the hub.
3. Spokes: six `BoxGeometry(150, 10, 10)` beams rotated evenly around the ring.
4. Docking arms: four `CylinderGeometry(12, 12, 180, 8)` or `BoxGeometry(26, 26, 180)` arms extending from cardinal points.
5. Cargo pods: repeated `BoxGeometry(45, 35, 35)` blocks attached around the lower ring or dock arms.
6. Signage glow: small `Sprite` or emissive `BoxGeometry` strips in faction colors.

LOD notes:

1. Near: torus, hub, six spokes, cargo pods, docks, glow strips.
2. Mid: torus, hub, four spokes, four docks.
3. Far: torus plus central sphere/cylinder only.

### Military Base

Role: angular armored station with strong defensive silhouette.

Geometry recipe:

1. Main body: stacked `BoxGeometry(150, 70, 220)` and `BoxGeometry(210, 45, 120)` armor slabs.
2. Command tower: `CylinderGeometry(38, 52, 90, 8)` or `BoxGeometry(65, 100, 65)` on top.
3. Defensive ring or brace: `TorusGeometry(145, 8, 8, 32)` rotated vertically, or four diagonal `BoxGeometry(16, 16, 180)` braces.
4. Turrets: small `CylinderGeometry(16, 16, 12, 8)` bases with `BoxGeometry(10, 10, 55)` barrels, placed on corners.
5. Hangar mouth: dark `BoxGeometry(90, 28, 8)` inset on the front face.
6. Radiators: paired `BoxGeometry(130, 5, 45)` fins along the sides.

LOD notes:

1. Near: slabs, tower, braces/ring, turrets, hangar, radiator fins.
2. Mid: body slabs, tower, four simplified turret blocks, hangar rectangle.
3. Far: one or two box hulls plus a tower block.

## Recommended Station LOD Bands

Stations have sharper silhouettes than planets, so their LOD can switch closer to the camera. Use per-station `THREE.LOD` groups with shared materials and reused geometries where possible.

| LOD | Camera distance | Station complexity |
|---|---:|---|
| Near | `0-2,500u` | Full primitive recipe; small turrets, antennas, panel details, glow strips. |
| Mid | `2,500-8,000u` | Main masses only; remove small antenna/turret barrels/cargo repeats. |
| Far | `8,000-20,000u` | Silhouette primitives only; ring/hub/body blocks. |
| Extreme | `20,000u+` | Single low-poly proxy, sprite icon, or navigation marker. |

## Final Recommendations

1. Use `THREE.LOD` for planets and stations; r128 supports the required API.
2. Planet LODs should be `64x32`, `32x16`, `16x8`, then `12x6` or sprite at `0`, `6,000`, `18,000`, and `36,000u`.
3. At `40,000u`, a `500u` radius planet is only about `23px` wide on a 1080p viewport, so high geometry is wasted.
4. Atmosphere should be a shader-free additive `BackSide` shell mesh, optionally reinforced with an additive radial-glow sprite.
5. Keep the base star field as `THREE.Points`, but lock or recenter it to the camera so it does not translate during system-scale flight.
6. Build stations from reusable primitive groups with distinct silhouettes: Outpost as cylinder/panels, Trading Hub as torus/ring/docks, Military Base as armored boxes/turrets.

## Risks

1. `THREE.LOD` switches are distance-threshold based and can pop without crossfade. Pick conservative thresholds and avoid very different silhouettes between adjacent levels.
2. Additive atmosphere shells can over-brighten when multiple transparent layers overlap. Keep opacity low and disable depth writes.
3. Camera-locked stars remove translation parallax by design. If nearby dust or nebula should imply motion, keep those as separate layers with controlled parallax rather than moving the base stars.
