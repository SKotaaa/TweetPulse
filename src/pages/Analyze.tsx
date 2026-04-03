import { useState } from 'react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../App';
import { analyzeSentiment } from '../services/geminiService';
import { Search, Sparkles, TrendingUp, Users, MessageSquare, AlertCircle, PieChart, BarChart3, Hash, Clock, ArrowUpRight, ArrowDownRight, ShieldCheck, Loader2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { formatConfidence } from '../utils/formatters';


export default function Analyze() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleAnalyze = async () => {
    if (!query || !user) return;
    setLoading(true);
    setResult(null);
    setError('');
    
    try {
      // The centralized service now handles timeouts (10s), retries, and errors internally.
      // It always returns a valid SentimentAnalysisResponse (success or fallback).
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: query })
      });

      const data = await response.json();
      
      if (!response.ok) {
        setError(data.details || data.error || "AI Intelligence Stream offline.");
        setLoading(false);
        return;
      }

      const { SENTIMENT_FALLBACK } = await import('../services/geminiService');
      
      // Check if we got a fallback (optional, but good for UI clarity)
      if (data.summary === SENTIMENT_FALLBACK.summary && data.confidence === 0) {
        setError("AI service returned a fallback response. Results may be limited.");
      }

      setResult({
        score: formatConfidence(data.confidence),
        label: data.sentiment.toUpperCase(),
        summary: data.summary,
        stats: data.stats,
        topics: data.topics || []
      });
      
      setLoading(false);

      // Save to Firestore in the background
      setIsSaving(true);
      const currentUid = user.uid;
      
      const analysisData = {
        userId: currentUid,
        text: query,
        sentiment: data.sentiment.toLowerCase(),
        summary: data.summary,
        confidence: data.confidence,
        stats: {
          positive: data.stats.positive || 0,
          negative: data.stats.negative || 0,
          neutral: data.stats.neutral || 0
        },
        topics: data.topics || [],
        createdAt: serverTimestamp()
      };

      const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const analysisRef = doc(db, 'users', currentUid, 'history', analysisId);

      setDoc(analysisRef, analysisData)
        .then(() => {
          setIsSaving(false);
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 4000);
        })
        .catch((fsError: any) => {
          console.warn("PULSE: Background Firestore save failed:", fsError.message);
          setIsSaving(false);
        });
    } catch (err: any) {
      console.error('PULSE: UI Analyze Error:', err);
      setError('Connection to AI Intelligence Stream failed.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Search Header */}
      <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] shadow-xl shadow-blue-900/5 border border-gray-100 dark:border-gray-800">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
            <input
              type="text"
              placeholder="Enter keyword, hashtag, or URL to analyze..."
              className="w-full pl-16 pr-6 py-5 bg-gray-50 dark:bg-gray-950 border-none rounded-2xl text-lg font-semibold text-gray-800 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            />
          </div>
            <button 
              onClick={handleAnalyze} 
              disabled={loading || isSaving || !query}
              className="w-full md:w-auto px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold text-lg shadow-xl shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? 'Analyzing...' : isSaving ? 'Saving...' : 'Run Analysis'}
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
            </button>
        </div>
        
        {saveSuccess && (
          <div className="mt-6 flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400 animate-in fade-in slide-in-from-top-4">
            <ShieldCheck className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-semibold text-sm uppercase tracking-widest mb-1">Persistence Secured</p>
              <p className="font-medium text-sm opacity-90 text-gray-600/80">This analysis has been permanently saved to your history.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 flex items-start gap-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-semibold text-sm uppercase tracking-widest mb-1">Analysis Error</p>
              <p className="font-medium text-sm opacity-90">{error}</p>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <div className="w-20 h-20 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Harvesting Data Streams</p>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Our AI is decoding the kinetic pulse of the internet...</p>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* Prominent AI Summary Section */}
          <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl shadow-blue-900/5 border border-blue-100/50 dark:border-blue-900/30 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-blue-500/10 transition-colors duration-700" />
            
            <div className="relative flex flex-col md:flex-row gap-8 items-start">
              <div className="shrink-0 p-5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-xl shadow-blue-600/20">
                <Sparkles size={32} className="text-white animate-pulse" />
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">AI Intelligence Summary</h3>
                  <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-semibold uppercase tracking-widest border border-blue-100 dark:border-blue-900/30">
                    Neural Insight
                  </span>
                </div>
                
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300 leading-relaxed italic">
                    "{result.summary}"
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 pt-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <ShieldCheck size={18} className="text-emerald-500" />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Confidence: {result.score}%</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <TrendingUp size={18} className="text-blue-500" />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Sentiment: {result.label}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Analysis Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Sentiment Breakdown */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] shadow-xl shadow-blue-900/5 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                    <PieChart size={24} />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Sentiment Breakdown</h3>
                </div>
                <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-semibold uppercase tracking-widest border border-emerald-100 dark:border-emerald-900/30">
                  Real-time Data
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className="relative flex items-center justify-center">
                  <svg className="w-64 h-64 transform -rotate-90">
                    <circle cx="128" cy="128" r="110" fill="transparent" stroke="currentColor" strokeWidth="16" className="text-gray-100 dark:text-gray-800" />
                    <circle 
                      cx="128" cy="128" r="110" fill="transparent" 
                      stroke="url(#sentimentGrad)" strokeWidth="16" 
                      strokeDasharray={691}
                      strokeDashoffset={691 - (691 * result.score) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-1500 ease-out"
                    />
                    <defs>
                      <linearGradient id="sentimentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute flex flex-col items-center text-center">
                    <span className="text-6xl font-semibold text-gray-800 dark:text-white tracking-tighter">{result.score}%</span>
                    <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                      result.label === 'POSITIVE' ? 'text-emerald-500' : 
                      result.label === 'NEGATIVE' ? 'text-red-500' : 
                      'text-blue-500'
                    }`}>{result.label}</span>
                  </div>
                </div>

                <div className="space-y-6">
                  {[
                    { label: 'Positive', value: result.stats.positive, color: 'bg-emerald-500', text: 'text-emerald-600' },
                    { label: 'Neutral', value: result.stats.neutral, color: 'bg-blue-500', text: 'text-blue-600' },
                    { label: 'Negative', value: result.stats.negative, color: 'bg-red-500', text: 'text-red-600' },
                  ].map((item) => (
                    <div key={item.label} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-medium text-gray-400 uppercase tracking-widest">{item.label}</span>
                        <span className={`text-lg font-semibold ${item.text}`}>{item.value}%</span>
                      </div>
                      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${item.color} rounded-full transition-all duration-1000`}
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sentiment Intensity Chart */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] shadow-xl shadow-blue-900/5 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-xl">
                    <BarChart3 size={24} />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Sentiment Intensity</h3>
                </div>
                <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-semibold uppercase tracking-widest border border-blue-100 dark:border-blue-900/30">
                  Analysis Metrics
                </div>
              </div>

              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Positive', value: result.stats.positive, color: '#10b981' },
                    { name: 'Neutral', value: result.stats.neutral, color: '#3b82f6' },
                    { name: 'Negative', value: result.stats.negative, color: '#ef4444' },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" className="dark:stroke-gray-800" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 500 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 500 }}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                        fontWeight: 600,
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(8px)'
                      }} 
                    />
                    <Bar 
                      dataKey="value" 
                      radius={[8, 8, 0, 0]} 
                      barSize={60}
                      animationDuration={1500}
                    >
                      {[
                        { color: '#10b981' },
                        { color: '#3b82f6' },
                        { color: '#ef4444' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-8">
            {/* Key Topics */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] shadow-xl shadow-blue-900/5 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Hash size={24} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Key Topics</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {result.topics.map((topic: string) => (
                  <span key={topic} className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-default">
                    #{topic}
                  </span>
                ))}
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
