# TTS

## API

| Function/Object | Purpose |
| --- | --- |
| `ttsEngine.speak(text, options)` | Speak a radio line with priority, pitch, rate, volume, and voice ID |
| `ttsEngine.stop()` | Cancel active speech |
| `preprocessRadioText(text)` | Strip markup and normalize radio wording |
| `getTtsPriorityRank(priority)` | Rank low, normal, high, and mission messages |
| `setTTSKey(key)` | Enable optional backend AI voice support |

## Radio Chain

The main app keeps a radio-style audio chain for browser speech and backend audio. It adds click-in/click-out effects, highpass/lowpass filtering, compression, and short noise beds when the Web Audio context is available.

## Voice Personas

| Source | Persona |
| --- | --- |
| USSYVERSE CONTROL | Low, steady mission controller |
| DEVUSSY DOCK CONTROL | Dock/station operator |
| COMBAT SYSTEM | Fast combat bark |
| NAVIGATION | Clear nav assistant |
| FACTION COMMS | Contract/faction voice |

## OpenRouter AI Voice

Browser speech is the default. To enable backend AI voice from the console:

```js
window.setTTSKey('your-key')
```

The static client sends TTS requests to the same-origin `/api/tts` endpoint when enabled.

## Kill Callouts

The combat pool includes: SPLASH ONE, BOGEY DOWN, KILL CONFIRMED, TARGET ELIMINATED, FOX TWO AWAY, TALLY HO, GUNS GUNS GUNS, BANDIT DOWN, CLEARED HOT, WINCHESTER ACHIEVED, SPLASH ANOTHER, GOOD KILL, RADAR CONTACT LOST, BINGO BINGO, BREAKING RIGHT, ENGAGED.
