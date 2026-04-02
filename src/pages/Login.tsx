import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { Activity, Zap, ShieldCheck, Eye, EyeOff, ArrowRight } from 'lucide-react';
import Logo from '../components/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password login is not enabled.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else {
        setError(err.message || 'Failed to login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Fire and forget the profile update, or use a timeout.
      // We don't want to block the user from entering the dashboard if Firestore is slow.
      setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        username: user.displayName?.replace(/\s+/g, '').toLowerCase() || user.email?.split('@')[0],
        email: user.email,
        createdAt: serverTimestamp(),
        role: 'user'
      }, { merge: true }).catch(firestoreErr => {
        console.error('Firestore background error:', firestoreErr);
      });

      navigate('/dashboard');
    } catch (err: any) {
      console.error('Google login error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Google sign-in is not enabled.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled.');
      } else {
        setError(err.message || 'Failed to login with Google');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950 transition-colors duration-300">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-[55%] bg-gray-50 dark:bg-gray-900 p-16 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-blue-100 to-teal-50 dark:from-blue-900/20 dark:to-teal-900/20 rounded-full blur-3xl animate-pulse" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <Logo className="w-12 h-12" />
            <div className="flex flex-col">
              <span className="text-2xl font-black text-blue-900 dark:text-white tracking-tight leading-none uppercase">TweetPulse</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mt-1">Sentiment Intelligence</span>
            </div>
          </div>
          
          <h1 className="text-7xl font-black text-blue-900 dark:text-white tracking-tighter leading-[0.9] mb-8">
            Decode the <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">Kinetic Pulse</span> <br />
            of data.
          </h1>
          <p className="text-xl text-gray-500 dark:text-gray-400 font-medium max-w-md leading-relaxed">
            Join the fastest growing high-velocity insight engine for modern brands. Real-time emotional intelligence, redefined.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-8 max-w-lg">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-xl shadow-blue-900/5 border border-white dark:border-gray-700">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4">
              <Zap size={20} fill="currentColor" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Latency</p>
            <p className="text-2xl font-black text-blue-900 dark:text-white">0.4ms</p>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-xl shadow-blue-900/5 border border-white dark:border-gray-700">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4">
              <Activity size={20} strokeWidth={3} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Accuracy</p>
            <p className="text-2xl font-black text-emerald-600">99.2%</p>
          </div>
        </div>

        {/* Decorative Image/Pulse */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl opacity-50 dark:opacity-30">
          <img 
            src="https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=2000&auto=format&fit=crop" 
            alt="" 
            className="w-full h-auto object-contain mix-blend-multiply dark:mix-blend-screen"
          />
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-24 relative">
        <div className="w-full max-w-md space-y-12">
          <div className="text-center lg:text-left">
            <h2 className="text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">Welcome Back</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Sign in to TweetPulse to continue your analysis.</p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm font-bold border border-red-100 dark:border-red-900/30 animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-3 py-4 px-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm active:scale-95"
            >
              <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="" className="w-5 h-5" />
              Google
            </button>
            <button 
              className="flex items-center justify-center gap-3 py-4 px-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm active:scale-95"
            >
              <Activity className="text-blue-400" size={20} />
              Twitter
            </button>
          </div>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100 dark:border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] font-black text-gray-400">
              <span className="bg-white dark:bg-gray-950 px-4">OR</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-6 py-5 bg-gray-100 dark:bg-gray-900 border-none rounded-2xl text-gray-900 dark:text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                  required
                />
              </div>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-6 py-5 bg-gray-100 dark:bg-gray-900 border-none rounded-2xl text-gray-900 dark:text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none pr-14"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" className="w-5 h-5 rounded-lg border-gray-200 dark:border-gray-800 text-blue-600 focus:ring-blue-500/20 transition-all" />
                <span className="text-sm font-bold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">Stay Logged In</span>
              </label>
              <Link to="#" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">Forgot Password?</Link>
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? 'Signing In...' : 'Sign in to Account'}
              <ArrowRight size={24} />
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 font-bold">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-600 dark:text-blue-400 hover:underline">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
