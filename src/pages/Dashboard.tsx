import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, getCountFromServer, limit } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, AnalysisResult } from '../firebase';
import { useAuth } from '../App';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Clock, AlertCircle, MessageSquare, Users, ArrowUpRight, Activity, Zap, Sparkles, PieChart as PieChartIcon } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#ef4444'];

export default function Dashboard() {
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState('');

  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setHistory([]);
      setLoading(false);
      return;
    }

    // 1. Instant Server-Side Count for the 'Analyses Total' metric
    const countQuery = query(collection(db, 'users', user.uid, 'history'));
    getCountFromServer(countQuery).then(snapshot => {
      setTotalCount(snapshot.data().count);
    }).catch(err => {
      console.warn("Count fetch failed, falling back to local history length:", err);
    });

    // 2. High-Speed Snapshot capped at 50 most recent records
    const q = query(
      collection(db, 'users', user.uid, 'history'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AnalysisResult[];
      console.log("Fetched dashboard data:", data);
      setHistory(data);
      setLoading(false);
      setIsInitialized(true);
    }, (err) => {
      console.error("Firestore error:", err);
      handleFirestoreError(err, OperationType.LIST, `users/${user?.uid}/history`);
      setError('Failed to fetch dashboard data');
      setLoading(false);
      setIsInitialized(true);
    });

    return () => unsubscribe();
  }, [user]);

  const latestAnalysis = history[0] || null;

  const stats = [
    { 
      label: 'Total Analyses', 
      value: totalCount !== null ? totalCount : history.length, 
      icon: Activity,
      color: 'from-blue-600 to-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-600 dark:text-blue-400'
    },
    { 
      label: 'Avg Confidence', 
      value: history.length ? `${Math.round(history.reduce((acc, curr) => acc + curr.confidence, 0) / history.length * 100)}%` : '0%', 
      icon: Zap,
      color: 'from-emerald-600 to-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-600 dark:text-emerald-400'
    },
    { 
      label: 'Latest Sentiment', 
      value: latestAnalysis ? latestAnalysis.sentiment.toUpperCase() : 'N/A', 
      icon: MessageSquare,
      color: 'from-purple-600 to-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      text: 'text-purple-600 dark:text-purple-400'
    },
    { 
      label: 'Active Topics', 
      value: new Set(history.map(h => h.text)).size, 
      icon: Sparkles,
      color: 'from-teal-600 to-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-900/20',
      text: 'text-teal-600 dark:text-teal-400'
    },
  ];

  const pieData = latestAnalysis ? [
    { name: 'Positive', value: latestAnalysis.stats.positive },
    { name: 'Neutral', value: latestAnalysis.stats.neutral },
    { name: 'Negative', value: latestAnalysis.stats.negative },
  ] : [];

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${loading ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${loading ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {loading ? 'Syncing Pulse Intelligence...' : 'Live Intelligence Feed'}
            </span>
          </div>
          <h2 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white leading-none">Dashboard</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium text-lg">High-velocity overview of your sentiment performance.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.location.reload()}
            className="p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-gray-500 hover:text-blue-600 transition-all shadow-sm active:scale-95"
            title="Refresh Dashboard"
          >
            <Activity size={20} />
          </button>
          <div className="flex items-center gap-4 px-6 py-3 bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-100 dark:border-gray-800">
            {loading ? (
              <div className="w-5 h-5 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
            ) : (
              <Clock className="text-blue-500" size={20} />
            )}
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{loading ? 'Syncing...' : 'Last Sync'}</span>
              <span className="text-sm font-black text-gray-900 dark:text-white">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-4 p-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-3xl text-red-600 dark:text-red-400">
          <AlertCircle className="w-6 h-6" />
          <p className="font-black text-sm uppercase tracking-widest">{error}</p>
        </div>
      )}

      {/* Stats Grid - GUARDED AGAINST FALSE ZEROS */}
      {isInitialized && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-in fade-in duration-500">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] shadow-xl shadow-blue-900/5 border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-[0.03] rounded-bl-[4rem] transform translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-700`} />
              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.text} flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-500`}>
                  <stat.icon size={28} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-2">{stat.label}</p>
                <div className="flex items-baseline gap-3">
                  <h3 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{stat.value}</h3>
                  <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                    <ArrowUpRight size={14} />
                    Live
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NO FALSE EMPTY STATE GUARANTEE */}
      {!isInitialized ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-400 font-black text-xs uppercase tracking-[0.2em] animate-pulse">Syncing Pulse Intelligence...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 p-12 rounded-[3rem] shadow-xl shadow-blue-900/5 border border-gray-100 dark:border-gray-800 text-center space-y-6">
          <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8">
            <Activity size={48} />
          </div>
          <div className="max-w-md mx-auto space-y-4">
            <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">No Kinetic Data Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 font-bold leading-relaxed">
              Your dashboard is currently waiting for data. Start your first analysis to see real-time sentiment intelligence and trends.
            </p>
            <div className="pt-4">
              <a 
                href="/analyze" 
                className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all"
              >
                Start First Analysis
                <Zap size={18} fill="currentColor" />
              </a>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Trend Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-10 rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
                <TrendingUp size={24} />
              </div>
              <div>
                <h4 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Sentiment Trend</h4>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{latestAnalysis?.text || 'No Active Keyword'}</p>
              </div>
            </div>
            <select className="bg-gray-50 dark:bg-gray-950 border-none rounded-xl text-xs font-black uppercase tracking-widest px-4 py-2 outline-none text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <option>Last 10 analyses</option>
              <option>Last 30 days</option>
            </select>
          </div>
          
          <div className="h-[350px] w-full">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history.slice(0, 10).reverse()}>
                  <defs>
                    <linearGradient id="colorPulse" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" className="dark:stroke-gray-800" />
                  <XAxis 
                    dataKey="text" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 700 }} 
                    dy={15}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 700 }} 
                    tickFormatter={(val) => `${Math.round(val * 100)}%`}
                    dx={-10}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '20px', 
                      border: 'none', 
                      boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(12px)',
                      padding: '16px'
                    }}
                    itemStyle={{ fontWeight: '900', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="confidence" 
                    stroke="#3b82f6" 
                    strokeWidth={5} 
                    fillOpacity={1} 
                    fill="url(#colorPulse)" 
                    animationDuration={2500}
                    dot={{ r: 6, fill: '#3b82f6', strokeWidth: 3, stroke: '#fff' }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                <Activity size={48} className="text-gray-200 dark:text-gray-800 mb-4" />
                <p className="text-gray-400 font-black text-xs uppercase tracking-widest">No trend data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Distribution Chart */}
        <div className="bg-white dark:bg-gray-900 p-10 rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4 mb-10">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <Activity size={24} />
            </div>
            <h4 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Distribution</h4>
          </div>
          
          <div className="h-[350px] w-full">
            {latestAnalysis ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={10}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={2000}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      fontWeight: 900
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                <PieChartIcon size={48} className="text-gray-200 dark:text-gray-800 mb-4" />
                <p className="text-gray-400 font-black text-xs uppercase tracking-widest">No distribution data</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Table */}
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl">
              <Clock size={24} />
            </div>
            <h4 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Recent Analyses</h4>
          </div>
          <button className="px-6 py-3 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">View All History</button>
        </div>
        
        <div className="overflow-x-auto">
          {history.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/30 dark:bg-gray-900/30">
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Text</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Sentiment</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Confidence</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {history.slice(0, 5).map((item) => (
                  <tr key={item.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all cursor-default">
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="font-black text-gray-900 dark:text-white text-lg tracking-tight">{item.text}</span>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em]
                        ${item.sentiment === 'positive' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30' : 
                          item.sentiment === 'negative' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/30' : 
                          'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30'}
                      `}>
                        {item.sentiment}
                      </span>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000"
                            style={{ width: `${Math.round(item.confidence * 100)}%` }}
                          />
                        </div>
                        <span className="font-black text-sm text-gray-900 dark:text-white">{Math.round(item.confidence * 100)}%</span>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                        {item.createdAt?.toDate().toLocaleDateString() || 'Just now'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-20 text-center bg-gray-50/30 dark:bg-gray-900/30">
              <Activity size={48} className="text-gray-200 dark:text-gray-800 mx-auto mb-4" />
              <p className="text-gray-400 font-black text-xs uppercase tracking-widest">No pulse history detected</p>
            </div>
          )}
        </div>
      </div>
    </>
  )}
</div>
);
}
