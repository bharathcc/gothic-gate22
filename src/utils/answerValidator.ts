import { RIDDLE_CONFIG } from '../config/riddleConfig';

/**
 * Normalizes text for voice/speech matching:
 * - Lowercases
 * - Replaces punctuation & special characters
 * - Normalizes spelling variations ("beauty full", "beautyful" -> "beautiful", "vasanth", "vasanta" -> "vasantha")
 * - Collapses consecutive duplicate characters and extra whitespace
 */
export function normalizeTranscript(input: string): string {
  if (!input) return '';

  let text = input.toLowerCase().trim();

  // Normalize curly quotes, apostrophes, and common symbols
  text = text.replace(/[\u2018\u2019`"']/g, ' ');

  // Remove punctuation & special symbols (keep alphanumeric and spaces)
  text = text.replace(/[^a-z0-9\s]/g, ' ');

  // Normalize spelling variations for "beautiful"
  text = text.replace(/\bbeauty\s+full\b/g, 'beautiful');
  text = text.replace(/\bbeautyful\b/g, 'beautiful');
  text = text.replace(/\bbeautifull\b/g, 'beautiful');
  text = text.replace(/\bbeutiful\b/g, 'beautiful');
  text = text.replace(/\bbeatiful\b/g, 'beautiful');
  text = text.replace(/\bbutiful\b/g, 'beautiful');
  text = text.replace(/\bbyutiful\b/g, 'beautiful');

  // Normalize variations for "vasantha"
  text = text.replace(/\bvasantham\b/g, 'vasantha');
  text = text.replace(/\bvasanthaa\b/g, 'vasantha');
  text = text.replace(/\bvasanth\b/g, 'vasantha');
  text = text.replace(/\bvasanta\b/g, 'vasantha');
  text = text.replace(/\bvasant\b/g, 'vasantha');
  text = text.replace(/\bwasantha\b/g, 'vasantha');
  text = text.replace(/\bwasanta\b/g, 'vasantha');
  text = text.replace(/\bvashantha\b/g, 'vasantha');
  text = text.replace(/\bvashanth\b/g, 'vasantha');

  // Collapse consecutive spaces
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Computes Levenshtein distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity ratio (0 to 1)
 */
function similarityRatio(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1.length || !s2.length) return 0.0;
  const distance = levenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  return 1.0 - distance / maxLen;
}

export interface ValidationResult {
  isValid: boolean;
  normalized: string;
  matchedRule?: string;
  similarity: number;
}

/**
 * Robust fuzzy validator for the singing challenge on Page 1:
 * Checks whether the transcribed or typed answer corresponds to
 * "Vasantha Vasantha Beautiful Vasantha" while rejecting unrelated answers.
 */
export function validateAnswer(rawTranscript: string): ValidationResult {
  const normalized = normalizeTranscript(rawTranscript);

  if (!normalized) {
    return { isValid: false, normalized: '', similarity: 0 };
  }

  const TARGET_CANONICAL = 'vasantha vasantha beautiful vasantha';

  // 1. Direct match with canonical phrase
  if (normalized === TARGET_CANONICAL) {
    return { isValid: true, normalized, matchedRule: 'exact_canonical_match', similarity: 1.0 };
  }

  // 2. Direct match against accepted variations in config
  for (const variation of RIDDLE_CONFIG.acceptedVariations) {
    const normVariation = normalizeTranscript(variation);
    if (normalized === normVariation) {
      return { isValid: true, normalized, matchedRule: 'exact_variation_match', similarity: 1.0 };
    }
  }

  // 3. Token pattern analysis:
  // Must contain multiple "vasantha" (at least 2-3) and "beautiful"
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const vasanthaCount = tokens.filter((t) => t === 'vasantha').length;
  const beautifulCount = tokens.filter((t) => t === 'beautiful').length;

  // Strict constraint: Do NOT accept unrelated answers just because they have "beautiful" or 1 "vasantha"
  if (beautifulCount < 1 || vasanthaCount < 2) {
    return { isValid: false, normalized, similarity: 0 };
  }

  // Check if token sequence matches [vasantha, vasantha, beautiful, vasantha]
  // Allow leading/trailing singing filler words like "oh", "sing", "la", "ah"
  const cleanedTokens = tokens.filter((t) => t === 'vasantha' || t === 'beautiful');
  if (
    cleanedTokens.length >= 4 &&
    cleanedTokens[0] === 'vasantha' &&
    cleanedTokens[1] === 'vasantha' &&
    cleanedTokens[2] === 'beautiful' &&
    cleanedTokens[3] === 'vasantha'
  ) {
    return { isValid: true, normalized, matchedRule: 'token_sequence_match', similarity: 1.0 };
  }

  // 4. Substring containment of target canonical phrase
  if (normalized.includes(TARGET_CANONICAL)) {
    return { isValid: true, normalized, matchedRule: 'substring_match', similarity: 0.98 };
  }

  // 5. Fuzzy similarity matching against canonical target
  const sim = similarityRatio(normalized, TARGET_CANONICAL);
  if (sim >= 0.82 && vasanthaCount >= 2 && beautifulCount >= 1) {
    return { isValid: true, normalized, matchedRule: 'fuzzy_similarity_match', similarity: sim };
  }

  return { isValid: false, normalized, similarity: sim };
}

