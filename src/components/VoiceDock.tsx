import { useState } from "react";
import { Loader2, Mic, MicOff, Send, Volume2 } from "lucide-react";
import { JUDGE_DEMO_COMMANDS } from "../data/initialData";

interface VoiceDockProps {
  isListening: boolean;
  isProcessing: boolean;
  liveTranscript: string;
  speechSupported: boolean;
  onToggleListening: () => void;
  onSelectCommand: (commandText: string) => void;
}

export function VoiceDock({
  isListening,
  isProcessing,
  liveTranscript,
  speechSupported,
  onToggleListening,
  onSelectCommand,
}: VoiceDockProps) {
  const [typedText, setTypedText] = useState("");

  const handleTypedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = typedText.trim();
    if (!cleaned || isProcessing) return;
    onSelectCommand(cleaned);
    setTypedText("");
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 pb-3 sm:pb-4 pt-3 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent pointer-events-auto">
        {/* Live Transcript Bubble when listening or processing */}
        {(isListening || isProcessing || liveTranscript) && (
          <div className="mb-2 rounded-2xl bg-slate-900 text-white px-4 py-2 shadow-lg flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {isProcessing ? (
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <p className="text-sm font-semibold truncate">
                {liveTranscript ||
                  (isListening
                    ? "Boliye... (e.g., 2 kilo tamatar 60 rupaye bika)"
                    : "Samajh raha hoon...")}
              </p>
            </div>
            {isListening && (
              <span className="text-[11px] font-bold text-emerald-400 whitespace-nowrap shrink-0">
                hi-IN Live
              </span>
            )}
          </div>
        )}

        {/* Always-Visible Compact Text Input Fallback */}
        <form onSubmit={handleTypedSubmit} className="mb-2 flex items-center gap-2">
          <input
            type="text"
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            disabled={isProcessing}
            placeholder="Type Hindi/Hinglish command if mic unavailable..."
            aria-label="Type Hindi or Hinglish command"
            className="flex-1 h-11 rounded-xl bg-white border-2 border-slate-300 px-3.5 text-sm font-semibold text-slate-900 placeholder:text-slate-500 shadow-xs focus:outline-none focus:border-emerald-600 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!typedText.trim() || isProcessing}
            className="h-11 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-sm flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </form>

        {/* Judge Demo Chips */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1 px-0.5">
            <span className="text-[11px] font-bold text-slate-600">
              Try Voice Command · बोलकर या दबाकर जांचें
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {JUDGE_DEMO_COMMANDS.map((cmd) => (
              <button
                key={cmd}
                type="button"
                disabled={isProcessing}
                onClick={() => onSelectCommand(cmd)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 active:scale-[0.98] disabled:opacity-50 border border-slate-300 hover:border-emerald-400 text-xs font-bold text-slate-800 shadow-xs transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                &ldquo;{cmd}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Main Mic Action Row */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onToggleListening}
            className={`w-full max-w-sm min-h-[52px] px-6 py-2.5 rounded-2xl font-extrabold text-base sm:text-lg text-white flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-70 cursor-pointer ${
              isListening
                ? "bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/35 ring-4 ring-rose-300/60"
                : "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/35 ring-4 ring-emerald-400/30"
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Samajh raha hoon...</span>
              </>
            ) : isListening ? (
              <>
                <MicOff className="w-6 h-6" />
                <span>Sun Raha Hoon · Stop</span>
              </>
            ) : (
              <>
                <Mic className="w-6 h-6" />
                <span>
                  {speechSupported ? "Boliye / Speak" : "Mic Unavailable · Type Above"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
