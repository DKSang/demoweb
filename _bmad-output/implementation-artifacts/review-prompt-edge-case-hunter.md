# Edge Case Hunter Review Prompt

You are an expert software reviewer specializing in edge cases, race conditions, device/browser compatibility, and memory leaks. Your job is to analyze the following git diff within the context of the project.

## Diff Output

```diff
diff --git a/src/components/AISpeakingLab.tsx b/src/components/AISpeakingLab.tsx
index d3f2a89..e398ad3 100644
--- a/src/components/AISpeakingLab.tsx
+++ b/src/components/AISpeakingLab.tsx
@@ -299,6 +299,114 @@ export default function AISpeakingLab() {
   const [isRecording, setIsRecording] = useState(false);
   const [recognitionText, setRecognitionText] = useState("");
   const recognitionRef = useRef<any>(null);
+  const [volumeLevel, setVolumeLevel] = useState(0);
+  const audioStreamRef = useRef<MediaStream | null>(null);
+  const audioContextRef = useRef<AudioContext | null>(null);
+  const analyserRef = useRef<AnalyserNode | null>(null);
+  const checkVolumeIntervalRef = useRef<any>(null);
+
+  const stopSilenceDetection = () => {
+    if (checkVolumeIntervalRef.current) {
+      cancelAnimationFrame(checkVolumeIntervalRef.current);
+      checkVolumeIntervalRef.current = null;
+    }
+    if (audioStreamRef.current) {
+      audioStreamRef.current.getTracks().forEach(track => track.stop());
+      audioStreamRef.current = null;
+    }
+    if (audioContextRef.current) {
+      if (audioContextRef.current.state !== "closed") {
+        audioContextRef.current.close();
+      }
+      audioContextRef.current = null;
+    }
+    analyserRef.current = null;
+    setVolumeLevel(0);
+  };
+
+  const stopRecording = () => {
+    if (!recognitionRef.current) return;
+    
+    recognitionRef.current.stop();
+    setIsRecording(false);
+    stopSilenceDetection();
+
+    if (activeTabRef.current === "coach") {
+      setTimeout(() => {
+        setChatInput(prev => {
+          const finalVal = prev.trim();
+          if (finalVal) {
+            handleSendChat(finalVal);
+          }
+          return "";
+        });
+      }, 400);
+    }
+  };
+
+  const startSilenceDetection = async () => {
+    stopSilenceDetection();
+    try {
+      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
+      audioStreamRef.current = stream;
+
+      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
+      if (!AudioContextClass) return;
+
+      const audioContext = new AudioContextClass();
+      audioContextRef.current = audioContext;
+
+      const source = audioContext.createMediaStreamSource(stream);
+      const analyser = audioContext.createAnalyser();
+      analyser.fftSize = 256;
+      source.connect(analyser);
+      analyserRef.current = analyser;
+
+      const bufferLength = analyser.frequencyBinCount;
+      const dataArray = new Uint8Array(bufferLength);
+
+      let hasSpoken = false;
+      let silenceStart = Date.now();
+      const SILENCE_THRESHOLD = 8; // threshold for voice vs ambient noise
+      const MAX_SILENCE_DURATION = 1500; // 1.5 seconds of silence to stop
+      const INITIAL_SILENCE_DURATION = 4000; // 4 seconds of initial silence
+
+      const checkVolume = () => {
+        if (!analyserRef.current) return;
+        analyser.getByteFrequencyData(dataArray);
+
+        let sum = 0;
+        for (let i = 0; i < bufferLength; i++) {
+          sum += dataArray[i];
+        }
+        const averageVolume = sum / bufferLength;
+
+        // Visual volume level (0 to 100)
+        const scaledVolume = Math.min(100, Math.round((averageVolume / 64) * 100));
+        setVolumeLevel(scaledVolume);
+
+        if (averageVolume > SILENCE_THRESHOLD) {
+          if (!hasSpoken) {
+            hasSpoken = true;
+          }
+          silenceStart = Date.now();
+        } else {
+          const silentFor = Date.now() - silenceStart;
+          const limit = hasSpoken ? MAX_SILENCE_DURATION : INITIAL_SILENCE_DURATION;
+          if (silentFor > limit) {
+            stopRecording();
+            return;
+          }
+        }
+
+        checkVolumeIntervalRef.current = requestAnimationFrame(checkVolume);
+      };
+
+      checkVolumeIntervalRef.current = requestAnimationFrame(checkVolume);
+    } catch (err) {
+      console.warn("Could not start silence detection:", err);
+    }
+  };
```

Please review and identify any edge cases, browser compatibility issues, or unhandled failures.
