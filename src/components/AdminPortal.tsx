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
  Settings,
  Bell,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface DeliveryStatus {
  recipient: string[];
  sender: string;
  ntfy?: { configured: boolean; topic: string; topicUrl: string; forwardEmail: string };
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
  onResetApp?: () => void;
}

export const AdminPortal: React.FC<Props> = ({ isOpen, onClose, onResetApp }) => {
  const [status, setStatus] = useState<DeliveryStatus | null>(null);
  const [sessions, setSessions] = useState<VisitorSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [testOutput, setTestOutput] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<VisitorSession | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'config' | 'visitors' | 'guide'>('status');

  // Runtime Config Form state
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [alertEmailTo, setAlertEmailTo] = useState('kmsiddesh009@gmail.com');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [resendKey, setResendKey] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statusRes, recordsRes] = await Promise.all([
        fetch('/api/admin/status').then((r) => r.json()),
        fetch('/api/visitor/records').then((r) => r.json()),
      ]);
      setStatus(statusRes);
      if (statusRes.smtp?.user) {
        setSmtpUser(statusRes.smtp.user);
      }
      if (statusRes.recipient && statusRes.recipient.length > 0) {
        setAlertEmailTo(statusRes.recipient.join(', '));
      }
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

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpUser: smtpUser.trim(),
          smtpPass: smtpPass.trim(),
          alertEmailTo: alertEmailTo.trim(),
          webhookUrl: webhookUrl.trim(),
          resendApiKey: resendKey.trim(),
          enableNtfy: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus('✅ Email configuration saved successfully! Run the delivery test now.');
        await fetchData();
      } else {
        setSaveStatus(`❌ Error: ${data.error || 'Failed to save configuration'}`);
      }
    } catch (err: any) {
      setSaveStatus(`❌ Network error: ${err?.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const [isVerifyingSmtp, setIsVerifyingSmtp] = useState(false);
  const [smtpVerifyResult, setSmtpVerifyResult] = useState<{ ok?: boolean; error?: string; message?: string } | null>(null);

  const handleVerifySmtp = async () => {
    setIsVerifyingSmtp(true);
    setSmtpVerifyResult(null);
    try {
      const res = await fetch('/api/admin/verify-smtp', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setSmtpVerifyResult({ ok: true, message: `✅ SMTP connection verified! Connected successfully to ${data.host || 'smtp.gmail.com'}:${data.port || 465} as ${data.user || 'configured user'}.` });
      } else {
        setSmtpVerifyResult({ ok: false, error: data.error || 'Failed to authenticate with SMTP server. Check email and 16-character App Password.' });
      }
    } catch (err: any) {
      setSmtpVerifyResult({ ok: false, error: `Network error: ${err?.message || err}` });
    } finally {
      setIsVerifyingSmtp(false);
    }
  };

  const handleResetSessions = async () => {
    if (!window.confirm('Reset all visitor records and restart the quest from Chapter 1 / Entrance?')) {
      return;
    }
    setIsResetting(true);
    try {
      await fetch('/api/visitor/reset-all', { method: 'POST' });
      setSessions([]);
      setSelectedSession(null);
      if (onResetApp) {
        onResetApp();
      }
      onClose();
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setIsResetting(false);
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
                Visitor Dossier & Email Alert System
              </h2>
              <p className="text-xs text-slate-400">
                Live delivery diagnostics, Gmail SMTP setup, and quiz response tracking
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
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40 gap-2 sm:gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 px-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'status'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            Delivery Channels
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`py-3 px-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'config'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            Configure Gmail / SMTP
          </button>
          <button
            onClick={() => setActiveTab('visitors')}
            className={`py-3 px-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
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
            className={`py-3 px-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'guide'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            1-Min Setup Guide
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: STATUS & TEST */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Cloud & Email Bridge Card */}
                <div className="p-4 rounded-xl border bg-sky-950/30 border-sky-500/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5" /> Instant Cloud Alerts
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white">ntfy.sh & Email Bridge</p>
                  <p className="text-xs text-slate-300 mt-1">
                    Zero-configuration real-time alert stream for <b>kmsiddesh009@gmail.com</b>.
                  </p>
                  <a
                    href="https://ntfy.sh/gothic-gate-dracula-kmsiddesh009"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-xs text-sky-400 hover:text-sky-300 underline font-medium"
                  >
                    Open Live Feed <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* SMTP Card */}
                <div className={`p-4 rounded-xl border ${status?.smtp.configured ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-slate-950/50 border-slate-800'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5" /> Direct Gmail SMTP
                    </span>
                    {status?.smtp.configured ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
                        <XCircle className="w-3 h-3" /> Needs Password
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white">Direct Gmail Inbox Delivery</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {status?.smtp.configured ? `User: ${status.smtp.user}` : 'Enter your 16-char Gmail App Password in Configure tab for 100% inbox delivery.'}
                  </p>
                </div>

                {/* Webhook Card */}
                <div className={`p-4 rounded-xl border ${status?.webhook.configured ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-slate-950/50 border-slate-800'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Webhook className="w-3.5 h-3.5" /> Webhook Push
                    </span>
                    {status?.webhook.configured ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
                        <XCircle className="w-3 h-3" /> Optional
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white">Discord / Slack Notifications</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {status?.webhook.configured ? `Type: ${status.webhook.type}` : 'Instant mobile alerts to Discord channel or Slack.'}
                  </p>
                </div>
              </div>

              {/* Action Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-rose-400" /> Test Delivery to {status?.recipient?.join(', ') || 'kmsiddesh009@gmail.com'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Dispatches a live diagnostic test alert across all channels and confirms delivery.
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
                <div className={`p-4 rounded-xl border text-xs ${testOutput.success ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-amber-950/40 border-amber-500/40 text-amber-200'}`}>
                  <div className="flex items-center gap-2 font-bold mb-2 text-sm font-sans">
                    {testOutput.success ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    {testOutput.success ? 'Delivery Channels Active & Verified' : 'Delivery Diagnostics Notice'}
                  </div>
                  <p className="mb-2 font-sans text-xs">{testOutput.advice}</p>
                  <pre className="bg-black/60 p-3 rounded-lg overflow-x-auto text-slate-300 font-mono text-[11px]">
                    {JSON.stringify(testOutput.results, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CONFIGURE CREDENTIALS */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              <form onSubmit={handleSaveConfig} className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Direct Gmail SMTP Settings</h3>
                  <p className="text-xs text-slate-400">
                    To receive every quiz attempt email directly in your Gmail inbox with 0% spam filtering, enter your Gmail and 16-character App Password below:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Your Gmail Address (Sender & Recipient)
                    </label>
                    <input
                      type="email"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="kmsiddesh009@gmail.com"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Gmail 16-Character App Password
                    </label>
                    <input
                      type="password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      placeholder="abcd efgh ijkl mnop"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-rose-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Generated from <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-rose-400 underline">myaccount.google.com/apppasswords</a>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Alert Recipient Email
                    </label>
                    <input
                      type="text"
                      value={alertEmailTo}
                      onChange={(e) => setAlertEmailTo(e.target.value)}
                      placeholder="kmsiddesh009@gmail.com"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Discord Webhook URL (Optional for Mobile Push)
                    </label>
                    <input
                      type="text"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {saveStatus && (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-medium text-slate-200">
                    {saveStatus}
                  </div>
                )}

                {smtpVerifyResult && (
                  <div className={`p-3 border rounded-lg text-xs font-medium ${smtpVerifyResult.ok ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' : 'bg-rose-950/40 border-rose-500/50 text-rose-200'}`}>
                    {smtpVerifyResult.ok ? smtpVerifyResult.message : `❌ ${smtpVerifyResult.error}`}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                  <span className="text-xs text-slate-400">Settings take effect immediately for all subsequent quiz attempts.</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleVerifySmtp}
                      disabled={isVerifyingSmtp || isSaving}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-all flex items-center gap-1.5"
                    >
                      {isVerifyingSmtp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />}
                      Verify Connection
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow transition-all flex items-center gap-2"
                    >
                      {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      Save Email Credentials
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: LIVE VISITOR RECORDS */}
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

          {/* TAB 4: SETUP GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <h4 className="text-sm font-bold text-rose-400 mb-2 flex items-center gap-2">
                  <Key className="w-4 h-4" /> Option 1: Gmail App Password (100% Direct Delivery to kmsiddesh009@gmail.com)
                </h4>
                <p className="text-slate-300 leading-relaxed mb-3">
                  Google allows you to generate a secure 16-character <b>App Password</b> for your Gmail account. When configured, emails are sent directly through Gmail without any domain verification:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1">
                  <li>Go to your Google Account: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-rose-400 underline">https://myaccount.google.com/apppasswords</a></li>
                  <li>Create an App Password (Name it <code>Gothic Gate</code>).</li>
                  <li>Copy the 16-character code (e.g. <code>abcd efgh ijkl mnop</code>).</li>
                  <li>Paste it directly in the <b>"Configure Gmail / SMTP"</b> tab above and click Save!</li>
                </ol>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <h4 className="text-sm font-bold text-sky-400 mb-2 flex items-center gap-2">
                  <Bell className="w-4 h-4" /> Option 2: Real-Time Cloud Alerts via ntfy.sh (Active Now!)
                </h4>
                <p className="text-slate-300 leading-relaxed mb-2">
                  Cloud alerts are already configured and live! Whenever someone attempts a riddle or completes a quiz, a real-time notification is pushed to:
                </p>
                <div className="bg-slate-900 p-2.5 rounded font-mono text-sky-300">
                  <a href="https://ntfy.sh/gothic-gate-dracula-kmsiddesh009" target="_blank" rel="noreferrer" className="underline">
                    https://ntfy.sh/gothic-gate-dracula-kmsiddesh009
                  </a>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex flex-wrap justify-between items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>Target Recipient: <strong className="text-slate-200">{alertEmailTo}</strong></span>
            <button
              type="button"
              onClick={handleResetSessions}
              disabled={isResetting}
              className="px-3 py-1 bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-200 rounded-md transition-colors font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Clear all stored records and restart the quest from Chapter 1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span>Reset All & Start Over</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-medium cursor-pointer"
          >
            Close Panel
          </button>
        </div>

      </div>
    </div>
  );
};
