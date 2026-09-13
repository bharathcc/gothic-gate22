import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Stethoscope,
  Activity,
  Clock,
  Award,
  ArrowRight,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  Shield,
  Zap,
  BookOpen,
  User,
  Volume2,
} from 'lucide-react';
import { VisitorUser } from '../types';
import { soundEngine } from '../utils/soundEngine';

interface Page4Props {
  user: VisitorUser;
  sessionId?: string;
  onReturnToTreasureHunt?: () => void;
  onReturnToEntrance?: () => void;
  onProceedToNext?: () => void;
}

interface RawQuestion {
  id: number;
  category: 'ANATOMY' | 'BIOCHEMISTRY' | 'HISTOLOGY' | 'PHYSIOLOGY' | 'CLINICAL BIOCHEMISTRY' | 'PHARMACOLOGY' | 'PATHOLOGY' | 'MICROBIOLOGY' | 'EMBRYOLOGY';
  categoryColor: string;
  prompt: string;
  options: string[];
  correctText: string;
}

const RAW_QUESTIONS: RawQuestion[] = [
  {
    id: 1,
    category: 'ANATOMY',
    categoryColor: 'from-red-600 to-rose-700',
    prompt: 'Which nerve is most commonly injured in a fracture of the surgical neck of the humerus?',
    options: ['Radial nerve', 'Median nerve', 'Axillary nerve', 'Ulnar nerve'],
    correctText: 'Axillary nerve',
  },
  {
    id: 2,
    category: 'BIOCHEMISTRY',
    categoryColor: 'from-amber-600 to-yellow-700',
    prompt: 'Which enzyme is the rate-limiting enzyme of glycolysis?',
    options: ['Hexokinase', 'Phosphofructokinase-1', 'Pyruvate kinase', 'Lactate dehydrogenase'],
    correctText: 'Phosphofructokinase-1',
  },
  {
    id: 3,
    category: 'ANATOMY',
    categoryColor: 'from-red-600 to-rose-700',
    prompt: 'Which structure passes through the foramen ovale of the sphenoid bone?',
    options: ['Maxillary nerve', 'Mandibular nerve', 'Facial nerve', 'Optic nerve'],
    correctText: 'Mandibular nerve',
  },
  {
    id: 4,
    category: 'BIOCHEMISTRY',
    categoryColor: 'from-amber-600 to-yellow-700',
    prompt: 'Deficiency of which vitamin causes megaloblastic anemia accompanied by subacute combined degeneration of the spinal cord?',
    options: ['Vitamin B1', 'Vitamin B6', 'Vitamin B12', 'Vitamin C'],
    correctText: 'Vitamin B12',
  },
  {
    id: 5,
    category: 'HISTOLOGY',
    categoryColor: 'from-emerald-600 to-teal-700',
    prompt: 'Which type of epithelium lines the urinary bladder and ureter to allow stretching?',
    options: [
      'Simple squamous epithelium',
      'Simple cuboidal epithelium',
      'Stratified squamous epithelium',
      'Transitional epithelium (Urothelium)',
    ],
    correctText: 'Transitional epithelium (Urothelium)',
  },
  {
    id: 6,
    category: 'ANATOMY',
    categoryColor: 'from-red-600 to-rose-700',
    prompt: 'Which artery supplies most of the superolateral surface of the cerebral hemisphere?',
    options: [
      'Anterior cerebral artery',
      'Middle cerebral artery',
      'Posterior cerebral artery',
      'Basilar artery',
    ],
    correctText: 'Middle cerebral artery',
  },
  {
    id: 7,
    category: 'PHYSIOLOGY',
    categoryColor: 'from-cyan-600 to-blue-700',
    prompt: 'During strenuous exercise, acidosis and elevated 2,3-BPG cause the oxygen–hemoglobin dissociation curve to:',
    options: ['Shift to the left', 'Shift to the right', 'Remain completely unchanged', 'Become horizontal'],
    correctText: 'Shift to the right',
  },
  {
    id: 8,
    category: 'PHYSIOLOGY',
    categoryColor: 'from-cyan-600 to-blue-700',
    prompt: 'Which ion permeability contributes most predominantly to the resting membrane potential of a typical excitable cell?',
    options: ['Sodium (Na+)', 'Calcium (Ca2+)', 'Potassium (K+)', 'Chloride (Cl-)'],
    correctText: 'Potassium (K+)',
  },
  {
    id: 9,
    category: 'CLINICAL BIOCHEMISTRY',
    categoryColor: 'from-purple-600 to-pink-700',
    prompt: 'Which high-sensitivity cardiac biomarker is the gold standard for diagnosing acute myocardial infarction?',
    options: [
      'Serum bilirubin',
      'Cardiac Troponin (cTnI / cTnT)',
      'Serum amylase',
      'Alkaline phosphatase',
    ],
    correctText: 'Cardiac Troponin (cTnI / cTnT)',
  },
  {
    id: 10,
    category: 'PHYSIOLOGY',
    categoryColor: 'from-cyan-600 to-blue-700',
    prompt: 'During which phase of the cardiac cycle does the majority (~70-80%) of ventricular blood filling occur?',
    options: [
      'Isovolumetric contraction',
      'Early diastole (Rapid ventricular filling)',
      'Ventricular ejection',
      'Isovolumetric relaxation',
    ],
    correctText: 'Early diastole (Rapid ventricular filling)',
  },
  {
    id: 11,
    category: 'PHARMACOLOGY',
    categoryColor: 'from-indigo-600 to-purple-700',
    prompt: 'Which specific antidote is administered to replenish glutathione stores in acute acetaminophen (paracetamol) overdose?',
    options: ['N-acetylcysteine (NAC)', 'Flumazenil', 'Naloxone', 'Atropine'],
    correctText: 'N-acetylcysteine (NAC)',
  },
  {
    id: 12,
    category: 'PATHOLOGY',
    categoryColor: 'from-rose-600 to-red-800',
    prompt: 'Which microscopic pathognomonic granulomatous lesions with Anitschkow myocytes are found in Rheumatic Myocarditis?',
    options: ['Aschoff bodies', 'Councilman bodies', 'Lewy bodies', 'Mallory-Denk bodies'],
    correctText: 'Aschoff bodies',
  },
  {
    id: 13,
    category: 'ANATOMY',
    categoryColor: 'from-red-600 to-rose-700',
    prompt: 'Injury to the long thoracic nerve of Bell paralyzing the serratus anterior results in which classical clinical sign?',
    options: ['Wrist drop', 'Winging of the scapula', 'Claw hand deformity', 'Ape thumb deformity'],
    correctText: 'Winging of the scapula',
  },
  {
    id: 14,
    category: 'BIOCHEMISTRY',
    categoryColor: 'from-amber-600 to-yellow-700',
    prompt: 'Which mitochondrial enzyme catalyzing the first committed step of the Urea cycle is allosterically activated by N-acetylglutamate?',
    options: [
      'Carbamoyl phosphate synthetase I (CPS-I)',
      'Ornithine transcarbamylase',
      'Argininosuccinate synthetase',
      'Arginase',
    ],
    correctText: 'Carbamoyl phosphate synthetase I (CPS-I)',
  },
  {
    id: 15,
    category: 'PHYSIOLOGY',
    categoryColor: 'from-cyan-600 to-blue-700',
    prompt: 'Which specialized cells in the gastric glands secrete both Hydrochloric Acid (HCl) and Intrinsic Factor?',
    options: ['Parietal (Oxyntic) cells', 'Chief (Peptic) cells', 'G cells (Gastrin)', 'Mucous neck cells'],
    correctText: 'Parietal (Oxyntic) cells',
  },
  {
    id: 16,
    category: 'MICROBIOLOGY',
    categoryColor: 'from-teal-600 to-emerald-700',
    prompt: 'Which bacterial pathogen produces an AB-exotoxin that halts host protein synthesis via ADP-ribosylation of Elongation Factor-2 (EF-2)?',
    options: ['Corynebacterium diphtheriae', 'Clostridium tetani', 'Vibrio cholerae', 'Staphylococcus aureus'],
    correctText: 'Corynebacterium diphtheriae',
  },
  {
    id: 17,
    category: 'PHARMACOLOGY',
    categoryColor: 'from-indigo-600 to-purple-700',
    prompt: 'What is the primary cellular mechanism of action of Digoxin in cardiac myocytes?',
    options: [
      'Inhibition of Na+/K+-ATPase pump',
      'Blockade of beta-1 adrenergic receptors',
      'Activation of voltage-gated potassium channels',
      'Direct stimulation of adenylate cyclase',
    ],
    correctText: 'Inhibition of Na+/K+-ATPase pump',
  },
  {
    id: 18,
    category: 'ANATOMY',
    categoryColor: 'from-red-600 to-rose-700',
    prompt: 'During thyroidectomy near the inferior pole of the thyroid gland, the recurrent laryngeal nerve is intimately related to which vessel?',
    options: ['Inferior thyroid artery', 'Superior thyroid artery', 'Internal carotid artery', 'Vertebral artery'],
    correctText: 'Inferior thyroid artery',
  },
  {
    id: 19,
    category: 'PHYSIOLOGY',
    categoryColor: 'from-cyan-600 to-blue-700',
    prompt: 'Which pressure gradient is the primary physical driving force favoring glomerular filtration in renal Bowman capsules?',
    options: [
      'Glomerular capillary hydrostatic pressure (PGC)',
      'Bowman space oncotic pressure',
      'Plasma colloid osmotic pressure (piGC)',
      'Tubular back-pressure',
    ],
    correctText: 'Glomerular capillary hydrostatic pressure (PGC)',
  },
  {
    id: 20,
    category: 'PATHOLOGY',
    categoryColor: 'from-rose-600 to-red-800',
    prompt: 'In which pattern of tissue necrosis is the cellular outline and tissue architecture preserved (ghost cells) for several days after ischemia?',
    options: ['Coagulative necrosis', 'Liquefactive necrosis', 'Caseous necrosis', 'Fat necrosis'],
    correctText: 'Coagulative necrosis',
  },
  {
    id: 21,
    category: 'BIOCHEMISTRY',
    categoryColor: 'from-amber-600 to-yellow-700',
    prompt: 'In which vital metabolic pathway is Glucose-6-phosphate dehydrogenase (G6PD) the committed rate-limiting enzyme producing NADPH?',
    options: [
      'Hexose Monophosphate (HMP) Shunt',
      'Tricarboxylic Acid (TCA) Cycle',
      'Beta-oxidation of fatty acids',
      'Gluconeogenesis',
    ],
    correctText: 'Hexose Monophosphate (HMP) Shunt',
  },
  {
    id: 22,
    category: 'ANATOMY',
    categoryColor: 'from-red-600 to-rose-700',
    prompt: 'Which is the ONLY cranial nerve to emerge from the dorsal (posterior) aspect of the brainstem?',
    options: ['Trochlear nerve (CN IV)', 'Oculomotor nerve (CN III)', 'Abducens nerve (CN VI)', 'Trigeminal nerve (CN V)'],
    correctText: 'Trochlear nerve (CN IV)',
  },
  {
    id: 23,
    category: 'PHARMACOLOGY',
    categoryColor: 'from-indigo-600 to-purple-700',
    prompt: 'Which first-line anti-tubercular drug can cause dose-dependent retrobulbar optic neuritis with red-green color blindness?',
    options: ['Ethambutol', 'Isoniazid (INH)', 'Rifampicin', 'Pyrazinamide'],
    correctText: 'Ethambutol',
  },
  {
    id: 24,
    category: 'PHYSIOLOGY',
    categoryColor: 'from-cyan-600 to-blue-700',
    prompt: 'Vasopressin (ADH) promotes water reabsorption in renal principal cells by stimulating the apical insertion of which aquaporin channel?',
    options: ['Aquaporin-2 (AQP2)', 'Aquaporin-1 (AQP1)', 'Aquaporin-3 (AQP3)', 'Aquaporin-4 (AQP4)'],
    correctText: 'Aquaporin-2 (AQP2)',
  },
  {
    id: 25,
    category: 'EMBRYOLOGY',
    categoryColor: 'from-emerald-600 to-teal-700',
    prompt: 'The epithelial mucosal lining of the respiratory and gastrointestinal tract is embryonically derived from which germ layer?',
    options: ['Endoderm', 'Mesoderm', 'Ectoderm', 'Neural crest cells'],
    correctText: 'Endoderm',
  },
  {
    id: 26,
    category: 'PATHOLOGY',
    categoryColor: 'from-rose-600 to-red-800',
    prompt: 'Giant binucleated or multinucleated Reed-Sternberg cells with prominent eosinophilic inclusion-like nucleoli are diagnostic of:',
    options: ['Classical Hodgkin Lymphoma', 'Burkitt Lymphoma', 'Multiple Myeloma', 'Follicular Lymphoma'],
    correctText: 'Classical Hodgkin Lymphoma',
  },
  {
    id: 27,
    category: 'BIOCHEMISTRY',
    categoryColor: 'from-amber-600 to-yellow-700',
    prompt: 'Which semi-essential amino acid serves as the direct substrate for endothelial Nitric Oxide Synthase (eNOS) to generate Nitric Oxide (NO)?',
    options: ['L-Arginine', 'L-Lysine', 'L-Tryptophan', 'L-Methionine'],
    correctText: 'L-Arginine',
  },
  {
    id: 28,
    category: 'ANATOMY',
    categoryColor: 'from-red-600 to-rose-700',
    prompt: 'The Anterior Cruciate Ligament (ACL) of the knee joint attaches proximally to which precise anatomical site on the femur?',
    options: [
      'Medial surface of lateral femoral condyle (posteriorly)',
      'Lateral surface of medial femoral condyle',
      'Intercondylar eminence apex',
      'Anterior intercondylar area of patella',
    ],
    correctText: 'Medial surface of lateral femoral condyle (posteriorly)',
  },
  {
    id: 29,
    category: 'PHYSIOLOGY',
    categoryColor: 'from-cyan-600 to-blue-700',
    prompt: 'In the sinoatrial (SA) node pacemaker cells, what generates the spontaneous slow Phase 4 diastolic depolarization?',
    options: [
      'Funny currents (If) via HCN hyperpolarization-activated channels',
      'Rapid influx of K+ through delayed rectifier channels',
      'Fast voltage-gated Na+ channels (INa)',
      'Complete inactivation of all calcium channels',
    ],
    correctText: 'Funny currents (If) via HCN hyperpolarization-activated channels',
  },
  {
    id: 30,
    category: 'PHARMACOLOGY',
    categoryColor: 'from-indigo-600 to-purple-700',
    prompt: 'Which class of antimicrobial agents is avoided in pediatric patients due to risk of cartilage erosion, arthropathy, and tendon rupture?',
    options: ['Fluoroquinolones (e.g. Ciprofloxacin)', 'Penicillins (e.g. Amoxicillin)', 'Macrolides (e.g. Azithromycin)', 'Cephalosporins (e.g. Ceftriaxone)'],
    correctText: 'Fluoroquinolones (e.g. Ciprofloxacin)',
  },
  {
    id: 31,
    category: 'PATHOLOGY',
    categoryColor: 'from-rose-600 to-red-800',
    prompt: 'Laminated concentric calcified Psammoma bodies (sand-like bodies) are most classically identified in which thyroid neoplasm?',
    options: ['Papillary thyroid carcinoma', 'Follicular thyroid adenoma', 'Medullary thyroid carcinoma', 'Anaplastic thyroid carcinoma'],
    correctText: 'Papillary thyroid carcinoma',
  },
  {
    id: 32,
    category: 'ANATOMY',
    categoryColor: 'from-red-600 to-rose-700',
    prompt: 'The main Thoracic Duct empties its lymph into the venous circulation at which anatomical confluence?',
    options: [
      'Junction of left internal jugular and left subclavian veins (Left Pirogoff angle)',
      'Right brachiocephalic vein junction',
      'Inferior vena cava directly',
      'Azygos vein arch',
    ],
    correctText: 'Junction of left internal jugular and left subclavian veins (Left Pirogoff angle)',
  },
  {
    id: 33,
    category: 'BIOCHEMISTRY',
    categoryColor: 'from-amber-600 to-yellow-700',
    prompt: 'Alkaptonuria (characterized by dark urine on standing and ochronotic arthritis) is caused by inherited deficiency of:',
    options: [
      'Homogentisate 1,2-dioxygenase (Homogentisate oxidase)',
      'Phenylalanine hydroxylase',
      'Branched-chain alpha-keto acid dehydrogenase',
      'Tyrosinase',
    ],
    correctText: 'Homogentisate 1,2-dioxygenase (Homogentisate oxidase)',
  },
  {
    id: 34,
    category: 'PHYSIOLOGY',
    categoryColor: 'from-cyan-600 to-blue-700',
    prompt: 'What is the unusual neurotransmitter utilized by sympathetic postganglionic fibers innervating thermoregulatory eccrine sweat glands?',
    options: ['Acetylcholine (ACh)', 'Norepinephrine (NE)', 'Dopamine', 'Serotonin'],
    correctText: 'Acetylcholine (ACh)',
  },
  {
    id: 35,
    category: 'PHARMACOLOGY',
    categoryColor: 'from-indigo-600 to-purple-700',
    prompt: 'Which drug serves as a specific competitive antagonist at the GABAA receptor benzodiazepine binding site to reverse benzodiazepine sedation?',
    options: ['Flumazenil', 'Naloxone', 'Physostigmine', 'Pralidoxime (2-PAM)'],
    correctText: 'Flumazenil',
  },
  {
    id: 36,
    category: 'ANATOMY',
    categoryColor: 'from-red-600 to-rose-700',
    prompt: 'Klumpke\'s paralysis (producing total claw hand and optional Horner syndrome) results from hyperabduction traction injury to which nerve roots?',
    options: ['C8 and T1', 'C5 and C6 (Erb-Duchenne)', 'C6 and C7', 'T2 and T3'],
    correctText: 'C8 and T1',
  },
  {
    id: 37,
    category: 'PATHOLOGY',
    categoryColor: 'from-rose-600 to-red-800',
    prompt: 'Eosinophilic, Councilman bodies (apoptotic hepatocytes with condensed chromatin) are characteristically found in liver biopsies of:',
    options: ['Acute viral hepatitis / Yellow fever', 'Non-alcoholic fatty liver disease (NAFLD)', 'Primary biliary cholangitis', 'Wilson disease'],
    correctText: 'Acute viral hepatitis / Yellow fever',
  },
  {
    id: 38,
    category: 'BIOCHEMISTRY',
    categoryColor: 'from-amber-600 to-yellow-700',
    prompt: 'What is the rate-limiting regulatory enzyme in the biosynthesis of Heme that requires Pyridoxal Phosphate (Vitamin B6)?',
    options: [
      '5-Aminolevulinate Synthase (ALA Synthase)',
      'Porphobilinogen Deaminase',
      'Ferrochelatase',
      'Uroporphyrinogen Decarboxylase',
    ],
    correctText: '5-Aminolevulinate Synthase (ALA Synthase)',
  },
  {
    id: 39,
    category: 'PHYSIOLOGY',
    categoryColor: 'from-cyan-600 to-blue-700',
    prompt: 'Which lung volume/capacity CANNOT be directly measured with conventional simple spirometry?',
    options: [
      'Residual Volume (and Functional Residual Capacity / TLC)',
      'Vital Capacity (VC)',
      'Tidal Volume (VT)',
      'Inspiratory Reserve Volume (IRV)',
    ],
    correctText: 'Residual Volume (and Functional Residual Capacity / TLC)',
  },
  {
    id: 40,
    category: 'MICROBIOLOGY',
    categoryColor: 'from-teal-600 to-emerald-700',
    prompt: 'Negri bodies (intracytoplasmic eosinophilic inclusion bodies in Purkinje cells of cerebellum and hippocampus) are diagnostic for:',
    options: ['Rabies virus encephalitis', 'Herpes simplex encephalitis', 'Cytomegalovirus (CMV)', 'Poliovirus'],
    correctText: 'Rabies virus encephalitis',
  },
];

const CORRECT_REACTIONS = [
  'Okay Doctor! 👀',
  'Someone actually studied!',
  'Dracula approves. 🧛‍♀️',
  'That was suspiciously correct.',
  'WHO TAUGHT YOU THIS?!',
];

const WRONG_REACTIONS = [
  "Are you sure you're in MBBS? 😂",
  'Dracula is concerned...',
  'The patient wants a second opinion.',
  'Please open your textbook.',
  'That answer needs CPR. 💀',
];

interface ShuffledQuestion {
  id: number;
  category: RawQuestion['category'];
  categoryColor: string;
  prompt: string;
  shuffledOptions: string[];
  correctText: string;
}

export const Page4Placeholder: React.FC<Page4Props> = ({
  user,
  sessionId,
  onReturnToTreasureHunt,
  onReturnToEntrance,
  onProceedToNext,
}) => {
  // Phases: 'intro_sequence' | 'intro_card' | 'question' | 'diagnosing' | 'result'
  const [phase, setPhase] = useState<'intro_sequence' | 'intro_card' | 'question' | 'diagnosing' | 'result'>('intro_sequence');
  const [introStep, setIntroStep] = useState<number>(0);

  // Quiz State
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerLocked, setIsAnswerLocked] = useState<boolean>(false);
  const [reactionText, setReactionText] = useState<string>('');
  const [isTimeout, setIsTimeout] = useState<boolean>(false);

  // Result Animation State
  const [animatedScore, setAnimatedScore] = useState<number>(0);
  const [diagnosisStep, setDiagnosisStep] = useState<number>(0);

  // Refs for bulletproof timer clearing
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const introTimeoutRef = useRef<NodeJS.Timeout[]>([]);
  const isAnswerLockedRef = useRef<boolean>(false);
  const answeredQuestionsRef = useRef<Array<{
    questionNumber: number;
    category: string;
    prompt: string;
    selectedOption: string;
    correctAnswer: string;
    isCorrect: boolean;
  }>>([]);

  // Prepare shuffled questions once on quiz start and dynamically on every retry
  const [shuffledQuestions, setShuffledQuestions] = useState<ShuffledQuestion[]>([]);
  const seenQuestionIdsRef = useRef<Set<number>>(new Set());

  const initializeQuizQuestions = useCallback(() => {
    // If fewer than 10 unseen questions remain, reset seen history
    const unseen = RAW_QUESTIONS.filter((q) => !seenQuestionIdsRef.current.has(q.id));
    let pool: RawQuestion[] = [];

    if (unseen.length < 10) {
      seenQuestionIdsRef.current.clear();
      pool = [...RAW_QUESTIONS];
    } else {
      pool = [...unseen];
    }

    // Shuffle available pool
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Pick 10 questions
    const selected = pool.slice(0, 10);
    selected.forEach((q) => seenQuestionIdsRef.current.add(q.id));

    const prepared: ShuffledQuestion[] = selected.map((q) => {
      // Fisher-Yates shuffle options
      const optionsCopy = [...q.options];
      for (let i = optionsCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [optionsCopy[i], optionsCopy[j]] = [optionsCopy[j], optionsCopy[i]];
      }
      return {
        id: q.id,
        category: q.category,
        categoryColor: q.categoryColor,
        prompt: q.prompt,
        shuffledOptions: optionsCopy,
        correctText: q.correctText,
      };
    });
    setShuffledQuestions(prepared);
  }, []);

  // Cleanup helper
  const clearAllTimeouts = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    introTimeoutRef.current.forEach((t) => clearTimeout(t));
    introTimeoutRef.current = [];
  }, []);

  useEffect(() => {
    initializeQuizQuestions();
    return () => {
      clearAllTimeouts();
    };
  }, [initializeQuizQuestions, clearAllTimeouts]);

  // Intro cinematic sequence on mount
  useEffect(() => {
    console.log('=== PAGE 4: DR. DRACULA QUIZ CHAMBER LOADED ===');

    // Step 0: "DRACULA HAS A QUESTION..."
    setIntroStep(0);

    const t1 = setTimeout(() => {
      // Step 1: "Since you're studying MBBS..."
      setIntroStep(1);
      soundEngine.playDraculaPoke(5);
    }, 2200);
    introTimeoutRef.current.push(t1);

    const t2 = setTimeout(() => {
      // Step 2: "LET'S SEE IF YOU ACTUALLY KNOW MEDICINE." 🧛‍♀️
      setIntroStep(2);
      soundEngine.playDraculaAnnoyed(8);
    }, 4500);
    introTimeoutRef.current.push(t2);

    const t3 = setTimeout(() => {
      // Step 3: Reveal Start Quiz Card
      setPhase('intro_card');
      soundEngine.playSuccessGateOpen();
    }, 6800);
    introTimeoutRef.current.push(t3);

    return () => {
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  // Start 30s timer for active question
  const startQuestionTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setTimeLeft(30);
    setIsAnswerLocked(false);
    isAnswerLockedRef.current = false;
    setSelectedOption(null);
    setReactionText('');
    setIsTimeout(false);

    timerRef.current = setInterval(() => {
      if (isAnswerLockedRef.current) {
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }

      setTimeLeft((prev) => {
        if (isAnswerLockedRef.current) return prev;

        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          handleQuestionTimeout();
          return 0;
        }

        if (prev <= 6) {
          soundEngine.playTimerTick(true);
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Handle Timeout (User took > 30s)
  const handleQuestionTimeout = () => {
    if (isAnswerLockedRef.current) return;
    isAnswerLockedRef.current = true;
    setIsAnswerLocked(true);
    setIsTimeout(true);

    const currentQ = shuffledQuestions[currentIndex];
    if (currentQ) {
      answeredQuestionsRef.current.push({
        questionNumber: currentIndex + 1,
        category: currentQ.category,
        prompt: currentQ.prompt,
        selectedOption: '[TIMED OUT]',
        correctAnswer: currentQ.correctText,
        isCorrect: false,
      });
    }

    if (sessionId && currentQ) {
      void fetch('/api/visitor/record-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId: `page4_mbbs_q${currentIndex + 1}_id${currentQ.id}`,
          questionNumber: 4,
          questionTitle: `[MBBS ${currentQ.category}] Question #${currentIndex + 1}`,
          questionPrompt: currentQ.prompt,
          answer: `[TIMED OUT] (Time expired after 30s - Correct Answer: ${currentQ.correctText})`,
          method: 'typed',
          isCorrect: false,
        }),
      });
    }

    soundEngine.playQuizWrong();
    setReactionText("TIME'S UP, DOCTOR! 🧛‍♀️");
  };

  // Start Quiz Handler
  const handleStartQuiz = () => {
    initializeQuizQuestions();
    answeredQuestionsRef.current = [];
    soundEngine.playHoverTone();
    soundEngine.playHeartbeat();
    setScore(0);
    setCurrentIndex(0);
    setPhase('question');
    startQuestionTimer();
  };

  // Option Click Handler
  const handleSelectOption = (option: string) => {
    if (isAnswerLocked || isAnswerLockedRef.current) return;

    // Immediately stop the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    isAnswerLockedRef.current = true;
    setIsAnswerLocked(true);
    setSelectedOption(option);

    const currentQ = shuffledQuestions[currentIndex];
    const isCorrect = option === currentQ.correctText;

    if (currentQ) {
      answeredQuestionsRef.current.push({
        questionNumber: currentIndex + 1,
        category: currentQ.category,
        prompt: currentQ.prompt,
        selectedOption: option,
        correctAnswer: currentQ.correctText,
        isCorrect,
      });
    }

    if (sessionId && currentQ) {
      void fetch('/api/visitor/record-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId: `page4_mbbs_q${currentIndex + 1}_id${currentQ.id}`,
          questionNumber: 4,
          questionTitle: `[MBBS ${currentQ.category}] Question #${currentIndex + 1}`,
          questionPrompt: currentQ.prompt,
          answer: isCorrect
            ? `${option} (✅ Correct)`
            : `${option} (❌ Incorrect - Correct Answer: ${currentQ.correctText})`,
          method: 'typed',
          isCorrect,
        }),
      });
    }

    if (isCorrect) {
      soundEngine.playQuizCorrect();
      setScore((prev) => prev + 1);
      const randomReaction = CORRECT_REACTIONS[Math.floor(Math.random() * CORRECT_REACTIONS.length)];
      setReactionText(randomReaction);
    } else {
      soundEngine.playQuizWrong();
      const randomReaction = WRONG_REACTIONS[Math.floor(Math.random() * WRONG_REACTIONS.length)];
      setReactionText(randomReaction);
    }
  };

  // Next Question or Finish
  const handleNextQuestion = () => {
    soundEngine.playHoverTone();
    const nextIndex = currentIndex + 1;

    if (nextIndex < shuffledQuestions.length) {
      setCurrentIndex(nextIndex);
      startQuestionTimer();
    } else {
      // Completed all 10 questions -> Trigger Cinematic Diagnosis Sequence
      triggerDiagnosisSequence();
    }
  };

  // Cinematic Diagnosis Sequence
  const triggerDiagnosisSequence = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (sessionId) {
      const percentage = Math.round((score / 10) * 100);
      const tierTitle = score >= 9 ? 'Rank 1 Chief Surgeon' : score >= 7 ? 'Senior Resident (Dracula Approved)' : score >= 5 ? 'Junior Intern' : 'Emergency CPR Needed';
      
      // Send dedicated complete exam breakdown with all 10 questions
      void fetch('/api/quiz/mbbs-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          score,
          totalQuestions: 10,
          tierTitle,
          questions: answeredQuestionsRef.current,
        }),
      });
    }

    setPhase('diagnosing');
    setDiagnosisStep(0); // "DIAGNOSING DR. DRACULA..."

    // Sound: Heartbeats
    soundEngine.playHeartbeat();
    const hb1 = setTimeout(() => soundEngine.playHeartbeat(), 800);
    const hb2 = setTimeout(() => soundEngine.playHeartbeat(), 1600);
    introTimeoutRef.current.push(hb1, hb2);

    // After pause, reveal score count up
    const tScore = setTimeout(() => {
      setDiagnosisStep(1);
      soundEngine.playKeyGlow();

      // Animate score counting upward from 0 to score
      let count = 0;
      const targetScore = score;
      if (targetScore === 0) {
        setAnimatedScore(0);
        setDiagnosisStep(2);
      } else {
        const interval = setInterval(() => {
          count++;
          setAnimatedScore(count);
          soundEngine.playDraculaPoke(count);
          if (count >= targetScore) {
            clearInterval(interval);
            setTimeout(() => {
              setDiagnosisStep(2);
              if (targetScore >= 7) {
                soundEngine.playSuccessGateOpen();
              } else {
                soundEngine.playDraculaAnnoyed(10);
              }
            }, 600);
          }
        }, 180);
      }
    }, 2400);
    introTimeoutRef.current.push(tScore);
  };

  // Current active question
  const currentQ = shuffledQuestions[currentIndex];

  // Diagnosis Tiers Calculation
  const resultTier = useMemo(() => {
    if (score >= 9) {
      return {
        icon: '🩺',
        title: 'DR. DRACULA — CHIEF SURGEON',
        quote1: 'Okay... WHO TAUGHT YOU THIS?! 😭',
        quote2: 'The patients may actually survive.',
        badgeColor: 'border-emerald-500/80 bg-emerald-950/60 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.4)]',
        glowColor: 'shadow-[0_0_80px_rgba(16,185,129,0.5)]',
      };
    }
    if (score >= 7) {
      return {
        icon: '🧛‍♀️',
        title: 'DR. DRACULA — RESIDENT LEVEL',
        quote1: 'Not bad, Doctor.',
        quote2: 'The patients might survive after all.',
        badgeColor: 'border-cyan-500/80 bg-cyan-950/60 text-cyan-300 shadow-[0_0_30px_rgba(6,182,212,0.4)]',
        glowColor: 'shadow-[0_0_80px_rgba(6,182,212,0.5)]',
      };
    }
    if (score >= 5) {
      return {
        icon: '🩸',
        title: 'DR. DRACULA — FIRST YEAR SURVIVOR',
        quote1: 'Back to the textbooks, Doctor.',
        quote2: 'At least you survived the quiz.',
        badgeColor: 'border-amber-500/80 bg-amber-950/60 text-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.4)]',
        glowColor: 'shadow-[0_0_80px_rgba(245,158,11,0.5)]',
      };
    }
    if (score >= 3) {
      return {
        icon: '💀',
        title: 'DR. DRACULA — SECOND OPINION REQUIRED',
        quote1: "Please don't touch the patient.",
        quote2: 'Your confidence is higher than your score.',
        badgeColor: 'border-rose-500/80 bg-rose-950/60 text-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.4)]',
        glowColor: 'shadow-[0_0_80px_rgba(244,63,94,0.5)]',
      };
    }
    return {
      icon: '🪦',
      title: 'DR. DRACULA — MEDICAL EMERGENCY',
      quote1: 'The vampire knows more medicine than you.',
      quote2: 'Please return to the library immediately. 😂',
      badgeColor: 'border-red-600/80 bg-red-950/70 text-red-300 shadow-[0_0_30px_rgba(220,38,38,0.5)]',
      glowColor: 'shadow-[0_0_80px_rgba(220,38,38,0.6)]',
    };
  }, [score]);

  return (
    <div
      id="page4-dracula-quiz-root"
      className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden select-none bg-[#03060e] text-slate-200"
    >
      {/* ========================================================================= */}
      {/* 1. EXACT UPLOADED FULL-SCREEN BACKGROUND IMAGE (NEVER REGENERATED) */}
      {/* ========================================================================= */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 brightness-[0.92] contrast-105"
        style={{ backgroundImage: "url('/page4_bg.png')" }}
      />

      {/* Atmospheric Medical & Gothic Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#02050b]/85 via-transparent to-[#02050b]/70 pointer-events-none" />

      {/* Floating Medical & Gothic Motifs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
        <div className="absolute top-[20%] left-[10%] w-2 h-2 rounded-full bg-red-400 blur-[1px] animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute bottom-[25%] right-[15%] w-2 h-2 rounded-full bg-cyan-300 blur-[1px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute top-[40%] right-[30%] w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping" style={{ animationDuration: '5s' }} />
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP HEADER NAVIGATION */}
      {/* ========================================================================= */}
      <header className="relative z-30 w-full px-4 sm:px-8 pt-3 pb-2 flex items-center justify-between pointer-events-auto backdrop-blur-[2px]">
        {/* Left: Back / User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onReturnToTreasureHunt && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playHoverTone();
                onReturnToTreasureHunt();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black/95 border border-slate-700/70 text-slate-300 hover:text-cyan-300 font-cinzel text-xs tracking-wider transition-all backdrop-blur-md cursor-pointer group shadow-lg"
            >
              <RotateCcw className="w-3.5 h-3.5 group-hover:-rotate-45 transition-transform" />
              <span className="hidden sm:inline">Chapter III</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 border border-cyan-500/30 text-xs font-cinzel text-cyan-300 backdrop-blur-md shadow-lg">
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span className="max-w-[110px] sm:max-w-[150px] truncate">{user.name}</span>
          </div>
        </div>

        {/* Center: DR. DRACULA Title Badge */}
        <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-black/85 border border-red-500/50 text-red-300 font-cinzel text-xs sm:text-sm font-bold tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(239,68,68,0.3)] backdrop-blur-md">
          <span>🧛‍♀️ DR. DRACULA</span>
          <span className="hidden md:inline text-slate-400 font-normal">&bull; MBBS CHAMBER</span>
        </div>

        {/* Right: Live Quiz Score & Timer (when playing) */}
        {phase === 'question' ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Score */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/85 border border-emerald-500/40 text-xs font-cinzel text-emerald-300 backdrop-blur-md shadow-lg">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">SCORE:</span>
              <span className="font-bold font-mono text-white text-sm">{score}</span>
            </div>

            {/* Timer 30s */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/85 border text-xs font-cinzel backdrop-blur-md transition-all shadow-lg ${
                timeLeft <= 5
                  ? 'border-red-500 text-red-400 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.7)]'
                  : 'border-cyan-500/40 text-cyan-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="text-slate-400">TIME:</span>
              <span className="font-bold font-mono text-sm">{timeLeft}s</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 border border-slate-700/60 text-xs font-cinzel text-slate-300 backdrop-blur-md">
            <Stethoscope className="w-3.5 h-3.5 text-red-400" />
            <span>Chapter IV</span>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 3. MAIN QUIZ CONTAINER */}
      {/* ========================================================================= */}
      <main className="relative z-20 flex-1 w-full max-w-4xl mx-auto flex flex-col items-center justify-center p-4 sm:p-6">
        {/* ----------------------------------------------------------------- */}
        {/* A. CINEMATIC INTRO STEPS OVERLAY */}
        {/* ----------------------------------------------------------------- */}
        {phase === 'intro_sequence' && (
          <div className="w-full max-w-lg mx-auto text-center p-8 sm:p-10 rounded-3xl gothic-glass border-2 border-red-500/50 shadow-[0_0_80px_rgba(239,68,68,0.4)] bg-[#070209]/90 backdrop-blur-xl animate-fadeIn flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-red-950/80 border border-red-500/50 flex items-center justify-center text-3xl mb-4 shadow-[0_0_30px_rgba(239,68,68,0.5)] animate-heartbeat">
              🩺
            </div>

            {introStep === 0 && (
              <h2 className="text-xl sm:text-2xl font-cinzel-decorative font-bold text-red-200 tracking-[0.2em] uppercase animate-fadeIn">
                "DRACULA HAS A QUESTION..."
              </h2>
            )}

            {introStep === 1 && (
              <h2 className="text-xl sm:text-2xl font-cinzel-decorative font-bold text-amber-200 tracking-wider uppercase animate-fadeIn">
                "Since you're studying MBBS..."
              </h2>
            )}

            {introStep === 2 && (
              <div className="animate-fadeIn">
                <h2 className="text-xl sm:text-2xl font-cinzel-decorative font-bold text-red-400 tracking-wider uppercase mb-2">
                  "LET'S SEE IF YOU ACTUALLY KNOW MEDICINE." 🧛‍♀️
                </h2>
                <p className="font-cormorant text-base text-slate-300 italic">
                  Prepare your clinical instincts...
                </p>
              </div>
            )}
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* B. INTRO CARD (START QUIZ) */}
        {/* ----------------------------------------------------------------- */}
        {phase === 'intro_card' && (
          <div className="w-full max-w-lg mx-auto text-center p-6 sm:p-8 rounded-3xl gothic-glass border-2 border-red-500/60 shadow-[0_0_90px_rgba(239,68,68,0.4)] bg-[#07020a]/92 backdrop-blur-xl animate-fadeIn flex flex-col items-center">
            {/* Stethoscope / Vampire Icon */}
            <div className="relative mb-3 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-red-950 via-slate-900 to-red-900 border-2 border-red-500 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.6)] animate-heartbeat">
                <Stethoscope className="w-10 h-10 text-red-400" />
              </div>
              <div className="absolute -top-1 -right-1 text-2xl">🧛‍♀️</div>
            </div>

            <div className="inline-block px-4 py-1 rounded-full bg-red-950/80 border border-red-500/50 text-xs font-cinzel font-bold text-red-300 tracking-[0.25em] uppercase mb-2 shadow-md">
              DR. DRACULA
            </div>

            <h1 className="text-2xl sm:text-3xl font-cinzel-decorative font-bold text-white tracking-[0.2em] uppercase mb-1 drop-shadow-[0_2px_15px_rgba(239,68,68,0.8)]">
              MBBS BOSS LEVEL
            </h1>

            <p className="font-cormorant text-base sm:text-lg text-slate-300 italic mb-6">
              "10 questions. No cheating, Doctor."
            </p>

            {/* Rules badge */}
            <div className="w-full py-2.5 px-4 rounded-xl bg-black/60 border border-slate-700/80 text-xs font-cinzel text-slate-300 flex items-center justify-around mb-6">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" /> 10 Questions
              </span>
              <span className="text-slate-600">&bull;</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> 30s Per Question
              </span>
            </div>

            {/* Start Button */}
            <button
              type="button"
              id="btn-start-mbbs-quiz"
              onClick={handleStartQuiz}
              className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-red-700 via-red-600 to-orange-600 hover:from-red-600 hover:to-orange-500 text-white font-cinzel font-bold text-sm sm:text-base tracking-[0.25em] uppercase flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_0_50px_rgba(239,68,68,0.8)] border border-red-300 hover:scale-105 active:scale-95 transition-all"
            >
              <Activity className="w-5 h-5 text-yellow-300 animate-pulse" />
              <span>[ START QUIZ ]</span>
            </button>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* C. ACTIVE QUIZ QUESTION CARD */}
        {/* ----------------------------------------------------------------- */}
        {phase === 'question' && currentQ && (
          <div className="w-full max-w-2xl mx-auto rounded-3xl gothic-glass border-2 border-red-500/50 shadow-[0_0_80px_rgba(239,68,68,0.35)] bg-[#07030b]/92 backdrop-blur-xl p-5 sm:p-8 animate-fadeIn flex flex-col justify-between">
            {/* Top Question Header */}
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                {/* Category Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700 text-[11px] font-cinzel font-semibold tracking-wider text-slate-300 uppercase">
                  <Activity className="w-3 h-3 text-red-400" />
                  <span>{currentQ.category}</span>
                </div>

                {/* Question 1 / 10 Progress */}
                <div className="font-cinzel text-xs sm:text-sm font-bold tracking-widest text-amber-300">
                  QUESTION {currentIndex + 1} <span className="text-slate-500">/ 10</span>
                </div>
              </div>

              {/* Question Prompt */}
              <h2 className="text-lg sm:text-xl font-cinzel font-semibold text-white tracking-wide leading-relaxed mb-6">
                {currentQ.prompt}
              </h2>

              {/* 4 Shuffled Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {currentQ.shuffledOptions.map((option, idx) => {
                  const optionLetter = ['A', 'B', 'C', 'D'][idx];
                  const isSelected = selectedOption === option;
                  const isCorrect = option === currentQ.correctText;

                  let optionStyle =
                    'bg-slate-900/70 border-slate-700/80 text-slate-200 hover:bg-slate-800/90 hover:border-slate-500 hover:shadow-[0_0_20px_rgba(255,255,255,0.08)]';

                  if (isAnswerLocked) {
                    if (isCorrect) {
                      // Highlight correct answer in vibrant green
                      optionStyle =
                        'bg-emerald-950/80 border-emerald-400 text-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.5)] font-bold';
                    } else if (isSelected && !isCorrect) {
                      // Highlight chosen wrong answer in red
                      optionStyle =
                        'bg-red-950/80 border-red-500 text-red-200 shadow-[0_0_25px_rgba(239,68,68,0.5)] line-through';
                    } else {
                      // Other non-selected options fade slightly
                      optionStyle = 'bg-slate-950/40 border-slate-800/50 text-slate-500 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={isAnswerLocked}
                      onClick={() => handleSelectOption(option)}
                      className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between cursor-pointer ${optionStyle} ${
                        !isAnswerLocked ? 'active:scale-98' : 'cursor-default'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-black/60 border border-slate-700/80 flex items-center justify-center font-cinzel text-xs font-bold text-slate-300">
                          {optionLetter}
                        </span>
                        <span className="font-cormorant text-base sm:text-lg text-slate-100 font-medium">
                          {option}
                        </span>
                      </div>

                      {isAnswerLocked && isCorrect && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      )}
                      {isAnswerLocked && isSelected && !isCorrect && (
                        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Answer Feedback & Next Button */}
            {isAnswerLocked && (
              <div className="mt-2 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
                {/* Funny Reaction Speech Bubble */}
                <div className="flex items-center gap-2.5 text-center sm:text-left">
                  <div className="text-2xl">{isTimeout ? '⌛' : selectedOption === currentQ.correctText ? '🧛‍♀️' : '💀'}</div>
                  <div>
                    <p className="font-cinzel text-xs sm:text-sm font-bold text-amber-300 tracking-wider">
                      {reactionText}
                    </p>
                    {selectedOption !== currentQ.correctText && (
                      <p className="font-cormorant text-xs sm:text-sm text-slate-400 italic">
                        Correct: <span className="text-emerald-300 font-semibold">{currentQ.correctText}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Next Question Button */}
                <button
                  type="button"
                  id="btn-next-mbbs-question"
                  onClick={handleNextQuestion}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-cinzel font-bold text-xs sm:text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_25px_rgba(239,68,68,0.5)] border border-red-300 hover:scale-105 transition-all"
                >
                  <span>{currentIndex < 9 ? 'NEXT QUESTION' : 'VIEW DIAGNOSIS'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* D. CINEMATIC DIAGNOSIS & FINAL RESULT */}
        {/* ----------------------------------------------------------------- */}
        {phase === 'diagnosing' && (
          <div className="w-full max-w-lg mx-auto text-center p-6 sm:p-8 rounded-3xl gothic-glass border-2 border-red-500/70 shadow-[0_0_100px_rgba(239,68,68,0.5)] bg-[#07020b]/95 backdrop-blur-xl animate-fadeIn flex flex-col items-center z-30">
            {/* Suspense Stage 0: "DIAGNOSING DR. DRACULA..." */}
            {diagnosisStep === 0 && (
              <div className="py-8 flex flex-col items-center animate-fadeIn">
                <div className="w-20 h-20 rounded-full bg-red-950 border-2 border-red-500 flex items-center justify-center mb-5 animate-heartbeat shadow-[0_0_50px_rgba(239,68,68,0.7)]">
                  <Activity className="w-10 h-10 text-red-400" />
                </div>
                <h2 className="text-xl sm:text-2xl font-cinzel-decorative font-bold text-red-300 tracking-[0.25em] uppercase animate-pulse">
                  DIAGNOSING DR. DRACULA...
                </h2>
                <p className="font-cormorant text-base text-slate-400 italic mt-2">
                  Calculating clinical accuracy & survival rate...
                </p>
              </div>
            )}

            {/* Score Count Up & Tier Reveal */}
            {diagnosisStep >= 1 && (
              <div className="w-full flex flex-col items-center animate-fadeIn">
                {/* Result Tier Icon */}
                <div className="text-5xl sm:text-6xl mb-2 animate-bounce">
                  {resultTier.icon}
                </div>

                {/* Score Banner with Animated Score */}
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-black/80 border border-amber-400/60 shadow-[0_0_30px_rgba(245,158,11,0.4)] mb-4">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span className="font-cinzel text-sm text-slate-300 font-bold tracking-widest uppercase">
                    SCORE:
                  </span>
                  <span className="font-mono text-2xl sm:text-3xl font-black text-amber-300">
                    {animatedScore} <span className="text-slate-500 text-sm font-normal">/ 10</span>
                  </span>
                </div>

                {/* Title Badge */}
                <div className={`px-4 py-1.5 rounded-full border text-xs sm:text-sm font-cinzel font-bold tracking-[0.2em] uppercase mb-4 ${resultTier.badgeColor}`}>
                  {resultTier.title}
                </div>

                {/* Dracula's Funny Quotes */}
                <div className="p-4 rounded-2xl bg-black/60 border border-slate-800 text-center mb-6 max-w-md">
                  <p className="font-cinzel text-base sm:text-lg font-bold text-white tracking-wide mb-1">
                    "{resultTier.quote1}"
                  </p>
                  <p className="font-cormorant text-sm sm:text-base text-slate-300 italic">
                    "{resultTier.quote2}"
                  </p>
                </div>

                {/* Action Buttons: Continue & Try Again */}
                <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                  <button
                    type="button"
                    id="btn-retry-mbbs-quiz"
                    onClick={handleStartQuiz}
                    className="px-5 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 font-cinzel text-xs tracking-widest uppercase flex items-center gap-2 cursor-pointer shadow-md hover:scale-105 transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>RETRY QUIZ</span>
                  </button>

                  <button
                    type="button"
                    id="btn-continue-from-quiz"
                    onClick={() => {
                      soundEngine.playSuccessGateOpen();
                      if (onProceedToNext) {
                        onProceedToNext();
                      } else if (onReturnToTreasureHunt) {
                        onReturnToTreasureHunt();
                      }
                    }}
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-yellow-500 hover:from-red-500 hover:to-yellow-400 text-white font-cinzel font-bold text-xs sm:text-sm tracking-[0.2em] uppercase flex items-center gap-2 cursor-pointer shadow-[0_0_35px_rgba(245,158,11,0.6)] border border-amber-300 hover:scale-105 active:scale-95 transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-yellow-200" />
                    <span>[ CONTINUE ]</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 4. FOOTER */}
      {/* ========================================================================= */}
      <footer className="relative z-20 pb-3 text-center text-slate-500/80 font-cinzel text-[10px] sm:text-xs tracking-[0.25em] uppercase pointer-events-none">
        Chapter IV &bull; Dr. Dracula: Quiz Chamber &bull; MBBS Boss Level
      </footer>
    </div>
  );
};
