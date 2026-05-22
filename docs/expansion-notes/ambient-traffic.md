# Ambient Civilian Traffic

## Current Enemy Model

Enemies are pooled `THREE.Group` objects stored in the exported `enemies` array. `createEnemyPool()` creates up to `maxEnemies` inactive groups, attaches a pooled `PointLight` engine glow, sets `userData.active = false`, and adds every group to `gameRoot`. Enemy disposal usually means returning the pooled object to inactive state through `deactivateCombatObject()` rather than removing it from the scene.

Enemy spawning is centralized through `spawnEnemy(enemy, offset, delay, classId)`. It resolves an enemy class, rebuilds the group's model with `buildEnemyFromClass()`, applies scale/radius, places the ship around `flightState.pos` at radius `92..150` and height `-27..27`, assigns a formation role, initializes velocity/rotation/health/shields/cooldowns, and toggles visibility based on `spawnDelay`. Bosses, bounty hunters, friendly escorts, mission waves, tutorial bogeys, and orchestrator events all reuse this same pool and spawn path.

Enemy updates run inside `updateCombatObjects(dt)`, called once per flight frame by `updateFlight()`. Active enemies wait out `spawnDelay`, then update class visuals, boss phases, engine glow, pips, movement, velocity, orientation, firing cooldowns, bullet/missile collisions, and player collision damage. Movement is player-relative: aggressors approach directly, flankers move toward an offset point using `flightRight`, supports hold a rough `45..80` range, elites strafe, phantoms flicker/cloak, gunboat turrets stay stationary, and friendly escorts orbit `flightState.pos` for a timed duration.

Enemy shape is class-driven wireframe primitive composition. `buildEnemyGeometry()` uses lightweight `MeshBasicMaterial` wireframes and simple geometry recipes: cone-plus-wings dart, box gunboat, octahedron diamond/phantom, cruiser boxes, and fallback sphere/wing/antenna. `userData` carries runtime shape, collision, AI, health, reward, faction, and effect state.

## CivilianShip Object Shape

Use a separate civilian pool, not `enemies`, because civilians have different collision/legal behavior and should not trigger combat debrief, enemy targeting, enemy bullets, or mission kill accounting.

```js
{
  id: 'civ_0001',
  kind: 'freighter' | 'shuttle' | 'courier',
  role: 'transit' | 'dock-approach' | 'dock-departure' | 'fleeing',
  object: THREE.Group,
  modelRoot: THREE.Group,
  active: true,
  visible: true,
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  route: {
    fromId: 'hub-alpha',
    toId: 'relay-7',
    nodeIds: ['hub-alpha', 'relay-7'],
    segmentIndex: 0,
    progress: 0
  },
  targetPos: THREE.Vector3,
  speed: 8,
  cruiseSpeed: 8,
  fleeSpeed: 18,
  radius: 0.9,
  health: 1,
  maxHealth: 1,
  faction: 'civilian',
  dockTargetId: null,
  dockedUntil: 0,
  spawnTime: performance.now(),
  lastSeenTime: performance.now(),
  engineGlow: THREE.PointLight | null,
  mapContact: {
    label: 'CIV FREIGHTER',
    color: 0x66ccff,
    size: 2
  }
}
```

Recommended implementation detail: mirror enemies' pool style physically (`THREE.Group.userData`) if that is easier for rendering, but keep the canonical data above intact. For example, `ship.object.userData.civilianShip = ship` avoids spreading civilian state across arbitrary fields while preserving object pooling.

## Traffic Rules

1. Maintain a hard cap of 6 active civilian ships, reduced to 3 during combat or hyperspeed and 0 while `flightState.landed` is true.
2. Spawn only near navgraph routes: choose station/planet/jump nodes from `buildNavGraph()` and place ships on or near route segments at least `90` units from the player and outside immediate docking radius.
3. Speeds: freighter cruises at `5..7`, shuttle at `8..11`, courier at `13..17`; fleeing multiplies current cruise by `1.8` capped at `24`.
4. Flee when a hostile enemy is within `55`, a player bullet/missile passes within `10`, or the civilian takes damage; flee vector should bias away from `flightState.pos` and nearest enemy for `6..10` seconds.
5. Destroy on lethal hit or high-speed player collision: trigger a small non-combat explosion, deactivate the civilian object, optionally apply security reputation loss later, and never call enemy kill/debrief handlers.
6. Dock and cull: dock by slowing within station `DOCK_PROXIMITY` and hiding/deactivating after a short approach; cull if farther than `900` from `flightState.pos`, outside `SYSTEM_RADIUS`, route is invalid, or unseen for more than `20` seconds.

## Geometry Recipes

All recipes should use shared `MeshBasicMaterial` instances, wireframe enabled, transparent opacity around `0.55..0.8`, and geometry cached per ship kind.

Freighter:

```js
const group = new THREE.Group();
group.add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 3.2), hullMat));
const containerGeo = new THREE.BoxGeometry(0.72, 0.56, 0.9);
[-0.52, 0.52].forEach(x => [-0.7, 0.25, 1.2].forEach(z => {
  const pod = new THREE.Mesh(containerGeo, cargoMat);
  pod.position.set(x, 0.05, z);
  group.add(pod);
}));
const engineGeo = new THREE.CylinderGeometry(0.16, 0.2, 0.55, 8);
[-0.55, 0.55].forEach(x => {
  const engine = new THREE.Mesh(engineGeo, accentMat);
  engine.rotation.x = Math.PI / 2;
  engine.position.set(x, 0, 1.9);
  group.add(engine);
});
```

Shuttle:

```js
const group = new THREE.Group();
const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 1.2, 4, 8), hullMat);
body.rotation.x = Math.PI / 2;
group.add(body);
const wingGeo = new THREE.BoxGeometry(1.15, 0.05, 0.36);
[-0.18, 0.22].forEach(z => {
  const wing = new THREE.Mesh(wingGeo, wingMat);
  wing.position.z = z;
  group.add(wing);
});
const nose = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.55, 8), glassMat);
nose.rotation.x = -Math.PI / 2;
nose.position.z = -0.9;
group.add(nose);
```

Courier:

```js
const group = new THREE.Group();
const body = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.45, 8), hullMat);
body.rotation.x = -Math.PI / 2;
group.add(body);
const finGeo = new THREE.BoxGeometry(0.06, 0.45, 0.5);
[-1, 1].forEach(side => {
  const fin = new THREE.Mesh(finGeo, wingMat);
  fin.position.set(side * 0.36, 0, 0.22);
  fin.rotation.z = side * 0.35;
  group.add(fin);
});
const tail = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), accentMat);
tail.position.z = 0.82;
group.add(tail);
```

## Performance Budget

Civilian traffic should cost less than `0.25ms` CPU and 6 to 18 extra draw calls at the hard cap. Keep triangle count under roughly 1,000 total for all active civilians, because `state.js` already warns when flight triangles exceed `18000`. Avoid per-frame allocations by reusing temp vectors and by updating only active ships.

Do not instance immediately for a max of 6 mixed ships. Use pooled `THREE.Group` objects and shared cached geometries/materials first, matching the enemy architecture. If the cap grows beyond 20 or traffic becomes visible on the system map as many inactive route ghosts, switch each ship kind to `THREE.InstancedMesh` for hull/wing/container subparts and store transforms in typed arrays.

## System Map Integration

The system map is rendered through `renderSystemMap(canvas, navGraph, flightState, PLANETS, STATIONS)` and currently receives static world nodes plus the player state. Civilian contacts should appear as small cyan/blue moving ticks along navgraph edges, not as selectable nav nodes. Freighters can be square pips, shuttles round pips, and couriers small triangles. Fleeing civilians should pulse amber, while docked/approaching ships should fade near station icons.

Integration should pass a read-only `flightState.civilianTraffic.ships` or a derived contacts array into the map renderer. Map coordinates should project `ship.position` in the same world-space convention as `PLANETS`, `STATIONS`, and navgraph nodes. Labels should be minimal: `CIV`, `FRG`, `SHT`, or `COU`, with no route text unless a ship is highlighted by future UI.

## Flight State Fields Needed

Add one contained field to avoid scattering traffic globals:

```js
flightState.civilianTraffic = {
  enabled: true,
  ships: [],
  maxActive: 6,
  lastSpawnAt: 0,
  nextSpawnAt: 0,
  lastMapSnapshotAt: 0,
  mapContacts: []
};
```

Useful derived access already exists elsewhere: `flightState.pos`, `flightState.vel`, `flightState.landed`, `flightState.autopilot.hyperspeedMult`, `flightForward`, `flightRight`, `flightUp`, `navGraph`, `systemStations`, and `DOCK_PROXIMITY`. Civilian traffic does not need to persist in saved run state for phase one.
