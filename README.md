# USSYVERSE Site

Three.js portfolio site with a hidden USSYVERSE dogfight mode and OpenRouter-backed TTS radio chatter.

## Local Setup

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Put the real OpenRouter key in `.env`:

   ```bash
   OPENROUTER_API_KEY=sk-or-v1-...
   ```

3. Start the local backend/static server:

   ```bash
   npm start
   ```

4. Open `http://127.0.0.1:3000`.

## TTS Backend

The browser never receives the OpenRouter API key. `app.js` calls the same-origin `/api/tts` endpoint, and `server.mjs` proxies the request to OpenRouter using `OPENROUTER_API_KEY` from the server environment.

Defaults:

```bash
OPENROUTER_TTS_MODEL=hexgrad/kokoro-82m
OPENROUTER_TTS_VOICE=onyx
OPENROUTER_TTS_FORMAT=pcm16
OPENROUTER_TTS_SAMPLE_RATE=24000
HOST=127.0.0.1
PORT=3000
```

Kokoro is the default backend TTS model. OpenAI-style voice names are mapped server-side to Kokoro voice IDs, and the backend returns the upstream `audio/*` response to the browser for Web Audio playback.

To switch back to GPT Audio, set `OPENROUTER_TTS_MODEL=openai/gpt-audio`. See `docs/TTS.md` for the voice map, endpoint differences, and multi-channel audio behavior.

Security notes:

- `.env` is ignored by git and must not be committed.
- `/api/tts` rejects missing-origin and cross-origin POST requests.
- `HOST=127.0.0.1` keeps the Node server local by default.
- If exposing this publicly, put it behind a reverse proxy and add rate limiting or authentication to prevent same-origin abuse.

## Tests

Run the default contract tests:

```bash
npm test
```

Validate the configured OpenRouter model against the public model catalog:

```bash
npm run test:tts:models
```

Run a live backend TTS smoke test using `.env` or an exported `OPENROUTER_API_KEY`:

```bash
OPENROUTER_LIVE_TTS=1 npm run test:tts:live
```

Syntax checks:

```bash
node --check app.js
node --check server.mjs
```
