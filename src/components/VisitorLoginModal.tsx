import React, { useState } from 'react';
import { User, Sparkles, X, Shield, Check } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

interface VisitorLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  currentMoniker?: string;
  currentEmail?: string;
  onSave: (info: { name: string; moniker?: string; email?: string }) => void;
}

export const VisitorLoginModal: React.FC<VisitorLoginModalProps> = ({
  isOpen,
  onClose,
  currentName,
  currentMoniker = '',
  currentEmail = '',
  onSave,
}) => {
  const [name, setName] = useState(currentName || '');
  const [moniker, setMoniker] = useState(currentMoniker || '');
  const [email, setEmail] = useState(currentEmail || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.playSuccessGateOpen();
    const finalName = name.trim() || 'Mortal Visitor';
    onSave({
      name: finalName,
      moniker: moniker.trim(),
      email: email.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md p-6 sm:p-8 rounded-2xl gothic-glass border border-cyan-500/40 shadow-[0_0_50px_rgba(56,189,248,0.25)] bg-[#070b14]/95 text-slate-200 select-none">
        {/* Filigree corner accents */}
        <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t border-l border-cyan-400/50 rounded-tl-sm pointer-events-none" />
        <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t border-r border-cyan-400/50 rounded-tr-sm pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b border-l border-cyan-400/50 rounded-bl-sm pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b border-r border-cyan-400/50 rounded-br-sm pointer-events-none" />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-cyan-950/70 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.3)]">
            <Shield className="w-6 h-6 text-cyan-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-cinzel-decorative font-bold text-white tracking-wider">
            Visitor Registry Seal
          </h2>
          <p className="text-xs font-cormorant text-slate-400 italic mt-1">
            Sign your mortal name into the Vampire Lord's chronicles before answering the trials.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-cinzel tracking-wider text-cyan-300 uppercase mb-1.5 font-semibold">
              Mortal Name / Nickname <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul, Pooja, Kiran..."
                autoFocus
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-black/60 border border-cyan-900/80 focus:border-cyan-400 focus:outline-none text-white text-sm font-cinzel placeholder:text-slate-600 shadow-inner"
              />
              <User className="absolute left-3 top-3 w-4 h-4 text-cyan-500/70" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-cinzel tracking-wider text-slate-400 uppercase mb-1.5">
              Vampire Alias / Title (Optional)
            </label>
            <input
              type="text"
              value={moniker}
              onChange={(e) => setMoniker(e.target.value)}
              placeholder="e.g. The Nightwalker, Shadow Monarch..."
              className="w-full px-3 py-2.5 rounded-lg bg-black/60 border border-slate-800 focus:border-cyan-400 focus:outline-none text-slate-300 text-sm font-cinzel placeholder:text-slate-600 shadow-inner"
            />
          </div>

          <div>
            <label className="block text-xs font-cinzel tracking-wider text-slate-400 uppercase mb-1.5">
              Email Address (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. yourname@example.com"
              className="w-full px-3 py-2.5 rounded-lg bg-black/60 border border-slate-800 focus:border-cyan-400 focus:outline-none text-slate-300 text-sm font-cinzel placeholder:text-slate-600 shadow-inner"
            />
            <p className="text-[10px] text-slate-500 mt-1 font-cormorant">
              All question answers and voice recordings will be archived and dispatched to <span className="text-cyan-400/80 font-mono">kmsiddesh009@gmail.com</span> upon completion.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-lg gothic-btn text-cyan-100 font-cinzel text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-cyan-500/20"
            >
              <Check className="w-4 h-4" />
              <span>Seal Identity & Continue</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
