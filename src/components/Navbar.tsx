import { useAuth } from '../App';
import { Search, Bell, User, LogOut } from 'lucide-react';
import Logo from './Logo';

export default function Navbar() {
  const { username, logout } = useAuth();

  return (
    <nav className="h-16 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 flex items-center justify-between px-8 sticky top-0 z-50 transition-colors duration-300">
      <div className="flex items-center gap-12">
        <div className="flex items-center gap-3">
          <Logo className="w-8 h-8" />
          <div className="flex flex-col">
            <span className="text-xl font-black text-blue-900 dark:text-white tracking-tight leading-none uppercase">TweetPulse</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Sentiment Intelligence</span>
          </div>
        </div>

        <div className="hidden md:flex items-center bg-gray-100 dark:bg-gray-900 rounded-full px-4 py-2 w-96 group focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
          <Search className="text-gray-400 mr-2" size={18} />
          <input 
            type="text" 
            placeholder="Search platform..." 
            className="bg-transparent border-none outline-none text-sm w-full text-gray-700 dark:text-gray-300 placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 pl-6 border-l border-gray-100 dark:border-gray-800">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-gray-900 dark:text-white leading-none">@{username || 'User'}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Active Analyst</p>
          </div>
          <div className="group relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black overflow-hidden shadow-lg shadow-blue-500/20 cursor-pointer">
              <User size={20} />
            </div>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2">
              <button 
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
