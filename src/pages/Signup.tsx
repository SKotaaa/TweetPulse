import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { Activity, Zap, ShieldCheck, Eye, EyeOff, ArrowRight, Check, X } from 'lucide-react';
import Logo from '../components/Logo';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const passwordStrength = useMemo(() => {
    if (!password) return { label: '', color: 'bg-gray-200', width: '0%', textColor: 'text-gray-400' };
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    switch (strength) {
      case 0:
      case 1:
        return { label: 'Weak', color: 'bg-red-500', width: '33%', textColor: 'text-red-500' };
      case 2:
      case 3:
        return { label: 'Medium', color: 'bg-yellow-500', width: '66%', textColor: 'text-yellow-600' };
      case 4:
        return { label: 'Strong', color: 'bg-emerald-500', width: '100%', textColor: 'text-emerald-500' };
      default:
        return { label: '', color: 'bg-gray-200', width: '0%', textColor: 'text-gray-400' };
    }
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setLoading(true);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: username });

      // Fire and forget the profile creation.
      // We don't want to block the user from entering the dashboard if Firestore is slow.
      setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        username: username.toLowerCase(),
        email,
        createdAt: serverTimestamp(),
        role: 'user'
      }, { merge: true }).catch(firestoreErr => {
        console.error('Firestore background error:', firestoreErr);
      });

      navigate('/dashboard');
    } catch (err: any) {
      console.error('Signup error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password signup is not enabled.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already in use. Please log in.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Failed to create account');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Fire and forget the profile update.
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
      console.error('Google signup error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Google sign-in is not enabled.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled.');
      } else {
        setError(err.message || 'Failed to sign up with Google');
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
            Start your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">Kinetic Journey</span> <br />
            today.
          </h1>
          <p className="text-xl text-gray-500 dark:text-gray-400 font-medium max-w-md leading-relaxed">
            Join thousands of analysts decoding the pulse of the internet in real-time. Fast, accurate, and incredibly powerful.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-8 max-w-lg">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-xl shadow-blue-900/5 border border-white dark:border-gray-700">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4">
              <ShieldCheck size={20} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Security</p>
            <p className="text-2xl font-black text-blue-900 dark:text-white">Enterprise</p>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-xl shadow-blue-900/5 border border-white dark:border-gray-700">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4">
              <Zap size={20} fill="currentColor" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Processing</p>
            <p className="text-2xl font-black text-emerald-600">Real-time</p>
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
            <h2 className="text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">Create Account</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Join TweetPulse and start decoding data.</p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-3xl text-sm font-bold border border-red-100 dark:border-red-900/30 animate-in fade-in slide-in-from-top-2 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <X size={12} />
                </div>
                <p className="flex-1">{error}</p>
              </div>
              {error.includes('already in use') && (
                <Link 
                  to="/login" 
                  className="w-full py-3 bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 rounded-2xl text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-all border border-blue-100 dark:border-blue-900/30"
                >
                  Go to Login
                </Link>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handleGoogleSignup}
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
                  type="text"
                  placeholder="User ID / Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-6 py-5 bg-gray-100 dark:bg-gray-900 border-none rounded-2xl text-gray-900 dark:text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                  required
                />
              </div>
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
              <div className="space-y-2">
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
                
                {password && (
                  <div className="px-2 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${passwordStrength.textColor}`}>
                        Strength: {passwordStrength.label}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${passwordStrength.color}`}
                        style={{ width: passwordStrength.width }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-6 py-5 bg-gray-100 dark:bg-gray-900 border-none rounded-2xl text-gray-900 dark:text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none pr-14"
                  required
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                  {confirmPassword && (
                    password === confirmPassword ? 
                    <Check className="text-emerald-500" size={20} /> : 
                    <X className="text-red-500" size={20} />
                  )}
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
              <ArrowRight size={24} />
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 font-bold">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
