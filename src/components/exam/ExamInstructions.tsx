import React, { useState, useEffect, useRef } from "react";
import { ExamCandidate, ExamPaper } from "../../types";
import {
  Mic,
  Volume2,
  Play,
  ArrowLeft,
  CheckCircle2,
  Shield,
  Clock,
  HelpCircle,
  Sparkles,
  Award,
} from "lucide-react";

interface ExamInstructionsProps {
  candidate: ExamCandidate;
  paper: ExamPaper;
  onBeginExam: () => void;
  onBackToLogin: () => void;
}

export function ExamInstructions({
  candidate,
  paper,
  onBeginExam,
  onBackToLogin,
}: ExamInstructionsProps) {
  const [micTested, setMicTested] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [ttsTested, setTtsTested] = useState(false);
  const [activeTab, setActiveTab] = useState<"cheatsheet" | "rules" | "security">("cheatsheet");
  const [spokenVoiceNotice, setSpokenVoiceNotice] = useState<string | null>(null);
  const highContrast = candidate.accommodations.highContrast;

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Compute total duration with accommodation extra time
  const multiplier =
    candidate.accommodations.extraTime === "2x"
      ? 2.0
      : candidate.accommodations.extraTime === "1.5x"
      ? 1.5
      : candidate.accommodations.extraTime === "1.25x"
      ? 1.25
      : 1.0;
  const effectiveMinutes = Math.round(paper.totalMinutes * multiplier);

  // Microphone test listener
  const startMicTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const checkVolume = () => {
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i];
        const avg = sum / buffer.length;
        setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
        if (avg > 15) {
          setMicTested(true);
        }
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (err) {
      console.warn("Mic test error:", err);
    }
  };

  const stopMicTest = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }
  };

  useEffect(() => {
    startMicTest();
    return () => stopMicTest();
  }, []);

  const testTtsSpeech = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `Audio test confirmed for candidate ${candidate.candidateName}. VoiceScript is ready for your ${paper.title} examination.`
    );
    utterance.rate = candidate.accommodations.speechRate || 1.0;
    utterance.onend = () => setTtsTested(true);
    window.speechSynthesis.speak(utterance);
    setTtsTested(true);
  };

  // Optional voice recognition for "begin exam" or "start exam"
  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const recognizer = new SpeechRec();
      recognizer.continuous = true;
      recognizer.interimResults = false;
      recognizer.lang = "en-US";

      recognizer.onresult = (event: any) => {
        const last = event.results[event.results.length - 1];
        const phrase = last[0].transcript.toLowerCase().trim();
        if (/^(begin exam|start exam|commence exam)$/i.test(phrase)) {
          setSpokenVoiceNotice("Spoken command recognized: 'Begin Exam'");
          setTimeout(() => {
            onBeginExam();
          }, 600);
        }
      };

      recognizer.start();
      return () => {
        try {
          recognizer.stop();
        } catch {}
      };
    } catch {}
  }, [onBeginExam]);

  return (
    <div className={`min-h-screen ${highContrast ? "bg-black text-yellow-300 font-medium" : "bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100"} py-10 px-4 sm:px-6 lg:px-8 transition-colors`}>
      <div className="max-w-4xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={onBackToLogin}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border ${
              highContrast
                ? "border-yellow-400 bg-black text-yellow-300 hover:bg-yellow-950/40"
                : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
            } font-semibold text-xs transition-colors cursor-pointer shadow-2xs`}
            title="Navigate to Previous Page (Candidate Login)"
            aria-label="Previous Page"
          >
            <ArrowLeft className={`w-4 h-4 ${highContrast ? "text-yellow-400" : "text-stone-600 dark:text-stone-300"}`} />
            <span>Previous Page (Candidate Login)</span>
          </button>

          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full ${
              highContrast ? "bg-yellow-950 border border-yellow-400 text-yellow-300" : "bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
            }`}>
              Candidate: {candidate.candidateName} ({candidate.candidateId})
            </span>
          </div>
        </div>

        {/* Header summary */}
        <div className={`${highContrast ? "bg-black border-2 border-yellow-400 text-yellow-300" : "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100"} rounded-2xl p-6 shadow-sm mb-6`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className={`text-xs font-mono font-bold ${highContrast ? "text-yellow-400" : "text-blue-600 dark:text-blue-400"} tracking-wider uppercase`}>
                Official Examination Brief
              </span>
              <h1 className={`text-2xl sm:text-3xl font-black ${highContrast ? "text-yellow-300" : "text-stone-900 dark:text-stone-100"} mt-1`}>
                {paper.title}
              </h1>
              <p className={`text-sm ${highContrast ? "text-yellow-200" : "text-stone-500 dark:text-stone-400"} mt-1`}>
                Code: <span className="font-mono font-bold">{paper.code}</span> • Subject:{" "}
                <span className="font-semibold">{paper.subject}</span> • Questions:{" "}
                <span className="font-semibold">{paper.questions.length}</span> • Total Marks:{" "}
                <span className="font-semibold">{paper.totalMarks}</span>
              </p>
            </div>

            <div className={`flex sm:flex-col items-end justify-between sm:justify-center p-3 rounded-xl ${
              highContrast ? "bg-yellow-950/60 border border-yellow-400" : "bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900"
            }`}>
              <span className={`text-xs font-bold ${highContrast ? "text-yellow-300" : "text-blue-800 dark:text-blue-300"} flex items-center gap-1.5 uppercase tracking-wider`}>
                <Clock className="w-4 h-4" />
                Effective Time
              </span>
              <span className={`text-2xl font-black ${highContrast ? "text-yellow-300" : "text-blue-700 dark:text-blue-300"} font-mono`}>
                {effectiveMinutes} mins
              </span>
              {candidate.accommodations.extraTime !== "none" && (
                <span className={`text-xs ${highContrast ? "text-yellow-400" : "text-blue-600 dark:text-blue-400"} font-medium`}>
                  Includes {candidate.accommodations.extraTime} accommodation
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Audio / Hardware Readiness Check */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200 dark:border-stone-800 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-blue-600" />
            Hardware & Audio Readiness Verification
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Microphone test */}
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <Mic className="w-4 h-4 text-blue-600" />
                    Microphone Input Check
                  </span>
                  {micTested ? (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Detected
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded font-medium">
                      Speak into mic
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mb-3">
                  Say a few words to test voice input levels.
                </p>
              </div>

              <div>
                <div className="h-2 w-full bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-75"
                    style={{ width: `${micVolume}%` }}
                  />
                </div>
                <span className="text-[11px] text-stone-400 mt-1 block text-right font-mono">
                  Input Level: {micVolume}%
                </span>
              </div>
            </div>

            {/* TTS Audio Output check */}
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-blue-600" />
                    Text-To-Speech Reader Test
                  </span>
                  {ttsTested && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mb-3">
                  Click to play sample speech verifying speaker / headphone clarity.
                </p>
              </div>

              <button
                type="button"
                onClick={testTtsSpeech}
                className="w-full py-2 px-3 rounded-lg bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 hover:border-blue-500 text-stone-800 dark:text-stone-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                <Play className="w-3.5 h-3.5 text-blue-600" />
                Play Audio Check Sample
              </button>
            </div>
          </div>
        </div>

        {/* Tabs: Cheatsheet, Rules, Security */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden mb-8">
          <div className="flex border-b border-stone-200 dark:border-stone-800">
            <button
              onClick={() => setActiveTab("cheatsheet")}
              className={`flex-1 py-3 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === "cheatsheet"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20"
                  : "border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900"
              }`}
            >
              Voice Commands Cheatsheet
            </button>
            <button
              onClick={() => setActiveTab("rules")}
              className={`flex-1 py-3 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === "rules"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20"
                  : "border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900"
              }`}
            >
              Exam Rules & Answering
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`flex-1 py-3 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === "security"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20"
                  : "border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900"
              }`}
            >
              Tamper-Evident Security & Audit
            </button>
          </div>

          <div className="p-6">
            {activeTab === "cheatsheet" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-2">
                      Navigation & Audio
                    </span>
                    <ul className="text-xs space-y-1.5 text-stone-700 dark:text-stone-300">
                      <li><strong className="font-mono text-stone-900 dark:text-stone-100">"Next question"</strong> — Advance to next item</li>
                      <li><strong className="font-mono text-stone-900 dark:text-stone-100">"Previous question"</strong> — Go back one item</li>
                      <li><strong className="font-mono text-stone-900 dark:text-stone-100">"Question 3"</strong> / <strong className="font-mono text-stone-900 dark:text-stone-100">"Go to question 4"</strong> — Jump directly</li>
                      <li><strong className="font-mono text-stone-900 dark:text-stone-100">"Read question"</strong> — Speaks prompt aloud via TTS</li>
                      <li><strong className="font-mono text-stone-900 dark:text-stone-100">"Time remaining"</strong> — Reads remaining clock hands-free</li>
                      <li><strong className="font-mono text-stone-900 dark:text-stone-100">"Flag question"</strong> — Marks question for later review</li>
                      <li><strong className="font-mono text-stone-900 dark:text-stone-100">"Select option A / B / C / D"</strong> — Answers MCQ</li>
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-2">
                      Voice Editing & Corrections
                    </span>
                    <ul className="text-xs space-y-1.5 text-stone-700 dark:text-stone-300">
                      <li><strong className="font-mono text-stone-900 dark:text-stone-100">"Delete last sentence"</strong> — Removes preceding sentence</li>
                      <li><strong className="font-mono text-stone-900 dark:text-stone-100">"Scratch that"</strong> / <strong className="font-mono text-stone-900 dark:text-stone-100">"Undo"</strong> — Removes last spoken word</li>
                      <li><strong className="font-mono text-stone-900 dark:text-stone-100">"Replace [X] with [Y]"</strong> — Edits words directly</li>
                      <li><strong className="font-mono text-stone-900 dark:text-stone-100">"Clear answer"</strong> — Erases answer buffer</li>
                      <li><strong className="font-mono text-stone-900 dark:text-stone-100">"New paragraph"</strong> / <strong className="font-mono text-stone-900 dark:text-stone-100">"New line"</strong> — Line formatting</li>
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800">
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-2">
                      Long-Answer Essay Structuring
                    </span>
                    <ul className="text-xs space-y-1.5 text-stone-700 dark:text-stone-300">
                      <li><strong className="font-mono text-stone-900 dark:text-stone-100">"Insert introduction"</strong> — Generates section header</li>
                      <li><strong className="font-mono text-stone-900 dark:text-stone-100">"Add bullet point [text]"</strong> — Adds formatted bullet</li>
                      <li><strong className="font-mono text-stone-900 dark:text-stone-100">"Numbered point [text]"</strong> — Adds sequential numbered item</li>
                      <li><strong className="font-mono text-stone-900 dark:text-stone-100">"Insert heading [title]"</strong> — Inserts sub-heading</li>
                      <li><strong className="font-mono text-stone-900 dark:text-stone-100">"In conclusion..."</strong> — Formats conclusion block</li>
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-2">
                      Math & Diagram Voice Support
                    </span>
                    <ul className="text-xs space-y-1.5 text-stone-700 dark:text-stone-300">
                      <li><strong className="font-mono text-stone-900 dark:text-stone-100">"Math mode [formula]"</strong> — Formats into LaTeX $...$</li>
                      <li><strong className="font-mono text-stone-900 dark:text-stone-100">"Draw circle radius 50 at center"</strong> — Adds SVG circle</li>
                      <li><strong className="font-mono text-stone-900 dark:text-stone-100">"Draw rectangle width 120 height 80"</strong> — Adds box</li>
                      <li><strong className="font-mono text-stone-900 dark:text-stone-100">"Draw arrow from left to right"</strong> — Adds vector arrow</li>
                      <li><strong className="font-mono text-stone-900 dark:text-stone-100">"Label diagram [text]"</strong> — Annotates graphic</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "rules" && (
              <div className="space-y-3 text-sm text-stone-700 dark:text-stone-300">
                <p className="font-medium text-stone-900 dark:text-stone-100">
                  Please read the instructions carefully before initiating your timed session:
                </p>
                <ol className="list-decimal pl-5 space-y-2">
                  {paper.instructions.map((inst, i) => (
                    <li key={`inst-${i}`}>{inst}</li>
                  ))}
                  <li>Answers are continually autosaved locally every 10 seconds. In the event of a page reload or device issue, your session will automatically restore.</li>
                  <li>You can review and modify any answer at any point prior to final submission.</li>
                </ol>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-4 text-sm text-stone-700 dark:text-stone-300">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
                  <Shield className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                      Tamper-Evident SHA-256 Digital Seal
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                      Upon final submission, a cryptographic SHA-256 hash digest is generated over your responses, timestamps, and audit log. Any post-submission modification invalidates the digital seal, guaranteeing absolute academic integrity for exam boards and universities.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800">
                  <Award className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                      Immutable Chronological Audit Log
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                      Every voice navigation, dictation event, editing command, and time query is logged with millisecond precision to protect candidates with accommodation documentation.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {spokenVoiceNotice && (
          <div className="mb-4 p-3 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-sm font-bold text-center animate-pulse">
            {spokenVoiceNotice}
          </div>
        )}

        {/* Start Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-stone-500 dark:text-stone-400">
            Tip: You can say <strong className="font-mono text-stone-800 dark:text-stone-200">"Begin exam"</strong> into your microphone or press the button.
          </span>

          <button
            onClick={onBeginExam}
            className="w-full sm:w-auto px-10 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-lg shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-3 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            Begin Examination Now
          </button>
        </div>
      </div>
    </div>
  );
}
