const USSY_PROJECTS = [
  {
    "id": "devussy",
    "name": "Devussy",
    "description": "Devussy turns rough software intent into explicit DevPlan artifacts: tasks, specs, checkpoints, and handoff files that both humans and coding agents can inspect. The point is not a mysterious autonomous run; it is a visible planning spine for work that needs to survive review.",
    "category": "core",
    "tags": ["Featured", "Ussyverse Core", "Stable", "Python", "FastAPI", "Next.js"],
    "github": "https://github.com/mojomast/devussy",
    "demo": "",
    "status": "Stable",
    "planet": { "pos": [5800, 187, 0], "radius": 852, "color": "0x3a5a8a", "atmosphereColor": "0x5588cc", "type": "core", "hasStation": true },
    "specs": {
      "Language": "Python 3.11 / Next.js",
      "Runtime": "FastAPI Server",
      "State Storage": "Stateless JSON Files",
      "Pipeline Mode": "Multi-Stage Agent Loop"
    },
    "features": [
      "Autonomous DevPlan syntax generation",
      "Circular developer-in-the-loop task queues",
      "Adaptive environment code verification"
    ],
    "telemetry": "[SYS_INIT] Loading devussy state registry...\n[REGISTRY] Found 14 active DevPlans\n[PIPELINE] Planning stage active: pending human ACK\n[STATUS] NOMINAL // Latency: 42ms"
  },
  {
    "id": "openclawssy",
    "name": "Openclawssy",
    "description": "Openclawssy is an operator-first agent runtime where permissions, audit trails, Discord control surfaces, and session visibility are part of the core architecture. It is built for supervised AI operations: every action should have a path, a policy, and a human-readable reason.",
    "category": "core",
    "tags": ["Featured", "Ussyverse Core", "Active", "Go", "Dashboard", "Discord"],
    "github": "https://github.com/mojomast/openclawssy",
    "demo": "",
    "status": "Active",
    "planet": { "pos": [4962, -192, 3605], "radius": 532, "color": "0x3a5a8a", "atmosphereColor": "0x5588cc", "type": "core", "hasStation": true },
    "specs": {
      "Language": "Go 1.21",
      "Runtime": "Single Binary Operator",
      "State Storage": "Local SQLite / GOB Encoded",
      "Provider Integrations": "OpenAI / Requesty / ZAI"
    },
    "features": [
      "Command-discipline auditable execution trails",
      "Deny-by-default capability security gates",
      "Interactive session dashboard & Discord harness"
    ],
    "telemetry": "[DAEMON] Starting Openclawssy agent runtime...\n[GATEWAY] Discord operator gate listening\n[POLICIES] Enforcing STRICT execution permissions\n[SECURITY] Sandbox verified, shell operations active"
  },
  {
    "id": "swarmussy",
    "name": "Swarmussy",
    "description": "Swarmussy is a terminal-native coding swarm for splitting repository work across specialist agents while keeping the operator in the loop. It explores the practical question behind multi-agent coding: how do you coordinate parallel help without losing traceability, review, or local verification?",
    "category": "core",
    "tags": ["Featured", "Ussyverse Core", "Stable", "Python", "TUI", "LLMs"],
    "github": "https://github.com/mojomast/swarmussy",
    "demo": "",
    "status": "Stable",
    "planet": { "pos": [1998, 22, 6150], "radius": 589, "color": "0x3a5a8a", "atmosphereColor": "0x5588cc", "type": "core", "hasStation": true },
    "specs": {
      "Language": "Python 3.10",
      "TUI Framework": "Textual / Rich",
      "Agent Orchestrator": "Swarm Protocol",
      "Verification Layer": "Local Docker Sandboxes"
    },
    "features": [
      "Real-time DevPlan orchestration TUI",
      "Autonomous codebase search and write swarms",
      "Multi-model group coordination channels"
    ],
    "telemetry": "[ORCHESTRATOR] Initializing multi-agent Swarm...\n[AGENTS] Spawned: Architect, Coder, Reviewer\n[TUI] Launching terminal supervision panels\n[STATE] Syncing repository plan nodes..."
  },
  {
    "id": "tchaikovskussy",
    "name": "Tchaikovskussy",
    "description": "Tchaikovskussy is a BabelFish-style chat room where language translation is built into the live conversation instead of bolted on afterward. Each participant can read the room in their own language while WebSockets keep the shared session moving in real time.",
    "category": "ai",
    "tags": ["Featured", "AI Tools", "Active", "Python", "React", "WebSocket"],
    "github": "https://github.com/mojomast/Tchaikovskussy",
    "demo": "https://chat.ussyco.de",
    "status": "Active",
    "planet": { "pos": [12000, 147, 0], "radius": 542, "color": "0x1a6a6a", "atmosphereColor": "0x44ddcc", "type": "ai", "hasStation": true },
    "specs": {
      "Backend Tech": "Python / WebSockets",
      "Frontend Tech": "React / TailwindCSS",
      "Translation Engine": "DeepL / OpenAI API",
      "Session Broker": "In-Memory WebSocket Client"
    },
    "features": [
      "Holographic real-time multilingual messaging",
      "Dynamic per-user automated conversation translation",
      "Zero-latency stateful socket streaming Channels"
    ],
    "telemetry": "[SOCKET] WS Server listening on port 8080\n[PEER] Client connected: user_4a2c (Fr)\n[TRANSLATION] Translating En -> Fr (Latency: 110ms)\n[STREAM] Broadcasted translated frame to socket pool"
  },
  {
    "id": "ussycode",
    "name": "ussycode",
    "description": "Ussycode is an SSH-first developer sandbox platform backed by Firecracker microVMs, persistent disks, and HTTPS routing. It asks how small a serious dev environment can be when the primitives are plain VMs, keys, ports, and workspaces rather than a giant orchestration stack.",
    "category": "infra",
    "tags": ["Featured", "Infrastructure", "Active", "Go", "Firecracker", "SQLite"],
    "github": "https://github.com/mojomast/ussycode",
    "demo": "https://ussyco.de/hub",
    "status": "Active",
    "planet": { "pos": [19000, -121, 0], "radius": 539, "color": "0x8a4a1a", "atmosphereColor": "0xdd8833", "type": "infra", "hasStation": true },
    "specs": {
      "Platform Tech": "Go / Firecracker SDK",
      "Storage Backing": "SQLite 3 / Local Volumes",
      "Networking": "TAP Device Bridge / Host NAT",
      "Security Sandboxing": "Linux cgroups / Namespaces"
    },
    "features": [
      "Instant SSH-first developer microVM spawning",
      "Dynamic HTTPS-to-port proxy routing tables",
      "Stateful writable workspace disk persistence"
    ],
    "telemetry": "[KERNEL] Spawning Firecracker microVM #f9c2...\n[NET] Bridging interface tap-f9c2 -> br0\n[SSH] Listening for SSH keys on port 2222\n[DISK] Mounting persistent volume /dev/vda... OK"
  },
  {
    "id": "hermes-dashboard",
    "name": "Hermes Dashboard",
    "description": "Hermes Dashboard is a supervision console for the usually invisible parts of agent work: conversations, context windows, memory, config, and runtime logs. It is deliberately utilitarian - a glowing operator panel for debugging what an agent thinks it is doing.",
    "category": "core",
    "tags": ["Featured", "DevTools", "Active", "Python", "HTML", "JavaScript"],
    "github": "https://github.com/mojomast/hermesdashboard",
    "demo": "",
    "status": "Active",
    "planet": { "pos": [-2101, -175, 6467], "radius": 601, "color": "0x3a5a8a", "atmosphereColor": "0x5588cc", "type": "core", "hasStation": true },
    "specs": {
      "Language": "Python / HTML5 / JS",
      "Monitoring Scope": "Agent Run Session Telemetry",
      "Storage Backing": "Local JSON Logs",
      "UI Styling": "Retro Matrix Amber Glow"
    },
    "features": [
      "Live supervising agent conversation contexts",
      "Interactive system environment variable configuration",
      "Real-time log stream viewing and tailing"
    ],
    "telemetry": "[DAEMON] Hermes Supervisor listening at http://127.0.0.1:4000\n[CONTEXT] Loaded 3 active session logs\n[MEM] Scanning vector memory cache keys\n[STATUS] Running, observing 1 active agent thread"
  },
  {
    "id": "imacomputerussy",
    "name": "iMaCoMpUtERussy",
    "description": "iMaCoMpUtERussy is a tiny fictional computer living in the browser, complete with windows, drawing tools, a custom assembly language, and steganography experiments. It is part emulator, part art toy, and part argument that web interfaces can still feel handmade and surprising.",
    "category": "creative",
    "tags": ["Featured", "Games & Creative", "Stable", "JavaScript", "Emulator", "Assembly"],
    "github": "https://github.com/mojomast/iMaCoMpUtERussy",
    "demo": "https://psp2.vercel.app",
    "status": "Stable",
    "planet": { "pos": [28000, -142, 0], "radius": 426, "color": "0x5a2a8a", "atmosphereColor": "0xaa55ff", "type": "creative", "hasStation": true },
    "specs": {
      "Engine": "Vanilla JS / HTML5 Canvas",
      "Virtual Architecture": "8-bit Custom CPU Emulator",
      "Assembly Compiler": "In-Browser Text-to-Bytecode",
      "Special Features": "Steganographic Image Decoders"
    },
    "features": [
      "Retro browser-based fully simulated OS desktop",
      "Interactive assembly compiler & register inspector",
      "Embedded graphics drawing and steganography canvas"
    ],
    "telemetry": "[BOOT] Initializing virtual system ROM...\n[CPU] Registers cleared. PC: 0x0000\n[OS] Drawing nostalgic UI windows and files\n[SYSTEM] Ready for custom assembly bytecode input"
  },
  {
    "id": "stallionussy",
    "name": "StallionUSSY",
    "description": "StallionUSSY is a loud, comedic horse breeding and racing economy with genetics, auctions, grids, and casino-adjacent side games. Under the joke is a real stateful multiplayer system: persistent assets, live events, trades, and enough simulation machinery to make the absurdity durable.",
    "category": "creative",
    "tags": ["Featured", "Games & Creative", "Active", "Go", "PostgreSQL", "SPA"],
    "github": "https://github.com/mojomast/stallionussy",
    "demo": "https://horse.ussyco.de",
    "status": "Active",
    "planet": { "pos": [20708, -62, 20708], "radius": 365, "color": "0x5a2a8a", "atmosphereColor": "0xaa55ff", "type": "creative", "hasStation": true },
    "specs": {
      "Language": "Go / PostgreSQL",
      "Interface": "Vue.js Single Page App",
      "Simulation": "Genetic Mutation Algorithm",
      "Racing Engine": "Real-time Event Tick Grid"
    },
    "features": [
      "Comedic genetic breeding and mutation simulation",
      "Real-time multiplayer race tracks and results",
      "Durable asset trading and casino games dashboard"
    ],
    "telemetry": "[DB] Connected to postgres://localhost:5432/stallion\n[SIM] Ticking genetics simulator: generation #244\n[GRID] Race #92 loaded, calculating velocity factors\n[COMMERCE] Processing auction trade: equine_node_10a"
  },
  {
    "id": "templeossy",
    "name": "TempleOSsy",
    "description": "TempleOSsy boots TempleOS/ShrineOS inside the browser through a WebAssembly QEMU stack. The goal is a respectful, approachable emulation surface: one-click boot, local writable persistence, and the strange feeling of a whole machine contained in a tab.",
    "category": "creative",
    "tags": ["Featured", "Games & Creative", "Active", "JavaScript", "WASM", "QEMU"],
    "github": "https://github.com/mojomast/templeossy",
    "demo": "https://templeos.ussyco.de",
    "status": "Active",
    "planet": { "pos": [0, 109, 30571], "radius": 277, "color": "0x5a2a8a", "atmosphereColor": "0xaa55ff", "type": "creative", "hasStation": true },
    "specs": {
      "Language": "JavaScript / C",
      "Emulator Core": "QEMU x86 (v6.0) compiled to WASM",
      "Disk Driver": "IndexedDB Virtual Disk Blocks",
      "Audio Mode": "WebAudio PC Speaker Emulator"
    },
    "features": [
      "Browser-native boot of TempleOS & Shrine OS",
      "Stateful writing to IndexedDB virtual drive",
      "Dual-core x86 QEMU emulation at near-native speed"
    ],
    "telemetry": "[EMU] Booting QEMU WASM Core...\n[DISK] Mounting virtual drive blocks from IndexedDB\n[AUDIO] WebAudio synthesizer bound to system speaker\n[KERNEL] TempleOS system initialized successfully"
  },
  {
    "id": "fruityboofs",
    "name": "Fruity Boofs",
    "description": "Fruity Boofs is a collaborative browser DAW for playful vocal synthesis, sequencing, and quick audio sketches. It leans on WebAudio and WebAssembly DSP so music creation can happen in a page without losing the tactility of a real instrument panel.",
    "category": "creative",
    "tags": ["Featured", "Music & Media", "Active", "JavaScript", "WebAudio", "WASM"],
    "github": "https://github.com/mojomast/fruityboofs",
    "demo": "https://fruityboofs.ussyco.de",
    "status": "Active",
    "planet": { "pos": [-22526, -188, 22526], "radius": 286, "color": "0x5a2a8a", "atmosphereColor": "0xaa55ff", "type": "creative", "hasStation": true },
    "specs": {
      "Synthesis Engine": "Paul Batchelor soundpipe (WASM)",
      "Audio API": "Web Audio API / AudioWorklets",
      "UI Framework": "React / Redux / CSS Grid",
      "Format Export": "WAV / Buffer Recording"
    },
    "features": [
      "Collaborative in-browser vocal synthesis sequencer",
      "Optimized WebAssembly-compiled DSP audio engines",
      "Multi-track timeline mixing with envelope controls"
    ],
    "telemetry": "[AUDIO] Spawning AudioWorkletNode context...\n[WASM] Paul Batchelor DSP sound engine compiled\n[SEQUENCER] Timeline grid set to 120 BPM\n[SYNTH] Outputting vocoder-synthesized audio buffers"
  },
  {
    "id": "mediageckussy",
    "name": "Mediageckussy",
    "description": "Mediageckussy is a nostalgic media workbench for preparing, filtering, transcoding, packaging, and sharing small audio/video loops. It treats exportable artifacts as the product: make the thing, package it, send it, let it live without a heavy hosted backend.",
    "category": "creative",
    "tags": ["Featured", "Music & Media", "Active", "Node.js", "Studio", "Static Export"],
    "github": "https://github.com/mojomast/mediageckussy",
    "demo": "https://geck.ussyco.de",
    "status": "Active",
    "planet": { "pos": [-33143, -10, 0], "radius": 523, "color": "0x5a2a8a", "atmosphereColor": "0xaa55ff", "type": "creative", "hasStation": true },
    "specs": {
      "Backend Tech": "Node.js / Express",
      "Transcoding Engine": "FFmpeg WebAssembly Core",
      "Format Scope": "Vintage Audio/Video Transcoders",
      "Export Method": "Static ZIP Asset Packages"
    },
    "features": [
      "Nostalgic media package studio workspace",
      "In-browser vintage format transcoding and filters",
      "Instant shareable looping playback web pages"
    ],
    "telemetry": "[STUDIO] Mediageckussy core server initialized\n[FFMPEG] FFmpeg WASM ready, loaded codecs\n[TRANSCODER] Processing vintage video format filter\n[EXPORT] Generated static media bundle zip (1.2MB)"
  },
  {
    "id": "strudelussy",
    "name": "Strudelussy",
    "description": "Strudelussy experiments around the Strudel live-coding music ecosystem, pushing code-driven composition toward collaboration and AI-assisted variation. The loop is immediate: type patterns, hear structure, mutate ideas, and keep the creative surface close to the sound.",
    "category": "creative",
    "tags": ["Featured", "Music & Media", "Active", "React", "Vite", "Workers"],
    "github": "https://github.com/mojomast/strudelussy",
    "demo": "https://strudel.ussyco.de",
    "status": "Active",
    "planet": { "pos": [-24345, -161, -24345], "radius": 368, "color": "0x5a2a8a", "atmosphereColor": "0xaa55ff", "type": "creative", "hasStation": true },
    "specs": {
      "Audio Platform": "Strudel Live-coding music engine",
      "Synthesis Engine": "Web Audio API / AudioWorklets",
      "AI Integration": "Local AI pattern generator",
      "UI Framework": "React / CodeMirror 6 Editor"
    },
    "features": [
      "Collaborative sandbox live-coding audio platform",
      "AI-assisted musical melody and rhythm helper",
      "Real-time visualizer canvas syncing to sound"
    ],
    "telemetry": "[STRUDEL] Booting live-coding console...\n[AUDIO] Web Audio context started at 48kHz\n[COMPILER] Code parsed successfully: structural melody grid\n[PATTERN] Ticking patterns in sync with master clock"
  },
  {
    "id": "scoreboardussy",
    "name": "Scoreboardussy",
    "description": "Scoreboardussy is a stage-friendly realtime scoreboard for comedy, improv, and live events where hosts need fast controls and audiences may join in. It combines score templates, bilingual host surfaces, QR voting, and WebSocket updates without making the operator fight the UI mid-show.",
    "category": "creative",
    "tags": ["Featured", "Games & Creative", "Stable", "React", "TypeScript", "Express"],
    "github": "https://github.com/mojomast/scoreboardussy",
    "demo": "",
    "status": "Stable",
    "planet": { "pos": [0, 128, -35714], "radius": 335, "color": "0x5a2a8a", "atmosphereColor": "0xaa55ff", "type": "creative", "hasStation": true },
    "specs": {
      "Language": "React / TypeScript",
      "Backend Tech": "Node.js / Express Server",
      "Communication": "WebSocket Real-time Client",
      "Persistence": "Local JSON state backup"
    },
    "features": [
      "Real-time score keeping with custom templates",
      "Bilingual host console dashboards",
      "Interactive audience voting via QR code portals"
    ],
    "telemetry": "[SYS] Starting Scoreboardussy Server on port 5000\n[SOCKET] Watching score broadcast socket pools\n[STATE] Loaded Improv Tournament scoreboard template\n[VOTES] Received 84 live audience votes for team_1"
  },
  {
    "id": "geoffrussy",
    "name": "Geoffrussy",
    "description": "Geoffrussy is a Go-based delivery orchestrator that starts with a structured interview and turns answers into implementation plans. It is an older ecosystem node, but an important one: it made planning feel like an executable command-line workflow rather than a static document.",
    "category": "core",
    "tags": ["Ussyverse Core", "Stable", "Go", "SQLite", "Cobra"],
    "github": "https://github.com/mojomast/geoffrussy",
    "demo": "",
    "status": "Stable",
    "planet": { "pos": [-5771, 101, 4193], "radius": 504, "color": "0x3a5a8a", "atmosphereColor": "0x5588cc", "type": "core", "hasStation": true },
    "specs": {
      "Language": "Go (Golang)",
      "CLI Engine": "Cobra CLI Framework",
      "Database": "SQLite 3 Database",
      "Planner Protocol": "DevPlan v2 Structured Spec"
    },
    "features": [
      "Structured command line interview-to-plan pipeline",
      "Automated multi-stage codebase design generator",
      "Go-based autonomous software delivery execution"
    ],
    "telemetry": "[CLI] Invoked Geoffrussy orchestrator...\n[DB] Connected to local cache database /var/cache/geoff.db\n[INTERVIEW] Gathering system blueprints: 8 prompts\n[PLAN] DevPlan #21 created, validating architectural nodes"
  },
  {
    "id": "battlebussy",
    "name": "Battlebussy",
    "description": "Battlebussy is a containerized cyber-range for watching autonomous agents behave under adversarial pressure. The interesting signal is not just win or lose; it is what the agent tries, what it touches, which guardrails hold, and how clearly the arena records the attempt.",
    "category": "core",
    "tags": ["AI Tools", "Active", "Go", "Docker", "Cyber Range"],
    "github": "https://github.com/mojomast/battlebussy",
    "demo": "https://battleb.ussy.host/",
    "status": "Active",
    "planet": { "pos": [-7467, -198, 0], "radius": 508, "color": "0x3a5a8a", "atmosphereColor": "0x5588cc", "type": "core", "hasStation": true },
    "specs": {
      "Platform Tech": "Go / Docker SDK",
      "Container Base": "Alpine Security Sandbox",
      "Network Topology": "Isolated Bridge / NAT",
      "Monitoring Engine": "cgroup CPU / RAM telemetry"
    },
    "features": [
      "Competitive cyber-range adversarial playground",
      "Heavily instrumented container sandboxing",
      "Autonomous AI agent penetration challenge runners"
    ],
    "telemetry": "[DAEMON] Battlebussy playground supervisor active\n[CONTAINERS] Launching adversarial nodes target_1 & attacker_1\n[NETWORK] Enforcing strict sandbox isolation policies\n[TELEMETRY] Logging agent security events: TCP portscan detected"
  },
  {
    "id": "ussyring",
    "name": "Ussyring Webring",
    "description": "Ussyring is a small decentralized webring for connecting independent projects without a central app server. It keeps the old-web ritual intact: portable widgets, static participant data, and visible routes between strange corners of the internet.",
    "category": "infra",
    "tags": ["Infrastructure", "Active", "JavaScript", "API", "Webring"],
    "github": "https://github.com/mojomast/ussyring",
    "demo": "",
    "status": "Active",
    "planet": { "pos": [-10500, -100, 18187], "radius": 300, "color": "0x8a4a1a", "atmosphereColor": "0xdd8833", "type": "infra", "hasStation": true },
    "specs": {
      "Language": "Vanilla HTML / CSS / JS",
      "API Type": "Client-Side Decentralized JSON Parser",
      "Storage Backing": "Static JSON on GitHub Pages",
      "CSS Styling": "Retro Cyber Webring widget"
    },
    "features": [
      "Decentralized webring navigation widgets",
      "Dynamic project list rendering and redirection",
      "Static-page widgets requiring zero hosting backend"
    ],
    "telemetry": "[WEBRING] Fetching ring participants database...\n[DOM] Rendered navigation widget: ussyring-v1\n[ROUTING] Loaded 14 active ring neighbors\n[OK] Parsed coordinates, ready for network redirection"
  },
  {
    "id": "ghstatsussy",
    "name": "ghstatsussy",
    "description": "ghstatsussy turns GitHub activity into stylized SVG/HTML artifacts from the command line. It is part stats report, part badge machine, and part experiment in making repository telemetry feel designed instead of dumped.",
    "category": "core",
    "tags": ["Featured", "DevTools", "Stable", "Go", "CLI", "Infographics"],
    "github": "https://github.com/mojomast/ghstatsussy",
    "demo": "",
    "status": "Stable",
    "planet": { "pos": [-6310, -166, -4585], "radius": 637, "color": "0x3a5a8a", "atmosphereColor": "0x5588cc", "type": "core", "hasStation": true },
    "specs": {
      "Language": "Go (Golang)",
      "CLI Engine": "Cobra CLI / Go-git",
      "Graphics Engine": "SVG Procedural Generator",
      "Export Output": "Interactive SVG / HTML"
    },
    "features": [
      "CLI tool generating GitHub infographic cards",
      "Detailed activity and contribution analyzer",
      "Beautiful customized cyberpunk SVG graphics generator"
    ],
    "telemetry": "[CLI] Running ghstatsussy activity generator...\n[GIT] Scanning contributions repository mojomast/devussy\n[SVG] Drawing neon commit activity grid charts\n[SUCCESS] SVG infographic generated: stats.svg (45KB)"
  },
  {
    "id": "stenographussy",
    "name": "Stenographussy",
    "description": "Stenographussy scans source code for invisible or hard-to-review text attacks: zero-width characters, homoglyphs, and suspicious Unicode patterns. It stays narrow on purpose so it can be useful during code review without becoming another vague security dashboard.",
    "category": "core",
    "tags": ["Featured", "DevTools", "Active", "Python", "Steganography", "Security"],
    "github": "https://github.com/mojomast/stenographussy",
    "demo": "",
    "status": "Active",
    "planet": { "pos": [-2513, 151, -7735], "radius": 706, "color": "0x3a5a8a", "atmosphereColor": "0x5588cc", "type": "core", "hasStation": true },
    "specs": {
      "Language": "Python 3.10",
      "Scan Engine": "AST Parsers / RegEx",
      "Scanner Scope": "Zero-width chars, Homoglyphs",
      "Reports Output": "Terminal stdout / JSON File"
    },
    "features": [
      "Steganographic code review security scanner",
      "AST-based malicious backdoor identifier",
      "Zero-width space and homoglyph attack detector"
    ],
    "telemetry": "[SCANNER] Starting Stenographussy security check...\n[SCAN] Auditing directory: src/components\n[WARNING] Found zero-width character at app.js:234\n[AST] Finished auditing, found 0 executable backdoors"
  },
  {
    "id": "fireslice",
    "name": "fireslice",
    "description": "Fireslice is a lightweight Firecracker control plane for small operator-managed hosting clusters. It focuses on the boring pieces that make VMs real: users, SSH keys, VM profiles, tap devices, launch APIs, and a system shape you can understand without a cloud manual.",
    "category": "infra",
    "tags": ["Infrastructure", "Active", "Go", "Firecracker", "Control Plane"],
    "github": "https://github.com/mojomast/fireslice",
    "demo": "",
    "status": "Active",
    "planet": { "pos": [-11500, -50, -19919], "radius": 452, "color": "0x8a4a1a", "atmosphereColor": "0xdd8833", "type": "infra", "hasStation": true },
    "specs": {
      "Language": "Go (Golang)",
      "API Framework": "Gin Gonic REST API",
      "Control Interface": "Firecracker MicroVM SDK",
      "Auth System": "JWT Operator Credentials"
    },
    "features": [
      "Lightweight Firecracker MicroVM control planes",
      "Multi-tenant user and SSH key registry APIs",
      "Automatic tap adapter configuration engines"
    ],
    "telemetry": "[DAEMON] fireslice REST server starting on port 8090\n[SDK] Verified local Firecracker binary path /usr/bin/firecracker\n[VM] Found 6 registered VM profiles\n[STATUS] Listening, ready to launch microVM instances"
  },
  {
    "id": "ralphussy",
    "name": "Ralphussy",
    "description": "Ralphussy is an early autonomous CLI coding agent and a fossil record for the newer planning tools. It keeps the rough edges visible: terminal UI experiments, swarm mode attempts, DevPlan v1, and the lessons that pushed later systems toward stricter operator control.",
    "category": "core",
    "tags": ["Ecosystem", "Historical", "Stable", "Python", "TUI", "DevPlan"],
    "github": "https://github.com/mojomast/ralphussy",
    "demo": "",
    "status": "Stable",
    "planet": { "pos": [2616, 3, -8052], "radius": 512, "color": "0x3a5a8a", "atmosphereColor": "0x5588cc", "type": "core", "hasStation": true },
    "specs": {
      "Language": "Python 3.9",
      "Interface": "Terminal User Interface (TUI)",
      "Planner": "DevPlan v1 Specification",
      "Runtime": "Ad-hoc Local Subprocesses"
    },
    "features": [
      "Early historical autonomous CLI coding agent",
      "DevPlan-driven file search and replacement",
      "Simple text-based user interface console"
    ],
    "telemetry": "[SYS] booting Ralphussy agent...\n[TUI] rendered terminal UI frame\n[PLANNER] Loaded project blueprint file\n[EXECUTE] Running shell commands... WARNING: No sandbox active"
  },
  {
    "id": "ragussy",
    "name": "RAGussy",
    "description": "RAGussy is a self-hosted retrieval chatbot for local markdown and documentation collections. It emphasizes visible ingestion, prompt/config controls, and a management UI that lets the retrieval layer be inspected instead of hiding everything behind one chat input.",
    "category": "ai",
    "tags": ["Featured", "AI Tools", "Active", "Python", "FastAPI", "ChromaDB", "React"],
    "github": "https://github.com/mojomast/ragussy",
    "demo": "",
    "status": "Active",
    "planet": { "pos": [-16000, 182, 0], "radius": 648, "color": "0x1a6a6a", "atmosphereColor": "0x44ddcc", "type": "ai", "hasStation": true },
    "specs": {
      "Backend Tech": "Python / FastAPI",
      "Vector Storage": "ChromaDB / SQLite",
      "Embedding Engine": "SentenceTransformers (Local)",
      "Frontend Tech": "React / TailwindCSS"
    },
    "features": [
      "Self-hosted universal RAG chatbot interface",
      "Markdown documentation folder indexing",
      "Full config and prompt management dashboards"
    ],
    "telemetry": "[FASTAPI] RAGussy server active on port 8000\n[VECTOR] ChromaDB initialized, loaded 1,240 document chunks\n[EMBEDDING] Local embedding model ready\n[QUERY] Q&A request: 'How to deploy ussycode?' -> 94% relevance"
  },
  {
    "id": "nexussy",
    "name": "nexussy",
    "description": "Nexussy is the fifth-generation staged delivery pipeline in the Ussyverse. It carries a plain-language idea through interview, design, validation, planning, review, and multi-worker development while leaving artifact traces that can be audited after the build settles.",
    "category": "core",
    "tags": ["Featured", "Ussyverse Core", "Active", "Python", "TypeScript", "SQLite", "SSE"],
    "github": "https://github.com/mojomast/nexussy",
    "demo": "",
    "status": "Active",
    "planet": { "pos": [7119, 199, -5173], "radius": 900, "color": "0x3a5a8a", "atmosphereColor": "0x5588cc", "type": "core", "hasStation": true },
    "specs": {
      "Core Tech": "Python / Starlette / SQLite WAL",
      "TUI Engine": "TypeScript / Bun / OpenTUI",
      "Web Dashboard": "Starlette SPA (port 7772)",
      "Worker Isolation": "Git Worktree per Worker"
    },
    "features": [
      "Six-stage pipeline: interview → design → validate → plan → review → develop",
      "Pi RPC subprocess worker swarm with git worktree isolation",
      "SSE event stream with replay, heartbeat, and typed payloads"
    ],
    "telemetry": "[CORE] nexussy-core listening on http://127.0.0.1:7771\n[DB] SQLite WAL mode active, 3 runs cached\n[PIPELINE] Stage transition: design → validate\n[WORKER] Pi worker #2 merged 14 changed files into main worktree"
  },
  {
    "id": "rpg-dm-bot",
    "name": "RPG DM Bot",
    "description": "RPG DM Bot is an AI-powered Discord Dungeon Master with persistent characters, combat, inventory, NPCs, generated worldbuilding, and a management dashboard. It is built like a real campaign backend rather than a novelty command, with REST endpoints supporting the play loop.",
    "category": "creative",
    "tags": ["Featured", "Games & Creative", "Active", "Python", "Discord", "SQLite", "AI DM"],
    "github": "https://github.com/mojomast/rpg-dm-bot",
    "demo": "",
    "status": "Active",
    "planet": { "pos": [26163, -47, -26163], "radius": 411, "color": "0x5a2a8a", "atmosphereColor": "0xaa55ff", "type": "creative", "hasStation": true },
    "specs": {
      "Language": "Python 3.10+ / discord.py",
      "Database": "SQLite 3 (rpg.db)",
      "AI Backend": "Requesty.ai LLM Router",
      "Web Dashboard": "FastAPI (~80 REST endpoints)"
    },
    "features": [
      "AI Dungeon Master with dynamic narration, NPC dialogue, and combat descriptions",
      "Full character system with stats, spellcasting, leveling, and equipment slots",
      "Generative worldbuilding: campaigns, NPCs, quests, encounters, and loot on demand"
    ],
    "telemetry": "[BOT] RPG DM Bot connected to Discord gateway\n[DB] Loaded rpg.db: 12 characters, 4 active campaigns\n[COMBAT] Initiative rolled: Warrior(18) > Mage(14) > Goblin(7)\n[AI] Generating narration for dungeon_crawl_session_03..."
  }
];

const USSY_CATEGORIES = {
  "core": {
    "title": "Planning & Core",
    "description": "Planning formats, operator consoles, multi-agent experiments, and handoff tools for making software delivery easier to inspect.",
    "color": "#00ff66" // Cyber Green
  },
  "infra": {
    "title": "Systems & Infra",
    "description": "Firecracker controllers, developer sandboxes, routing glue, and small-web infrastructure that keep the experiments reachable.",
    "color": "#00f0ff" // Cyber Cyan
  },
  "ai": {
    "title": "Autonomous AI",
    "description": "Translation rooms, RAG interfaces, policy-gated agent runtimes, and sandboxes for testing AI behavior with sharper edges.",
    "color": "#b026ff" // Cyber Purple
  },
  "creative": {
    "title": "Games & Creative",
    "description": "Browser DAWs, retro machines, tabletop bots, media studios, game systems, and odd tools that make the web feel handmade.",
    "color": "#ff0055" // Cyber Pink
  }
};

window.USSY_PROJECTS = USSY_PROJECTS;
window.USSY_CATEGORIES = USSY_CATEGORIES;
