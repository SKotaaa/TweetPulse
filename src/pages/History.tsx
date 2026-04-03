import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, limit as fsLimit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, AnalysisResult } from '../firebase';
import { useAuth } from '../App';
import Card from '../components/Card';
import { Calendar, Search, AlertCircle, Trash2, Share2, CheckCircle2 } from 'lucide-react';
import { TableSkeleton } from '../components/Skeleton';
import { throttle, CACHE_KEYS, CACHE_MAX_AGE, CACHE_VERSION, CACHE_SIZE_LIMIT } from '../utils/performance';
import { formatConfidence } from '../utils/formatters';


interface HistoryCache {
  version: string;
  timestamp: number;
  history: any[];
}

export default function History() {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // 1. Instant Cache Initialization with Versioning
  useEffect(() => {
    if (!user) return;
    const cacheKey = `${CACHE_KEYS.HISTORY}_${user.uid}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed: HistoryCache = JSON.parse(cached);
        if (parsed.version === CACHE_VERSION && Array.isArray(parsed.history)) {
          setHistory(parsed.history.slice(0, CACHE_SIZE_LIMIT));
          if (Date.now() - parsed.timestamp > CACHE_MAX_AGE) setIsStale(true);
          setLoading(false);
        } else {
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (e) {
      console.warn("PULSE: History cache corrupted, clearing.");
      localStorage.removeItem(cacheKey);
    }
  }, [user]);

  // 2. Storage Event (Multi-tab Sync)
  useEffect(() => {
    const handleSync = (e: StorageEvent) => {
      if (e.key === `${CACHE_KEYS.HISTORY}_${user?.uid}` && e.newValue) {
        try {
          const parsed: HistoryCache = JSON.parse(e.newValue);
          if (parsed.version === CACHE_VERSION) setHistory(parsed.history);
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }, [user]);

  // 3. Throttled Persistence
  const persistToCache = useMemo(() => throttle((uid: string, data: HistoryCache) => {
    try {
      localStorage.setItem(`${CACHE_KEYS.HISTORY}_${uid}`, JSON.stringify(data));
    } catch (e) {}
  }, 3000), []);

  // 4. Real-time Subscription
  useEffect(() => {
    if (!user) {
      setHistory([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'history'),
      orderBy('createdAt', 'desc'),
      fsLimit(100) // Keep history view reasonably fast
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AnalysisResult[];
      
      setHistory(data);
      setLoading(false);
      setIsStale(false);
      
      persistToCache(user.uid, {
        version: CACHE_VERSION,
        timestamp: Date.now(),
        history: data.slice(0, CACHE_SIZE_LIMIT) // Store only top bits
      });
    }, (err) => {
      console.error("PULSE: History sync failed:", err.message);
      setError('Live history stream paused. Showing available data.');
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup
  }, [user, persistToCache]);

  const handleDelete = async (id: string) => {
    if (!user) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'history', id));
      setConfirmDeleteId(null);
      setSuccess('Pulse deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/history/${id}`);
      setError('Failed to delete pulse');
    } finally {
      setDeletingId(null);
    }
  };

  const handleShare = (item: any) => {
    const text = `Pulse Report: ${item.text}\nSentiment: ${item.sentiment.toUpperCase()}\nConfidence: ${formatConfidence(item.confidence)}%`;
    navigator.clipboard.writeText(text).then(() => {
      setSuccess('Report copied!');
      setTimeout(() => setSuccess(''), 3000);
    });
  };

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchesSearch = item.text.toLowerCase().includes(searchTerm.toLowerCase());
      if (!item.createdAt) return matchesSearch;
      
      const itemDate = item.createdAt.seconds ? new Date(item.createdAt.seconds * 1000) : (item.createdAt.toDate ? item.createdAt.toDate() : new Date());
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);
      
      const matchesStart = start ? itemDate >= start : true;
      const matchesEnd = end ? itemDate <= end : true;
      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [history, searchTerm, startDate, endDate]);

  const formatDate = (createdAt: any) => {
    try {
      if (!createdAt) return 'Just now';
      if (createdAt.toDate) return createdAt.toDate().toLocaleDateString();
      if (createdAt.seconds) return new Date(createdAt.seconds * 1000).toLocaleDateString();
      return 'Recently';
    } catch (e) { return 'History log'; }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${loading ? 'bg-blue-500 animate-pulse' : isStale ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span className={`text-[10px] font-semibold uppercase tracking-widest ${loading ? 'text-blue-600' : isStale ? 'text-amber-600' : 'text-emerald-600'}`}>
              {loading ? 'Fetching History...' : isStale ? 'Updating Pulse...' : 'History Synchronized'}
            </span>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white leading-tight">Pulse History</h2>
        </div>
      </header>

      {(error || success) && (
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <p className="font-semibold text-sm tracking-tight">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <p className="font-semibold text-sm tracking-tight">{success}</p>
            </div>
          )}
        </div>
      )}

      <Card className="p-0 overflow-hidden border-none shadow-xl shadow-gray-200/50 dark:shadow-none">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-6 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-blue-600 dark:focus:border-blue-500 text-gray-900 dark:text-white transition-colors"
              placeholder="Search pulses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Range</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs" />
              <span className="text-gray-400">-</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {(loading && history.length === 0) ? <TableSkeleton /> : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-900/50">
                  <th className="px-8 py-4 text-[10px] font-medium uppercase tracking-widest text-gray-400">Pulse</th>
                  <th className="px-8 py-4 text-[10px] font-medium uppercase tracking-widest text-gray-400">Date</th>
                  <th className="px-8 py-4 text-[10px] font-medium uppercase tracking-widest text-gray-400">Sentiment</th>
                  <th className="px-8 py-4 text-[10px] font-medium uppercase tracking-widest text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                      <td className="px-8 py-5 font-semibold text-gray-800 dark:text-white text-lg tracking-tight">{item.text}</td>
                      <td className="px-8 py-5 text-sm font-medium text-gray-500 dark:text-gray-400">{formatDate(item.createdAt)}</td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-widest rounded-full ${item.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-700' : item.sentiment === 'negative' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                          {item.sentiment}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleShare(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Share2 size={18} /></button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="px-8 py-12 text-center text-gray-400 font-bold">No matching pulses found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
