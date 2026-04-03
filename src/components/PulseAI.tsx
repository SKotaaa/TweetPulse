import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import axios from 'axios';
import { MessageSquare, X, Send, Sparkles, User, Bot, Loader2, Trash2, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { useAuth } from '../App';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, setDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';

interface Message {
  id?: string;
  role: 'user' | 'model';
  content: string;
  createdAt?: any;
}

export default function PulseAI() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const responseCache = useRef<Record<string, string>>({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Local Fallback Logic
  const getLocalFallback = (query: string): string => {
    const q = query.toLowerCase();
    if (q.includes('sentiment')) return "Sentiment analysis measures the emotional tone of text. TweetPulse uses AI to categorize it as Positive, Negative, or Neutral.";
    if (q.includes('confidence')) return "Confidence score (0-1) indicates how certain the AI is about its sentiment classification. Higher is better!";
    if (q.includes('history')) return "You can view all your past analyses in the 'History' tab from the sidebar.";
    if (q.includes('dashboard')) return "The Dashboard gives you a high-level overview of your recent sentiment trends and distributions.";
    return "Here’s a quick insight: TweetPulse analyzes real-time data to give you instant sentiment intelligence. How else can I help?";
  };

  // Load chat history from Firestore
  useEffect(() => {
    if (!user) {
      setMessages([]);
      return;
    }

    setIsSyncing(true);
    const q = query(
      collection(db, 'users', user.uid, 'chat_history'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      setMessages(history);
      setIsSyncing(false);
    }, (error) => {
      console.error("Chat History Error:", error);
      setIsSyncing(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || loading || !user) return;

    const userMessage = trimmedInput;
    setInput('');
    setError(null);
    setLoading(true);
    
    // 0. Check Cache
    if (responseCache.current[userMessage.toLowerCase()]) {
      const cachedResponse = responseCache.current[userMessage.toLowerCase()];
      setMessages(prev => [
        ...prev,
        { role: 'user', content: userMessage, id: 'user-' + Date.now() },
        { role: 'model', content: cachedResponse, id: 'cached-' + Date.now() }
      ]);
      setLoading(false);
      return;
    }

    // 1. Instant UI Feedback (Optimistic UI)
    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMessage, id: 'user-' + Date.now() }
    ]);

    const startTime = Date.now();

    try {
      // 1. Save user message to Firestore (Background)
      const msgId = `msg_user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const msgRef = doc(db, 'users', user.uid, 'chat_history', msgId);
      setDoc(msgRef, {
        role: 'user',
        content: userMessage,
        createdAt: serverTimestamp()
      }).catch(e => console.warn("PULSE: Background save failed:", e));

      // 3. Centralized API Call (Centralized logic handles timeout, safety, and errors)
      const chatMessages = [
        ...messages.slice(-3).map(m => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.content
        })),
        { role: "user", content: userMessage }
      ];

      const { fetchPulseAIResponse, CHAT_FALLBACK } = await import('../services/geminiService');
      const response = await fetchPulseAIResponse(chatMessages);
      const aiResponse = response.content;

      // 4. Update UI Error if it's the fallback (Optional diagnostic)
      if (aiResponse === CHAT_FALLBACK.content) {
        console.warn("PULSE: Received fallback response from AI service.");
      }

      // 5. Cache it
      responseCache.current[userMessage.toLowerCase()] = aiResponse;

      // 6. Update UI
      setMessages(prev => [
        ...prev,
        { role: 'model', content: aiResponse, id: 'ai-' + Date.now() }
      ]);

      // 7. Save AI response to Firestore (Background)
      const aiMsgId = `msg_ai_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const aiMsgRef = doc(db, 'users', user.uid, 'chat_history', aiMsgId);
      setDoc(aiMsgRef, {
        role: 'model',
        content: aiResponse,
        createdAt: serverTimestamp()
      }).catch(e => console.warn("PULSE: Background AI save failed:", e));

    } catch (err: any) {
      console.error("PULSE: CRITICAL AI UI ERROR:", err);
      // Even if the centralized service fails unexpectedly, we provide a final UI-tier fallback
      const finalFallback = getLocalFallback(userMessage);
      setMessages(prev => [
        ...prev,
        { role: 'model', content: finalFallback, id: 'err-' + Date.now() }
      ]);
    } finally {
      setLoading(false);
      if (import.meta.env.DEV) {
        console.log(`PULSE: Total cycle time: ${Date.now() - startTime}ms`);
      }
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    
    try {
      const q = query(collection(db, 'users', user.uid, 'chat_history'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      setMessages([]); // Immediate UI update
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

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
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2.5 hover:bg-white/10 rounded-xl transition-all active:scale-90"
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
                    <p className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Pulse Intelligence</p>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 leading-relaxed">
                      Your neural link to sentiment data. Ask me to analyze trends, explain confidence scores, or navigate the platform.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 w-full">
                    {[
                      "Explain sentiment analysis",
                      "How do I view history?",
                      "What is confidence score?"
                    ].map(suggestion => (
                      <button 
                        key={suggestion}
                        onClick={() => {
                          setInput(suggestion);
                        }}
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
                  <div className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white dark:bg-gray-800 text-indigo-600 border border-gray-100 dark:border-gray-700'
                    }`}>
                      {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                    </div>
                    <div className={`p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-700'
                    }`}>
                      <div className="markdown-body">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pulse AI is typing...</span>
                    </div>
                  </div>
                </div>
              )}
              {error && (
                <div className="flex justify-start">
                  <div className="flex gap-3 max-w-[90%]">
                    <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center border border-red-100 dark:border-red-900/30">
                      <AlertCircle size={18} />
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl rounded-tl-none border border-red-100 dark:border-red-900/30 text-xs font-bold">
                      {error}
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
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    className="w-full pl-6 pr-12 py-4 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all outline-none"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-300 dark:text-gray-700">
                    <div className="w-px h-4 bg-current" />
                    <MessageSquare size={16} />
                  </div>
                </div>
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-blue-600 shrink-0"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)] transition-all hover:scale-110 active:scale-90 group relative pointer-events-auto ${
          isOpen 
            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' 
            : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
        }`}
      >
        {isOpen ? <X size={28} /> : (
          <div className="relative">
            <Sparkles size={28} className="group-hover:rotate-12 transition-transform duration-500" />
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full shadow-sm" />
          </div>
        )}
        {!isOpen && (
          <div className="absolute right-20 bg-white dark:bg-gray-900 px-4 py-2 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap">
            <span className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Pulse AI</span>
          </div>
        )}
      </button>
    </div>
  );
}
