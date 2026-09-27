<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

# VoiceScript — Hands-Free Examination Platform for Students with Disabilities

VoiceScript is an accessible, timed examination and academic scribe platform engineered for students who cannot write by hand due to motor, visual, or neurological disabilities. It enables completely voice-navigated and voice-dictated test-taking with real-time math formula conversion, spoken diagramming, and tamper-evident SHA-256 submission seals.

---

## Key Features

### 1. Secure Candidate Login & Timed Exams
- **Candidate Authentication**: Secure PIN-based login with paper selection (e.g., Mathematics, Applied Mechanics, Cellular Biology).
- **Disability Accommodations Suite**:
  - Extra time options: 1.25x, 1.5x, 2.0x time extension presets.
  - High-contrast visual mode (WCAG AAA compliance).
  - OpenDyslexic / Dyslexia-friendly typography toggle.
  - Dynamic font sizing (Normal, Large, Extra Large).
  - Configurable TTS voice rate and feedback announcements.
- **Hardware & Audio Readiness Verification**: Pre-exam mic check, speech test, and browser compatibility validation.
- **Accessible Countdown Timer**: Voice queryable ("time remaining"), 15/5/1-minute auditory warnings, and automatic auto-submission on expiry.

### 2. Full Voice Navigation & Control
- **Question Navigation**: "next question", "previous question", "go to question [N]", "first question", "last question".
- **Question Reading (TTS)**: "read question", "read question again", "stop reading", "read options".
- **Review & Flagging**: "flag question", "unflag question", "flag for review", "status summary", "how many answered".
- **Submission**: "submit exam", "go to review", "finish exam".

### 3. Voice Answering & Real-Time Transcript
- **Continuous Voice Recognition**: Web Speech API with fallback, visual mic activity indicator, and live interim speech transcript.
- **Voice Editing Commands**:
  - "scratch that" / "delete that" — removes the most recently spoken phrase.
  - "delete last sentence" — strips the final sentence.
  - "clear answer" / "delete all" — resets current question response.
  - "undo" — restores previous state.
  - "replace [X] with [Y]" — contextual voice find-and-replace.
- **Structured Long-Answer Formatting**:
  - "new paragraph" / "next paragraph".
  - "bullet point" / "add bullet" / "dash point".
  - "heading [text]" / "subheading [text]".
  - "bold that" / "capitalize that".

### 4. Spoken Math & Scientific Equations (KaTeX)
- Natural language math transcription converted directly to valid LaTeX:
  - "fraction of [A] over [B]" $\to \frac{A}{B}$
  - "[X] squared / cubed / to the power of [N]" $\to x^2, x^3, x^N$
  - "square root of [X]" $\to \sqrt{X}$
  - "integral of [f(x)] from [a] to [b]" $\to \int_{a}^{b} f(x) \, dx$
  - "sum of [expression] from [i=1] to [n]" $\to \sum_{i=1}^{n} \dots$
  - Greek letters & symbols: alpha, beta, theta, pi, delta, plus or minus, infinity, arrows.

### 5. Voice-Controlled Diagram Canvas (SVG)
- Spoken commands for geometric figures and coordinate axes:
  - "draw coordinate axes" / "draw graph"
  - "draw rectangle width 120 height 80 at center"
  - "draw circle radius 50"
  - "draw arrow from left to right" / "draw arrow pointing up"
  - "draw triangle"
  - "label diagram [text]"
  - "clear diagram" / "undo shape"

### 6. Autosave & Crash Recovery
- Automated snapshot caching every 3 seconds and after every voice command or answer revision.
- In the event of browser crash, accidental closure, or battery failure, VoiceScript immediately prompts to resume the in-progress session with exact time remaining and answers intact.

### 7. Tamper-Evident SHA-256 Submission & Audit Trail
- Every candidate interaction (logins, navigations, voice edits, formula conversions, diagram draws, question flags, and submissions) is timestamped in an append-only cryptographic audit log.
- Submissions produce a canonical deterministic payload hashed with the Web Cryptography API (`crypto.subtle.digest("SHA-256")`).
- Generates a verifiable digital receipt with QR-ready representation, download options (JSON/Text), and copyable cryptographic digest for university examination boards.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Compile and build
npm run build
```

## Running the Platform
1. Open the application in your browser.
2. Click **"Exam Platform"** in the top header or click **"Launch Exam Platform"** from the setup dashboard.
3. Configure your accommodations (Extra time, High contrast, Dyslexia font, TTS rate) and select your exam paper.
4. Review the audio and hardware check in the briefing screen, then click or say "Start Exam".
5. Answer questions hands-free using natural voice dictation and voice commands!

