import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Mail,
  Send,
  Download,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  X,
  Volume2,
  Key,
  Webhook,
  User,
  Clock,
  HelpCircle,
} from 'lucide-react';

interface DeliveryStatus {
  recipient: string[];
  sender: string;
  smtp: { configured: boolean; user: string | null; host: string | null; port: number | null };
  resend: { configured: boolean; keyPrefix: string | null };
  webhook: { configured: boolean; type: string | null };
  totalSessionsRecorded: number;
}

interface StoredAnswer {
  questionId: string;
  questionNumber: number;
  questionTitle: string;
  questionPrompt: string;
  answer: string;
  method: 'voice' | 'typed';
  isCorrect: boolean;
  timestamp: string;
  hasAudio: boolean;
  attachmentFilename?: string;
}

interface VisitorSession {
  sessionId: string;
  userName: string;
  moniker?: string;
  email?: string;
  status: string;
  startTime: string;
  completedTime?: string;
  durationSeconds?: number;
  totalAttempts: number;
  answers: StoredAnswer[];
  emailSent?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPortal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<DeliveryStatus | null>(null);
  const [sessions, setSessions] = useState<VisitorSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testOutput, setTestOutput] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<VisitorSession | null>(null);
  const [audioPlayingUrl, setAudioPlayingUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'visitors' | 'guide'>('status');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statusRes, recordsRes] = await Promise.all([
        fetch('/api/admin/status').then((r) => r.json()),
        fetch('/api/visitor/records').then((r) => r.json()),
      ]);
      setStatus(statusRes);
      if (recordsRes.records) {
        setSessions(recordsRes.records);
        if (recordsRes.records.length > 0 && !selectedSession) {
          setSelectedSession(recordsRes.records[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const handleTestDispatch = async () => {
    setTesting(true);
    setTestOutput(null);
    try {
      const res = await fetch('/api/admin/test-dispatch', { method: 'POST' });
      const data = await res.json();
      setTestOutput(data);
      fetchData();
    } catch (err: any) {
      setTestOutput({ success: false, error: err?.message || 'Network error' });
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Visitor Dossier & Email Control Panel
              </h2>
              <p className="text-xs text-slate-400">
                Live delivery diagnostics, visitor answers & recorded audio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40 gap-4">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'status'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            Delivery Channels
          </button>
          <button
            onClick={() => setActiveTab('visitors')}
            className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'visitors'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            Live Visitor Records ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'guide'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            How to Set Up Email in 1 Minute
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: STATUS & TEST */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* SMTP Card */}
                <div className={`p-4 rounded-xl border ${status?.smtp.configured ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-slate-950/50 border-slate-800'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5" /> Gmail SMTP
                    </span>
                    {status?.smtp.configured ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
                        <XCircle className="w-3 h-3" /> Not Configured
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white">Direct Gmail Sending</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {status?.smtp.configured ? `Logged in as: ${status.smtp.user}` : 'Uses Gmail App Password. Direct delivery with zero spam blocking.'}
                  </p>
                </div>

                {/* Resend API Card */}
                <div className={`p-4 rounded-xl border ${status?.resend.configured ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-slate-950/50 border-slate-800'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> Resend API
                    </span>
                    {status?.resend.configured ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle className="w-3 h-3" /> Key Detected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
                        <XCircle className="w-3 h-3" /> Not Configured
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white">Resend Email Gateway</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {status?.resend.configured ? `API Key: ${status.resend.keyPrefix}` : 'Requires verified sender or domain in Resend dashboard.'}
                  </p>
                </div>

                {/* Webhook Card */}
                <div className={`p-4 rounded-xl border ${status?.webhook.configured ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-slate-950/50 border-slate-800'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Webhook className="w-3.5 h-3.5" /> Webhook
                    </span>
                    {status?.webhook.configured ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
                        <XCircle className="w-3 h-3" /> Not Configured
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white">Discord / Slack Push</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {status?.webhook.configured ? `Type: ${status.webhook.type}` : 'Instant mobile alerts to Discord channel or webhook.'}
                  </p>
                </div>
              </div>

              {/* Action Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-white">Test All Delivery Channels</h4>
                  <p className="text-xs text-slate-400">
                    Sends a live diagnostic test message to <b>{status?.recipient?.join(', ') || 'kmsiddesh009@gmail.com'}</b> and verifies all connections.
                  </p>
                </div>
                <button
                  onClick={handleTestDispatch}
                  disabled={testing}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow transition-all flex items-center gap-2 shrink-0"
                >
                  {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Run Live Delivery Test
                </button>
              </div>

              {/* Diagnostic Test Result Box */}
              {testOutput && (
                <div className={`p-4 rounded-xl border text-xs font-mono ${testOutput.success ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-amber-950/40 border-amber-500/40 text-amber-200'}`}>
                  <div className="flex items-center gap-2 font-bold mb-2 text-sm font-sans">
                    {testOutput.success ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    {testOutput.success ? 'Delivery Channel Test Succeeded' : 'Delivery Diagnostics Notice'}
                  </div>
                  <p className="mb-2 font-sans">{testOutput.advice}</p>
                  <pre className="bg-black/50 p-3 rounded-lg overflow-x-auto text-slate-300">
                    {JSON.stringify(testOutput.results, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIVE VISITOR RECORDS */}
          {activeTab === 'visitors' && (
            <div className="space-y-4">
              {sessions.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No visitor sessions recorded yet in this server instance.</p>
                  <p className="text-xs mt-1">Try entering the gates and answering questions to see live records here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Session List */}
                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                    {sessions.map((s) => (
                      <div
                        key={s.sessionId}
                        onClick={() => setSelectedSession(s)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedSession?.sessionId === s.sessionId
                            ? 'bg-rose-950/40 border-rose-500/60 text-white'
                            : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">{s.userName}</span>
                          <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                            {s.answers.length} answers
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(s.startTime).toLocaleTimeString()}</span>
                          {s.durationSeconds ? <span>&bull; {s.durationSeconds}s</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Session Details */}
                  <div className="md:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col max-h-[480px]">
                    {selectedSession ? (
                      <>
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                          <div>
                            <h3 className="font-bold text-white text-base">{selectedSession.userName}</h3>
                            <p className="text-xs text-slate-400">
                              Session ID: {selectedSession.sessionId} &bull; Started: {new Date(selectedSession.startTime).toLocaleString()}
                            </p>
                          </div>
                          <a
                            href={`/api/visitor/export-html/${selectedSession.sessionId}`}
                            download
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download HTML
                          </a>
                        </div>

                        <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                          {selectedSession.answers.map((ans, idx) => (
                            <div key={idx} className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-3 text-xs">
                              <div className="flex items-center justify-between text-rose-400 font-semibold mb-1">
                                <span>#{ans.questionNumber || idx + 1}: {ans.questionTitle}</span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  {ans.method.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-slate-400 mb-1.5 text-[11px]">{ans.questionPrompt}</p>
                              <div className="bg-slate-950 p-2 rounded border-l-2 border-rose-500 font-medium text-white italic">
                                "{ans.answer}"
                              </div>
                              {ans.hasAudio && (
                                <div className="mt-2 flex items-center gap-2">
                                  <audio
                                    controls
                                    src={`/api/visitor/audio/${selectedSession.sessionId}/${ans.questionId}`}
                                    className="h-7 w-full max-w-xs"
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-slate-500 text-xs text-center py-10">Select a visitor from the list to view their questions & answers.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SETUP GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <h4 className="text-sm font-bold text-rose-400 mb-2 flex items-center gap-2">
                  <Key className="w-4 h-4" /> Option 1: Gmail SMTP (Recommended - 100% Free & No Setup Domain)
                </h4>
                <p className="text-slate-300 leading-relaxed mb-3">
                  Google allows you to generate a secure 16-character <b>App Password</b> for your Gmail account. When configured, emails are sent directly through Gmail with 100% inbox delivery:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1">
                  <li>Go to your Google Account: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-rose-400 underline">https://myaccount.google.com/apppasswords</a></li>
                  <li>Create an App Password (Name it <code>Gothic Gate</code>).</li>
                  <li>Copy the 16-character code (e.g. <code>abcd efgh ijkl mnop</code>).</li>
                  <li>In this project's <b>Settings &rarr; Environment Variables</b> (or <code>.env</code>), add:
                    <div className="bg-slate-900 p-2.5 rounded mt-1 font-mono text-emerald-300">
                      SMTP_USER=kmsiddesh009@gmail.com<br/>
                      SMTP_PASS=your16charactercode
                    </div>
                  </li>
                </ol>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <h4 className="text-sm font-bold text-sky-400 mb-2 flex items-center gap-2">
                  <Webhook className="w-4 h-4" /> Option 2: Discord Webhook (Instant Mobile Push Notifications)
                </h4>
                <p className="text-slate-300 leading-relaxed mb-2">
                  If you want instant notifications on your mobile phone or PC whenever someone answers a riddle:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1">
                  <li>Create a private channel in your Discord server.</li>
                  <li>Go to <b>Channel Settings &rarr; Integrations &rarr; Webhooks &rarr; New Webhook</b>.</li>
                  <li>Copy the Webhook URL and add it to <b>Settings &rarr; Environment Variables</b>:
                    <div className="bg-slate-900 p-2.5 rounded mt-1 font-mono text-sky-300">
                      WEBHOOK_URL=https://discord.com/api/webhooks/.../...
                    </div>
                  </li>
                </ol>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Option 3: In-App Live Dossier (Zero Config Needed!)
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  You don't even need email setup! All visitor attempts, questions, answers, and audio recordings are saved directly on this server. You can open this panel at any time by clicking the secret <b>Lock / Dossier Icon</b> in the entrance gate corner or pressing <kbd className="bg-slate-800 px-1.5 py-0.5 rounded">Ctrl + Shift + D</kbd>.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex justify-between items-center text-xs text-slate-400">
          <span>Target Recipient: <strong className="text-slate-200">kmsiddesh009@gmail.com</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-medium"
          >
            Close Panel
          </button>
        </div>

      </div>
    </div>
  );
};
