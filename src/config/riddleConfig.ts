/**
 * GOTHIC ENTRANCE RIDDLE CONFIGURATION
 * 
 * You can easily customize the entrance question, hint, and accepted answers below.
 */

export interface RiddleConfig {
  /** The atmospheric intro text displayed above the riddle */
  introText: string;
  
  /** The prominent question presented to the visitor */
  question: string;
  
  /** The subtle hint text revealed on click/hover */
  hint: string;
  
  /** Primary expected answer (kept secure and not exposed visually) */
  expectedAnswer: string;

  /** Primary answer alias */
  primaryAnswer: string;
  
  /** 
   * Array of acceptable transcription variations for singing/voice recognition
   */
  acceptedVariations: string[];
  acceptedAnswers: string[];

  /** Message displayed upon correct answer validation */
  successMessage: string;

  /** Message displayed when an answer is rejected */
  rejectionMessage: string;
}

export const RIDDLE_CONFIG: RiddleConfig = {
  introText: "A musical challenge echoes from the castle...",
  question: "Sing your famous song 😁",
  hint: "beautiful",
  expectedAnswer: "Vasantha Vasantha Beautiful Vasantha",
  primaryAnswer: "Vasantha Vasantha Beautiful Vasantha",
  acceptedVariations: [
    "Vasantha Vasantha Beautiful Vasantha",
    "Vasantha Vasantha, Beautiful Vasantha",
    "Vasantha Vasantha beautiful vasantha",
    "Vasantha Vasantha beautyful Vasantha",
    "Vasantha Vasantha, beauty full Vasantha",
    "Vasantha Vasantha beautiful, Vasantha",
    "Vasantha Vasantha Beautiful, Vasantha",
    "vasantha vasantha beautiful vasantha",
    "vasantha vasantha beautyful vasantha",
    "vasantha vasantha beauty full vasantha",
    "vasanth vasanth beautiful vasanth",
    "vasanta vasanta beautiful vasanta",
    "vasantham vasantham beautiful vasantham",
    "vasantha vasantha beatiful vasantha",
    "vasantha vasantha butiful vasantha",
    "vasantha vasantha beutiful vasantha"
  ],
  acceptedAnswers: [
    "Vasantha Vasantha Beautiful Vasantha",
    "vasantha vasantha beautiful vasantha",
    "vasantha vasantha beautyful vasantha",
    "vasantha vasantha beauty full vasantha"
  ],
  successMessage: "The gates recognize you.",
  rejectionMessage: "The gates remain sealed."
};

