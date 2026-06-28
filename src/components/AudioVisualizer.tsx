import React, { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  isListening: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isListening }) => {
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);

      draw();
    } catch (err) {
      console.error("Error accessing microphone for visualizer:", err);
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
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    
    // Clear canvas
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
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const volume = average / 255; // 0 to 1
      
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;
      
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      
      // Draw a waveform that reacts to volume
      for (let i = 0; i < width; i += 5) {
        // Create a wave that gets taller with more volume
        const x = i;
        // Map x to a sine wave phase
        const phase = (x / width) * Math.PI * 4 + (Date.now() / 200);
        // Calculate height based on volume and a base sine wave
        // Add some random noise based on dataArray for the audio-reactive feel
        const dataIndex = Math.floor((x / width) * bufferLength);
        const intensity = dataArray[dataIndex] / 255;
        
        const y = centerY + Math.sin(phase) * (height / 3) * (volume + 0.2) + (intensity * height / 4 * (Math.random() - 0.5));
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.strokeStyle = "#10B981"; // emerald-500
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.stroke();
    };
    
    renderFrame();
  };

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={60}
      className="absolute top-1/2 -translate-y-1/2 transition-opacity duration-300"
      style={{
        left: "calc(100% + 1rem)",
        opacity: isListening ? 1 : 0
      }}
    />
  );
};
