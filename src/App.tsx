import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Analyze from './pages/Analyze';
import History from './pages/History';
import Settings from './pages/Settings';
import DashboardLayout from './layouts/DashboardLayout';
import ErrorBoundary from './components/ErrorBoundary';

interface AuthContextType {
  user: User | null;
  username: string | null;
  authLoading: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  username: null,
  authLoading: true,
  theme: 'light',
  toggleTheme: () => {},
  logout: async () => {} 
});

export const useAuth = () => useContext(AuthContext);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, authLoading } = useAuth();
  
  // PERFORMANCE: No null render state, no full-screen spinner.
  // Pages will handle skeletons while authLoading is true.
  if (!authLoading && !user) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  useEffect(() => {
    // PERFORMANCE: Optimized single listener for auth
    const unsubscribe = onAuthStateChanged(auth, (userSession) => {
      setUser(userSession);
      setUsername(userSession?.displayName || 'User');
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // PERFORMANCE: Move profile listener here but keep it non-blocking
  useEffect(() => {
    if (user) {
      const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
        if (doc.exists()) {
          setUsername(doc.data().username || user.displayName || 'User');
        }
      }, (error) => {
        console.warn("PULSE: Profile fetch issue:", error.message);
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const authValue = useMemo(() => ({
    user,
    username,
    authLoading,
    theme,
    toggleTheme: () => setTheme(prev => prev === 'light' ? 'dark' : 'light'),
    logout: () => signOut(auth)
  }), [user, username, authLoading, theme]);

  return (
    <AuthContext.Provider value={authValue}>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="analyze" element={<Analyze />} />
              <Route path="history" element={<History />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </AuthContext.Provider>
  );
}

