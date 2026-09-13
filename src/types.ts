export interface VisitorUser {
  id: string;
  name: string;
  moniker?: string;
  email?: string;
  loginTime: string;
}

export interface QuestionAnswerRecord {
  questionId: string;
  questionNumber: number;
  questionTitle: string;
  questionPrompt: string;
  answer: string;
  normalizedAnswer?: string;
  method: 'voice' | 'typed';
  isCorrect?: boolean;
  timestamp: string;
  audioBase64?: string;
  audioMimeType?: string;
  attachmentFilename?: string;
}

export interface VisitorSessionRecord {
  sessionId: string;
  user: VisitorUser;
  status: 'in_progress' | 'completed';
  startTime: string;
  completedTime?: string;
  durationSeconds?: number;
  totalAttempts: number;
  answers: QuestionAnswerRecord[];
  emailSent?: boolean;
  emailSentAt?: string;
  emailError?: string;
}

export interface CastleQuestion {
  id: string;
  number: number;
  chamberName: string;
  title: string;
  prompt: string;
  hint: string;
  placeholder: string;
  iconName: string;
  expectedKeywords?: string[];
  allowAnyAnswer?: boolean;
  vampireFeedback: string;
}

export interface PuzzleCompletionRecord {
  sessionId: string;
  attemptNumber: number;
  moves: number;
  timeRemainingSeconds?: number;
  timeTakenSeconds: number;
  completedAt: string;
  userName?: string;
  status: 'solved' | 'failed';
}

export type TreasureTarget = 'clock' | 'book' | 'candle' | 'key' | 'moon';

export interface TreasureClue {
  stepIndex: number; // 0 to 4
  target: TreasureTarget;
  title: string;
  sourceDescription: string;
  riddle: string;
  answerName: string;
  icon: string;
  unlockText: string;
}

