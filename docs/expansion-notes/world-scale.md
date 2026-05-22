# World Scale Research

## Current Effective Playfield

Flight mode imports `flightUniverseScale = 10` from `js/constants.js`, stores it in `activeUniverseScale`, and applies it to bounds, radar, landing range, and non-flight project node scaling. Combat spawn, orbit, aggression, and weapon projectile distances are local raw world units.

| Measure | Source | Raw value | Effective flight value | Notes |
|---|---:|---:|---:|---|
| Player clamp radius | `state.js:233`, `physics.js:267` | `flightBounds = 135` | `1,350u` | `flightState.pos.clampLength(1.8, flightBounds * activeUniverseScale)` limits free flight to a 2,700u diameter sphere. |
| Planet/project shell | `state.js:228-229`, `state.js:1035-1049` | `260-1,080u` | `260-1,080u` in flight positions | `createFlightProjectPosition()` generates dedicated flight positions directly; they are not multiplied by `flightUniverseScale` when active. |
| Planet shell jitter | `state.js:1043-1048` | radial `+/-54u`, vertical sinusoid `+/-120u` | same | Meaningful relative to current 260-1,080u shell. |
| Landing range | `state.js:232`, `state.js:2317` | `7.2u` | `72u` | Landing uses `landingRange * activeUniverseScale`. |
| Radar range | `state.js:234`, `hud.js:76`, `hud.js:183` | `140u` | `1,400u` | Current radar sees nearly the full clamped playfield radius. |
| Enemy spawn radius | `enemies.js:752-759` | `92-150u`, height `+/-27u` | `92-150u` | Spawns are relative to player and not scaled. |
| Enemy orbit/aggression radius | `enemies.js:869-871`, `combat-state.js:98` | `46u`; low shield `27.6u`; phase fallback `46u` | same | Enemy firing begins when `dist < aggressionRadius`; combat phase also uses `46u` fallback. |
| Support enemy preferred band | `enemies.js:881-883` | `45-80u` | same | Support enemies approach if beyond 80u and back off if within 45u. |
| Player max speed | `physics.js:24`, `physics.js:312` | `22u/s` | `22u/s` | Afterburner boost raises cap to `39.6u/s`. |
| Player thrust/strafe | `state.js:1371-1372`, `physics.js:217-239` | thrust `14`, strafe `8` | same | Acceleration, not direct max speed. |
| Cold jump | `physics.js:127-130`, `combat-overhaul.js:172` | `40u` | same | Very small relative to current 1,350u radius; tiny at system scale. |
| Player laser cap | `state.js:222`, `weapons.js:286`, `weapons.js:450` | `320u` cap | `320u` | Projectile lifetime can imply longer railgun reach, but `playerLaserMaxDistanceSq` caps player bullets at 320u from player. |
| Player missile cap | `weapons.js:489` | `70u` from player | `70u` | `sqrt(4900) = 70`; this overrides 8s * 55-60u/s theoretical travel. |
| EMP burst | `combat-overhaul.js:149`, `weapons.js:342` | `22u` | `22u` | Local combat area effect only. |
| Enemy bullet range | `enemies.js:929`, `weapons.js:286`, `weapons.js:450` | `37.8u` lifetime, `60u` max-distance fallback | `37.8u` practical | Enemy bullets use speed `18`, life `2.1s`, fallback max distance `sqrt(3600)`. |

## Target Vast-System Scale

1. Recommended system metaphor: `1 world unit = 1,000 km`. This keeps readable HUD numbers possible while making a `50,000u` outer shell represent about `50,000,000 km`, roughly an inner-system playground rather than true astronomical scale.
2. Recommended `WORLD_SCALE`: `50`. It is the clean expansion factor from the current project shell max of about `1,080u` to about `54,000u`, and it aligns with the requested `+/-50,000u` precision question.
3. Recommended planet orbit bands: inner `8,000-14,000u`, mid `20,000-30,000u`, outer `38,000-50,000u`. Use category or mission importance to assign bands rather than uniformly scattering every station.
4. Recommended station placement rules: place stations on orbital shells with minimum angular separation of about `8-12deg` inside a band, radial jitter of `+/-1,200u`, vertical offset of `+/-1,500u`, and minimum station-to-station spacing of `2,500u`.
5. Recommended local-combat bubble: keep dogfight mechanics in a separate `400-1,500u` bubble around the player instead of multiplying every combat number by `50`. Spawn enemies relative to the player, keep aggression and weapon ranges readable, and move only navigation/station positions to system scale.
6. Recommended travel model: add or tune cruise/autopilot separately. At the current `22u/s`, crossing `50,000u` takes about 38 minutes; even afterburner at `39.6u/s` takes about 21 minutes.

## Scale References To Update

| File | Line | Current value | Meaning | Recommended new value |
|---|---:|---:|---|---|
| `js/flight/combat-state.js` | 98 | `event.range ?? 46` | Combat phase enemy-range fallback. | Keep `46` for local combat, or replace with `LOCAL_AGGRESSION_RADIUS = 46`; do not multiply by `WORLD_SCALE`. |
| `js/flight/enemies.js` | 41 | PointLight distance `8` | Enemy engine glow falloff. | Keep local, or derive from enemy visual scale; not system scale. |
| `js/flight/enemies.js` | 214 | `cls.approachSpeed.far * 2.2` | Spawn approach burst multiplier. | Keep local combat tuning. |
| `js/flight/enemies.js` | 224 | `strafeAmp = 4.5` | Elite local strafe amplitude. | Keep local combat tuning. |
| `js/flight/enemies.js` | 650 | friendly bullet speed `110`, life `1.4` | Friendly escort projectile range, about `154u` theoretical. | Keep local, or cap through shared `LOCAL_WEAPON_RANGE`. |
| `js/flight/enemies.js` | 753 | height `54` | Enemy spawn vertical spread `+/-27u`. | Keep local; optionally rename `LOCAL_ENEMY_SPAWN_HEIGHT = 54`. |
| `js/flight/enemies.js` | 754 | `92 + Math.random() * 58` | Enemy spawn radius `92-150u`. | Keep local, or change to `LOCAL_ENEMY_SPAWN_MIN = 140`, `LOCAL_ENEMY_SPAWN_MAX = 220` if larger radar/combat bubble is desired. |
| `js/flight/enemies.js` | 869 | `orbitRadius = 46` | Aggression/orbit radius. | Keep `46` for local dogfight, or modestly raise to `75` if weapon ranges are expanded. |
| `js/flight/enemies.js` | 870 | `orbitRadius * 0.6` | Low-shield aggression radius `27.6u`. | Keep ratio. |
| `js/flight/enemies.js` | 882 | `dist > 80` | Support approach threshold. | Keep local or raise with local orbit radius, e.g. `130` if orbit becomes `75`. |
| `js/flight/enemies.js` | 883 | `dist < 45` | Support retreat threshold. | Keep local or raise with local orbit radius, e.g. `70` if orbit becomes `75`. |
| `js/flight/enemies.js` | 892-893 | `2.8` | Evasion random displacement. | Keep local. |
| `js/flight/enemies.js` | 929 | enemy bullet speed `18`, life `2.1` | Enemy projectile practical range `37.8u`. | Keep local or tune to `24` speed, `3.0s` life for `72u` if aggression increases. |
| `js/flight/enemies.js` | 940 | `dist < 1.15` | Collision damage threshold. | Keep local. |
| `js/flight/weapons.js` | 56 | player bullet geometry radius `0.026`, streak length from state | Visual projectile size. | Keep local visual tuning. |
| `js/flight/weapons.js` | 70 | bullet radius `0.22` | Player bullet collision radius. | Keep local. |
| `js/flight/weapons.js` | 82 | enemy bullet streak length `1.55` | Enemy tracer visual length. | Keep local visual tuning. |
| `js/flight/weapons.js` | 87 | enemy bullet radius `0.2` | Enemy bullet collision radius. | Keep local. |
| `js/flight/weapons.js` | 97 | missile radius `0.36` | Missile collision radius. | Keep local. |
| `js/flight/weapons.js` | 286 | fallback max distance `3600` | Non-player bullet cap squared, `60u`. | Keep local; if enemy ranges increase, use `LOCAL_ENEMY_PROJECTILE_RANGE ** 2`, e.g. `100 ** 2`. |
| `js/flight/weapons.js` | 308-309 | missile defaults speed `17`, life `4.2` | Fallback missile motion. | Replace with weapon definition only or local constants; not system scale. |
| `js/flight/weapons.js` | 342 | `weapon.aoeRadius` | EMP radius from weapon defs, currently `22u`. | Keep local, or expose as `LOCAL_EMP_RADIUS = 22`. |
| `js/flight/weapons.js` | 376, 409 | muzzle offsets `1.2` | Weapon origin offsets. | Keep local visual tuning. |
| `js/flight/weapons.js` | 386, 426 | muzzle offsets `0.85`, `1.05 + i * 0.08` | Projectile origin offsets. | Keep local visual tuning. |
| `js/flight/weapons.js` | 450 | player bullet cap via `playerLaserMaxDistanceSq`, fallback `3600` | Player bullets capped by state `320u`; fallback `60u`. | Keep player local cap near `320u`, or set `LOCAL_PLAYER_WEAPON_RANGE = 500`; do not multiply by `WORLD_SCALE`. |
| `js/flight/weapons.js` | 480 | missile homing lerp target speed `24` | Homing correction speed. | Keep local, or scale only with missile weapon tuning. |
| `js/flight/weapons.js` | 489 | missile cap `4900` | Missile deactivates past `70u` from player. | Change to match intended missile range, e.g. `LOCAL_MISSILE_RANGE = 500`, squared `250000`; current value conflicts with 8s missile life. |
| `js/flight/state.js` | 220 | `playerLaserStreakLength = 5.4` | Player tracer visual length. | Keep local visual tuning. |
| `js/flight/state.js` | 222 | `playerLaserMaxDistanceSq = 320 * 320` | Player bullet range cap. | Keep local `320u` or raise to `500u`; define as `LOCAL_PLAYER_WEAPON_RANGE ** 2`. |
| `js/flight/state.js` | 223 | `constellationScale = 2.25` | Console-mode project layout scale. | Separate from flight/system scale; no direct `WORLD_SCALE` change unless console layout is also redesigned. |
| `js/flight/state.js` | 228 | `flightPlanetMinDistance = 260` | Minimum station/planet flight shell. | `8_000` with `WORLD_SCALE = 50`. |
| `js/flight/state.js` | 229 | `flightPlanetMaxDistance = 1080` | Maximum station/planet flight shell. | `50_000` with `WORLD_SCALE = 50`. |
| `js/flight/state.js` | 232 | `landingRange = 7.2` | Raw landing range, multiplied by active universe scale. | Use explicit `LOCAL_LANDING_RANGE = 72` and stop multiplying by `WORLD_SCALE`, or set raw to `72` when `activeUniverseScale` no longer handles landing. |
| `js/flight/state.js` | 233 | `flightBounds = 135` | Raw player clamp radius, currently multiplied by active universe scale. | `55_000` as an absolute system radius, or `1_100` if still multiplied by `WORLD_SCALE = 50`. Prefer absolute. |
| `js/flight/state.js` | 234 | `radarRange = 140` | Raw radar range, currently multiplied to `1,400u`. | Split into `LOCAL_RADAR_RANGE = 1_500` and `SYSTEM_MAP_RANGE = 55_000`; do not use one value for both. |
| `js/flight/state.js` | 1044 | sinusoidal shell jitter `54` | Station radial jitter. | `1_200`. |
| `js/flight/state.js` | 1047 | vertical scale `0.92`, vertical sinusoid `120` | Station Y distribution. | Keep `0.10-0.18` of orbit radius for inclination, plus `+/-1_500u` local jitter; avoid huge Y spread if the system should read as orbital. |

## Three.js Precision At +/-50,000u

1. JavaScript numbers are 64-bit floats, but Three.js sends most geometry attributes, matrices, and shader positions to GPU as 32-bit floats.
2. At `50,000u`, float32 spacing is roughly `0.0039u`, so pure position storage is not catastrophic if `1u = 1,000km`; it is about `3.9km` of granularity in the metaphor.
3. Visual jitter can still appear because camera-relative transforms, depth buffer precision, large line bounding spheres, particles, and tiny cockpit/combat meshes share a large coordinate space.
4. Mitigation needed: use a floating origin or camera-relative render origin for system-scale travel. Keep the player/camera near `(0,0,0)` for local combat and shift planets, stations, nav lines, stars, particles, enemies, and projectiles by a sector origin offset.
5. Also use near/far camera planes appropriate to the current mode: local combat should use tight near/far ranges, while system map/navigation can use impostors, sprites, or logarithmic depth only if needed. Floating origin is the primary mitigation.

## Radar Scale

1. Current cockpit radar maps 3D relative positions into radar space in `hud.js:68-86`.
2. Current active range is `radarRange * activeUniverseScale()`, which is `140 * 10 = 1,400u` in flight mode.
3. Current canvas scale is `radius / activeRadarRange` in `hud.js:182-184`. For a 200px square radar, radius is about `84px`, so the current scale is about `0.06px/u`; equivalently `1u` is about `0.06px` and the full radar radius is `1,400u`.
4. Contacts beyond range are clamped to the radar edge via `Math.min(distance, activeRadarRange) / activeRadarRange`, so a `50,000u` station would sit on the edge and be indistinguishable from any other far contact.
5. Needed change: split radar into a local combat radar and a system-scale minimap. The local radar should cover about `1,500u`, show enemies/projectiles/near station contacts, and keep trajectory vectors meaningful. The system minimap should cover `55,000u`, show orbit bands, nav target, station icons, and route bearing; it should not draw enemy trajectories or use the same contact scale.
6. Recommended implementation shape: `LOCAL_RADAR_RANGE = 1_500`, `SYSTEM_MAP_RANGE = WORLD_RADIUS`, and a mode toggle or layered UI where local radar remains tactical and the system map compresses orbital distances logarithmically or by band.

## Recommended Constant

| Constant | Value | Purpose |
|---|---:|---|
| `WORLD_SCALE` | `50` | System-wide multiplier/metaphor for expanding current flight-space station layout into a `~50,000u` vast-system shell. |

Use `WORLD_SCALE` for system layout, station orbit bands, navigation distances, and world-map presentation. Do not blindly import it into local dogfight movement, projectile, collision, or spawn tuning; those should become explicit local constants.
