# Blind Hunter Code Review Prompt

You are the **Blind Hunter** reviewer. Your job is to review the code changes below for code quality, syntax, logic errors, potential bugs, and architectural compliance. You receive ONLY this diff.

## Code Diff

```diff
diff --git a/vite.config.ts b/vite.config.ts
index fc23e76..d0c6b3e 100644
--- a/vite.config.ts
+++ b/vite.config.ts
@@ -13,10 +13,17 @@ export default defineConfig(() => {
     },
     server: {
       // HMR is disabled in AI Studio via DISABLE_HMR env var.
-      // Do not modify—file watching is disabled to prevent flickering during agent edits.
+      // Do not modify—file watching is disabled to prevent flickering during agent edits.
       hmr: process.env.DISABLE_HMR !== 'true',
       // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
       watch: process.env.DISABLE_HMR === 'true' ? null : {},
+      proxy: {
+        '/api/ollama': {
+          target: 'http://127.0.0.1:11434',
+          changeOrigin: true,
+          rewrite: (path) => path.replace(/^\/api\/ollama/, ''),
+        },
+      },
     },
   };
 });
diff --git a/src/App.tsx b/src/App.tsx
index 2ea468d..81be1d5 100644
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -21,6 +21,7 @@ import {
 import Expertise from "./components/Expertise";
 import Portfolio from "./components/Portfolio";
 import InteractiveLab from "./components/InteractiveLab";
+import AISpeakingLab from "./components/AISpeakingLab.tsx";
 import Philosophy from "./components/Philosophy";
 import Pricing from "./components/Pricing";
 import Contact from "./components/Contact";
@@ -89,6 +90,7 @@ export default function App() {
           <a href="#expertise" className="hover:text-white transition-colors">CAPABILITIES</a>
           <a href="#portfolio" className="hover:text-white transition-colors">PORTFOLIO</a>
           <a href="#interactive-lab" className="hover:text-white transition-colors">GROWTH LAB</a>
+          <a href="#ai-speaking-lab" className="hover:text-white transition-colors font-semibold text-white">AI COACH</a>
           <a href="#philosophy" className="hover:text-white transition-colors">PHILOSOPHY</a>
           <a href="#pricing" className="hover:text-white transition-colors">SPONSORSHIP</a>
           <a href="#contact-faq" className="hover:text-white transition-colors">FAQ</a>
@@ -367,6 +369,11 @@ export default function App() {
       {/* ======================================= */}
       <InteractiveLab onTriggerNotification={triggerNotification} />
 
+      {/* ======================================= */}
+      {/* SECTION 4.5: AI SPEAKING LAB            */}
+      {/* ======================================= */}
+      <AISpeakingLab />
+
       {/* ======================================= */}
       {/* SECTION 5: STUDIO METAPHYSICAL STORY   */}
       {/* ======================================= */}
@@ -410,9 +417,10 @@ export default function App() {
 
               <nav className="flex flex-col gap-6 text-3xl font-medium tracking-tight">
                 {[
-                  { name: "Design Canvas", hash: "#expertise", note: "Procedural studio workspace" },
+                  { name: "Design Canvas", hash: "#expertise", note: "procedural studio workspace" },
                   { name: "Neural Registry", hash: "#portfolio", note: "specimen storage" },
                   { name: "Growth Sandbox", hash: "#interactive-lab", note: "interactive simulator" },
+                  { name: "AI Speaking Lab", hash: "#ai-speaking-lab", note: "Llama3 conversational coach" },
                   { name: "Sponsorships", hash: "#pricing", note: "Ecosystem project calculations" }
                 ].map((item, index) => (
                   <a
```

Note: A new file `src/components/AISpeakingLab.tsx` was added containing the React component for the English Coach.

Please evaluate this diff and report back any potential bugs, logic gaps, or code improvements.
