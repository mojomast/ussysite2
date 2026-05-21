export function numToWord(value) {
  const words = [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen', 'twenty'
  ];
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 20 ? words[number] : String(value);
}

export function preprocessRadioText(text) {
  return String(text)
    .replace(/\bUSSYVERSE\b/gi, 'us ee verse')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/gi, ' ')
    .replace(/\b([0-9]|1[0-9]|20)\s*\/\s*([0-9]|1[0-9]|20)\b/g, (_, left, right) => `${numToWord(left)} of ${numToWord(right)}`)
    .replace(/\s*\/{1,}\s*/g, ', ')
    .replace(/&/g, ' and ')
    .replace(/[`*_~#>]/g, '')
    .replace(/[\[\](){}<>]/g, ' ')
    .replace(/\b([0-9]|1[0-9]|20)\b/g, match => numToWord(match))
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/([,.!?]){2,}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getTtsPriorityRank(priority = 'normal') {
  if (priority === 'high' || priority === 'mission') return 2;
  if (priority === 'low' || priority === 'bark') return 0;
  return 1;
}

export const ttsConfig = {
  endpoint: '/api/tts',
  model: 'openai/gpt-audio',
  voiceId: 'onyx',
  audioFormat: 'pcm16',
  enabled: false,
  key: ''
};

export const radioChain = {
  resume() {},
  addClickIn() {},
  addClickOut() {},
  stopActive() {}
};

export function setTTSBackendEnabled(enabled = true) {
  ttsConfig.enabled = Boolean(enabled);
  return ttsConfig.enabled;
}

export function setTTSKey(key) {
  ttsConfig.key = String(key || '');
  ttsConfig.enabled = Boolean(ttsConfig.key);
  return ttsConfig.enabled;
}

export function buildBackendTTSRequest(text, persona = {}) {
  return {
    url: ttsConfig.endpoint,
    options: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        voiceId: persona.voiceId || ttsConfig.voiceId,
        format: ttsConfig.audioFormat,
        speed: persona.rate ?? 1.0
      })
    }
  };
}

export async function fetchTTSSpeech(text, persona = {}, signal = null) {
  if (!ttsConfig.enabled) return null;
  try {
    const request = buildBackendTTSRequest(text, persona);
    if (signal) request.options.signal = signal;
    const response = await fetch(request.url, request.options);
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    return contentType.startsWith('audio/') ? await response.blob() : null;
  } catch {
    return null;
  }
}

export const ttsEngine = {
  supported: typeof window !== 'undefined' && 'speechSynthesis' in window,
  enabled: true,
  activePriority: -1,

  async speak(text, options = {}) {
    if (!this.enabled || !text) return;
    const radioText = preprocessRadioText(text);
    if (!radioText) return;
    const priority = getTtsPriorityRank(options.priority);
    if (this.activePriority > priority || (priority === 0 && this.activePriority >= 0)) return;
    this.activePriority = priority;
    try {
      if (ttsConfig.enabled) {
        const blob = await fetchTTSSpeech(radioText, options);
        if (blob) return;
      }
      if (!this.supported) return;
      const utterance = new SpeechSynthesisUtterance(radioText);
      utterance.rate = options.rate ?? 1.1;
      utterance.pitch = options.pitch ?? 0.85;
      utterance.volume = options.volume ?? 0.9;
      utterance.onend = () => { this.activePriority = -1; };
      utterance.onerror = () => { this.activePriority = -1; };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch {
      this.activePriority = -1;
    }
  },

  stop() {
    this.activePriority = -1;
    if (this.supported) window.speechSynthesis.cancel();
  },

  setVoice() { return null; },
  initVoices() { return null; }
};

if (typeof window !== 'undefined') {
  window.setTTSKey = setTTSKey;
}
