import React, { useEffect, useState } from 'react';
import { Sparkles, KeyRound } from 'lucide-react';

interface GateTransitionProps {
  successMessage: string;
  onTransitionComplete: () => void;
}

export const GateTransition: React.FC<GateTransitionProps> = ({
  successMessage,
  onTransitionComplete,
}) => {
  const [phase, setPhase] = useState<'flash' | 'unseal' | 'partGates' | 'done'>('flash');

  useEffect(() => {
    // Phase 1: Sudden mystical moonlight flash & bell chime (0 - 1.2s)
    const t1 = setTimeout(() => {
      setPhase('unseal');
    }, 1100);

    // Phase 2: Fog parting and iron gate unsealing (1.2s - 2.8s)
    const t2 = setTimeout(() => {
      setPhase('partGates');
    }, 2800);

    // Phase 3: Transition to the inner realm / second page (4.2s)
    const t3 = setTimeout(() => {
      setPhase('done');
      onTransitionComplete();
    }, 4500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onTransitionComplete]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden">
      {/* 1. Supernatural Moonlight Flash */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 bg-gradient-to-t from-cyan-100 via-sky-300 to-white ${
          phase === 'flash' ? 'opacity-70 mix-blend-overlay' : 'opacity-0'
        }`}
      />

      {/* 2. Mystical Dissolving Runes and Fog Opening */}
      <div
        className={`absolute inset-0 bg-[#02050a] transition-opacity duration-1000 ${
          phase === 'partGates' ? 'opacity-90' : 'opacity-0'
        }`}
      />

      {/* 3. Splitting Heavy Wrought-Iron Gothic Gates Overlay */}
      <div className="absolute inset-0 flex w-full h-full">
        {/* Left Gate Wing */}
        <div
          className={`w-1/2 h-full bg-gradient-to-r from-black via-[#060e18] to-[#0d1c2c] border-r-2 border-cyan-400/40 transition-transform duration-[2000ms] ease-in-out ${
            phase === 'partGates' ? '-translate-x-full' : 'translate-x-0'
          }`}
        >
          {/* Iron Grille Pattern */}
          <div className="w-full h-full opacity-30 bg-[radial-gradient(circle_at_center,transparent_40%,#000_100%)] flex items-center justify-end pr-6">
            <div className="space-y-6">
              <div className="w-24 h-24 rounded-full border border-cyan-400/30 flex items-center justify-center">
                <span className="font-cinzel text-cyan-300 text-3xl font-black">✦</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Gate Wing */}
        <div
          className={`w-1/2 h-full bg-gradient-to-l from-black via-[#060e18] to-[#0d1c2c] border-l-2 border-cyan-400/40 transition-transform duration-[2000ms] ease-in-out ${
            phase === 'partGates' ? 'translate-x-full' : 'translate-x-0'
          }`}
        >
          {/* Iron Grille Pattern */}
          <div className="w-full h-full opacity-30 bg-[radial-gradient(circle_at_center,transparent_40%,#000_100%)] flex items-center justify-start pl-6">
            <div className="space-y-6">
              <div className="w-24 h-24 rounded-full border border-cyan-400/30 flex items-center justify-center">
                <span className="font-cinzel text-cyan-300 text-3xl font-black">✦</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Center Success Seal & Cinematic Message Banner */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 max-w-lg">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-b from-[#14314e] to-[#081525] border-2 border-cyan-300 shadow-[0_0_50px_rgba(56,189,248,0.8)] flex items-center justify-center mb-6 animate-pulse">
          <KeyRound className="w-10 h-10 text-cyan-200 animate-spin [animation-duration:12s]" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-cyan-300 font-cinzel text-xs tracking-[0.3em] uppercase">
            <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
            <span>The Ancient Seal Dissolves</span>
            <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
          </div>

          <h1 className="text-2xl sm:text-4xl font-cinzel-decorative font-bold text-white tracking-widest drop-shadow-[0_0_20px_rgba(56,189,248,0.7)]">
            {successMessage}
          </h1>

          <p className="font-cormorant italic text-lg sm:text-xl text-cyan-200/90 tracking-wider">
            Entering the Count's inner sanctuary...
          </p>
        </div>
      </div>
    </div>
  );
};
