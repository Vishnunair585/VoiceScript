import React, { useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface ExamTimerProps {
  remainingSeconds: number;
  initialTotalSeconds: number;
  accommodationsExtraTime: string;
  onTimeExpired: () => void;
  voiceFeedback: boolean;
}

export function ExamTimer({
  remainingSeconds,
  initialTotalSeconds,
  accommodationsExtraTime,
  onTimeExpired,
  voiceFeedback,
}: ExamTimerProps) {
  // Format seconds into HH:MM:SS
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const timeFormatted =
    hours > 0
      ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      : `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const progressPercent = Math.max(
    0,
    Math.min(100, (remainingSeconds / initialTotalSeconds) * 100)
  );

  // Time warnings via speech synthesis if enabled
  useEffect(() => {
    if (remainingSeconds === 0) {
      onTimeExpired();
    } else if (voiceFeedback) {
      if (remainingSeconds === 15 * 60) {
        speakTimerAlert("Attention candidate: 15 minutes remaining in your examination.");
      } else if (remainingSeconds === 5 * 60) {
        speakTimerAlert("Attention candidate: 5 minutes remaining. Please review your answers.");
      } else if (remainingSeconds === 60) {
        speakTimerAlert("Final minute remaining in your examination.");
      }
    }
  }, [remainingSeconds, onTimeExpired, voiceFeedback]);

  const speakTimerAlert = (text: string) => {
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0;
      window.speechSynthesis.speak(u);
    }
  };

  const handleSpeakTime = () => {
    let msg = "";
    if (hours > 0) {
      msg = `${hours} hour${hours > 1 ? "s" : ""} and ${minutes} minute${minutes > 1 ? "s" : ""} remaining.`;
    } else {
      msg = `${minutes} minute${minutes !== 1 ? "s" : ""} and ${seconds} seconds remaining.`;
    }
    speakTimerAlert(msg);
  };

  // Color urgency
  const isUrgent = remainingSeconds < 5 * 60;
  const isWarning = remainingSeconds < 15 * 60 && !isUrgent;

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label={`Time remaining: ${timeFormatted}`}
      className={`px-3 py-1.5 rounded-xl border flex items-center gap-2.5 transition-colors cursor-pointer ${
        isUrgent
          ? "bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 animate-pulse"
          : isWarning
          ? "bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300"
          : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200"
      }`}
      onClick={handleSpeakTime}
      title="Click or say 'time remaining' to listen"
    >
      <div className="flex items-center gap-1.5 font-mono font-black text-sm sm:text-base">
        {isUrgent ? (
          <AlertTriangle className="w-4 h-4 text-red-600 animate-bounce" />
        ) : (
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        )}
        <span>{timeFormatted}</span>
      </div>

      {accommodationsExtraTime !== "none" && (
        <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
          +{accommodationsExtraTime}
        </span>
      )}

      {/* Progress pill */}
      <div className="w-12 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden hidden md:block">
        <div
          className={`h-full transition-all duration-1000 ${
            isUrgent ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
