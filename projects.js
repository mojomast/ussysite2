const USSY_PROJECTS = [
  {
    "id": "devussy",
    "name": "Devussy",
    "description": "Stateless multi-stage planning pipeline for human and AI handoffs. Seamlessly orchestrates task descriptions, coding specs, and code executions across environments.",
    "category": "core",
    "tags": ["Featured", "Ussyverse Core", "Stable", "Python", "FastAPI", "Next.js"],
    "github": "https://github.com/mojomast/devussy",
    "demo": "",
    "status": "Stable",
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
    "description": "Operator-first agent runtime featuring fully auditable execution paths and customizable policy gates. Designed for robust production deployment of AI operations.",
    "category": "core",
    "tags": ["Featured", "Ussyverse Core", "Active", "Go", "Dashboard", "Discord"],
    "github": "https://github.com/mojomast/openclawssy",
    "demo": "",
    "status": "Active",
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
    "description": "Autonomous multi-agent coding swarm integrated with a live, real-time DevPlan orchestration dashboard to coordinate complex repository operations.",
    "category": "core",
    "tags": ["Featured", "Ussyverse Core", "Stable", "Python", "TUI", "LLMs"],
    "github": "https://github.com/mojomast/swarmussy",
    "demo": "",
    "status": "Stable",
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
    "description": "Holographic BabelFish-style chat system enabling real-time, per-user translated multilingual conversation over native WebSockets.",
    "category": "ai",
    "tags": ["Featured", "AI Tools", "Active", "Python", "React", "WebSocket"],
    "github": "https://github.com/mojomast/Tchaikovskussy",
    "demo": "https://chat.ussyco.de",
    "status": "Active",
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
    "description": "SSH-first developer microVM orchestration platform built on Firecracker, providing instant web-based development sandboxes over HTTPS.",
    "category": "infra",
    "tags": ["Featured", "Infrastructure", "Active", "Go", "Firecracker", "SQLite"],
    "github": "https://github.com/mojomast/ussycode",
    "demo": "https://ussyco.de/hub",
    "status": "Active",
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
    "description": "Operator-grade standalone runtime dashboard built to supervise agent conversations, active context, long-term memory, and system configurations.",
    "category": "core",
    "tags": ["Featured", "DevTools", "Active", "Python", "HTML", "JavaScript"],
    "github": "https://github.com/mojomast/hermesdashboard",
    "demo": "",
    "status": "Active",
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
    "description": "A beautiful retro browser desktop computer emulator fully equipped with its own virtual assembly language compiler, drawing applications, and steganographic features.",
    "category": "creative",
    "tags": ["Featured", "Games & Creative", "Stable", "JavaScript", "Emulator", "Assembly"],
    "github": "https://github.com/mojomast/iMaCoMpUtERussy",
    "demo": "https://psp2.vercel.app",
    "status": "Stable",
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
    "description": "A comedic multiplayer horse breeding and genetic simulation game incorporating real-time racing grids, asset trading, and high-stakes casino mini-games.",
    "category": "creative",
    "tags": ["Featured", "Games & Creative", "Active", "Go", "PostgreSQL", "SPA"],
    "github": "https://github.com/mojomast/stallionussy",
    "demo": "https://horse.ussyco.de",
    "status": "Active",
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
    "description": "A browser-native recreation of Terry A. Davis's TempleOS, running in a WebAssembly-compiled QEMU environment with writable local disk persistence.",
    "category": "creative",
    "tags": ["Featured", "Games & Creative", "Active", "JavaScript", "WASM", "QEMU"],
    "github": "https://github.com/mojomast/templeossy",
    "demo": "https://templeos.ussyco.de",
    "status": "Active",
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
    "description": "A collaborative in-browser vocal synthesis digital audio workstation (DAW) utilizing optimized Paul Batchelor WASM sound synthesis engines.",
    "category": "creative",
    "tags": ["Featured", "Music & Media", "Active", "JavaScript", "WebAudio", "WASM"],
    "github": "https://github.com/mojomast/fruityboofs",
    "demo": "https://fruityboofs.ussyco.de",
    "status": "Active",
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
    "description": "A nostalgic studio platform built for managing, transcoding, and exporting vintage media formats and instant share playback loops.",
    "category": "creative",
    "tags": ["Featured", "Music & Media", "Active", "Node.js", "Studio", "Static Export"],
    "github": "https://github.com/mojomast/mediageckussy",
    "demo": "https://geck.ussyco.de",
    "status": "Active",
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
    "description": "An AI-enhanced fork of the Strudel live-coding music platform, enabling real-time musical composition via code in a collaborative sandbox.",
    "category": "creative",
    "tags": ["Featured", "Music & Media", "Active", "React", "Vite", "Workers"],
    "github": "https://github.com/mojomast/strudelussy",
    "demo": "https://strudel.ussyco.de",
    "status": "Active",
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
    "description": "A fast real-time scoreboard designed for comedy/improv shows, complete with interactive audience voting systems and bilingual host controls.",
    "category": "creative",
    "tags": ["Featured", "Games & Creative", "Stable", "React", "TypeScript", "Express"],
    "github": "https://github.com/mojomast/scoreboardussy",
    "demo": "",
    "status": "Stable",
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
    "description": "An efficient Go-based delivery orchestrator executing automated project plans initiated from a structured interview pipeline.",
    "category": "core",
    "tags": ["Ussyverse Core", "Stable", "Go", "SQLite", "Cobra"],
    "github": "https://github.com/mojomast/geoffrussy",
    "demo": "",
    "status": "Stable",
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
    "description": "A competitive, heavily instrumented cyber-range sandbox designed for autonomous AI agents to engage in adversarial security challenges.",
    "category": "core",
    "tags": ["AI Tools", "Active", "Go", "Docker", "Cyber Range"],
    "github": "https://github.com/mojomast/battlebussy",
    "demo": "https://battleb.ussy.host/",
    "status": "Active",
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
    "description": "The custom-built decentralized webring system that connects Kyle's weird web projects with neighbors across the independent internet.",
    "category": "infra",
    "tags": ["Infrastructure", "Active", "JavaScript", "API", "Webring"],
    "github": "https://github.com/mojomast/ussyring",
    "demo": "",
    "status": "Active",
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
    "description": "A CLI-first tool for generating beautiful, interactive, and polished GitHub activity infographics with rich telemetry reports.",
    "category": "core",
    "tags": ["Featured", "DevTools", "Stable", "Go", "CLI", "Infographics"],
    "github": "https://github.com/mojomast/ghstatsussy",
    "demo": "",
    "status": "Stable",
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
    "description": "A steganographic code review security tool designed to detect invisible security threats in source code (homoglyphs, zero-width characters).",
    "category": "core",
    "tags": ["Featured", "DevTools", "Active", "Python", "Steganography", "Security"],
    "github": "https://github.com/mojomast/stenographussy",
    "demo": "",
    "status": "Active",
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
    "description": "A lightweight and reliable Firecracker VM control plane optimized for small operator-managed hosting clusters.",
    "category": "infra",
    "tags": ["Infrastructure", "Active", "Go", "Firecracker", "Control Plane"],
    "github": "https://github.com/mojomast/fireslice",
    "demo": "",
    "status": "Active",
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
    "description": "An early historical autonomous CLI coding agent system. Featured a terminal user interface (TUI), swarm mode, and DevPlan workflows, representing a milestone in Kyle's AI planning research.",
    "category": "core",
    "tags": ["Ecosystem", "Historical", "Stable", "Python", "TUI", "DevPlan"],
    "github": "https://github.com/mojomast/ralphussy",
    "demo": "",
    "status": "Stable",
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
    "description": "A self-hosted, universal Retrieval-Augmented Generation (RAG) chatbot with a comprehensive web-based management UI, designed to easily ingest markdown directories for context-gated user Q&A.",
    "category": "ai",
    "tags": ["Featured", "AI Tools", "Active", "Python", "FastAPI", "ChromaDB", "React"],
    "github": "https://github.com/mojomast/ragussy",
    "demo": "",
    "status": "Active",
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
    "description": "Fifth-generation Ussyverse staged software delivery pipeline. Takes a plain-language idea through interview, design, validation, planning, review, and multi-worker development stages, producing built projects with full artifact traces and handoff documents.",
    "category": "core",
    "tags": ["Featured", "Ussyverse Core", "Active", "Python", "TypeScript", "SQLite", "SSE"],
    "github": "https://github.com/mojomast/nexussy",
    "demo": "",
    "status": "Active",
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
    "description": "An AI-powered Discord bot serving as a full Dungeon Master for tabletop RPG campaigns. Features persistent characters, turn-based combat, spellcasting, inventory management, NPC party members, generative AI worldbuilding, and a complete web dashboard with ~80 REST API endpoints.",
    "category": "creative",
    "tags": ["Featured", "Games & Creative", "Active", "Python", "Discord", "SQLite", "AI DM"],
    "github": "https://github.com/mojomast/rpg-dm-bot",
    "demo": "",
    "status": "Active",
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
    "description": "The structural heart of the ecosystem: planning interfaces, multi-agent orchestrators, and developer handoff tools that structure execution.",
    "color": "#00ff66" // Cyber Green
  },
  "infra": {
    "title": "Systems & Infra",
    "description": "Durable platform machinery, VM control planes, webrings, and routing tables underpinning our creative experiments.",
    "color": "#00f0ff" // Cyber Cyan
  },
  "ai": {
    "title": "Autonomous AI",
    "description": "Bilingual WebSocket routers, competitive adversarial arenas, and orchestration runtimes built to let agents perform without boundaries.",
    "color": "#b026ff" // Cyber Purple
  },
  "creative": {
    "title": "Games & Creative",
    "description": "DAWs, custom game architectures, nostalgic emulators, and synthetic audio instruments designed to make weird things serious.",
    "color": "#ff0055" // Cyber Pink
  }
};
