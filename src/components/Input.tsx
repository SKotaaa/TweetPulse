export default function Input({ label, type = "text", value, onChange, placeholder, required = false, className = "", ...props }: any) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 rounded-xl outline-none transition-all font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
        {...props}
      />
    </div>
  );
}
