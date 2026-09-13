import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Mail, CheckCircle2, AlertCircle, User, Calendar, Clock, Scroll, Send } from 'lucide-react';
import { VisitorSessionRecord } from '../types';
import { soundEngine } from '../utils/soundEngine';

interface RecordsExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RecordsExplorerModal: React.FC<RecordsExplorerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [records, setRecords] = useState<VisitorSessionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/visitor/records');
      const data = await resp.json();
      if (data.success && Array.isArray(data.records)) {
        setRecords(data.records);
        if (data.records.length > 0 && !selectedSessionId) {
          setSelectedSessionId(data.records[0].sessionId);
        }
      }
    } catch (err) {
      console.error('[Records Explorer] Error fetching records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void fetchRecords();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleResendEmail = async (sessionId: string) => {
    setResendingId(sessionId);
    setResendStatus(null);
    try {
      const resp = await fetch(`/api/visitor/resend-dossier/${sessionId}`, { method: 'POST' });
      const data = await resp.json();
      if (data.success) {
        setResendStatus(`Dossier email dispatched successfully to kmsiddesh009@gmail.com!`);
        void fetchRecords();
      } else {
        setResendStatus(`Resend notice: ${data.error || 'Failed'}`);
      }
    } catch (err: any) {
      setResendStatus(`Error: ${err?.message || 'Failed to dispatch email'}`);
    } finally {
      setResendingId(null);
    }
  };

  const selectedRecord = records.find((r) => r.sessionId === selectedSessionId) || records[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-4xl h-[85vh] flex flex-col rounded-2xl gothic-glass border border-cyan-500/40 shadow-[0_0_60px_rgba(56,189,248,0.3)] bg-[#070b14]/95 text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center">
              <Scroll className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-cinzel-decorative font-bold text-white tracking-wider">
                Castle Visitor Dossier Chronicles
              </h2>
              <p className="text-xs font-cinzel text-cyan-400/80 tracking-wider">
                Stored Login Records & Completed Answers ({records.length} Visitors)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchRecords}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
              title="Refresh records"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Resend status alert banner */}
        {resendStatus && (
          <div className="px-6 py-2.5 bg-cyan-950/80 border-b border-cyan-500/40 text-xs font-cinzel text-cyan-200 flex items-center justify-between">
            <span>{resendStatus}</span>
            <button
              type="button"
              onClick={() => setResendStatus(null)}
              className="text-slate-400 hover:text-white"
            >
              &times;
            </button>
          </div>
        )}

        {/* Body Split View */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Visitors List */}
          <div className="w-full md:w-1/3 border-r border-slate-800 overflow-y-auto bg-black/40 p-3 space-y-2">
            {records.length === 0 ? (
              <div className="p-6 text-center text-xs font-cormorant italic text-slate-500">
                No visitor sessions recorded yet. Visitors who sign in and answer questions will appear here.
              </div>
            ) : (
              records.map((rec) => {
                const isSelected = rec.sessionId === selectedSessionId;
                return (
                  <div
                    key={rec.sessionId}
                    onClick={() => setSelectedSessionId(rec.sessionId)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-400/80 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                        : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-cinzel text-xs font-bold text-white truncate max-w-[140px]">
                        {rec.userName || 'Mortal Visitor'}
                      </span>
                      <span
                        className={`text-[9px] font-cinzel uppercase px-1.5 py-0.5 rounded border ${
                          rec.status === 'completed'
                            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                            : 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                        }`}
                      >
                        {rec.status === 'completed' ? 'Completed' : 'In Progress'}
                      </span>
                    </div>

                    <div className="text-[11px] font-cormorant text-slate-400 truncate">
                      {rec.answers?.length || 0} questions recorded
                    </div>

                    <div className="text-[10px] font-mono text-slate-500 mt-1">
                      {new Date(rec.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Selected Dossier Detail */}
          <div className="w-full md:w-2/3 overflow-y-auto p-4 sm:p-6 space-y-6">
            {selectedRecord ? (
              <div>
                {/* Visitor Profile Box */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-base font-cinzel font-bold text-white">
                        {selectedRecord.userName}
                      </h3>
                      {selectedRecord.moniker && (
                        <span className="text-xs font-cinzel text-cyan-300/80">
                          ({selectedRecord.moniker})
                        </span>
                      )}
                    </div>
                    {selectedRecord.email && (
                      <div className="text-xs text-slate-400 font-mono mt-1">
                        Email: {selectedRecord.email}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-500 mt-1 font-mono">
                      Session: {selectedRecord.sessionId}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleResendEmail(selectedRecord.sessionId)}
                    disabled={resendingId === selectedRecord.sessionId}
                    className="px-3.5 py-2 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-200 text-xs font-cinzel tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{resendingId === selectedRecord.sessionId ? 'Sending...' : 'Send Dossier Email'}</span>
                  </button>
                </div>

                {/* Email Dispatch Info */}
                <div className="p-3 rounded-lg bg-black/40 border border-slate-800/80 text-xs font-cinzel flex items-center gap-2 text-slate-300">
                  <Mail className="w-4 h-4 text-cyan-400" />
                  <span>
                    Email Target: <span className="text-cyan-300 font-mono">kmsiddesh009@gmail.com</span>
                    {selectedRecord.emailSent ? (
                      <span className="ml-2 text-emerald-400">✅ Dispatched</span>
                    ) : (
                      <span className="ml-2 text-slate-500">(Pending or recorded)</span>
                    )}
                  </span>
                </div>

                {/* Questions & Answers List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-cinzel tracking-widest text-slate-300 uppercase font-semibold">
                    Recorded Questions & Answers ({selectedRecord.answers?.length || 0}):
                  </h4>

                  {selectedRecord.answers && selectedRecord.answers.length > 0 ? (
                    selectedRecord.answers.map((ans, idx) => (
                      <div
                        key={ans.questionId || idx}
                        className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-left space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-cinzel font-bold text-cyan-400">
                            Question #{ans.questionNumber || idx + 1}: {ans.questionTitle}
                          </span>
                          <span className="text-[10px] font-cinzel uppercase bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-slate-300">
                            {ans.method.toUpperCase()} {ans.hasAudio ? '🎙️ Audio Attached' : '⌨️ Typed'}
                          </span>
                        </div>

                        <p className="text-xs font-cormorant text-slate-400 italic">
                          "{ans.questionPrompt}"
                        </p>

                        <div className="p-3 rounded-lg bg-black/60 border-l-2 border-cyan-400 text-sm font-cormorant italic text-white">
                          "{ans.answer}"
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs font-cormorant italic text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      No answers submitted yet for this session.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-cormorant italic text-slate-500">
                Select a visitor session from the left list to view their complete dossier records.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
