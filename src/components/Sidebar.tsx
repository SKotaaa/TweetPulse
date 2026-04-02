import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Search, History, Settings, Plus } from 'lucide-react';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analyze', label: 'Analyze', icon: Search },
  { to: '/history', label: 'History', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 h-[calc(100vh-64px)] sticky top-16 p-4 flex flex-col justify-between transition-colors duration-300">
      <div className="space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `
              flex items-center gap-4 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all
              ${isActive 
                ? 'bg-gradient-to-r from-blue-600 to-teal-500 text-white shadow-lg shadow-blue-500/20' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-blue-600 dark:hover:text-blue-400'}
            `}
          >
            <link.icon size={18} />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="px-2">
        <NavLink
          to="/analyze"
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Plus size={20} />
          <span>New Analysis</span>
        </NavLink>
      </div>
    </aside>
  );
}
