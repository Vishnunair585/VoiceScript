import React, { useEffect, useRef } from "react";
import { getCleanMicAudioStream } from "../lib/speechAccuracy";

interface AudioVisualizerProps {
  isListening: boolean;
  className?: string;
  width?: number;
  height?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isListening,
  className = "",
  width = 120,
  height = 36,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isListening) {
      startVisualizer();
    } else {
      stopVisualizer();
    }

    return () => {
      stopVisualizer();
    };
  }, [isListening]);

  const startVisualizer = async () => {
    try {
      const stream = await getCleanMicAudioStream();
      if (!stream) return;
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioContext = new AudioCtx();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);

      draw();
    } catch (err) {
      console.warn("Could not start audio visualizer:", err);
    }
  };

  const stopVisualizer = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const renderFrame = () => {
      animationRef.current = requestAnimationFrame(renderFrame);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const volume = average / 255;

      const cWidth = canvas.width;
      const cHeight = canvas.height;
      const centerY = cHeight / 2;

      // Create rich gradient using Coral-Salmon (#e07a5f) and Slate Teal (#3d5b59)
      const grad = ctx.createLinearGradient(0, 0, cWidth, 0);
      grad.addColorStop(0, "#e07a5f");
      grad.addColorStop(0.5, "#3d5b59");
      grad.addColorStop(1, "#e07a5f");

      ctx.beginPath();
      ctx.moveTo(0, centerY);

      for (let i = 0; i < cWidth; i += 4) {
        const x = i;
        const phase = (x / cWidth) * Math.PI * 4 + Date.now() / 180;
        const dataIndex = Math.floor((x / cWidth) * bufferLength);
        const intensity = dataArray[dataIndex] / 255;

        const y =
          centerY +
          Math.sin(phase) * (cHeight / 2.6) * (volume + 0.15) +
          (intensity * cHeight) / 3 * (Math.random() - 0.5);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.stroke();
    };

    renderFrame();
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      role="img"
      aria-label={isListening ? "Microphone active audio waveform" : "Microphone offline"}
      className={`transition-opacity duration-300 ${className} ${isListening ? "opacity-100" : "opacity-0"}`}
    />
  );
};
