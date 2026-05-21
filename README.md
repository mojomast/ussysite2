# USSYVERSE Site

Three.js portfolio site with a hidden USSYVERSE dogfight mode and browser-native TTS radio chatter.

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
OPENROUTER_TTS_MODEL=openai/gpt-audio-mini
OPENROUTER_TTS_VOICE=onyx
OPENROUTER_TTS_FORMAT=pcm16
OPENROUTER_TTS_SAMPLE_RATE=24000
HOST=127.0.0.1
PORT=3000
```

OpenRouter currently requires streamed `pcm16` output for this audio model. The backend assembles the streamed PCM chunks and returns `audio/wav` to the browser so the existing Web Audio radio chain can decode and process it.

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
