import { STATIONS, worldToThree } from './world.js';

export const DOCK_PROXIMITY = 120;

export const STATION_ROTATION_SPEEDS = {
  outpost: 0.04,
  hub: 0.04,
  military: 0.015
};

export const STATION_COLORS = {
  outpostHull: 0x888899,
  outpostDish: 0x44aacc,
  hubHull: 0xaaaacc,
  hubDocking: 0xffcc00,
  militaryHull: 0x556655,
  militaryTurret: 0xff3333
};

export function createStationMaterial(THREE, color) {
  return new THREE.MeshBasicMaterial({
    color,
    wireframe: true,
    transparent: true,
    opacity: 0.85
  });
}

function addMesh(group, THREE, geometry, material, configure) {
  const mesh = new THREE.Mesh(geometry, material);
  configure?.(mesh);
  group.add(mesh);
  return mesh;
}

export function buildOutpostStation(THREE) {
  const group = new THREE.Group();
  const hull = createStationMaterial(THREE, STATION_COLORS.outpostHull);
  const dish = createStationMaterial(THREE, STATION_COLORS.outpostDish);

  addMesh(group, THREE, new THREE.CylinderGeometry(8, 8, 24, 8), hull);

  for (const y of [-10, 10]) {
    addMesh(group, THREE, new THREE.CylinderGeometry(12, 12, 1, 16), dish, mesh => {
      mesh.position.y = y;
    });
  }

  const spineGeometry = new THREE.CylinderGeometry(0.5, 0.5, 18, 8);
  const spineConfigs = [
    { x: 17, z: 0, rz: Math.PI / 2 },
    { x: -17, z: 0, rz: Math.PI / 2 },
    { x: 0, z: 17, rx: Math.PI / 2 },
    { x: 0, z: -17, rx: Math.PI / 2 }
  ];
  for (const config of spineConfigs) {
    addMesh(group, THREE, spineGeometry, hull, mesh => {
      mesh.position.x = config.x;
      mesh.position.z = config.z;
      mesh.rotation.x = config.rx ?? 0;
      mesh.rotation.z = config.rz ?? 0;
    });
  }

  return group;
}

export function buildTradingHubStation(THREE) {
  const group = new THREE.Group();
  const hull = createStationMaterial(THREE, STATION_COLORS.hubHull);
  const docking = createStationMaterial(THREE, STATION_COLORS.hubDocking);

  addMesh(group, THREE, new THREE.TorusGeometry(28, 4, 8, 24), hull);
  addMesh(group, THREE, new THREE.CylinderGeometry(10, 10, 20, 16), hull);

  const armGeometry = new THREE.BoxGeometry(2, 2, 16);
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    addMesh(group, THREE, armGeometry, docking, mesh => {
      mesh.position.x = Math.sin(angle) * 18;
      mesh.position.z = Math.cos(angle) * 18;
      mesh.rotation.y = angle;
    });
  }

  // Small traffic-control accent keeps the hub at the required 9 primitive meshes.
  addMesh(group, THREE, new THREE.BoxGeometry(6, 10, 2), docking, mesh => {
    mesh.position.y = 14;
  });

  return group;
}

export function buildMilitaryBaseStation(THREE) {
  const group = new THREE.Group();
  const hull = createStationMaterial(THREE, STATION_COLORS.militaryHull);
  const turret = createStationMaterial(THREE, STATION_COLORS.militaryTurret);

  addMesh(group, THREE, new THREE.BoxGeometry(60, 15, 80), hull);

  const turretGeometry = new THREE.BoxGeometry(6, 6, 12);
  for (const [x, z] of [[24, 34], [-24, 34], [24, -34], [-24, -34]]) {
    addMesh(group, THREE, turretGeometry, turret, mesh => {
      mesh.position.x = x;
      mesh.position.y = 10;
      mesh.position.z = z;
    });
  }

  const hangarGeometry = new THREE.BoxGeometry(20, 12, 4);
  for (const x of [-13, 13]) {
    addMesh(group, THREE, hangarGeometry, hull, mesh => {
      mesh.position.x = x;
      mesh.position.y = -1;
      mesh.position.z = 42;
    });
  }

  addMesh(group, THREE, new THREE.BoxGeometry(18, 10, 16), hull, mesh => {
    mesh.position.y = 13;
    mesh.position.z = -18;
  });

  return group;
}

export function buildStationGeometry(type, THREE) {
  if (type === 'hub') return buildTradingHubStation(THREE);
  if (type === 'military') return buildMilitaryBaseStation(THREE);
  return buildOutpostStation(THREE);
}

export function createStation(stationDef, THREE) {
  if (!stationDef) throw new Error('createStation requires a station definition');
  if (!THREE) throw new Error('createStation requires THREE');

  const station = buildStationGeometry(stationDef.type, THREE);
  const worldPos = worldToThree(stationDef.pos, THREE);
  if (typeof station.position?.copy === 'function') station.position.copy(worldPos);
  else if (typeof station.position?.set === 'function') station.position.set(worldPos.x, worldPos.y, worldPos.z);
  else station.position = worldPos;
  station.userData = {
    ...(station.userData ?? {}),
    id: stationDef.id,
    name: stationDef.name,
    pos: stationDef.pos,
    stationId: stationDef.id,
    type: stationDef.type,
    hasTrading: stationDef.hasTrading,
    hasMissions: stationDef.hasMissions,
    isStation: true
  };

  return station;
}

export function createAllStations(scene, THREE) {
  if (!scene) throw new Error('createAllStations requires a scene');
  const stations = STATIONS.map(stationDef => createStation(stationDef, THREE));
  for (const station of stations) scene.add(station);
  return stations;
}

export function updateStationRotations(stations, dt = 0) {
  for (const station of stations ?? []) {
    const type = station?.userData?.type;
    const speed = STATION_ROTATION_SPEEDS[type] ?? STATION_ROTATION_SPEEDS.outpost;
    if (station?.rotation) station.rotation.y += speed * dt;
  }
}
