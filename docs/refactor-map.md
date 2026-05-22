# `js/main.js` Refactor Map

Pass 1 audit of `js/main.js` at 5,319 lines. No runtime code was moved in this pass.

## Pass 9 repair summary

- `js/main.js` remains a thin DOM bootstrap importing only the flight runtime boundary.
- `js/flight/runtime.js` is a tiny orchestration-only re-export (well under 5KB) and contains no TTS, mission, UI graph, render, or gameplay implementation.
- `js/flight/flight-application.js` was removed. Remaining implementation lives in concept modules: `js/flight/audio.js` (TTS/radio/settings/chatter), `js/flight/messages.js` (message typewriter), `js/flight/mission.js` (serializable mission contracts/state helpers), `js/flight/orchestrator.js` (director payload and enemy wave helpers), `js/flight/state.js` (flight state transitions, persistence, and current frame entry points), `js/flight/combat*.js` (combat objects/state/definitions), `js/flight/navigation.js`, `js/flight/physics.js`, `js/flight/hud.js`, `js/engine/{core,scene,starfield,nodes}.js`, and `js/ui/{console,cursor,hero,nodes-overlay}.js`.
- Source-inspection tests now target owning modules (`audio.js`, `messages.js`, `weapons.js`, `enemies.js`, `orchestrator.js`) and no longer inspect the removed flight application file.

## Target Module Tree

- `js/main.js`: thin bootstrap/wiring only.
- `js/engine/core.js`: holographic core helpers already partly extracted.
- `js/engine/nodes.js`: project node registries, labels, relationship edges.
- `js/engine/scene.js`: renderer/camera/lighting/resize.
- `js/engine/starfield.js`: deep-space fields, debris/dust environment.
- `js/flight/audio.js`: TTS, radio chain, combat chatter, audio settings.
- `js/flight/state.js`: flight state, combat loadout/skills bridge, save/restore resources.
- `js/flight/controls.js`: keyboard, mouse, pointer lock, orbit controls, hero gestures.
- `js/flight/navigation.js`: navigation target, autopilot, landing target, nav marker/line.
- `js/flight/combat.js`: enemy/player projectile pools, combat object updates, damage, weapons, VFX.
- `js/flight/hud.js`: HUD/radar/telemetry rendering.
- `js/flight/mission.js`: mission/tutorial/contracts/objective UI progress.
- `js/flight/orchestrator.js`: director polling/events/payloads.
- `js/economy/trader.js`: station menus, equipment market, trade callbacks, credits/fuel bridge.
- `js/ui/project-inspector.js`: project list, filters, selection, inspector content.
- `js/ui/inventory-panel.js`: inventory panel is already imported; callers remain in controls.

## Meaningful Top-Level Blocks

| Block | Lines | Target module | Outer reads | Outer writes/mutates |
|---|---:|---|---|---|
| Imports | 3-40 | `js/main.js` | external modules | module bindings |
| Window data aliases | 42-43 | `js/engine/nodes.js` | `window.USSY_PROJECTS`, `window.USSY_CATEGORIES` | none |
| Core scene mutable declarations | 45-61 | `js/main.js` / engine bootstrap | none | declares `scene`, `camera`, `renderer`, groups, selection/input refs, flight root refs |
| Runtime constants and temp vectors | 63-118 | shared constants modules | `window`, `THREE`, engine node exports | allocates temp vectors, sets, relation hints |
| `orbitState` | 119-133 | `js/flight/controls.js` | `Math` | mutable object fields |
| `flightState` | 135-176 | `js/flight/state.js` | `THREE` | central mutable flight object |
| Combat pools/constants | 178-218 | `js/flight/combat.js` / `js/engine/starfield.js` | `prefersReducedMotion`, `isCoarsePointer` | arrays and counters: enemies/projectiles/VFX/debris/dust/ticks |
| `loadoutState` object | 220-236 | `js/flight/state.js` | `combatState`, `getWeaponDef` | proxies mutate `combatState.primaryWeapon`, `combatState.secondaryWeapon` |
| `skillTree` object | 238-286 | `js/flight/state.js` | `SKILL_TREE_NODES`, `combatState`, `unlockCombatSkillNode`, `reapplySkills`, `flightState` | mutates `flightState.energy`; unlock path mutates `combatState.unlocked/skillPoints` via imported API |
| Combat state wiring | 288-298 | `js/main.js` bootstrap | `flightState`, `triggerDeathExplosion`, `getEnemyClass`, `awardXp`, `loseReputation`, `getNearestStationFaction` | configures imported combat singleton callbacks |
| Mission/orchestrator/message state | 300-332 | `js/flight/mission.js` / `js/flight/orchestrator.js` | `createMissionState`, `cloneMissionContracts`, `MISSION_INTRO_TEXT` | declares mutable mission/orchestrator/message state |
| Settings/audio singletons | 372-809 | `js/flight/audio.js` | `window`, `gameSettings`, `ttsConfig`, `radioChain`, `ttsEngine`, `fetchTTSSpeech` | mutate audio contexts, sources, gains, timers, active TTS request/priority |
| Debug/window exports | 816-879 | `js/main.js` bootstrap/debug | TTS/combat/loadout/orchestrator symbols | mutates `window.*`, `window.speechSynthesis.onvoiceschanged`, DOM listener |
| Camera animation constants | 887-913 | `js/engine/scene.js` / `js/flight/controls.js` | `THREE` | mutable `camTarget`, `camCurrent`; immutable section arrays |
| Project copy map | 915-939 | `js/ui/project-inspector.js` | none | none |
| Engine node aliases | 941-943 | `js/engine/nodes.js` | engine exports | aliases shared arrays/maps |
| DOM element cache | 945-1021 | `js/main.js` bootstrap / UI modules | `document`, `cockpitRadar` | caches DOM refs; `inspectHowLabel`, `inspectHowBody` mutable |
| Initial event hook | 4123 | `js/main.js` bootstrap | `canvasContainer`, `resetCameraView` | adds DOM listener |
| Start application block | 5314-5319 | `js/main.js` bootstrap | `document.readyState`, `window`, `init` | adds load listener or calls `init()` |

## Function and Method Map

### State Object Methods

| Entry | Lines | Target module | Outer reads | Outer writes/mutates |
|---|---:|---|---|---|
| `loadoutState.primary` getter | 221-223 | `js/flight/state.js` | `combatState.primaryWeapon` | none |
| `loadoutState.primary` setter | 224-226 | `js/flight/state.js` | none | `combatState.primaryWeapon` |
| `loadoutState.secondary` getter | 227-229 | `js/flight/state.js` | `combatState.secondaryWeapon` | none |
| `loadoutState.secondary` setter | 230-232 | `js/flight/state.js` | none | `combatState.secondaryWeapon` |
| `loadoutState.getWeapon` | 233-235 | `js/flight/state.js` | `getWeaponDef`, selected loadout slot | none |
| `skillTree.canUnlock` | 241-248 | `js/flight/state.js` | `SKILL_TREE_NODES`, `combatState.skillPoints`, `skillTree.unlocked` | none |
| `skillTree.unlock` | 250-253 | `js/flight/state.js` | `unlockCombatSkillNode` | `combatState.unlocked/skillPoints` via imported API |
| `skillTree.getMaxShield` | 255-260 | `js/flight/state.js` | `skillTree.unlocked` | none |
| `skillTree.getMaxArmor` | 262-267 | `js/flight/state.js` | `skillTree.unlocked` | none |
| `skillTree.getMaxEnergy` | 269-271 | `js/flight/state.js` | `skillTree.unlocked` | none |
| `skillTree.getPrimaryCooldown` | 273-276 | `js/flight/state.js` | `skillTree.unlocked`, passed weapon | none |
| `skillTree.getArmorDamageMultiplier` | 278-280 | `js/flight/state.js` | `skillTree.unlocked` | none |
| `skillTree.applyAll` | 282-285 | `js/flight/state.js` | `reapplySkills`, `flightState.energy`, `skillTree.getMaxEnergy` | `combatState` via `reapplySkills`, `flightState.energy` |

### Audio and TTS

| Entry | Lines | Target module | Outer reads | Outer writes/mutates |
|---|---:|---|---|---|
| `numToWord` | 334-344 | `js/flight/audio.js` | none | none |
| `preprocessRadioText` | 346-364 | `js/flight/audio.js` | `numToWord` | none |
| `getTtsPriorityRank` | 366-370 | `js/flight/audio.js` | none | none |
| `clampVolume` | 378-380 | `js/flight/audio.js` | none | none |
| `volumePercent` | 382-384 | `js/flight/audio.js` | `clampVolume` | none |
| `loadFlightSettings` | 386-394 | `js/flight/audio.js` | `window.localStorage`, `SETTINGS_STORAGE_KEY`, `clampVolume` | `gameSettings.radioVolume`, `gameSettings.chatterVolume` |
| `saveFlightSettings` | 396-402 | `js/flight/audio.js` | `window.localStorage`, `SETTINGS_STORAGE_KEY`, `gameSettings` | browser localStorage |
| `setRadioVolume` | 404-411 | `js/flight/audio.js` | `clampVolume`, `saveFlightSettings`, `radioChain`, `volumePercent`, `performance`, `updateFlightHud` | `gameSettings.radioVolume`, `flightState.status`, `flightState.statusUntil`, radio gains |
| `setChatterVolume` | 413-420 | `js/flight/audio.js` | `clampVolume`, `saveFlightSettings`, `combatAudio`, `volumePercent`, `performance`, `updateFlightHud` | `gameSettings.chatterVolume`, `flightState.status`, `flightState.statusUntil`, combat gain |
| `loadFlightSettings()` call | 422 | `js/flight/audio.js` | `loadFlightSettings` | `gameSettings` |
| `ttsEngine.speak` | 432-490 | `js/flight/audio.js` | `preprocessRadioText`, `getTtsPriorityRank`, `clampVolume`, `gameSettings`, `ttsConfig`, `fetchTTSSpeech`, `radioChain`, `AbortController`, `window.speechSynthesis` | `ttsEngine.activeTransmission`, `activePriority`, `activeRequest`, active voice indirectly, radio chain active source/noise |
| `ttsEngine.stop` | 492-499 | `js/flight/audio.js` | `window.speechSynthesis`, `radioChain` | `ttsEngine.activeTransmission`, `activeRequest`, `activePriority`; aborts request; stops radio chain |
| `ttsEngine.setVoice` | 501-524 | `js/flight/audio.js` | `window.speechSynthesis` | `ttsEngine.activeVoice` |
| `ttsEngine.initVoices` | 526-528 | `js/flight/audio.js` | `ttsEngine.setVoice` | `ttsEngine.activeVoice` |
| `radioChain.buildChain` | 538-580 | `js/flight/audio.js` | `window.AudioContext`, `window.webkitAudioContext`, `gameSettings.radioVolume` | `radioChain.ctx`, `radioChain.outputGains` |
| `radioChain.updateOutputGains` | 582-590 | `js/flight/audio.js` | `gameSettings.radioVolume` | gain values, `radioChain.outputGains` deletion on failures |
| `radioChain.processBlob` | 592-615 | `js/flight/audio.js` | `radioChain.buildChain` | `radioChain.activeSource`, `radioChain.outputGains` |
| `radioChain.processSpeechSynthesis` | 617-664 | `js/flight/audio.js` | `ttsEngine.supported`, `SpeechSynthesisUtterance`, `window.speechSynthesis`, `gameSettings.radioVolume` | `radioChain.activeNoise`, `radioChain.speechTimer`, `radioChain.outputGains` |
| `radioChain.addClickIn` | 666-668 | `js/flight/audio.js` | `radioChain.playClick` | audio side effect |
| `radioChain.addClickOut` | 670-672 | `js/flight/audio.js` | `radioChain.playClick` | audio side effect |
| `radioChain.playClick` | 674-692 | `js/flight/audio.js` | `radioChain.buildChain`, `gameSettings.radioVolume` | audio graph nodes |
| `radioChain.fadeNoiseOut` | 694-706 | `js/flight/audio.js` | `radioChain.ctx` | noise gain/source, `radioChain.activeNoise` |
| `radioChain.resume` | 708-712 | `js/flight/audio.js` | `radioChain.ctx` | resumes `AudioContext` |
| `radioChain.stopActive` | 714-727 | `js/flight/audio.js` | `radioChain.fadeNoiseOut`, `window.clearTimeout` | `activeSource`, `activeNoise`, `speechTimer` |
| `combatAudio.init` | 736-744 | `js/flight/audio.js` | `radioChain.buildChain` | `combatAudio.ctx`, `gainNode` |
| `combatAudio.updateGain` | 746-748 | `js/flight/audio.js` | `gameSettings.chatterVolume` | gain node value |
| `combatAudio.bark` | 750-793 | `js/flight/audio.js` | `ttsEngine`, `preprocessRadioText`, `fetchTTSSpeech`, `radioChain`, `clampVolume`, `gameSettings` | `combatAudio.active` queue, audio sources |
| `combatAudio.stopAll` | 795-800 | `js/flight/audio.js` | `combatAudio.active` | stops sources, clears `active` |
| `setTTSBackendEnabled` | 811-814 | `js/flight/audio.js` | none | `ttsConfig.enabled` |
| `buildBackendTTSRequest` | 821-837 | `js/flight/audio.js` | `ttsConfig` | none |
| `fetchTTSSpeech` | 839-856 | `js/flight/audio.js` | `ttsConfig`, `buildBackendTTSRequest`, `fetch` | none |
| TTS voices setup block | 877-880 | `js/flight/audio.js` | `ttsEngine`, `window.speechSynthesis`, `document` | `speechSynthesis.onvoiceschanged`, DOM listener |
| `updateTtsStatusIndicator` | 4952-4956 | `js/flight/audio.js` / `js/flight/hud.js` | `ttsStatus`, `document`, `ttsEngine.enabled` | TTS status DOM text/class |
| `toggleFlightTts` | 4958-4965 | `js/flight/audio.js` | `ttsEngine`, `performance`, `updateTtsStatusIndicator`, `updateFlightHud` | `ttsEngine.enabled`, TTS stop, `flightState.status/statusUntil` |
| `openAudioSettingsMenu` | 4967-4981 | `js/flight/audio.js` | `showGameMessage`, `volumePercent`, `gameSettings`, `ttsEngine`, `setRadioVolume`, `setChatterVolume`, `dismissGameMessage` | game message state via `showGameMessage` |
| `openVolumeMenu` | 4983-5006 | `js/flight/audio.js` | `setRadioVolume`, `setChatterVolume`, `gameSettings`, `showGameMessage`, `volumePercent`, `openAudioSettingsMenu` | game message state; selected volume via setter |

### Save, State, Bootstrap

| Entry | Lines | Target module | Outer reads | Outer writes/mutates |
|---|---:|---|---|---|
| `getRenderPixelRatio` | 882-884 | `js/engine/scene.js` | `window.devicePixelRatio`, `isCoarsePointer` | none |
| `restoreCombatStateFromHash` | 1023-1045 | `js/flight/state.js` | `location.hash`, `deserializeCombatState`, `applyPersistedFlightResources`, `reputationState`, `restoreMissionProgress`, `syncCombatCreditsFromTrader` | `traderState.credits`, `reputationState.scores`, combat/mission state via helpers |
| `saveCombatStateToHash` | 1047-1052 | `js/flight/state.js` | `serializeCombatState`, `reputationState.scores`, `serializeMissionProgress`, `missionState`, `missionContracts`, `gameOrchestrator`, `traderState.credits` | `history.replaceState` URL hash |
| `restoreMissionProgress` | 1054-1061 | `js/flight/mission.js` | `atob`, `JSON` | `persistedMissionProgress` |
| `applyPersistedFlightResources` | 1063-1073 | `js/flight/state.js` | `combatState.resources`, `maxPlayerAmmo`, `maxPlayerMissilesStored`, `traderState.maxFuel` | `flightState.ammo/missiles/fuel/fuelDepleted`, `traderState.fuel` |
| `applyPersistedMissionProgress` | 1075-1082 | `js/flight/mission.js` | `persistedMissionProgress`, `applyMissionProgress`, `missionState`, `missionContracts`, `gameOrchestrator`, `getActiveContractStep` | mission/contracts/orchestrator via imported progress apply, `persistedMissionProgress = null`; objective UI via render/update |
| `init` | 1085-1161 | `js/main.js` bootstrap | most module init functions, DOM refs, `configureTrader`, `initEngineScene`, `THREE`, event handlers | trader callbacks, `scene/camera/renderer`, groups, `raycaster/mouse`, scene graph, event listeners, timers, selected project, starts animation |

### Engine, Space, Nodes, Inspector UI

| Entry | Lines | Target module | Outer reads | Outer writes/mutates |
|---|---:|---|---|---|
| `createHolographicCore` | 1164-1173 | `js/engine/core.js` wrapper removal | `createEngineHolographicCore`, `THREE`, `document`, `scene`, `coreGroup`, flags | `coreMesh`, `coreOuterParticles`, `selectionRing` |
| `createRadialGlowTexture` | 1175-1177 | `js/engine/starfield.js` / shared engine util | `createEngineRadialGlowTexture`, `THREE`, `document` | none |
| `createDeepSpaceEffects` | 1179-1190 | `js/engine/starfield.js` | `createEngineDeepSpaceEffects`, `THREE`, `document`, `scene`, flags, `flightTempVec`, `createDebrisField`, `createDustField` | `starField`, `milkyWayField`, `brightStarField`, `dataRibbonGroup`; debris/dust via callbacks |
| `randomizeDebrisInstance` | 1192-1205 | `js/engine/starfield.js` | `flightBounds`, `flightState.pos`, `flightForward`, `flightRight`, `flightUp` | `debrisPositions`, `debrisAxes`, `debrisSpinRates` |
| `createDebrisField` | 1207-1219 | `js/engine/starfield.js` | `THREE`, `debrisCount`, `scene`, `updateFlightBasis`, `randomizeDebrisInstance`, `updateDebrisMatrix` | `debrisField`, scene graph, instance matrix |
| `updateDebrisMatrix` | 1221-1231 | `js/engine/starfield.js` | `debrisPositions`, `debrisAxes`, `debrisSpinRates`, temp debris vectors/quaternion/matrix/scale | `debrisAngles`, `debrisField` matrices, temp objects |
| `createDustField` | 1233-1258 | `js/engine/starfield.js` | `THREE`, `dustParticleCount`, `createRadialGlowTexture`, `updateFlightBasis`, `randomizeDustParticle`, flags, `scene` | `dustPositions`, `dustSpeeds`, `dustField`, scene graph |
| `randomizeDustParticle` | 1260-1269 | `js/engine/starfield.js` | `flightState.pos`, `flightForward`, `flightRight`, `flightUp` | `dustPositions`, `dustSpeeds` |
| `buildProjectNodes` | 1543-1607 | `js/engine/nodes.js` | `USSY_PROJECTS`, `USSY_CATEGORIES`, `THREE`, constants, `createPlanetNodeLOD`, `createFlightProjectPosition`, DOM labels | `projectHitTargets`, `nodesGroup`, `projectNodes`, `projectNodeById`, `connectionsGroup`, `projectLabels` |
| `createFlightProjectPosition` | 1609-1624 | `js/engine/nodes.js` | `THREE`, `flightPlanetMinDistance`, `flightPlanetMaxDistance` | none |
| `buildRelatedProjectEdges` | 1626-1708 | `js/engine/nodes.js` | `manualRelationHints`, `USSY_PROJECTS`, `ignoredRelationTags`, `isCoarsePointer`, `projectNodeById`, `getCategoryColor`, `THREE`, `connectionsGroup`, `selectedEdgeLimit` | `relationshipEdges`, `relationshipEdgesMesh`, `selectedEdgesMesh`, connection scene graph |
| `applyFlightUniverseScale` | 1710-1734 | `js/engine/nodes.js` / `js/flight/navigation.js` | `activeUniverseScale`, `flightUniverseScale`, `planetNodeFlightScale`, `projectNodes`, `nodeBaseScale`, `updateRelationshipEdges`, `selectedNode`, `selectionRing` | `activeUniverseScale`, node positions/scales/halos/line geometry, selection ring position |
| `getEdgeKey` | 1736-1738 | `js/engine/nodes.js` | none | none |
| `getCategoryColor` | 1740-1743 | `js/engine/nodes.js` | `USSY_CATEGORIES`, `THREE` | none |
| `updateRelationshipEdges` | 1745-1764 | `js/engine/nodes.js` | `relationshipEdgesMesh`, `relationshipEdges`, `updateSelectedRelationEdges` | relationship edge geometry positions |
| `updateSelectedRelationEdges` | 1766-1789 | `js/engine/nodes.js` | `selectedEdgesMesh`, `selectedNode`, `getRelatedEdgesForProject`, `selectedEdgeLimit` | selected edge draw range/geometry positions |
| `createPlanetNodeLOD` | 1791-1849 | `js/engine/nodes.js` | `THREE`, `createRadialGlowTexture`, node visual constants | static `createPlanetNodeLOD.glowTexture`; LOD/userData objects |
| `setProjectNodeOpacity` | 1851-1858 | `js/engine/nodes.js` | node userData materials | material opacities |
| `getRelatedEdgesForProject` | 1860-1862 | `js/engine/nodes.js` | `relationshipEdges` | none |
| `ensureProjectHowSection` | 1864-1876 | `js/ui/project-inspector.js` | `inspectHowBody`, `inspectDesc`, `document` | `inspectHowLabel`, `inspectHowBody`, inspector DOM |
| `getProjectHowCopy` | 1878-1883 | `js/ui/project-inspector.js` | `PROJECT_HOW_COPY`, `USSY_CATEGORIES` | none |
| `createAmbientLighting` | 1886-1888 | `js/engine/scene.js` | `createEngineAmbientLighting`, `scene`, `THREE` | `pointLight1`, `pointLight2` |
| `populateProjectsUI` | 1891-1930 | `js/ui/project-inspector.js` | `projectsScrollList`, `USSY_PROJECTS`, `activeCategory`, `USSY_CATEGORIES`, `isFlightActive`, `selectProject` | project list DOM |
| `setupUIEventListeners` | 1932-2005 | `js/ui/project-inspector.js` / bootstrap | `document`, `enterConsoleBtn`, `backToHeroBtn`, `hudHeaderTitle`, `heroContainer`, `isFlightActive`, `projectNodes`, `projectLabels` | event listeners, `activeCategory`, card classes, node visibility, label display, relationship edges |
| `selectProject` | 2008-2110 | `js/ui/project-inspector.js` | `USSY_PROJECTS`, `projectNodes`, DOM refs, `USSY_CATEGORIES`, `ensureProjectHowSection`, `getProjectHowCopy`, `getRelatedEdgesForProject`, `camTarget`, `syncOrbitFromCamera` | `selectedNode`, DOM text/classes/links, node scale/opacity/line opacity, selected edge geometry, camera target |
| `activateConsoleMode` | 2113-2125 | `js/ui/project-inspector.js` / controls | `document`, `camTarget`, `syncOrbitFromCamera`, `selectedNode`, `selectProject` | `isConsoleActive`, body class, camera target |
| `deactivateConsoleMode` | 2127-2147 | `js/ui/project-inspector.js` / controls | `isFlightActive`, `exitFlightMode`, `document`, `projectNodes`, `heroContainer` | `isConsoleActive`, `selectedNode`, body/project/list/label state, hero scroll |
| `resetCategoryFilterForFlight` | 2153-2169 | `js/ui/project-inspector.js` | `document`, `projectNodes`, `projectLabels`, `populateProjectsUI`, `updateRelationshipEdges` | `activeCategory`, DOM classes, node/label visibility |
| `resetCameraView` | 4105-4121 | `js/flight/controls.js` / inspector | `isConsoleActive`, `isFlightActive`, `camTarget`, `syncOrbitFromCamera`, `projectNodes`, `document` | `selectedNode`, camera target, node/list/label visual state |
| `updateDeepSpaceAnchor` | 5036-5038 | `js/engine/starfield.js` | `updateEngineDeepSpaceAnchor`, star fields, `camera`, `flightState`, `isFlightActive`, `flightUniverseScale` | starfield anchor via imported helper |
| `updateSpaceEnvironment` | 5040-5053 | `js/engine/starfield.js` | `isFlightActive`, `debrisField`, `dustField`, `scene`, `flightState.vel`, `combatState.afterburnerActive`, `THREE`, update helpers | field visibility, fog density |
| `updateDebrisField` | 5055-5070 | `js/engine/starfield.js` | `debrisField`, `flightBounds`, `debrisCount`, `debrisPositions`, `flightState.pos`, `flightForward`, `randomizeDebrisInstance`, `updateDebrisMatrix` | debris visibility, positions/matrices, instance matrix flag |
| `updateDustField` | 5072-5088 | `js/engine/starfield.js` | `dustField`, `dustPositions`, `flightState.vel/pos`, `combatState.afterburnerActive`, `flightForward`, `dustSpeeds`, `dustTempVec`, `THREE` | dust positions, geometry flag, material opacity |
| `onWindowResize` | 5090-5092 | `js/engine/scene.js` | `resizeScene`, `camera`, `renderer`, `isCoarsePointer` | renderer/camera sizing via helper |

### Flight Mode, Controls, Navigation

| Entry | Lines | Target module | Outer reads | Outer writes/mutates |
|---|---:|---|---|---|
| `isTypingTarget` | 2149-2151 | `js/flight/controls.js` | none | none |
| `enterFlightMode` | 2171-2260 | `js/flight/state.js` / controls bootstrap | `renderer`, `isConsoleActive`, `activateConsoleMode`, `resetCategoryFilterForFlight`, `document`, `gameRoot`, `applyFlightUniverseScale`, constants, `combatState`, `traderState`, `gameOrchestrator`, `missionState`, `camCurrent`, `camTarget`, enemies/pools, `ttsEngine`, UI update helpers | `isFlightActive`, body classes, `orbitState.dragging`, game root, `flightState` many fields, `combatState` heat/adrenaline/afterburner, trader dock/fuel, orchestrator fields, combat objects, pointer lock request |
| `exitFlightMode` | 2262-2303 | `js/flight/state.js` / controls | `ttsEngine`, `combatAudio`, `document`, `renderer`, `gameRoot`, effects, `scene`, `applyFlightUniverseScale`, pools, UI helpers | `isFlightActive`, `flightState` pointer/input/nav/velocity/dock fields, trader dock, orchestrator, body classes, pool visibility/userData, message state |
| `onPointerLockChange` | 2305-2318 | `js/flight/controls.js` | `document`, `renderer`, `isFlightActive`, `performance`, `updateFlightHud`, `clearFlightInput` | `flightState.pointerLocked/landed/status`, body class |
| `onPointerLockError` | 2320-2327 | `js/flight/controls.js` | `isFlightActive`, `document`, `clearFlightInput`, `updateFlightHud` | `flightState.pointerLocked/status`, body class, input sets via helper |
| `clearFlightInput` | 2329-2333 | `js/flight/controls.js` | `isFlightActive` | clears `flightState.keys`, `flightState.mouseButtons` |
| `toggleFlightView` | 2335-2341 | `js/flight/controls.js` | `document`, `updateFlightHud`, `updateCockpitRadar` | `flightState.view/status`, body class |
| `formatEta` | 2343-2349 | `js/flight/navigation.js` | none | none |
| `getProjectNodeName` | 2351-2353 | `js/flight/navigation.js` | none | none |
| `getVoicePersona` | 2477-2488 | `js/flight/audio.js` | none | none |
| `updateCrosshairProjectTarget` | 2355-2372 | `js/flight/navigation.js` | `projectNodes`, `navTempVec`, `flightState.pos`, `flightForward` | `flightState.crosshairNode`, `navTempVec` |
| `updateFlightNavigation` | 2374-2391 | `js/flight/navigation.js` | `updateCrosshairProjectTarget`, `flightState`, `navTempVec`, `formatEta`, `updateFlightNavLine` | `flightState.navDistance/navEta/autopilot`, `navTempVec` |
| `setNavigationTarget` | 2393-2403 | `js/flight/navigation.js` | `performance`, `getProjectNodeName`, `selectProject`, `updateFlightNavigation`, `updateFlightHud` | `flightState.navNode/navDistance/status/statusUntil` |
| `setNavigationFromCrosshair` | 2405-2414 | `js/flight/navigation.js` | `updateCrosshairProjectTarget`, `setNavigationTarget`, `performance`, `updateFlightHud` | `flightState.status/statusUntil` when no target |
| `toggleAutopilot` | 2416-2427 | `js/flight/navigation.js` | `getProjectNodeName`, `performance`, `updateFlightHud` | `flightState.autopilot/status/statusUntil` |
| `disableAutopilot` | 2429-2436 | `js/flight/navigation.js` | `flightState.autopilot`, `performance` | `flightState.autopilot/status/statusUntil` |
| `updateAutopilot` | 2438-2462 | `js/flight/navigation.js` | `flightState`, `navTempVec`, `landingRange`, `activeUniverseScale`, `disableAutopilot`, `flightNavMatrix`, `flightNavQuat`, `flightUp`, `flightForward`, `THREE` | `flightState.vel`, `flightState.orientation`, basis temps via `updateFlightBasis` |
| `updateFlightNavLine` | 2464-2475 | `js/flight/navigation.js` | `flightNavLine`, `isFlightActive`, `flightState`, `navTempVec`, `flightForward` | nav line visibility/geometry |
| `onGlobalKeyDown` | 3953-4045 | `js/flight/controls.js` | `radioChain`, `isTypingTarget`, `isFlightActive`, `handleGameMessageChoice`, navigation/combat/menu helpers, `manualFlightKeys`, `toggleInventoryPanel` | `launchCodeBuffer`, `flightState.keys`, DOM inventory hidden, message state via helpers, mode/menu state via helpers |
| `onGlobalKeyUp` | 4047-4050 | `js/flight/controls.js` | `isFlightActive` | `flightState.keys` |
| `onHeroScroll` | 4053-4075 | `js/flight/controls.js` / hero UI | `isConsoleActive`, `heroContainer`, `window`, `sectionCamPositions`, `document`, `coreOuterParticles` | nav dot DOM, `coreOuterParticles.rotation.y` |
| `isOnFinalHeroCard` | 4077-4081 | `js/flight/controls.js` | `heroContainer`, `window` | none |
| `onHeroWheel` | 4083-4089 | `js/flight/controls.js` | `isConsoleActive`, `isOnFinalHeroCard`, `activateConsoleMode` | event default, console mode via helper |
| `onHeroTouchStart` | 4091-4095 | `js/flight/controls.js` | event touches | `heroTouchStartY` |
| `onHeroTouchEnd` | 4097-4103 | `js/flight/controls.js` | `isConsoleActive`, `isOnFinalHeroCard`, `activateConsoleMode`, `heroTouchStartY` | console mode via helper |
| `updatePointerFromClient` | 4126-4131 | `js/flight/controls.js` | `mouse`, `window`, `telemetryCoord` | `mouse.x/y`, `pointerDirty`, telemetry DOM |
| `getInteractiveHits` | 4133-4137 | `js/flight/controls.js` | `raycaster`, `mouse`, `camera`, `projectHitTargets` | raycaster internal state |
| `syncOrbitFromCamera` | 4139-4145 | `js/flight/controls.js` | `THREE`, `camTarget`, `orbitState` | `orbitState.distance/theta/phi` |
| `applyOrbitToCamera` | 4147-4156 | `js/flight/controls.js` | `THREE`, `orbitState`, `camTarget` | `orbitState.phi/distance`, `camTarget.pos` |
| `onPointerDown` | 4158-4183 | `js/flight/controls.js` | `radioChain`, `isFlightActive`, `renderer`, `document`, `isConsoleActive` | `flightState.mouseButtons`, pointer lock request, `orbitState` drag fields, body class |
| `onPointerMove` | 4185-4197 | `js/flight/controls.js` | `orbitState`, `applyOrbitToCamera` | `orbitState.lastX/lastY/moved/theta/phi`, camera target via helper |
| `onPointerUp` | 4199-4212 | `js/flight/controls.js` | `isFlightActive`, `orbitState`, `document` | `flightState.mouseButtons`, `orbitState.dragging/pointerId/captureTarget`, body class |
| `onSceneContextMenu` | 4214-4217 | `js/flight/controls.js` | `isFlightActive` | event default prevented |
| `onSceneWheel` | 4219-4226 | `js/flight/controls.js` | `isFlightActive`, `isConsoleActive`, `isCoarsePointer`, `orbitState`, `applyOrbitToCamera` | `orbitState.distance`, event default, camera target via helper |
| `onMouseMove` | 4228-4238 | `js/flight/controls.js` | `isFlightActive`, `flightState.pointerLocked`, `disableAutopilot`, `applyLocalFlightRotation`, `customCursor`, `updatePointerFromClient` | `flightState.orientation` via rotation helper, cursor DOM, pointer state via helper |
| `onTouchStart` | 4240-4244 | `js/flight/controls.js` | `updatePointerFromClient` | pointer state via helper |
| `onSceneClick` | 4246-4268 | `js/flight/controls.js` / inspector | `isFlightActive`, `renderer`, `isConsoleActive`, `orbitState`, `updatePointerFromClient`, `getInteractiveHits`, `selectProject` | pointer lock request, `orbitState.moved`, pointer state, selected project via helper |
| `applyLocalFlightRotation` | 4270-4275 | `js/flight/controls.js` | `flightTempVec`, `flightInputQuat`, `flightState.orientation` | temp vector/quaternion, `flightState.orientation` |
| `updateFlightBasis` | 4277-4282 | `js/flight/state.js` | `flightState.orientation`, `flightQuat`, `flightForward`, `flightRight`, `flightUp` | basis temp vectors/quaternion |
| `getWeaponDirection` | 4284-4293 | `js/flight/combat.js` | `flightForward`, `flightRight`, `flightUp`, `flightTempVec2` | `flightTempVec2` |
| `updateFlight` | 4368-4458 | `js/flight/state.js` | `flightState`, `skillTree`, `performance`, `combatState`, `isCoarsePointer`, weapon/navigation/combat/HUD helpers, `updateFuelDrain`, `traderState`, constants | `flightState.lastTime/energy/shield/vel/pos/fuelDepleted/thrust/strafe/fuel`, `combatState.heat/overheated/afterburnerActive`, message state on fuel depletion |
| `updateProjectLandingTarget` | 4460-4490 | `js/flight/navigation.js` | `projectNodes`, `landingRange`, `activeUniverseScale`, `projectNodeById`, `missionState`, `performance`, `combatAudio`, `getVoicePersona`, `isCoarsePointer` | `flightState.nearestNode/nearestDistance/currentDockedProject/finalApproachSpoken/status` |
| `updateFlightCamera` | 4695-4710 | `js/flight/controls.js` | `updateFlightBasis`, `playerShip`, `flightState`, `flightQuat`, `flightForward`, `flightUp`, `camTarget` | player ship transform/visibility, camera target |
| `updateFlightNavMarker` | 5008-5034 | `js/flight/navigation.js` / HUD | `flightNavMarker`, `isFlightActive`, `flightState.navNode`, `navTempVec`, `navTempVec2`, `navScreenVec`, `camera`, `window`, `THREE`, `getProjectNodeName` | nav marker DOM classes/style/text, temp vectors |

### Combat, Weapons, Economy Menus

| Entry | Lines | Target module | Outer reads | Outer writes/mutates |
|---|---:|---|---|---|
| `createFlightGameObjects` | 1271-1386 | `js/flight/combat.js` | `THREE`, `scene`, constants, `gameRoot`, `playerShip`, `createMissileExhaust`, `createWeaponVfxPools` | `gameRoot`, `playerShip`, `enemies`, `playerBullets`, `enemyBullets`, `playerMissiles`, `flightNavLine`, scene graph |
| `createMissileExhaust` | 1388-1411 | `js/flight/combat.js` | `THREE` | missile child exhaust and `missile.userData.exhaust` |
| `createWeaponVfxPools` | 1413-1452 | `js/flight/combat.js` | `THREE`, `gameRoot` | `muzzleFlashPool`, `impactFlashPool`, `deathExplosionPool`, scene graph |
| `warnVfxPoolExhausted` | 1454-1456 | `js/flight/combat.js` | `console` | console warning |
| `triggerMuzzleFlash` | 1458-1469 | `js/flight/combat.js` | `muzzleFlashPool`, `warnVfxPoolExhausted` | light position/intensity/userData/visibility |
| `triggerImpactFlash` | 1471-1484 | `js/flight/combat.js` | `impactFlashPool`, `warnVfxPoolExhausted`, `camera` | impact transform/material/userData/visibility |
| `triggerDeathExplosion` | 1486-1499 | `js/flight/combat.js` | `deathExplosionPool`, `gameRoot`, `warnVfxPoolExhausted` | explosion transform/material/userData/visibility |
| `updateWeaponVfxPools` | 1501-1540 | `js/flight/combat.js` | VFX pools | VFX frames/intensity/scale/material/visibility/userData |
| `syncCombatCreditsFromTrader` | 2490-2492 | `js/economy/trader.js` | `traderState.credits` | normalized `traderState.credits` |
| `setCombatCredits` | 2494-2496 | `js/economy/trader.js` | none | `traderState.credits` |
| `addCombatCredits` | 2498-2501 | `js/economy/trader.js` / HUD | `setCombatCredits`, `traderState.credits`, `isFlightActive`, `showCreditGain` | `traderState.credits`, HUD credit gain |
| `buildEnemyMaterial` | 2503-2505 | `js/flight/combat.js` | `THREE` | none |
| `buildEnemyGeometry` | 2507-2570 | `js/flight/combat.js` | `getEnemyClass`, `THREE`, `buildEnemyMaterial` | returned group/material userData |
| `buildEnemyHealthPips` | 2572-2590 | `js/flight/combat.js` | `THREE` | enemy children/userData health pips |
| `updateEnemyHealthPips` | 2592-2603 | `js/flight/combat.js` | `performance`, enemy userData | enemy pip material colors, `lastPipUpdate` |
| `buildEnemyFromClass` | 2605-2612 | `js/flight/combat.js` | `getEnemyClass`, `buildEnemyGeometry` | enemy children/userData class/body material |
| `getEnemyDamageUnits` | 2614-2616 | `js/flight/combat.js` | none | none |
| `applyEnemyHit` | 2618-2642 | `js/flight/combat.js` | `getEnemyClass`, `getEnemyDamageUnits`, `skillTree`, `performance`, `updateEnemyHealthPips`, `handleEnemyDestroyed` | enemy `health/shieldHp/bodyMaterial/flashUntil`, `flightState.status/statusUntil` |
| `applyEmpBurst` | 2644-2656 | `js/flight/combat.js` | `enemies`, `performance`, `applyEnemyHit` | enemy `stunUntil`, enemy damage, `flightState.status/statusUntil` |
| `stationName` | 3458-3460 | `js/economy/trader.js` | `USSY_PROJECTS` | none |
| `getStationCategory` | 3462-3464 | `js/economy/trader.js` | `USSY_PROJECTS` | none |
| `getNearestStationFaction` | 3466-3481 | `js/economy/trader.js` / combat | `normalizeCategory`, `getStationCategory`, `traderState`, `flightState.nearestNode`, `projectNodes` | none |
| `getEnemyFireCooldown` | 3483-3486 | `js/flight/combat.js` | `getEnemyAggressionMultiplier`, `getNearestStationFaction` | none |
| `openStationMenu` | 3488-3503 | `js/economy/trader.js` | `syncCombatCreditsFromTrader`, `showGameMessage`, `stationName`, `traderState`, `restockAtProject`, `USSY_PROJECTS`, `openEquipmentMarket`, `openTradeMenu`, `dismissGameMessage` | game message state |
| `openEquipmentMarket` | 3505-3533 | `js/economy/trader.js` | `syncCombatCreditsFromTrader`, `getStationEquipment`, `getStationCategory`, `getWeaponDef`, `WEAPON_PRICES`, `loadoutState`, `combatState.ownedWeapons`, `traderState.credits`, `buyAndEquipWeapon`, `openStationMenu`, `showGameMessage`, `stationName` | game message state |
| `buyAndEquipWeapon` | 3535-3568 | `js/economy/trader.js` / combat state | `getWeaponDef`, `combatState.ownedWeapons`, `buyWeapon`, `traderState`, `equipWeapon`, `syncCombatCreditsFromTrader`, `reapplySkills`, `ttsEngine`, `getVoicePersona`, `updateFlightHud`, `showGameMessage` | `combatState` owned/equipped via imported APIs, `traderState.credits`, game message/HUD/TTS |
| `openSkillTree` | 3570-3584 | `js/flight/state.js` | `showGameMessage`, `combatState`, branch helpers, `dismissGameMessage` | game message state |
| `showSkillBranch` | 3586-3606 | `js/flight/state.js` | `SKILL_TREE_NODES`, `skillTree`, `confirmSkillUnlock`, `openSkillTree`, `showGameMessage` | game message state |
| `confirmSkillUnlock` | 3608-3621 | `js/flight/state.js` | `SKILL_TREE_NODES`, `showGameMessage`, `unlockSkillNode`, `showSkillBranch` | game message state |
| `unlockSkillNode` | 3623-3630 | `js/flight/state.js` | `SKILL_TREE_NODES`, `skillTree`, `ttsEngine`, `getVoicePersona`, `updateFlightHud`, `showSkillBranch` | `combatState` via `skillTree.unlock`, HUD/TTS/message |
| `deactivateCombatObject` | 3632-3639 | `js/flight/combat.js` | object userData | object `visible`, `userData.active/life`, trail/exhaust visibility |
| `spawnEnemy` | 3641-3671 | `js/flight/combat.js` | `missionState`, `getRandomClassForTier`, `getDifficultyTier`, `flightState.score/pos`, `getEnemyClass`, `buildEnemyFromClass`, `getEnemyFireCooldown`, `buildEnemyHealthPips` | enemy position/userData/visibility/children |
| `fireBullet` | 3673-3696 | `js/flight/combat.js` | projectile pool, `playerBullets`, `playerLaserMaxDistanceSq`, `flightBeamAxis`, `triggerMuzzleFlash`, `updateBulletTrail` | bullet position/velocity/life/damage/trail/material/quaternion/visibility |
| `fireMissile` | 3698-3713 | `js/flight/combat.js` | `playerMissiles`, `findNearestEnemy`, `flightBeamAxis`, `triggerMuzzleFlash` | missile position/velocity/life/damage/target/exhaust/material/quaternion/visibility |
| `findNearestEnemy` | 3715-3727 | `js/flight/combat.js` | `enemies`, `flightState.pos` | none |
| `firePrimaryWeapon` | 4295-4329 | `js/flight/combat.js` | `loadoutState`, `getWeaponDef`, `flightState`, `skillTree`, `combatState`, `flightHeatBar`, `flightTempVec`, `flightForward`, `applyEmpBurst`, `applyHeatShot`, `getWeaponDirection`, `fireBullet`, `playerBullets` | `flightState.status/lastShot/ammo/energy`, `combatState.heat/overheated` via `applyHeatShot`, VFX/projectile pools |
| `fireSecondaryWeapon` | 4331-4366 | `js/flight/combat.js` | `loadoutState`, `getWeaponDef`, `flightState`, `flightTempVec`, `flightForward`, `applyEmpBurst`, `getWeaponDirection`, `fireMissile`, `combatAudio`, `getVoicePersona` | `flightState.status/lastMissile/energy/missiles`, projectile pools, chatter audio |
| `updateCombatObjects` | 4492-4601 | `js/flight/combat.js` | projectile/enemy pools, combat helpers, `flightState`, `combatState`, `performance`, `getEnemyClass`, `flightTempVec`, `flightRight`, `flightUp`, `getEnemyFireCooldown` | bullets/missiles/enemies positions/userData/visibility, player damage, enemy respawns, `flightState.armor/shield/score/vel/pos/status` |
| `applyPlayerDamage` | 4603-4626 | `js/flight/combat.js` | `emitCombatPlayerHit`, `triggerImpactFlash`, `performance`, `applyDamageModel`, `skillTree`, `flightHud`, `window`, `combatAudio`, `getVoicePersona` | `combatState.lastHitAt/adrenaline`, `flightState.shield/armor/shieldCriticalSpoken`, HUD classes |
| `updateBullet` | 4628-4636 | `js/flight/combat.js` | bullet userData, `flightState.pos`, `updateBulletTrail`, `deactivateCombatObject` | bullet position/life/trail/active state |
| `updateBulletTrail` | 4638-4654 | `js/flight/combat.js` | bullet trail data, `bulletTrailTemp` | trail cursor/points/geometry, temp vector |
| `updateMissile` | 4656-4674 | `js/flight/combat.js` | `findNearestEnemy`, `flightTempVec`, `flightBeamAxis`, `updateMissileExhaust`, `flightState.pos`, `deactivateCombatObject` | missile target/velocity/position/quaternion/life/exhaust/active state |
| `updateMissileExhaust` | 4676-4693 | `js/flight/combat.js` | exhaust userData | exhaust positions/geometry flag |

### Mission, Objectives, Orchestrator

| Entry | Lines | Target module | Outer reads | Outer writes/mutates |
|---|---:|---|---|---|
| `showGameMessage` | 2658-2682 | `js/flight/mission.js` / UI message module | `Symbol`, `performance`, `renderGameMessage`, `ttsEngine`, `getVoicePersona` | `gameMessageState` fields, TTS transmission |
| `renderGameMessage` | 2684-2703 | `js/flight/mission.js` / UI message module | message DOM refs, `gameMessageState`, `document` | message DOM content/classes |
| `updateGameMessage` | 2705-2714 | `js/flight/mission.js` / UI message module | `gameMessageState`, `renderGameMessage` | `gameMessageState.shown/index/nextTypeAt` |
| `dismissGameMessage` | 2716-2725 | `js/flight/mission.js` / UI message module | `gameMessageState`, `renderGameMessage`, `ttsEngine` | `gameMessageState.active/onDismiss`, TTS stop, callback side effects |
| `handleGameMessageChoice` | 2727-2738 | `js/flight/mission.js` / UI message module | `gameMessageState`, `renderGameMessage`, `ttsEngine` | `gameMessageState.active`, TTS/action side effects |
| `resetContractState` | 2740-2746 | `js/flight/mission.js` | `missionState` | contract fields on `missionState` |
| `getMissionContract` | 2748-2750 | `js/flight/mission.js` | `missionContracts` | none |
| `getActiveContractStep` | 2752-2755 | `js/flight/mission.js` | `getMissionContract`, `missionState` | none |
| `setCurrentObjective` | 2757-2760 | `js/flight/mission.js` | `renderObjectivesPanel` | `missionState.currentObjective`, objective DOM via render |
| `getObjectiveProgressLabel` | 2762-2768 | `js/flight/mission.js` | `missionState.currentObjective` | none |
| `renderObjectivesPanel` | 2770-2808 | `js/flight/mission.js` | objective DOM refs, `missionState`, `getObjectiveProgressLabel`, `objectiveViewButtons`, `missionContracts`, `gameOrchestrator`, `document` | objectives DOM |
| `switchObjectivesView` | 2810-2813 | `js/flight/mission.js` | `renderObjectivesPanel` | `missionState.objectiveView` |
| `toggleObjectivesView` | 2815-2817 | `js/flight/mission.js` | `missionState.objectiveView`, `switchObjectivesView` | `missionState.objectiveView` via helper |
| `handleObjectivesPanelClick` | 2819-2827 | `js/flight/mission.js` | event target, `switchObjectivesView`, `startMissionContract` | objective view or mission state via helpers |
| `showFlightStartupChoice` | 2829-2849 | `js/flight/mission.js` | `setCurrentObjective`, `showGameMessage`, `startTutorialMission`, `startFreeRoam`, `performance` | objective/message state, `flightState.status/statusUntil` |
| `startFreeRoam` | 2851-2867 | `js/flight/mission.js` | `resetContractState`, `performance`, `setCurrentObjective`, `showGameMessage`, `updateFlightHud` | `missionState.active/step/kills`, `gameOrchestrator.tutorialComplete/nextPollAt`, objective/message/HUD |
| `startTutorialMission` | 2869-2892 | `js/flight/mission.js` | `resetContractState`, `setCurrentObjective`, `showGameMessage`, `missionIntroText`, `setMissionStep`, `performance` | `missionState` tutorial fields, objective/message, `flightState.status/statusUntil` |
| `setMissionStep` | 2894-2988 | `js/flight/mission.js` | `projectNodeById`, `setNavigationTarget`, `setCurrentObjective`, `showGameMessage`, `stationName`, `traderState`, `openTradeMenu`, `finishTutorialMission`, `renderObjectivesPanel` | `missionState.step/landingProjectId`, `flightState.landed/status/statusUntil`, enemies via `spawnTutorialBogeys`, objective/message/nav state |
| `startTradingTutorialBuy` | 2990-3002 | `js/flight/mission.js` | `setCurrentObjective`, `openTradeMenu` | `missionState.step/contractStartStationId`, objective/message via trade menu |
| `finishTutorialMission` | 3004-3022 | `js/flight/mission.js` | `combatState.skillPoints`, `emitCombatMissionComplete`, `resetContractState`, `performance`, `setCurrentObjective`, `showGameMessage`, `updateFlightHud` | combat state via imported emit, `missionState.active/step`, `gameOrchestrator.tutorialComplete/nextPollAt`, `flightState.status`, objective/message/HUD |
| `getTradingTutorialDestinationId` | 3024-3028 | `js/flight/mission.js` | `projectNodeById`, `USSY_PROJECTS`, `missionState.contractStartStationId` | none |
| `updateMission` | 3030-3033 | `js/flight/mission.js` | `updateGameMessage`, `missionState.active` | message typewriter via helper |
| `registerMissionKill` | 3035-3061 | `js/flight/mission.js` | `missionState`, `setCurrentObjective`, `enemies`, `deactivateCombatObject`, `setMissionStep`, `showMissionKillProgress`, `getActiveContractStep`, `updateContractObjectiveProgress`, `advanceContractStep` | `missionState.kills/contractProgress`, enemy active states, objective/message state |
| `showMissionKillProgress` | 3063-3084 | `js/flight/mission.js` | `combatAudio`, `getVoicePersona`, `showGameMessage` | chatter audio, game message state |
| `handleMissionLanding` | 3086-3109 | `js/flight/mission.js` | `missionState`, `handleDirectorLanding`, `getMissionLandingProjectName`, `performance`, `updateFlightHud`, `setMissionStep`, `stationName`, `handleContractLanding` | `flightState.status/statusUntil`, mission step via helper |
| `handleDirectorLanding` | 3111-3124 | `js/flight/mission.js` / orchestrator | `missionState.currentObjective`, `setCurrentObjective`, `showGameMessage` | objective/message state |
| `spawnTutorialBogeys` | 3126-3130 | `js/flight/mission.js` | `enemies`, `deactivateCombatObject`, `spawnEnemy` | enemies |
| `seededRange` | 3132-3134 | `js/flight/mission.js` | none | none |
| `getFactionMissionDestination` | 3136-3139 | `js/flight/mission.js` | `USSY_PROJECTS` | none |
| `upsertFactionMissionContract` | 3141-3201 | `js/flight/mission.js` | `USSY_PROJECTS`, `stationName`, `normalizeCategory`, `getMissionContract`, `COMMODITIES`, `seededRange`, `renderObjectivesPanel` | `missionContracts` push, objectives DOM |
| `showFactionMission` | 3203-3220 | `js/flight/mission.js` | `upsertFactionMissionContract`, `openTradeMenu`, `missionState.active`, `gameOrchestrator.tutorialComplete`, `startMissionContract`, `showGameMessage`, `stationName` | game message state |
| `startMissionContract` | 3222-3235 | `js/flight/mission.js` | `missionState`, `gameOrchestrator.tutorialComplete`, `getMissionContract`, `traderState.dockedStation`, `beginContractStep`, `showGameMessage` | `missionState` contract fields, objective/message via helper |
| `beginContractStep` | 3237-3254 | `js/flight/mission.js` | `getActiveContractStep`, `completeMissionContract`, `updateContractObjectiveProgress`, `projectNodeById`, `setNavigationTarget`, `enemies`, `spawnEnemy`, `performance` | `missionState.step/contractProgress`, enemies, `flightState.status/statusUntil` |
| `updateContractObjectiveProgress` | 3256-3268 | `js/flight/mission.js` | `getMissionContract`, `getActiveContractStep`, `missionState`, `setCurrentObjective` | objective state/DOM |
| `advanceContractStep` | 3270-3281 | `js/flight/mission.js` | `getMissionContract`, `beginContractStep`, `getActiveContractStep`, `completeMissionContract`, `showGameMessage` | `missionState.contractStepIndex`, objective/message state |
| `completeMissionContract` | 3283-3304 | `js/flight/mission.js` | `getMissionContract`, `normalizeCategory`, `getStationCategory`, `traderState`, `emitCombatMissionComplete`, `addCombatCredits`, `gainReputation`, `resetContractState`, `setCurrentObjective`, `showGameMessage`, `updateFlightHud` | combat/reputation/credits via imported/helpers, `missionState.active/step`, objective/message/HUD |
| `handleContractLanding` | 3306-3325 | `js/flight/mission.js` | `getActiveContractStep`, `stationName`, `performance`, `updateFlightHud`, `advanceContractStep` | `flightState.status/statusUntil`, `missionState.contractProgress/contractStartStationId` |
| `handleTradeCompleted` | 3327-3354 | `js/flight/mission.js` | `missionState`, `setMissionStep`, `setCurrentObjective`, `finishTutorialMission`, `getActiveContractStep`, `updateContractObjectiveProgress`, `advanceContractStep` | `missionState.contractStartStationId/contractProgress`, objective/message/mission step |
| `buildOrchestratorPayload` | 3729-3742 | `js/flight/orchestrator.js` | `flightState`, `traderState`, `missionState`, `gameOrchestrator`, `performance`, `buildOrchestratorGameState` | none |
| `pollOrchestrator` | 3744-3771 | `js/flight/orchestrator.js` | `gameOrchestrator`, `isFlightActive`, `performance`, `gameMessageState`, `fetch`, `buildOrchestratorPayload`, `fireOrchestratedEvent` | `gameOrchestrator.polling/pendingEvent/nextPollAt` |
| `spawnOrchestratedEnemies` | 3773-3780 | `js/flight/orchestrator.js` | `activateEnemyWave`, `enemies`, `maxEnemies`, `spawnEnemy` | enemies, enemy `orchestratorEventId/bountyEventId` |
| `getRandomActiveProjectNode` | 3782-3786 | `js/flight/orchestrator.js` | `projectNodes` | none |
| `showOrchestratorMessage` | 3788-3797 | `js/flight/orchestrator.js` | `showGameMessage` | game message state |
| `fireOrchestratedEvent` | 3799-3926 | `js/flight/orchestrator.js` | `performance`, `spawnOrchestratedEnemies`, `setCurrentObjective`, `showOrchestratorMessage`, `dismissGameMessage`, `getRandomActiveProjectNode`, `setNavigationTarget`, `getProjectNodeName`, `window.setTimeout`, `traderState`, `updateFlightHud`, `resolveOrchestratedChoice` | `gameOrchestrator.lastEventTime/lastEventId/bountyPendingReward`, objective state, `flightState.status/statusUntil`, trader cargo/credits/fuel, enemies, message state |
| `resolveOrchestratedChoice` | 3928-3951 | `js/flight/orchestrator.js` | `dismissGameMessage`, `window.setTimeout`, `showGameMessage`, `addCombatCredits`, `updateFlightHud`, `traderState` | message state, `flightState.status/statusUntil`, `traderState.fuel`, credits via helper |

### HUD, Radar, Animation Loop

| Entry | Lines | Target module | Outer reads | Outer writes/mutates |
|---|---:|---|---|---|
| `landOnNearestProject` | 3406-3427 | `js/economy/trader.js` / navigation | `updateProjectLandingTarget`, `landingRange`, `activeUniverseScale`, `flightState`, `handleMissionLanding`, `restockAtProject`, `traderState`, `selectProject`, `document`, `renderer`, `gameMessageState`, `openStationMenu`, `updateFlightHud` | `flightState.landed/currentDockedProject/vel/status`, trader dock fields, pointer lock, selection/message/HUD |
| `restockAtProject` | 3429-3456 | `js/economy/trader.js` / flight state | `skillTree`, `combatState`, `refuelAt`, `traderState`, `ttsEngine`, `updateFlightHud` | `flightState.shield/armor/ammo/missiles/energy/fuel/fuelDepleted/strafe/status/statusUntil` and combat heat/overheat/overcharge |
| `handleEnemyDestroyed` | 3356-3399 | `js/flight/combat.js` / mission | `getEnemyClass`, `combatState`, `emitCombatEnemyKill`, `registerMissionKill`, `gameOrchestrator`, `enemies`, `addCombatCredits`, `setCurrentObjective`, `ttsEngine`, `getVoicePersona`, `updateFlightHud`, `combatAudio`, `missionState`, `spawnEnemy`, `deactivateCombatObject` | enemy active state/respawn, `gameOrchestrator.bountyPendingReward`, `flightState.score/status/statusUntil`, credits, objective/HUD/TTS/chatter |
| `getMissionLandingProjectName` | 3401-3404 | `js/flight/mission.js` | `USSY_PROJECTS`, `missionState.landingProjectId` | none |
| `mapRadarPoint` | 4712-4729 | `js/flight/hud.js` | `radarTempVec`, `flightState.pos`, `flightRight`, `flightForward`, `flightUp`, `radarRange`, `activeUniverseScale` | `radarTempVec` |
| `drawRadarContact` | 4731-4762 | `js/flight/hud.js` | `mapRadarPoint`, canvas context | canvas drawing state |
| `updateCockpitRadar` | 4764-4819 | `js/flight/hud.js` | `radarCtx`, `cockpitRadar`, `isFlightActive`, `isCoarsePointer`, `projectNodes`, `flightState`, `missionState`, `drawRadarContact`, `enemies`, `radarRange`, `activeUniverseScale` | `radarLastUpdate`, canvas drawing |
| `updateFlightHud` | 4821-4950 | `js/flight/hud.js` | `performance`, `syncCombatCreditsFromTrader`, `flightState`, `skillTree`, `updateTtsStatusIndicator`, all HUD DOM refs, `combatState`, `traderState`, `WEAPON_DEFS`, `findNearestEnemy`, `playerShip`, `enemies`, `document` | `flightState.lastHudUpdate/fuel`, many HUD DOM text/styles/classes |
| `animate` | 5095-5312 | `js/main.js` / rendering scheduler | almost all render/game state: `requestAnimationFrame`, `performance`, `combatState`, `adrenalineVignette`, `combatAudio`, engine animation helpers, nodes, mode flags, camera/light temps, `updateFlight`, `updateSpaceEnvironment`, `tickPriceDrift`, `pollOrchestrator`, selection/pointer helpers, labels, renderer, telemetry DOM | `combatState.lastAdrenalineFrame/adrenaline/lastAdrenalineBarkAt`, node positions/line geometry, `lastPriceDriftTick`, `gameOrchestrator._lastCheck`, light colors, `pointerDirty`, `hoveredNode`, selection ring, `camCurrent`, camera, label DOM, `telemetryLastUpdate`, `lastTriangleWarnAt` |

## Shared Mutable Variables and Touch Points

- `scene`: written `init` (1099); read/mutated by `createHolographicCore`, `createDeepSpaceEffects`, `createDebrisField`, `createDustField`, `createFlightGameObjects`, `createAmbientLighting`, `exitFlightMode`, `updateSpaceEnvironment`.
- `camera`: written `init`; read/mutated by `triggerImpactFlash`, `getInteractiveHits`, `updateFlightNavMarker`, `animate`, `updateDeepSpaceAnchor`.
- `renderer`: written `init`; read/mutated by `enterFlightMode`, `exitFlightMode`, pointer handlers, `onWindowResize`, `animate`.
- `coreGroup`, `nodesGroup`, `connectionsGroup`: written `init`; read/mutated by core/node builders.
- `coreMesh`, `coreOuterParticles`, `selectionRing`: written `createHolographicCore`; touched by `onHeroScroll`, `applyFlightUniverseScale`, `animate`.
- `raycaster`, `mouse`: written `init`; touched by `updatePointerFromClient`, `getInteractiveHits`.

## Pass 9 — Final Wiring & Verification

- `js/main.js` remains the thin module entry point: it only imports `init`/`tick`, starts the `requestAnimationFrame` loop, and wires `DOMContentLoaded` bootstrap.
- The temporary `js/app.js` monolith from the previous attempt was removed. The remaining runtime wiring now lives under flight ownership in `js/flight/runtime.js`, while the browser radio/TTS/settings implementation was extracted to canonical `js/flight/audio.js`.
- Browser-contract tests that intentionally inspect implementation text now inspect the owning module: TTS/radio assertions read `js/flight/audio.js` (with runtime text only where message/orchestrator integration is asserted), and orchestrator payload source checks read `js/flight/runtime.js`.
- `index.html` remains a single module-entry page and still imports only `js/main.js`.
- Verification performed: `npm test` passed.
- `hoveredNode`: written `animate`; read by hover logic in `animate`.
- `selectedNode`: written `selectProject`, `deactivateConsoleMode`, `resetCameraView`, `animate` hover path indirectly; read by selection/orbit/animation/edge functions.
- `activeCategory`: written `setupUIEventListeners`, `resetCategoryFilterForFlight`; read by `populateProjectsUI`, category filtering.
- `isConsoleActive`: written `activateConsoleMode`, `deactivateConsoleMode`; read by mode, input, scroll, animate, label rendering.
- `isFlightActive`: written `enterFlightMode`, `exitFlightMode`; read by controls, UI guards, HUD, navigation, animate, orchestrator.
- `heroTouchStartY`: written `onHeroTouchStart`; read `onHeroTouchEnd`.
- `pointerDirty`: written `updatePointerFromClient`, `animate`; read `animate`.
- `pointLight1`, `pointLight2`: written `createAmbientLighting`; mutated by `animate`.
- `starField`, `milkyWayField`, `brightStarField`, `dataRibbonGroup`: written `createDeepSpaceEffects`; read by starfield update/animate.
- `relationshipEdgesMesh`, `selectedEdgesMesh`: written `buildRelatedProjectEdges`; mutated by relationship update functions.
- `debrisField`, `dustField`, `dustPositions`, `dustSpeeds`: written create/update starfield functions; read/mutated by environment updates and mode exits.
- `telemetryLastUpdate`, `lastTriangleWarnAt`, `radarLastUpdate`, `lastPriceDriftTick`, `activeUniverseScale`: counters/scalars mutated in `animate`, `updateCockpitRadar`, `applyFlightUniverseScale`.
- `launchCodeBuffer`: mutated in `onGlobalKeyDown`.
- `gameRoot`, `playerShip`, `flightNavLine`: written `createFlightGameObjects`; read/mutated by mode, combat, navigation, camera, HUD.
- `orbitState`: mutated by orbit sync/apply and pointer/wheel handlers; read by flight mode entry and controls.
- `flightState`: central mutable object touched by nearly all flight, mission, combat, HUD, economy, navigation, controls, save/restore functions.
- `enemies`: populated `createFlightGameObjects`; mutated/read by combat, missions, orchestrator, radar, HUD.
- `playerBullets`, `enemyBullets`, `playerMissiles`: populated `createFlightGameObjects`; mutated/read by firing, updates, collision, mode resets.
- `muzzleFlashPool`, `impactFlashPool`, `deathExplosionPool`: populated `createWeaponVfxPools`; mutated/read by VFX triggers, updates, mode resets.
- `combatState`: imported mutable singleton touched by loadout/skill bridge, save/restore, flight mode, weapons, damage, HUD, missions, economy purchases.
- `traderState`: imported mutable singleton touched by save/restore, credits/fuel/docking, economy menus, landing, orchestrator, HUD.
- `reputationState.scores`: mutated by `restoreCombatStateFromHash`; read by save.
- `missionState`: created at line 300 and mutated by all mission/tutorial/contract/objective functions plus save/restore/orchestrator/HUD/navigation.
- `missionContracts`: cloned at line 331 and mutated by `upsertFactionMissionContract`; read by objectives/contracts/save.
- `persistedMissionProgress`: written `restoreMissionProgress`, cleared `applyPersistedMissionProgress`.
- `gameOrchestrator`: mutated by flight mode, free roam/tutorial completion, poll/orchestrated event/bounty functions; read by objectives/save/orchestrator payload.
- `gameMessageState`: mutated by game message UI functions, flight exit, orchestrator/menus/missions through `showGameMessage`/`dismissGameMessage`.
- `gameSettings`: mutated by load/save/set volume; read by audio and settings menus.
- `ttsEngine`, `radioChain`, `combatAudio`, `ttsConfig`: mutable audio singletons touched by audio functions, controls, mission messages, debug exports.
- `camTarget`, `camCurrent`: mutated by selection, mode, orbit, flight camera, animate; read by flight entry and render loop.
- `projectNodes`, `projectLabels`, `projectHitTargets`, `projectNodeById`, `relationshipEdges`: shared node registries mutated by builders/filtering/animation/selection; read across UI, navigation, radar, orchestrator, landing.
- Cached DOM refs: mutated by UI/HUD/message/objective functions; read throughout controls and render loop.

## Pass 1 Status

- Completed audit-only pass for `js/main.js`.
- Wrote this extraction map to `docs/refactor-map.md`.
- No runtime code was moved.
- No file other than `docs/refactor-map.md` was edited.
- No commit was created.
