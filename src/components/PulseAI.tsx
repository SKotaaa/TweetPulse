import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Sparkles, User, Bot, Trash2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { useAuth } from '../App';
import { db } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
  writeBatch,
} from 'firebase/firestore';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  createdAt?: any;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LS_KEY = 'pulse_ai_chat';
const FALLBACK_REPLY = "I'm having trouble responding right now. Please try again.";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Load messages from localStorage safely */
function loadFromStorage(): Message[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m: any) =>
        m &&
        typeof m.id === 'string' &&
        (m.role === 'user' || m.role === 'model') &&
        typeof m.content === 'string'
    );
  } catch {
    return [];
  }
}

/** Save messages to localStorage safely */
function saveToStorage(messages: Message[]): void {
  try {
    // Only persist the last 50 messages to avoid localStorage bloat
    const toSave = messages.slice(-50);
    localStorage.setItem(LS_KEY, JSON.stringify(toSave));
  } catch {
    // Ignore quota errors silently
  }
}

/** Generate a unique message id */
function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Context-aware local fallback — only used when the API is truly unreachable */
function getLocalFallback(input: string): string {
  const q = input.toLowerCase();
  if (q.includes('sentiment'))
    return 'Sentiment analysis measures the emotional tone of text — Positive, Negative, or Neutral. TweetPulse uses AI to classify it instantly.';
  if (q.includes('confidence'))
    return 'The confidence score shows how certain the AI is about its classification. A score near 100% means high certainty.';
  if (q.includes('history'))
    return "All your past analyses are saved in the History tab. Click the clock icon in the sidebar to access them.";
  if (q.includes('dashboard'))
    return 'The Dashboard gives you an overview of your recent sentiment trends, topic themes, and distribution stats.';
  if (q.includes('hello') || q.includes('hi'))
    return "Hi! I'm Pulse AI, your TweetPulse assistant. Ask me anything about sentiment analysis or how to use the app.";
  return "TweetPulse helps you analyze the sentiment of any text in real-time. Feel free to ask me anything about the platform!";
}

/** Call /api/chat, never throws — returns reply string always */
async function fetchAIReply(
  chatMessages: { role: string; content: string }[]
): Promise<{ reply: string; success: boolean }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ messages: chatMessages }),
    });

    clearTimeout(timeoutId);

    // Read as text first — never assume JSON
    const text = await res.text();

    if (!text || !text.trim()) {
      console.warn('[PULSE] Empty response body');
      return { reply: FALLBACK_REPLY, success: false };
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      console.warn('[PULSE] Response is not valid JSON:', text.slice(0, 200));
      return { reply: FALLBACK_REPLY, success: false };
    }

    // Accept both { reply } (new) and { content } (old) shapes for robustness
    const raw = data?.reply ?? data?.content ?? '';
    const reply = typeof raw === 'string' ? raw.trim() : '';

    if (!reply || reply.length < 5) {
      console.warn('[PULSE] reply field missing or too short');
      return { reply: FALLBACK_REPLY, success: false };
    }

    return { reply, success: data?.success !== false };
  } catch (err: any) {
    const reason = err?.name === 'AbortError' ? 'timeout' : (err?.message ?? 'unknown');
    console.warn('[PULSE] fetchAIReply failed:', reason);
    return { reply: FALLBACK_REPLY, success: false };
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PulseAI() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const responseCache = useRef<Record<string, string>>({});
  // Track the last model reply to prevent duplicate fallback spam
  const lastModelReply = useRef<string>('');

  // ── Scroll to bottom whenever messages change ──────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, scrollToBottom]);

  // ── Persist messages to localStorage whenever they change ──────────────────
  useEffect(() => {
    // Only persist if not syncing from Firestore (to avoid clobbering)
    if (!isSyncing) {
      saveToStorage(messages);
    }
  }, [messages, isSyncing]);

  // ── Load from Firestore (logged-in) or localStorage (guest) ───────────────
  useEffect(() => {
    if (!user) {
      // Guest mode — load from localStorage
      const saved = loadFromStorage();
      setMessages(saved);
      return;
    }

    // Logged-in — sync from Firestore, seed with localStorage if Firestore is empty
    setIsSyncing(true);
    const q = query(
      collection(db, 'users', user.uid, 'chat_history'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const history = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Message, 'id'>),
          })) as Message[];
          setMessages(history);
        } else {
          // Firestore empty — seed from localStorage
          const saved = loadFromStorage();
          setMessages(saved);
        }
        setIsSyncing(false);
      },
      (err) => {
        console.error('[PULSE] Firestore snapshot error:', err);
        // Fallback to localStorage on Firestore error
        setMessages(loadFromStorage());
        setIsSyncing(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // ── Send a message ─────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (overrideInput?: string) => {
      const trimmedInput = (overrideInput ?? input).trim();
      if (!trimmedInput || loading) return;

      const userMessage = trimmedInput;
      setInput('');
      setLoading(true);

      // Build IDs up front
      const userMsgId = genId('user');
      const aiMsgId = genId('ai');

      // 1. Add user message to UI immediately
      const userMsg: Message = { id: userMsgId, role: 'user', content: userMessage };
      setMessages((prev) => [...prev, userMsg]);

      // 2. Save user message to Firestore (background, non-blocking)
      if (user) {
        const ref = doc(db, 'users', user.uid, 'chat_history', userMsgId);
        setDoc(ref, {
          role: 'user',
          content: userMessage,
          createdAt: serverTimestamp(),
        }).catch((e) => console.warn('[PULSE] Firestore user save failed:', e));
      }

      // 3. Build context (last 4 exchanges = 8 messages max)
      const contextMessages = messages
        .slice(-8)
        .map((m) => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.content,
        }))
        .concat({ role: 'user', content: userMessage });

      try {
        let aiReply: string;

        // Check cache first
        const cacheKey = userMessage.toLowerCase().trim();
        if (responseCache.current[cacheKey]) {
          aiReply = responseCache.current[cacheKey];
        } else {
          // Call API
          const result = await fetchAIReply(contextMessages);

          if (!result.success || !result.reply || result.reply.length < 5) {
            // API failed — use local fallback, but only if last reply wasn't the same
            const localReply = getLocalFallback(userMessage);
            aiReply = lastModelReply.current === localReply ? FALLBACK_REPLY : localReply;
          } else {
            aiReply = result.reply;
            // Cache successful responses only
            responseCache.current[cacheKey] = aiReply;
          }
        }

        // Guard: prevent appending the exact same fallback twice in a row
        if (
          aiReply === lastModelReply.current &&
          aiReply === FALLBACK_REPLY
        ) {
          console.warn('[PULSE] Suppressing duplicate fallback message.');
          return; // Don't add it again — user already sees the previous one
        }

        lastModelReply.current = aiReply;

        const aiMsg: Message = { id: aiMsgId, role: 'model', content: aiReply };
        setMessages((prev) => [...prev, aiMsg]);

        // Save AI response to Firestore (background, non-blocking)
        if (user) {
          const ref = doc(db, 'users', user.uid, 'chat_history', aiMsgId);
          setDoc(ref, {
            role: 'model',
            content: aiReply,
            createdAt: serverTimestamp(),
          }).catch((e) => console.warn('[PULSE] Firestore AI save failed:', e));
        }
      } catch (err: any) {
        // This should never be reached thanks to fetchAIReply's own safety, but just in case
        console.error('[PULSE] Unexpected error in handleSend:', err);
        const emergency = getLocalFallback(userMessage);
        if (emergency !== lastModelReply.current) {
          lastModelReply.current = emergency;
          setMessages((prev) => [
            ...prev,
            { id: genId('err'), role: 'model', content: emergency },
          ]);
        }
      } finally {
        // ALWAYS end loading — no infinite spinners
        setLoading(false);
      }
    },
    [input, loading, messages, user]
  );

  // ── Clear chat history ─────────────────────────────────────────────────────
  const clearHistory = useCallback(async () => {
    // 1. Clear UI immediately — no reload needed
    setMessages([]);
    lastModelReply.current = '';
    responseCache.current = {};

    // 2. Clear localStorage
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      // ignore
    }

    // 3. Clear Firestore (background, only if logged in)
    if (user) {
      try {
        const q = query(collection(db, 'users', user.uid, 'chat_history'));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const batch = writeBatch(db);
          snapshot.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (err) {
        console.error('[PULSE] Failed to clear Firestore history:', err);
        // UI is already cleared — non-critical
      }
    }
  }, [user]);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="mb-4 w-[calc(100vw-3rem)] sm:w-[420px] max-h-[calc(100vh-140px)] h-[650px] bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden pointer-events-auto"
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md border border-white/10">
                  <Sparkles size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black tracking-tight text-lg">Pulse AI</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                      {isSyncing ? 'Syncing History...' : 'Intelligence Active'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="p-2.5 hover:bg-white/10 rounded-xl transition-all active:scale-90 text-white/60 hover:text-white"
                    title="Clear History"
                    aria-label="Clear chat history"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2.5 hover:bg-white/10 rounded-xl transition-all active:scale-90"
                  aria-label="Close chat"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-gray-50/50 dark:bg-gray-950/50">
              {messages.length === 0 && !isSyncing && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 px-4">
                  <div className="w-20 h-20 bg-white dark:bg-gray-900 rounded-[2rem] shadow-xl shadow-blue-500/5 flex items-center justify-center border border-gray-100 dark:border-gray-800">
                    <MessageSquare size={40} className="text-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                      Pulse Intelligence
                    </p>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 leading-relaxed">
                      Your neural link to sentiment data. Ask me to analyze trends, explain
                      confidence scores, or navigate the platform.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 w-full">
                    {[
                      'Explain sentiment analysis',
                      'How do I view history?',
                      'What is confidence score?',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSend(suggestion)}
                        className="px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-xs font-black text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 transition-all text-left"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
                >
                  <div
                    className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-indigo-600 border border-gray-100 dark:border-gray-700'
                      }`}
                    >
                      {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                    </div>
                    <div
                      className={`p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-700'
                      }`}
                    >
                      <div className="markdown-body">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex justify-start animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 text-indigo-600 flex items-center justify-center border border-gray-100 dark:border-gray-700">
                      <Bot size={18} />
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-700 flex items-center gap-3">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                      </div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Pulse AI is typing...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shrink-0">
              <div className="relative flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Ask Pulse AI..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={loading}
                    className="w-full pl-6 pr-12 py-4 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all outline-none disabled:opacity-60"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-300 dark:text-gray-700">
                    <div className="w-px h-4 bg-current" />
                    <MessageSquare size={16} />
                  </div>
                </div>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-blue-600 shrink-0"
                  aria-label="Send message"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)] transition-all hover:scale-110 active:scale-90 group relative pointer-events-auto ${
          isOpen
            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
            : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
        }`}
        aria-label={isOpen ? 'Close Pulse AI' : 'Open Pulse AI'}
      >
        {isOpen ? (
          <X size={28} />
        ) : (
          <div className="relative">
            <Sparkles size={28} className="group-hover:rotate-12 transition-transform duration-500" />
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full shadow-sm" />
          </div>
        )}
        {!isOpen && (
          <div className="absolute right-20 bg-white dark:bg-gray-900 px-4 py-2 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap">
            <span className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
              Pulse AI
            </span>
          </div>
        )}
      </button>
    </div>
  );
}
