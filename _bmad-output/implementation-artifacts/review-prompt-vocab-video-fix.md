# Blind Hunter Code Review Prompt

You are the **Blind Hunter** reviewer. Your job is to review the code changes below for code quality, syntax, logic errors, potential bugs, and architectural compliance. You receive ONLY this diff.

## Code Diff

```diff
diff --git a/src/components/AISpeakingLab.tsx b/src/components/AISpeakingLab.tsx
index 5f24e64..650d04a 100644
--- a/src/components/AISpeakingLab.tsx
+++ b/src/components/AISpeakingLab.tsx
@@ -969,8 +969,7 @@ export default function AISpeakingLab() {
           {/* ======================================= */}
           {/* TAB 1: YOUTUBE SHADOWING HUB            */}
           {/* ======================================= */}
-          {activeTab === "shadow" && (
-            <>
+          <div className={`lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start ${activeTab === "shadow" ? "" : "hidden"}`}>
               {/* Left Column: Player & Subtitles */}
               <div className="lg:col-span-8 flex flex-col gap-6">
                 <div className="rounded-[2rem] liquid-glass p-6 flex flex-col gap-5">
@@ -1184,8 +1183,7 @@ export default function AISpeakingLab() {
                 </div>
 
               </div>
-            </>
-          )}
+          </div>
 
           {/* ======================================= */}
           {/* TAB 2: INTERACTIVE SPEAKING COACH       */}
@@ -1564,6 +1562,68 @@ export default function AISpeakingLab() {
                       </div>
                     </div>
                   )
+                ) : vocabSubTab === "add" ? (
+                  <form onSubmit={handleAddCustomWord} className="flex flex-col gap-5 bg-black/45 p-6 rounded-2xl border border-white/5">
+                    <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
+                      <Plus className="w-4 h-4 text-white/60" />
+                      <h4 className="text-xs font-semibold text-white tracking-wide uppercase">Add Custom Vocabulary</h4>
+                    </div>
+
+                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
+                      <div className="flex flex-col gap-1.5">
+                        <label className="text-[10px] font-mono uppercase tracking-wider text-white/50">Vocabulary Word <span className="text-red-400">*</span></label>
+                        <input
+                          type="text"
+                          placeholder="e.g. Serendipity"
+                          required
+                          value={newWordForm.word}
+                          onChange={(e) => setNewWordForm(prev => ({ ...prev, word: e.target.value }))}
+                          className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all focus:border-white/20"
+                        />
+                      </div>
+
+                      <div className="flex flex-col gap-1.5">
+                        <label className="text-[10px] font-mono uppercase tracking-wider text-white/50">Pronunciation (IPA - Optional)</label>
+                        <input
+                          type="text"
+                          placeholder="e.g. /ˌserənˈdipədē/"
+                          value={newWordForm.ipa}
+                          onChange={(e) => setNewWordForm(prev => ({ ...prev, ipa: e.target.value }))}
+                          className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all focus:border-white/20"
+                        />
+                      </div>
+                    </div>
+
+                    <div className="flex flex-col gap-1.5">
+                      <label className="text-[10px] font-mono uppercase tracking-wider text-white/50">Definition (Optional)</label>
+                      <textarea
+                        placeholder="e.g. The occurrence and development of events by chance in a happy or beneficial way."
+                        value={newWordForm.definition}
+                        onChange={(e) => setNewWordForm(prev => ({ ...prev, definition: e.target.value }))}
+                        rows={3}
+                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all focus:border-white/20 resize-none font-sans"
+                      />
+                    </div>
+
+                    <div className="flex flex-col gap-1.5">
+                      <label className="text-[10px] font-mono uppercase tracking-wider text-white/50">Example Sentence (Optional)</label>
+                      <textarea
+                        placeholder="e.g. We found the charming little restaurant by pure serendipity."
+                        value={newWordForm.example}
+                        onChange={(e) => setNewWordForm(prev => ({ ...prev, example: e.target.value }))}
+                        rows={2}
+                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all focus:border-white/20 resize-none font-serif italic"
+                      />
+                    </div>
+
+                    <button
+                      type="submit"
+                      className="py-3 rounded-full bg-white text-black hover:bg-white/95 text-xs font-semibold hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 w-full"
+                    >
+                      <Plus className="w-3.5 h-3.5 text-black" />
+                      <span>Save to Vocabulary Store</span>
+                    </button>
+                  </form>
                 ) : (
                   // Review flashcard game mode
                   savedVocab.length === 0 ? (
```

Please evaluate this diff and report back any potential bugs, logic gaps, or code improvements.
