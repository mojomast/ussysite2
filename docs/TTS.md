# TTS

## Kokoro

The default OpenRouter TTS model is `hexgrad/kokoro-82m`. The browser still sends OpenAI-style voice names such as `onyx` and `echo`; `server.mjs` maps those names to Kokoro voice IDs before forwarding the request to OpenRouter.

| OpenAI name | Kokoro ID | Character description |
| --- | --- | --- |
| `onyx` | `am_adam` | Primary control voice with a grounded, authoritative male radio tone. |
| `alloy` | `af_heart` | Navigation voice with a clear, steady female delivery. |
| `echo` | `am_michael` | Dock control and dev voice with a direct male operations tone. |
| `fable` | `bf_emma` | Faction/system voice with a lighter British female character. |
| `nova` | `af_nova` | Bright female voice for alternate callouts. |
| `shimmer` | `af_sky` | Airy female voice for alternate callouts. |
| default | `am_adam` | Fallback when no voice is supplied. |

To switch back to GPT Audio, set the model environment variable before starting the server:

```bash
OPENROUTER_TTS_MODEL=openai/gpt-audio
```

The same `/api/tts` browser endpoint is used either way. The server chooses the upstream OpenRouter endpoint from `OPENROUTER_TTS_MODEL`:

| Model family | OpenRouter endpoint | Payload shape |
| --- | --- | --- |
| Kokoro (`hexgrad/kokoro-*`) | `/audio/speech` | `{ model, input, voice }`; voice is the mapped Kokoro ID. |
| GPT Audio (`openai/gpt-audio`) | `/chat/completions` | Chat messages plus `modalities: ['text', 'audio']`, `audio.voice`, `audio.format`, and streaming enabled. |

Kokoro returns speech from the `/audio/speech` API. GPT Audio uses the chat completions API and streams audio chunks; the backend assembles those chunks and returns `audio/wav` to the browser.

## Multi-Channel

The game uses two TTS playback channels so long-form radio messages and short combat barks do not block each other.

Comms channel:

- Entry point: `ttsEngine.speak()`.
- Used for mission, control, navigation, dock, menu, and status transmissions.
- Priority rules: `high` and `mission` rank above normal; `low` and `bark` rank below normal.
- A lower-priority request is dropped while a higher-priority transmission is active.
- A low-priority request is dropped while any comms transmission is active.
- Accepted comms transmissions stop the prior comms audio and include radio click-in/click-out noise.
- Comms volume defaults to `45%` and is adjustable from the in-flight audio settings menu.

Combat channel:

- Entry point: `combatAudio.bark()`.
- Used for short overlapping callouts such as missile, shield, and kill barks.
- Concurrency cap: `maxConcurrent` is `2`; when the cap is reached, the oldest bark is stopped before the new one starts.
- Combat barks play through their own gain node, then through the same radio filter chain as comms. They do not add click-in/click-out noise.
- Combat chatter volume defaults to `38%` and is adjustable separately from comms.

Diagram:

```text
ttsEngine.speak()   -> comms channel  -> priority-gated radio chain with clicks
combatAudio.bark()  -> combat channel -> capped overlapping barks -> radio chain, no click noise
```

## API

| Function/Object | Purpose |
| --- | --- |
| `ttsEngine.speak(text, options)` | Speak a radio line with priority, pitch, rate, volume, and voice ID |
| `ttsEngine.stop()` | Cancel active speech |
| `preprocessRadioText(text)` | Strip markup and normalize radio wording |
| `getTtsPriorityRank(priority)` | Rank low, normal, high, and mission messages |
| `setTTSBackendEnabled(enabled)` | Toggle same-origin backend TTS from the browser console |

## Radio Chain

The main app keeps a radio-style audio chain for browser speech and backend audio. It adds click-in/click-out effects, highpass/lowpass filtering, compression, and short noise beds when the Web Audio context is available.

All in-game voices that play through the main app are routed through this chain. If the Web Audio context is unavailable or suspended, the app drops the voice instead of falling back to clean speech so the player does not hear mixed clean/distorted voices.

## Audio Settings

Open the in-flight audio settings menu with `M`. Use `Shift+M` for the quick TTS mute toggle. Settings are persisted in `localStorage` under `ussy.flight.settings.v1`.

| Setting | Default | Purpose |
| --- | --- | --- |
| Radio volume | `45%` | Main mission, dock, navigation, and menu transmissions |
| Chatter volume | `38%` | Short overlapping combat/navigation barks before they enter the radio filter |
| TTS | Active | Enables or mutes voice playback |

## Voice Personas

| Source | Persona |
| --- | --- |
| USSYVERSE CONTROL | Low, steady mission controller |
| DEVUSSY DOCK CONTROL | Dock/station operator |
| COMBAT SYSTEM | Fast combat bark |
| NAVIGATION | Clear nav assistant |
| FACTION COMMS | Contract/faction voice |

## OpenRouter AI Voice

Backend AI voice is proxied through the same-origin `/api/tts` endpoint. Keep `OPENROUTER_API_KEY` on the server; do not expose it in browser code.

## Kill Callouts

The combat pool includes: SPLASH ONE, BOGEY DOWN, KILL CONFIRMED, TARGET ELIMINATED, FOX TWO AWAY, TALLY HO, GUNS GUNS GUNS, BANDIT DOWN, CLEARED HOT, WINCHESTER ACHIEVED, SPLASH ANOTHER, GOOD KILL, RADAR CONTACT LOST, BINGO BINGO, BREAKING RIGHT, ENGAGED.
