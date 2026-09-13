import React, { useState, useEffect } from 'react';
import { Sparkles, ChevronRight } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

interface SecretDoorIntroProps {
  onComplete: () => void;
  onManualLightning?: () => void;
}

export const SecretDoorIntro: React.FC<SecretDoorIntroProps> = ({
  onComplete,
}) => {
  // Intro Sub-Scenes:
  // 1: 'door' (Closed gothic door with "Something is waiting behind this door... 👀" + [ OPEN THE DOOR 🚪 ])
  // 2: 'opening' (Door swinging open, bright light flare, cinematic zoom)
  // 3: 'hello_dracula' ("HELLO DRACULA 😁" staged animation + "Okayyy... you made it this far. 😂" + "But I have something for you to do first... 👀")
  // 4: 'challenge' ("If you want to see what's waiting at the end..." + "You're going to have to solve a few riddles. 😏" + "Each challenge takes you one step closer." + "Think carefully. Don't give up. 😂")
  // 5: 'ready_start' ("Ready, Dracula? 😁" + [ LET'S BEGIN 🧛‍♀️ ])
  const [scene, setScene] = useState<'door' | 'opening' | 'hello_dracula' | 'challenge' | 'ready_start'>('door');

  // Animation sub-phases for Scene 2 (HELLO DRACULA)
  const [helloPhase, setHelloPhase] = useState<number>(0);
  // Animation sub-phases for Scene 3 (THE CHALLENGE)
  const [challengePhase, setChallengePhase] = useState<number>(0);

  // Handle clicking "OPEN THE DOOR 🚪"
  const handleOpenDoor = () => {
    soundEngine.playSuccessGateOpen();
    setScene('opening');

    // Wait for the door opening & light expansion animation, then transition to Scene 2
    setTimeout(() => {
      setScene('hello_dracula');
    }, 2200);
  };

  // Scene 2 staged reveals
  useEffect(() => {
    if (scene === 'hello_dracula') {
      setHelloPhase(1); // 'HELLO' appears

      const t1 = setTimeout(() => setHelloPhase(2), 600); // 'DRACULA' appears
      const t2 = setTimeout(() => setHelloPhase(3), 1200); // '😁' pops in with bounce
      const t3 = setTimeout(() => setHelloPhase(4), 2200); // "Okayyy... you made it this far. 😂"
      const t4 = setTimeout(() => setHelloPhase(5), 3600); // "But I have something for you to do first... 👀"

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    }
  }, [scene]);

  // Scene 3 staged reveals
  useEffect(() => {
    if (scene === 'challenge') {
      setChallengePhase(1); // "If you want to see what's waiting at the end..."

      const t1 = setTimeout(() => setChallengePhase(2), 1000); // "You're going to have to solve a few riddles. 😏"
      const t2 = setTimeout(() => setChallengePhase(3), 2200); // "Each challenge takes you one step closer."
      const t3 = setTimeout(() => setChallengePhase(4), 3400); // "Think carefully. Don't give up. 😂"

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [scene]);

  const handleStartFirstRiddle = () => {
    soundEngine.playHoverTone();
    onComplete();
  };

  return (
    <div className="relative w-full min-h-[580px] sm:min-h-[640px] flex flex-col items-center justify-center select-none overflow-hidden px-4 py-6">
      {/* ========================================================================= */}
      {/* SCENE 1 & OPENING: THE MYSTERIOUS GOTHIC DOOR                             */}
      {/* ========================================================================= */}
      {(scene === 'door' || scene === 'opening') && (
        <div className="relative flex flex-col items-center justify-center w-full max-w-lg mx-auto animate-fadeIn">
          {/* Top Floating Mystery Tag */}
          <div className="mb-5 text-center transition-all duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-950/60 border border-red-500/40 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.25)] backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="font-cinzel text-xs sm:text-sm tracking-widest font-semibold uppercase">
                A Secret Gateway
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            </div>

            <h1 className="mt-3 text-lg sm:text-2xl font-cormorant italic text-slate-200 font-medium tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              Something is waiting behind this door... 👀
            </h1>
          </div>

          {/* THE 3D GOTHIC DOOR ARCHITECTURE */}
          <div
            className={`relative w-64 h-80 sm:w-76 sm:h-96 my-2 rounded-t-[100px] sm:rounded-t-[120px] p-2.5 bg-gradient-to-b from-[#1a080e] via-[#120509] to-[#080204] border-4 border-[#4a1c26] shadow-[0_0_50px_rgba(185,28,28,0.35),inset_0_0_30px_rgba(0,0,0,0.9)] flex items-center justify-center perspective-[1200px] transition-transform duration-1000 ${
              scene === 'opening' ? 'scale-110 shadow-[0_0_90px_rgba(251,191,36,0.6)]' : 'scale-100'
            }`}
          >
            {/* Outer Stone/Iron Arch Inset & Filigree */}
            <div className="absolute inset-1.5 rounded-t-[90px] sm:rounded-t-[110px] border border-red-500/20 pointer-events-none" />

            {/* Glowing Light Burst Behind the Doors (Visible when opening) */}
            <div
              className={`absolute inset-3 rounded-t-[85px] sm:rounded-t-[105px] bg-gradient-to-t from-amber-100 via-amber-300 to-white transition-opacity duration-1000 flex items-center justify-center ${
                scene === 'opening' ? 'opacity-100 animate-pulse' : 'opacity-0'
              }`}
            >
              <div className="w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,1)_0%,rgba(251,191,36,0.8)_50%,transparent_90%)] blur-md" />
            </div>

            {/* Door Container (Double Leaf Doors) */}
            <div className="relative w-full h-full rounded-t-[85px] sm:rounded-t-[105px] overflow-hidden flex [perspective:1000px]">
              {/* LEFT DOOR LEAF */}
              <div
                className={`w-1/2 h-full bg-gradient-to-r from-[#22070d] via-[#2f0d14] to-[#1a0509] border-r border-[#4a1520] transition-transform duration-[1800ms] ease-in-out origin-left flex flex-col justify-between p-3 relative ${
                  scene === 'opening' ? '[transform:rotateY(-115deg)] shadow-2xl' : '[transform:rotateY(0deg)]'
                }`}
              >
                {/* Wood Plank Grooves */}
                <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,rgba(0,0,0,0.4)_21px,transparent_22px)] opacity-60 pointer-events-none" />
                
                {/* Upper Gothic Arch Inlay */}
                <div className="w-full h-24 rounded-t-full border-2 border-[#5c1c28]/60 bg-black/30 mt-2 flex items-center justify-center shadow-inner">
                  <div className="w-3 h-3 rounded-full border border-amber-500/40 flex items-center justify-center">
                    <span className="text-[7px] text-amber-400">✦</span>
                  </div>
                </div>

                {/* Left Door Iron Studs & Banding */}
                <div className="space-y-4 my-auto relative z-10">
                  <div className="h-1.5 w-full bg-gradient-to-r from-[#1a0509] via-[#4a1520] to-[#1a0509] rounded-full border-t border-red-400/20 shadow-sm flex items-center justify-around px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-600/70 shadow-sm" />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-600/70 shadow-sm" />
                  </div>
                  <div className="h-1.5 w-full bg-gradient-to-r from-[#1a0509] via-[#4a1520] to-[#1a0509] rounded-full border-t border-red-400/20 shadow-sm flex items-center justify-around px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-600/70 shadow-sm" />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-600/70 shadow-sm" />
                  </div>
                </div>

                {/* Left Door Handle & Ring */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="w-4 h-6 rounded-t-sm bg-gradient-to-b from-amber-600 via-amber-700 to-amber-900 border border-amber-400/60 shadow-md flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-300 shadow-sm" />
                  </div>
                  <div className="w-3.5 h-5 rounded-b-full border-2 border-amber-500/80 -mt-1 shadow-md" />
                </div>

                {/* Lower Door Panel */}
                <div className="w-full h-16 rounded-md border-2 border-[#5c1c28]/60 bg-black/40 mb-2 shadow-inner" />
              </div>

              {/* RIGHT DOOR LEAF */}
              <div
                className={`w-1/2 h-full bg-gradient-to-l from-[#22070d] via-[#2f0d14] to-[#1a0509] border-l border-[#4a1520] transition-transform duration-[1800ms] ease-in-out origin-right flex flex-col justify-between p-3 relative ${
                  scene === 'opening' ? '[transform:rotateY(115deg)] shadow-2xl' : '[transform:rotateY(0deg)]'
                }`}
              >
                {/* Wood Plank Grooves */}
                <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,rgba(0,0,0,0.4)_21px,transparent_22px)] opacity-60 pointer-events-none" />

                {/* Upper Gothic Arch Inlay */}
                <div className="w-full h-24 rounded-t-full border-2 border-[#5c1c28]/60 bg-black/30 mt-2 flex items-center justify-center shadow-inner">
                  <div className="w-3 h-3 rounded-full border border-amber-500/40 flex items-center justify-center">
                    <span className="text-[7px] text-amber-400">✦</span>
                  </div>
                </div>

                {/* Right Door Iron Studs & Banding */}
                <div className="space-y-4 my-auto relative z-10">
                  <div className="h-1.5 w-full bg-gradient-to-r from-[#1a0509] via-[#4a1520] to-[#1a0509] rounded-full border-t border-red-400/20 shadow-sm flex items-center justify-around px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-600/70 shadow-sm" />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-600/70 shadow-sm" />
                  </div>
                  <div className="h-1.5 w-full bg-gradient-to-r from-[#1a0509] via-[#4a1520] to-[#1a0509] rounded-full border-t border-red-400/20 shadow-sm flex items-center justify-around px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-600/70 shadow-sm" />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-600/70 shadow-sm" />
                  </div>
                </div>

                {/* Right Door Handle & Keyhole */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="w-4 h-6 rounded-t-sm bg-gradient-to-b from-amber-600 via-amber-700 to-amber-900 border border-amber-400/60 shadow-md flex items-center justify-center">
                    <div className="w-1 h-2 bg-black rounded-full" />
                  </div>
                  <div className="w-3.5 h-5 rounded-b-full border-2 border-amber-500/80 -mt-1 shadow-md" />
                </div>

                {/* Lower Door Panel */}
                <div className="w-full h-16 rounded-md border-2 border-[#5c1c28]/60 bg-black/40 mb-2 shadow-inner" />
              </div>
            </div>

            {/* Glowing Door Keyhole / Seam Light */}
            {scene === 'door' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-red-500/20 blur-md pointer-events-none animate-pulse" />
            )}
          </div>

          {/* OPEN THE DOOR BUTTON */}
          {scene === 'door' && (
            <button
              type="button"
              id="btn-open-secret-door"
              onClick={handleOpenDoor}
              className="mt-6 px-8 py-3.5 sm:px-10 sm:py-4 rounded-2xl bg-gradient-to-r from-red-800 via-rose-700 to-amber-700 hover:from-red-700 hover:via-rose-600 hover:to-amber-600 active:scale-95 text-white font-cinzel font-bold text-sm sm:text-base tracking-[0.2em] uppercase flex items-center justify-center gap-3 cursor-pointer shadow-[0_0_40px_rgba(225,29,72,0.5)] border border-rose-400/60 hover:border-amber-300 transition-all duration-300 hover:scale-105"
            >
              <span>OPEN THE DOOR 🚪</span>
            </button>
          )}

          {scene === 'opening' && (
            <div className="mt-6 flex items-center justify-center gap-2 text-amber-300 font-cinzel text-xs tracking-[0.25em] uppercase animate-pulse">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <span>Unsealing the Chamber...</span>
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCENE 2: HELLO DRACULA                                                    */}
      {/* ========================================================================= */}
      {scene === 'hello_dracula' && (
        <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-3xl gothic-glass border-2 border-rose-500/60 shadow-[0_0_60px_rgba(225,29,72,0.4)] bg-[#0f0408]/90 backdrop-blur-xl flex flex-col items-center text-center animate-fadeIn transition-all">
          {/* Subtle Decorative Top Crest */}
          <div className="flex items-center justify-center gap-2 mb-4 opacity-75">
            <div className="h-[1px] w-8 bg-gradient-to-r from-transparent via-rose-400/60 to-transparent" />
            <span className="text-rose-300 text-xs tracking-widest font-cinzel">✦ ❖ ✦</span>
            <div className="h-[1px] w-8 bg-gradient-to-r from-transparent via-rose-400/60 to-transparent" />
          </div>

          {/* 1. PLAYFUL ANIMATED "HELLO DRACULA 😁" */}
          <div className="min-h-[70px] flex items-center justify-center flex-wrap gap-2 sm:gap-3 my-2">
            {helloPhase >= 1 && (
              <span className="text-2xl sm:text-4xl font-cinzel-decorative font-extrabold text-white tracking-wider animate-fadeIn drop-shadow-[0_2px_15px_rgba(255,255,255,0.4)]">
                HELLO
              </span>
            )}
            {helloPhase >= 2 && (
              <span className="text-2xl sm:text-4xl font-cinzel-decorative font-extrabold text-rose-400 tracking-wider animate-fadeIn drop-shadow-[0_2px_20px_rgba(244,63,94,0.6)]">
                DRACULA
              </span>
            )}
            {helloPhase >= 3 && (
              <span className="text-3xl sm:text-5xl inline-block animate-bounce drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                😁
              </span>
            )}
          </div>

          {/* 2. "Okayyy... you made it this far. 😂" */}
          {helloPhase >= 4 && (
            <div className="mt-4 animate-fadeIn transition-all duration-500">
              <p className="font-cormorant italic text-lg sm:text-xl text-slate-200 font-medium tracking-wide">
                Okayyy... you made it this far. 😂
              </p>
            </div>
          )}

          {/* 3. "But I have something for you to do first... 👀" */}
          {helloPhase >= 5 && (
            <div className="mt-3 animate-fadeIn transition-all duration-500">
              <p className="font-cormorant text-base sm:text-lg text-rose-300/95 font-semibold tracking-wide">
                But I have something for you to do first... 👀
              </p>
            </div>
          )}

          {/* Next Button */}
          {helloPhase >= 5 && (
            <button
              type="button"
              id="btn-intro-to-challenge"
              onClick={() => {
                soundEngine.playHoverTone();
                setScene('challenge');
              }}
              className="mt-6 px-7 py-3 rounded-2xl bg-gradient-to-r from-rose-700 to-amber-700 hover:from-rose-600 hover:to-amber-600 active:scale-95 text-white font-cinzel font-bold text-xs sm:text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_30px_rgba(225,29,72,0.4)] border border-rose-400/50 hover:scale-105 transition-all animate-fadeIn"
            >
              <span>CONTINUE</span>
              <ChevronRight className="w-4 h-4 text-amber-300" />
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCENE 3: THE CHALLENGE INTRO                                              */}
      {/* ========================================================================= */}
      {scene === 'challenge' && (
        <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-3xl gothic-glass border-2 border-amber-500/60 shadow-[0_0_60px_rgba(245,158,11,0.35)] bg-[#0f0704]/90 backdrop-blur-xl flex flex-col items-center text-center animate-fadeIn">
          {/* Top Mystic Symbol */}
          <div className="w-12 h-12 rounded-full bg-amber-950/80 border border-amber-500/50 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            <span className="text-xl">📜</span>
          </div>

          {/* Staged Challenge Lines */}
          <div className="space-y-4 my-2 text-center w-full">
            {challengePhase >= 1 && (
              <p className="font-cormorant italic text-lg sm:text-xl text-slate-200 font-medium tracking-wide animate-fadeIn">
                "If you want to see what's waiting at the end..."
              </p>
            )}

            {challengePhase >= 2 && (
              <p className="font-cinzel text-base sm:text-lg text-amber-300 font-bold tracking-wider animate-fadeIn drop-shadow-[0_2px_10px_rgba(245,158,11,0.4)]">
                You're going to have to solve a few riddles. 😏
              </p>
            )}

            {challengePhase >= 3 && (
              <div className="p-3 rounded-xl bg-black/60 border border-amber-500/30 animate-fadeIn">
                <p className="font-cormorant text-sm sm:text-base text-slate-300 font-medium">
                  Each challenge takes you one step closer.
                </p>
              </div>
            )}

            {challengePhase >= 4 && (
              <p className="font-cormorant italic text-base sm:text-lg text-amber-200/90 font-semibold animate-fadeIn">
                Think carefully. Don't give up. 😂
              </p>
            )}
          </div>

          {/* Next Button to Scene 4 */}
          {challengePhase >= 4 && (
            <button
              type="button"
              id="btn-intro-to-ready"
              onClick={() => {
                soundEngine.playHoverTone();
                setScene('ready_start');
              }}
              className="mt-6 px-7 py-3 rounded-2xl bg-gradient-to-r from-amber-700 via-rose-700 to-red-800 hover:from-amber-600 hover:via-rose-600 hover:to-red-700 active:scale-95 text-white font-cinzel font-bold text-xs sm:text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_30px_rgba(245,158,11,0.4)] border border-amber-400/50 hover:scale-105 transition-all animate-fadeIn"
            >
              <span>I'M READY</span>
              <ChevronRight className="w-4 h-4 text-amber-300" />
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCENE 4: START — "Ready, Dracula? 😁" + [ LET'S BEGIN 🧛‍♀️ ]                */}
      {/* ========================================================================= */}
      {scene === 'ready_start' && (
        <div className="w-full max-w-md mx-auto p-6 sm:p-9 rounded-3xl gothic-glass border-2 border-rose-500 shadow-[0_0_70px_rgba(225,29,72,0.5)] bg-[#120409]/95 backdrop-blur-xl flex flex-col items-center text-center animate-fadeIn">
          {/* Avatar Emoji */}
          <div className="text-5xl sm:text-6xl mb-3 animate-bounce">
            🧛‍♀️
          </div>

          <h2 className="text-2xl sm:text-3xl font-cinzel-decorative font-bold text-white tracking-wider mb-2 drop-shadow-[0_2px_15px_rgba(244,63,94,0.6)]">
            Ready, Dracula? 😁
          </h2>

          <p className="font-cormorant italic text-sm sm:text-base text-slate-300 mb-6">
            The first trial awaits beyond the gates.
          </p>

          <button
            type="button"
            id="btn-lets-begin-intro"
            onClick={handleStartFirstRiddle}
            className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-rose-700 via-red-600 to-amber-600 hover:from-rose-600 hover:via-red-500 hover:to-amber-500 active:scale-95 text-white font-cinzel font-extrabold text-sm sm:text-base tracking-[0.25em] uppercase flex items-center justify-center gap-3 cursor-pointer shadow-[0_0_40px_rgba(225,29,72,0.7)] border-2 border-rose-300 hover:scale-105 transition-all duration-200"
          >
            <span>LET'S BEGIN 🧛‍♀️</span>
          </button>
        </div>
      )}
    </div>
  );
};
