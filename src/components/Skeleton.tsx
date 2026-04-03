import React from 'react';

export const StatsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-pulse">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] shadow-xl shadow-blue-900/5 border border-gray-100 dark:border-gray-800">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-6" />
        <div className="h-2 w-24 bg-gray-100 dark:bg-gray-800 rounded-full mb-3" />
        <div className="h-8 w-32 bg-gray-100 dark:bg-gray-800 rounded-lg" />
      </div>
    ))}
  </div>
);

export const ChartSkeleton = () => (
  <div className="bg-white dark:bg-gray-900 p-10 rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-gray-100 dark:border-gray-800 animate-pulse">
    <div className="flex items-center gap-4 mb-10">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800" />
      <div className="space-y-2">
        <div className="h-6 w-48 bg-gray-100 dark:bg-gray-800 rounded-lg" />
        <div className="h-3 w-32 bg-gray-100 dark:bg-gray-800 rounded-full" />
      </div>
    </div>
    <div className="h-[300px] w-full bg-gray-50/50 dark:bg-gray-950/50 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800" />
  </div>
);

export const TableSkeleton = () => (
  <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-gray-100 dark:border-gray-800 overflow-hidden animate-pulse">
    <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-8 w-48 bg-gray-100 dark:bg-gray-800 rounded-lg" />
      </div>
      <div className="w-32 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl" />
    </div>
    <div className="p-10 space-y-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center justify-between h-12">
          <div className="h-4 w-1/3 bg-gray-100 dark:bg-gray-800 rounded-full" />
          <div className="h-4 w-1/4 bg-gray-100 dark:bg-gray-800 rounded-full" />
          <div className="h-4 w-1/6 bg-gray-100 dark:bg-gray-800 rounded-full" />
        </div>
      ))}
    </div>
  </div>
);
