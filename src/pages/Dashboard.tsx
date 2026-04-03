import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, getCountFromServer, limit } from 'firebase/firestore';
import { db, AnalysisResult } from '../firebase';
import { useAuth } from '../App';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Clock, AlertCircle, Activity, Zap, Sparkles, PieChart as PieChartIcon, ArrowUpRight, MessageSquare, CheckCircle2 } from 'lucide-react';
import { StatsSkeleton, ChartSkeleton, TableSkeleton } from '../components/Skeleton';
import { throttle, CACHE_KEYS, CACHE_MAX_AGE, CACHE_VERSION, CACHE_SIZE_LIMIT } from '../utils/performance';

const COLORS = ['#10b981', '#3b82f6', '#ef4444'];

interface DashboardCache {
  version: string;
  timestamp: number;
  history: any[];
  totalCount: number | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [isTakingLong, setIsTakingLong] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const [error, setError] = useState('');
  
  const lastSyncCount = useRef(0);

  // 1. Instant Cache Initialization with Versioning
  useEffect(() => {
    if (!user) return;
    
    try {
      const cacheKey = `${CACHE_KEYS.DASHBOARD}_${user.uid}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed: DashboardCache = JSON.parse(cached);
        
        // Version and Structure Validation
        if (parsed.version === CACHE_VERSION && Array.isArray(parsed.history)) {
          setHistory(parsed.history.slice(0, CACHE_SIZE_LIMIT));
          setTotalCount(parsed.totalCount);
          
          if (Date.now() - parsed.timestamp > CACHE_MAX_AGE) setIsStale(true);
          setLoading(false);
        } else {
          // Schema mismatch or corrupt - clear safely
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (e) {
      console.warn("PULSE: Cache corrupted, clearing.");
      localStorage.removeItem(`${CACHE_KEYS.DASHBOARD}_${user?.uid}`);
    }
  }, [user]);

  // 2. Multi-tab Sync (Storage Event)
  useEffect(() => {
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === `${CACHE_KEYS.DASHBOARD}_${user?.uid}` && e.newValue) {
        try {
          const parsed: DashboardCache = JSON.parse(e.newValue);
          if (parsed.version === CACHE_VERSION) {
            setHistory(parsed.history);
            setTotalCount(parsed.totalCount);
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, [user]);

  // 3. Throttled Cache Writer
  const persistToCache = useMemo(() => throttle((uid: string, data: DashboardCache) => {
    try {
      localStorage.setItem(`${CACHE_KEYS.DASHBOARD}_${uid}`, JSON.stringify(data));
    } catch (e) {
      console.warn("PULSE: Cache limit exceeded or write failure.");
    }
  }, 3000), []);

  // 4. Single-Listener Data Sync
  useEffect(() => {
    if (!user) {
      setHistory([]);
      setLoading(false);
      return; 
    }

    const timeoutId = setTimeout(() => setIsTakingLong(true), 5000);

    const countQuery = query(collection(db, 'users', user.uid, 'history'));
    getCountFromServer(countQuery).then(snapshot => {
      setTotalCount(snapshot.data().count);
    }).catch(() => {});

    const q = query(
      collection(db, 'users', user.uid, 'history'),
      orderBy('createdAt', 'desc'),
      limit(50) // Fetch 50 but we'll cache less
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      clearTimeout(timeoutId);
      setIsTakingLong(false);
      setIsStale(false);
      
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AnalysisResult[];
      
      // BACKGROUND REFRESH UX: Show feedback only if data actually changed
      if (lastSyncCount.current > 0 && snapshot.docs.length !== lastSyncCount.current) {
        setJustUpdated(true);
        setTimeout(() => setJustUpdated(false), 3000);
      }
      lastSyncCount.current = snapshot.docs.length;

      setHistory(data);
      setLoading(false);
      setError('');

      // CACHE SIZE CONTROL: Store only top 20 items to save space
      persistToCache(user.uid, {
        version: CACHE_VERSION,
        timestamp: Date.now(),
        history: data.slice(0, CACHE_SIZE_LIMIT),
        totalCount: null
      });
    }, (err) => {
      clearTimeout(timeoutId);
      setIsTakingLong(false);
      setLoading(false);
      setError('Live intelligence feed paused. Showing last cached state.');
      console.error("PULSE: Sync Fail:", err.message);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe(); // ENSURE CLEANUP ON LOGOUT/UNMOUNT
    };
  }, [user, persistToCache]);

  const stats = useMemo(() => {
    const latest = history[0] || null;
    const avgConfRaw = history.length 
      ? history.reduce((acc, curr) => acc + (curr.confidence || 0), 0) / history.length
      : 0;
    const avgConf = formatConfidence(avgConfRaw);
    
    return [
      { label: 'Total Analyses', value: totalCount !== null ? totalCount : history.length, icon: Activity, color: 'from-blue-600', bg: 'bg-blue-50', text: 'text-blue-600' },
      { label: 'Avg Confidence', value: `${avgConf}%`, icon: Zap, color: 'from-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-600' },
      { label: 'Latest Sentiment', value: latest ? latest.sentiment.toUpperCase() : 'N/A', icon: MessageSquare, color: 'from-purple-600', bg: 'bg-purple-50', text: 'text-purple-600' },
      { label: 'Active Topics', value: new Set(history.map(h => h.text)).size, icon: Sparkles, color: 'from-teal-600', bg: 'bg-teal-50', text: 'text-teal-600' },
    ];
  }, [history, totalCount]);

  const pieData = useMemo(() => {
    const latest = history[0];
    if (!latest?.stats) return [];
    return [
      { name: 'Positive', value: latest.stats.positive },
      { name: 'Neutral', value: latest.stats.neutral },
      { name: 'Negative', value: latest.stats.negative },
    ];
  }, [history]);

  const formatDate = (createdAt: any) => {
    try {
      if (!createdAt) return 'Just now';
      if (createdAt.toDate) return createdAt.toDate().toLocaleDateString();
      if (createdAt.seconds) return new Date(createdAt.seconds * 1000).toLocaleDateString();
      return 'Recently';
    } catch (e) { return 'Pulse logged'; }
  };

  return (
    <div className="space-y-10 pb-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${loading ? 'bg-blue-500 animate-pulse' : isStale ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span className={`text-[10px] font-semibold uppercase tracking-widest ${loading ? 'text-blue-600' : isStale ? 'text-amber-600' : 'text-emerald-600'}`}>
              {loading ? 'Booting Intelligence...' : isStale ? 'Updating Stale Data...' : 'Live Feed Active'}
            </span>
          </div>
          <h2 className="text-5xl font-semibold tracking-tighter text-gray-900 dark:text-white leading-none">Dashboard</h2>
          {isTakingLong && (
            <p className="text-amber-600 dark:text-amber-400 mt-2 font-medium text-[10px] uppercase tracking-widest animate-pulse">Sync is taking longer than usual...</p>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <AnimatePresence>
            {justUpdated && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl"
              >
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest">Feed Updated</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="flex items-center gap-4 px-6 py-3 bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-100 dark:border-gray-800">
            <Clock className={loading ? 'text-blue-500 animate-spin' : 'text-blue-500'} size={20} />
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                {loading ? 'Syncing...' : 'Real-time Feed'}
              </span>
              <span className="text-sm font-semibold text-gray-800 dark:text-white">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-4 p-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-3xl text-red-600 dark:text-red-400">
          <AlertCircle className="w-6 h-6" />
          <p className="font-semibold text-sm uppercase tracking-widest leading-none">{error}</p>
        </div>
      )}

      {/* Stats Grid */}
      {(loading && history.length === 0) ? <StatsSkeleton /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-in fade-in duration-500">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] shadow-xl shadow-blue-900/5 border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-[0.03] rounded-bl-[4rem]` } />
              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.text} flex items-center justify-center mb-6 shadow-sm`}>
                  <stat.icon size={28} />
                </div>
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-600 mb-2">{stat.label}</p>
                <div className="flex items-baseline gap-3">
                  <h3 className="text-4xl font-semibold text-gray-800 dark:text-white tracking-tighter">{stat.value}</h3>
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-500 uppercase tracking-widest">
                    <ArrowUpRight size={14} />
                    Live
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {(loading && history.length === 0) ? (
          <div className="lg:col-span-2"><ChartSkeleton /></div>
        ) : (
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-10 rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
                <TrendingUp size={24} />
              </div>
              <h4 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Pulse Trend</h4>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history.slice(0, 10).reverse()}>
                  <defs>
                    <linearGradient id="colorPulse" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" className="dark:stroke-gray-800" />
                  <XAxis dataKey="text" hide />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 500 }} tickFormatter={(val) => `${formatConfidence(val)}%`} />
                  <Tooltip labelStyle={{ fontWeight: 600 }} />
                  <Area type="monotone" dataKey="confidence" stroke="#3b82f6" strokeWidth={5} fillOpacity={1} fill="url(#colorPulse)" animationDuration={800} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {(loading && history.length === 0) ? <ChartSkeleton /> : (
          <div className="bg-white dark:bg-gray-900 p-10 rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <PieChartIcon size={24} />
              </div>
              <h4 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Distribution</h4>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={80} outerRadius={110} paddingAngle={10} dataKey="value" animationDuration={800}>
                    {pieData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {(loading && history.length === 0) ? <TableSkeleton /> : (
        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl">
                <Clock size={24} />
              </div>
              <h4 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Recent Analyses</h4>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/30 dark:bg-gray-900/30">
                  <th className="px-10 py-6 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-600">Text</th>
                  <th className="px-10 py-6 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-600">Sentiment</th>
                  <th className="px-10 py-6 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-600 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {history.slice(0, 5).map((item) => (
                  <tr key={item.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all cursor-default">
                    <td className="px-10 py-8 font-semibold text-gray-800 dark:text-white text-lg tracking-tight">{item.text}</td>
                    <td className="px-10 py-8">
                      <span className={`px-4 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-[0.15em] ${item.sentiment === 'positive' ? 'bg-emerald-50 text-emerald-600' : item.sentiment === 'negative' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        {item.sentiment}
                      </span>
                    </td>
                    <td className="px-10 py-8 text-right text-xs font-semibold text-gray-500 uppercase tracking-widest">
                      {formatDate(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Add these for framer-motion compatibility
import { motion, AnimatePresence } from 'framer-motion';
import { formatConfidence } from '../utils/formatters';

