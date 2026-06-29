/**
 * Client-side word validator with Trie data structure for fast prefix/word lookup
 * Provides instant feedback before calling server API
 */

class TrieNode {
  children: Map<string, TrieNode>;
  isWord: boolean;
  frequency: number;

  constructor() {
    this.children = new Map();
    this.isWord = false;
    this.frequency = 0;
  }
}

export class WordTrie {
  private root: TrieNode;
  private wordList: Set<string>;

  constructor() {
    this.root = new TrieNode();
    this.wordList = new Set();
  }

  /**
   * Build trie from vocabulary list
   */
  buildFromVocab(vocab: string[]): void {
    vocab.forEach(word => this.insert(word.toLowerCase()));
  }

  /**
   * Insert a word into the trie
   */
  insert(word: string): void {
    const normalizedWord = word.toLowerCase().trim();
    let node = this.root;
    
    for (const char of normalizedWord) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
      node.frequency += 1;
    }
    
    node.isWord = true;
    this.wordList.add(normalizedWord);
  }

  /**
   * Check if a word exists in the trie
   */
  hasWord(word: string): boolean {
    const normalizedWord = word.toLowerCase().trim();
    let node = this.root;
    
    for (const char of normalizedWord) {
      if (!node.children.has(char)) {
        return false;
      }
      node = node.children.get(char)!;
    }
    
    return node.isWord;
  }

  /**
   * Check if any word starts with the given prefix
   */
  hasPrefix(prefix: string): boolean {
    const normalizedPrefix = prefix.toLowerCase().trim();
    let node = this.root;
    
    for (const char of normalizedPrefix) {
      if (!node.children.has(char)) {
        return false;
      }
      node = node.children.get(char)!;
    }
    
    return true;
  }

  /**
   * Get word suggestions based on prefix
   */
  getSuggestions(prefix: string, limit: number = 5): string[] {
    const normalizedPrefix = prefix.toLowerCase().trim();
    const suggestions: string[] = [];
    
    if (!this.hasPrefix(normalizedPrefix)) {
      return suggestions;
    }
    
    let node = this.root;
    for (const char of normalizedPrefix) {
      node = node.children.get(char)!;
    }
    
    // DFS to find words with this prefix
    this.dfs(node, normalizedPrefix, suggestions, limit);
    return suggestions;
  }

  private dfs(node: TrieNode, prefix: string, results: string[], limit: number): void {
    if (results.length >= limit) return;
    
    if (node.isWord) {
      results.push(prefix);
    }
    
    // Sort children by frequency for better suggestions
    const sortedChildren = Array.from(node.children.entries())
      .sort((a, b) => b[1].frequency - a[1].frequency);
    
    for (const [char, childNode] of sortedChildren) {
      this.dfs(childNode, prefix + char, results, limit);
    }
  }

  /**
   * Get all words in the trie
   */
  getAllWords(): string[] {
    return Array.from(this.wordList);
  }

  /**
   * Get word count
   */
  size(): number {
    return this.wordList.size;
  }
}

/**
 * Simple semantic similarity checker using common associations
 * Fallback when AI is not available
 */
export class SemanticChecker {
  private associations: Map<string, string[]>;

  constructor() {
    this.associations = new Map();
    this.initializeCommonAssociations();
  }

  private initializeCommonAssociations(): void {
    // Common semantic relationships for English learners
    const assocData: Record<string, string[]> = {
      // Time related
      "time": ["clock", "watch", "hour", "minute", "second", "schedule", "calendar", "day", "night"],
      "clock": ["time", "watch", "hour", "alarm", "tick"],
      "watch": ["clock", "time", "wrist", "bracelet"],
      
      // Book related
      "book": ["page", "read", "library", "author", "story", "novel", "textbook", "cover"],
      "page": ["book", "paper", "number", "turn"],
      "library": ["book", "read", "study", "quiet", "shelf"],
      "read": ["book", "page", "story", "learn"],
      
      // Haircut related
      "haircut": ["scissors", "barber", "salon", "clipper", "trim", "style", "hair"],
      "scissors": ["cut", "haircut", "paper", "blade"],
      "barber": ["haircut", "shave", "salon", "chair"],
      
      // Traffic related
      "traffic": ["light", "car", "road", "street", "jam", "signal"],
      "light": ["traffic", "red", "green", "yellow", "stop", "go"],
      "red": ["color", "light", "stop", "apple", "blood"],
      "stop": ["go", "light", "sign", "police"],
      
      // General associations
      "money": ["cash", "bank", "coin", "dollar", "pay", "buy", "price"],
      "friend": ["person", "help", "play", "talk", "trust"],
      "conversation": ["talk", "speak", "chat", "discuss", "dialogue"],
      "language": ["english", "speak", "learn", "word", "grammar"],
      "water": ["drink", "glass", "bottle", "ocean", "river", "rain"],
      "food": ["eat", "hungry", "meal", "cook", "restaurant"],
      "house": ["home", "room", "door", "window", "live"],
      "school": ["learn", "teacher", "student", "class", "study"],
      "work": ["job", "office", "employee", "boss", "task"],
      "family": ["mother", "father", "sister", "brother", "parent", "child"],
      "weather": ["sunny", "rainy", "cloudy", "hot", "cold", "temperature"],
      "health": ["doctor", "hospital", "medicine", "sick", "well"],
      "sport": ["play", "game", "team", "ball", "exercise", "run"],
      "music": ["song", "sing", "dance", "instrument", "guitar", "piano"],
      "travel": ["trip", "vacation", "plane", "train", "hotel", "visit"],
      "shopping": ["buy", "store", "mall", "price", "sale", "cart"]
    };

    Object.entries(assocData).forEach(([word, associations]) => {
      this.associations.set(word.toLowerCase(), associations);
    });
  }

  /**
   * Check if two words have a semantic relationship
   * Returns confidence score 0-1
   */
  checkRelation(word1: string, word2: string): { related: boolean; score: number; reason: string } {
    const w1 = word1.toLowerCase().trim();
    const w2 = word2.toLowerCase().trim();

    // Direct association check
    const assoc1 = this.associations.get(w1) || [];
    const assoc2 = this.associations.get(w2) || [];

    if (assoc1.includes(w2) || assoc2.includes(w1)) {
      return { related: true, score: 0.9, reason: "Direct semantic association" };
    }

    // Check for shared associations (indirect relationship)
    const sharedAssoc = assoc1.filter(a => assoc2.includes(a));
    if (sharedAssoc.length > 0) {
      return { 
        related: true, 
        score: 0.6 + (sharedAssoc.length * 0.1), 
        reason: `Shared association: ${sharedAssoc.slice(0, 2).join(", ")}` 
      };
    }

    // Check if both words belong to same category
    const categories = this.getCategory(w1);
    if (categories.length > 0 && categories.some(cat => this.belongsToCategory(w2, cat))) {
      return { related: true, score: 0.5, reason: `Both relate to: ${categories.join(", ")}` };
    }

    // No clear relationship found
    return { related: false, score: 0.2, reason: "No clear semantic connection found" };
  }

  private getCategory(word: string): string[] {
    const categoryMap: Record<string, string[]> = {
      "time": ["clock", "watch", "hour", "minute", "schedule"],
      "book": ["page", "read", "library", "author", "novel"],
      "haircut": ["scissors", "barber", "salon", "clipper"],
      "traffic": ["light", "car", "road", "signal"],
      "color": ["red", "blue", "green", "yellow", "orange"],
      "family": ["mother", "father", "sister", "brother"],
      "weather": ["sunny", "rainy", "cloudy", "hot", "cold"],
      "food": ["eat", "hungry", "meal", "cook"],
      "sport": ["play", "game", "team", "ball"]
    };

    return Object.entries(categoryMap)
      .filter(([_, words]) => words.includes(word))
      .map(([category, _]) => category);
  }

  private belongsToCategory(word: string, category: string): boolean {
    const categoryMap: Record<string, string[]> = {
      "time": ["clock", "watch", "hour", "minute", "schedule", "calendar"],
      "book": ["page", "read", "library", "author", "novel", "textbook"],
      "haircut": ["scissors", "barber", "salon", "clipper", "trim"],
      "traffic": ["light", "car", "road", "signal", "street"],
      "color": ["red", "blue", "green", "yellow", "orange", "purple"],
      "family": ["mother", "father", "sister", "brother", "parent", "child"],
      "weather": ["sunny", "rainy", "cloudy", "hot", "cold", "wind"],
      "food": ["eat", "hungry", "meal", "cook", "restaurant", "dish"],
      "sport": ["play", "game", "team", "ball", "exercise", "run"]
    };

    return (categoryMap[category] || []).includes(word);
  }

  /**
   * Get hints for a given word
   */
  getHints(word: string, limit: number = 3): string[] {
    const normalizedWord = word.toLowerCase().trim();
    const assoc = this.associations.get(normalizedWord) || [];
    return assoc.slice(0, limit);
  }
}

/**
 * Cache for validated words to reduce API calls
 */
export class ValidationCache {
  private cache: Map<string, { valid: boolean; explanation: string; timestamp: number }>;
  private ttl: number; // Time to live in milliseconds

  constructor(ttlMinutes: number = 60) {
    this.cache = new Map();
    this.ttl = ttlMinutes * 60 * 1000;
  }

  private generateKey(gameType: string, reference: string, word: string): string {
    return `${gameType}:${reference.toLowerCase()}:${word.toLowerCase()}`;
  }

  get(gameType: string, reference: string, word: string): { valid: boolean; explanation: string } | null {
    const key = this.generateKey(gameType, reference, word);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return { valid: cached.valid, explanation: cached.explanation };
    }
    
    // Remove expired entry
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  set(gameType: string, reference: string, word: string, valid: boolean, explanation: string): void {
    const key = this.generateKey(gameType, reference, word);
    this.cache.set(key, {
      valid,
      explanation,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Singleton instances for global use
export const wordTrie = new WordTrie();
export const semanticChecker = new SemanticChecker();
export const validationCache = new ValidationCache(60);

/**
 * Initialize the validator with vocabulary
 */
export function initializeValidator(vocab: string[]): void {
  wordTrie.buildFromVocab(vocab);
  console.log(`[WordValidator] Initialized with ${wordTrie.size()} words`);
}

/**
 * Quick client-side validation before calling server
 * Returns: { shouldCallServer: boolean, immediateResult?: object }
 */
export function quickValidate(
  gameType: 'tree' | 'association',
  reference: string,
  word: string
): { shouldCallServer: boolean; confidence?: number; reason?: string } {
  // Check cache first
  const cached = validationCache.get(gameType, reference, word);
  if (cached) {
    return { 
      shouldCallServer: false, 
      confidence: cached.valid ? 0.95 : 0,
      reason: cached.explanation 
    };
  }

  // Check if word exists in our vocabulary
  const isInVocab = wordTrie.hasWord(word);
  
  // Check semantic relationship
  const semanticResult = semanticChecker.checkRelation(reference, word);
  
  // Decision logic
  if (isInVocab && semanticResult.related) {
    // High confidence - word is in vocab AND semantically related
    return { 
      shouldCallServer: false, 
      confidence: 0.9,
      reason: `✓ Valid word (in vocabulary, ${semanticResult.reason})`
    };
  }
  
  if (semanticResult.score >= 0.7) {
    // Medium-high confidence - strong semantic link
    return { 
      shouldCallServer: false, 
      confidence: 0.75,
      reason: `✓ Likely valid (${semanticResult.reason})`
    };
  }
  
  if (semanticResult.score <= 0.3 && !isInVocab) {
    // Low confidence - probably invalid, but still call server for edge cases
    return { 
      shouldCallServer: true,
      confidence: 0.2,
      reason: `? Unclear connection (server will decide)`
    };
  }
  
  // Default: call server for final validation
  return { 
    shouldCallServer: true,
    confidence: 0.5,
    reason: "Checking with AI validator..."
  };
}
