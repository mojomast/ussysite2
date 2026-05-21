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

Combat channel:

- Entry point: `combatAudio.bark()`.
- Used for short overlapping callouts such as missile, shield, and kill barks.
- Concurrency cap: `maxConcurrent` is `2`; when the cap is reached, the oldest bark is stopped before the new one starts.
- Combat barks play through their own gain node and do not add radio click noise.

Diagram:

```text
ttsEngine.speak()   -> comms channel  -> priority-gated radio chain with clicks
combatAudio.bark()  -> combat channel -> capped overlapping barks, no click noise
```
