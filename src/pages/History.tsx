import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, AnalysisResult } from '../firebase';
import { useAuth } from '../App';
import Card from '../components/Card';
import { Calendar, Search, AlertCircle, Trash2, ExternalLink, Share2, CheckCircle2 } from 'lucide-react';

export default function History() {
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setHistory([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'history'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AnalysisResult[];
      console.log("Fetched data:", data);
      setHistory(data);
      setLoading(false);
      setIsInitialized(true);
    }, (err) => {
      console.error("Firestore error:", err);
      handleFirestoreError(err, OperationType.LIST, `users/${user?.uid}/history`);
      setError('Failed to fetch history');
      setLoading(false);
      setIsInitialized(true);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!user) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'history', id));
      setConfirmDeleteId(null);
      setSuccess('Entry deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error("Firestore error:", err);
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/history/${id}`);
      setError('Failed to delete entry');
    } finally {
      setDeletingId(null);
    }
  };

  const handleShare = (item: AnalysisResult) => {
    const text = `TweetPulse Analysis Report\nTopic: ${item.text}\nSentiment: ${item.sentiment.toUpperCase()}\nConfidence: ${Math.round(item.confidence * 100)}%\nSummary: ${item.summary}`;
    navigator.clipboard.writeText(text).then(() => {
      setSuccess('Report copied to clipboard!');
      setTimeout(() => setSuccess(''), 3000);
    }).catch(() => {
      setError('Failed to copy to clipboard');
    });
  };

  const filteredHistory = history.filter(item => {
    const matchesSearch = item.text.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!item.createdAt) return matchesSearch;
    
    const itemDate = item.createdAt.toDate();
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    // Set end date to end of day
    if (end) end.setHours(23, 59, 59, 999);
    
    const matchesStart = start ? itemDate >= start : true;
    const matchesEnd = end ? itemDate <= end : true;
    
    return matchesSearch && matchesStart && matchesEnd;
  });

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">History</h2>
          <p className="text-gray-500 dark:text-gray-400">Review your past analysis reports</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.location.reload()}
            className="p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-gray-500 hover:text-blue-600 transition-all shadow-sm active:scale-95"
            title="Refresh History"
          >
            <Calendar size={20} />
          </button>
          {loading && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
              <div className="w-4 h-4 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Syncing...</span>
            </div>
          )}
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <p className="font-bold">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-5 h-5" />
          <p className="font-bold">{success}</p>
        </div>
      )}

      <Card className="p-0 overflow-hidden border-none shadow-xl shadow-gray-200/50 dark:shadow-none">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-6 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-blue-600 dark:focus:border-blue-500 text-gray-900 dark:text-white transition-colors"
              placeholder="Filter history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">From</span>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:border-blue-600 dark:focus:border-blue-500 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">To</span>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:border-blue-600 dark:focus:border-blue-500 text-gray-900 dark:text-white"
              />
            </div>
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-900/50">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Text</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Date</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Confidence</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Status</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {!isInitialized ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                      <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest animate-pulse">Synchronizing Records...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredHistory.length > 0 ? (
                filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    {/* ... (row content remains same) */}
                    <td className="px-8 py-5 font-bold text-gray-900 dark:text-white">{item.text}</td>
                    <td className="px-8 py-5 text-sm text-gray-500 dark:text-gray-400">
                      {item.createdAt?.toDate().toLocaleDateString() || 'Just now'}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${Math.round(item.confidence * 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-black dark:text-gray-300">{Math.round(item.confidence * 100)}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${
                        item.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        item.sentiment === 'negative' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {item.sentiment}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleShare(item)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" 
                          title="Share Report"
                        >
                          <Share2 size={16} />
                        </button>
                        
                        {confirmDeleteId === item.id ? (
                          <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
                            <button 
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingId === item.id}
                              className="px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-700 transition-colors"
                            >
                              {deletingId === item.id ? '...' : 'Confirm'}
                            </button>
                            <button 
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setConfirmDeleteId(item.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" 
                            title="Delete Entry"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-gray-400 dark:text-gray-600 font-bold">
                    No matching analysis history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
