export default function Card({ children, className = "", ...props }: any) {
  return (
    <div className={`bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors duration-300 ${className}`} {...props}>
      {children}
    </div>
  );
}
