import { useState, useEffect, useRef } from "react";

export interface UseSilenceDetectionProps {
  lang?: string;
  onTextUpdate?: (text: string) => void;
  onSpeechEnd?: (finalText: string) => void;
}

export function useSilenceDetection({ lang = "en-GB", onTextUpdate, onSpeechEnd }: UseSilenceDetectionProps = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [recognitionText, setRecognitionText] = useState("");
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);

  // Keep latest callbacks in ref to avoid stale closures
  const propsRef = useRef({ lang, onTextUpdate, onSpeechEnd });
  useEffect(() => {
    propsRef.current = { lang, onTextUpdate, onSpeechEnd };
  });

  const recognitionRef = useRef<any>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Check speech recognition support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
    }
  }, []);

  const stopSilenceDetection = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setVolumeLevel(0);
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const startRecording = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      return;
    }

    setRecognitionText("");
    setIsRecording(true);

    try {
      // 1. Web Audio API setup for volume meter and auto-silence
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let hasSpoken = false;
      let silenceStart = Date.now();
      const SILENCE_THRESHOLD = 15;
      const MAX_SILENCE_DURATION = 1500;
      const INITIAL_SILENCE_DURATION = 4000;

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const averageVolume = sum / bufferLength;
        setVolumeLevel(averageVolume);

        const now = Date.now();
        if (averageVolume > SILENCE_THRESHOLD) {
          hasSpoken = true;
          silenceStart = now;
        } else {
          const silenceElapsed = now - silenceStart;
          if (hasSpoken && silenceElapsed > MAX_SILENCE_DURATION) {
            stopRecording();
            return;
          }
          if (!hasSpoken && silenceElapsed > INITIAL_SILENCE_DURATION) {
            stopRecording();
            return;
          }
        }
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      animationFrameRef.current = requestAnimationFrame(checkVolume);

      // 2. Speech recognition initialization
      const rec = new SpeechRecognition();
      recognitionRef.current = rec;
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = propsRef.current.lang;

      let accumulatedText = "";

      rec.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          accumulatedText += finalTranscript;
          setRecognitionText(accumulatedText);
          if (propsRef.current.onTextUpdate) {
            propsRef.current.onTextUpdate(accumulatedText);
          }
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        setIsRecording(false);
        stopSilenceDetection();
      };

      rec.onend = () => {
        setIsRecording(false);
        stopSilenceDetection();
        if (propsRef.current.onSpeechEnd) {
          propsRef.current.onSpeechEnd(accumulatedText.trim());
        }
      };

      rec.start();
    } catch (err) {
      console.error("Failed to start recording:", err);
      setIsRecording(false);
      stopSilenceDetection();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSilenceDetection();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return {
    isRecording,
    volumeLevel,
    recognitionText,
    isSpeechSupported,
    startRecording,
    stopRecording,
    setRecognitionText
  };
}
