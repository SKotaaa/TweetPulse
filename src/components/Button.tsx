export default function Button({ 
  children, 
  onClick, 
  className = "", 
  variant = "primary", 
  type = "button", 
  disabled = false, 
  loading = false,
  ...props 
}: any) {
  const variants: any = {
    primary: "bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30",
    secondary: "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-2 border-blue-100 dark:border-blue-900/50 hover:border-blue-600 dark:hover:border-blue-500",
    outline: "border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
