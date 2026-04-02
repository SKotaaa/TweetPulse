import React from 'react';
import { Activity } from 'lucide-react';

export default function Logo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <div className={`${className} bg-gradient-to-br from-blue-600 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20`}>
      <Activity size="70%" strokeWidth={3} />
    </div>
  );
}
