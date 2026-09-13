import React, { useState } from 'react';
import { Volume2, VolumeX, Zap, User } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

interface AudioControlProps {
  onManualLightning: () => void;
  visitorName: string;
  onOpenVisitorModal: () => void;
}

export const AudioControl: React.FC<AudioControlProps> = ({
  onManualLightning,
  visitorName,
  onOpenVisitorModal,
}) => {
  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());

  const toggleSound = () => {
    const newMuteState = soundEngine.toggleMute();
    setIsMuted(newMuteState);
  };

  const handleLightning = () => {
    onManualLightning();
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-none select-none">
      {/* Left side: Visitor Identity (Records button removed from UI, stored directly to DB & emailed) */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={onOpenVisitorModal}
          className="px-3 py-2 rounded-xl bg-[#091524]/85 hover:bg-[#11243b] border border-cyan-500/40 text-cyan-200 hover:text-white transition-all shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-md flex items-center gap-2 text-xs font-cinzel tracking-wider cursor-pointer group"
          title="Edit Visitor Identity / Name"
        >
          <User className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span className="max-w-[140px] sm:max-w-[200px] truncate font-semibold">
            {visitorName || 'Visitor'}
          </span>
        </button>
      </div>

      {/* Right side: Sound & Lightning Controls */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Sound Effects Mute Toggle */}
        <button
          id="sound-effects-toggle"
          type="button"
          onClick={toggleSound}
          className="p-2.5 rounded-xl bg-[#091524]/85 hover:bg-[#11243b] border border-cyan-500/30 text-cyan-200 hover:text-white transition-all shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-md flex items-center gap-2 text-xs font-cinzel tracking-wider cursor-pointer"
          title={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
        >
          {isMuted ? (
            <>
              <VolumeX className="w-4 h-4 text-slate-400" />
              <span className="hidden md:inline text-[11px] text-slate-400">Audio Muted</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-cyan-300" />
              <span className="hidden md:inline text-[11px] text-cyan-200">Audio Enabled</span>
            </>
          )}
        </button>

        {/* Manual Lightning Crash Trigger */}
        <button
          id="lightning-flash-button"
          type="button"
          onClick={handleLightning}
          className="p-2.5 rounded-xl bg-[#091524]/85 hover:bg-[#11243b] border border-cyan-500/30 text-cyan-300 hover:text-white transition-all shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-md cursor-pointer group"
          title="Summon Lightning"
        >
          <Zap className="w-4 h-4 transition-transform group-hover:scale-110 text-cyan-300" />
        </button>
      </div>
    </div>
  );
};
