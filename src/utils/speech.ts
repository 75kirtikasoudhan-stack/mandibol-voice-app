export interface SpeechRecognitionEventLike extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

export interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function speakHindi(text: string, onEnd?: () => void): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }

  try {
    const synth = window.speechSynthesis;
    synth.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "hi-IN";
    utter.rate = 0.98;
    utter.pitch = 1;

    const pickVoiceAndSpeak = () => {
      const voices = synth.getVoices();
      const hiInVoice = voices.find(
        (v) => v.lang.toLowerCase() === "hi-in"
      );
      const anyHindiVoice = voices.find((v) =>
        v.lang.toLowerCase().startsWith("hi")
      );
      const indianEnglishVoice = voices.find(
        (v) => v.lang.toLowerCase() === "en-in"
      );
      if (hiInVoice) {
        utter.voice = hiInVoice;
      } else if (anyHindiVoice) {
        utter.voice = anyHindiVoice;
      } else if (indianEnglishVoice) {
        utter.voice = indianEnglishVoice;
      }
      utter.onend = () => onEnd?.();
      utter.onerror = () => onEnd?.();
      synth.speak(utter);
    };

    if (synth.getVoices().length > 0) {
      pickVoiceAndSpeak();
    } else {
      let spoken = false;
      const handleVoices = () => {
        if (spoken) return;
        spoken = true;
        synth.removeEventListener("voiceschanged", handleVoices);
        pickVoiceAndSpeak();
      };
      synth.addEventListener("voiceschanged", handleVoices);
      // Fallback if voiceschanged doesn't fire quickly
      setTimeout(() => {
        if (!spoken) {
          spoken = true;
          synth.removeEventListener("voiceschanged", handleVoices);
          pickVoiceAndSpeak();
        }
      }, 250);
    }
  } catch {
    onEnd?.();
  }
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
