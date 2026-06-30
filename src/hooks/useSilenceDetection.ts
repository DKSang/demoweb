import { useState, useEffect, useRef } from "react";

export interface UseSilenceDetectionProps {
  lang?: string;
  onTextUpdate?: (text: string) => void;
  onSpeechEnd?: (finalText: string) => void;
  enableNoiseCancellation?: boolean;
  enableEnhancedProcessing?: boolean;
}

export function useSilenceDetection({ 
  lang = "en-GB", 
  onTextUpdate, 
  onSpeechEnd,
  enableNoiseCancellation = true,
  enableEnhancedProcessing = true
}: UseSilenceDetectionProps = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [recognitionText, setRecognitionText] = useState("");
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [audioQuality, setAudioQuality] = useState<"poor" | "good" | "excellent">("good");
  const [backgroundNoise, setBackgroundNoise] = useState(0);

  // Keep latest callbacks in ref to avoid stale closures
  const propsRef = useRef({ lang, onTextUpdate, onSpeechEnd, enableNoiseCancellation, enableEnhancedProcessing });
  useEffect(() => {
    propsRef.current = { lang, onTextUpdate, onSpeechEnd, enableNoiseCancellation, enableEnhancedProcessing };
  });

  const recognitionRef = useRef<any>(null);
  const latestTextRef = useRef("");
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const noiseProfileRef = useRef<Uint8Array | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);

  // Check speech recognition support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
    }
  }, []);

  // Capture noise profile for cancellation (when not speaking)
  const captureNoiseProfile = async () => {
    if (!audioStreamRef.current || !analyserRef.current) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Capture 5 samples of ambient noise
    const samples: Uint8Array[] = [];
    for (let i = 0; i < 5; i++) {
      analyser.getByteFrequencyData(dataArray);
      samples.push(new Uint8Array(dataArray));
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Average the samples to create noise profile
    const avgProfile = new Uint8Array(bufferLength);
    for (let i = 0; i < bufferLength; i++) {
      let sum = 0;
      for (const sample of samples) {
        sum += sample[i];
      }
      avgProfile[i] = Math.round(sum / samples.length);
    }
    
    noiseProfileRef.current = avgProfile;
    setBackgroundNoise(Math.round(avgProfile.reduce((a, b) => a + b, 0) / bufferLength));
  };

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
    latestTextRef.current = "";
    setIsRecording(true);

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    try {
      // 1. Web Audio API setup for volume meter, noise cancellation and auto-silence
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: enableNoiseCancellation,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      audioStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512; // Higher FFT size for better frequency resolution
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Capture initial noise profile in first 500ms
      setTimeout(() => captureNoiseProfile(), 500);

      let hasSpoken = false;
      let silenceStart = Date.now();
      let peakVolume = 0;
      
      // Adaptive thresholds based on environment
      const getAdaptiveThreshold = () => {
        const baseThreshold = 15;
        const noiseFloor = backgroundNoise || 0;
        return Math.max(baseThreshold, noiseFloor + 10);
      };
      
      const SILENCE_THRESHOLD_DYNAMIC = getAdaptiveThreshold();
      const MAX_SILENCE_DURATION = 2000; // Slightly longer for better phrase capture
      const INITIAL_SILENCE_DURATION = 5000;

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyser.getByteFrequencyData(dataArray);

        // Calculate RMS-like volume with noise subtraction
        let sum = 0;
        let maxVal = 0;
        for (let i = 0; i < bufferLength; i++) {
          const noiseFloor = noiseProfileRef.current ? noiseProfileRef.current[i] : 0;
          const adjustedVal = Math.max(0, dataArray[i] - noiseFloor * 0.7); // Subtract 70% of noise profile
          sum += adjustedVal;
          if (adjustedVal > maxVal) maxVal = adjustedVal;
        }
        const averageVolume = sum / bufferLength;
        peakVolume = Math.max(peakVolume, averageVolume);
        
        // Determine audio quality
        if (peakVolume > 60) setAudioQuality("excellent");
        else if (peakVolume > 30) setAudioQuality("good");
        else setAudioQuality("poor");
        
        setVolumeLevel(Math.round(averageVolume));

        const now = Date.now();
        const currentThreshold = getAdaptiveThreshold();
        
        if (averageVolume > currentThreshold) {
          hasSpoken = true;
          silenceStart = now;
          if (typeof window !== "undefined" && window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
          }
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

      // 2. Enhanced Speech recognition initialization
      const rec = new SpeechRecognition();
      recognitionRef.current = rec;
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = propsRef.current.lang;
      rec.maxAlternatives = 3; // Get multiple alternatives for better matching

      let accumulatedText = "";
      let bestAlternativeText = "";

      rec.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";
        let allAlternatives: string[] = [];

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          // Collect all alternatives for this result
          const alternatives: string[] = [];
          for (let j = 0; j < result.length; j++) {
            alternatives.push(result[j].transcript);
          }
          allAlternatives.push(...alternatives);

          if (result.isFinal) {
            // Use the highest confidence alternative (usually index 0)
            finalTranscript += result[0].transcript + " ";
            bestAlternativeText = result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        if (finalTranscript) {
          accumulatedText += finalTranscript;
          const cleanText = accumulatedText.trim();
          latestTextRef.current = cleanText;
          setRecognitionText(cleanText);
          if (propsRef.current.onTextUpdate) {
            propsRef.current.onTextUpdate(cleanText);
          }
        } else if (interimTranscript && enableEnhancedProcessing) {
          // Show interim results with visual indicator
          const currentText = (accumulatedText + interimTranscript).trim();
          latestTextRef.current = currentText;
          setRecognitionText(currentText + "…");
          if (propsRef.current.onTextUpdate) {
            propsRef.current.onTextUpdate(currentText);
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
        const finalTextVal = latestTextRef.current || accumulatedText.trim();
        if (propsRef.current.onSpeechEnd) {
          propsRef.current.onSpeechEnd(finalTextVal);
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
    setRecognitionText,
    audioQuality,
    backgroundNoise
  };
}
