import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import Logo from '../components/Logo';
import { 
  ArrowRight, 
  PlayCircle, 
  Rocket, 
  Zap, 
  TrendingUp, 
  Users, 
  ShieldCheck, 
  Database, 
  Clock, 
  CheckCircle2, 
  Star,
  Send,
  Bell,
  Search,
  LayoutDashboard,
  History,
  Sparkles
} from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#f7f9fb] text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navigation */}
      <header className="w-full sticky top-0 z-50 bg-[#f7f9fb]/70 backdrop-blur-xl border-b border-gray-200/50">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
              <Logo className="w-8 h-8" />
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-gray-900 leading-none">TweetPulse</span>
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-600 mt-1">Sentiment Intelligence</span>
              </div>
            </div>
            <div className="hidden md:flex gap-8">
              <Link to="/dashboard" className="text-blue-600 font-bold border-b-2 border-blue-600 pb-1 text-sm">Dashboard</Link>
              <Link to="/analyze" className="text-gray-500 hover:text-gray-900 font-bold text-sm transition-colors">Analyze</Link>
              <Link to="/history" className="text-gray-500 hover:text-gray-900 font-bold text-sm transition-colors">History</Link>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell size={20} />
            </button>
            <Link to="/login" className="text-blue-600 font-bold text-sm hover:text-blue-700">Sign In</Link>
            <Link to="/signup" className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:scale-105 transition-all">
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7 space-y-8"
            >
              <h1 className="text-7xl font-black leading-[1.1] tracking-tight text-gray-900">
                Analyze Public <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">Sentiment</span> in Real-Time
              </h1>
              <p className="text-xl text-gray-500 max-w-xl leading-relaxed">
                TweetPulse transforms the chaotic Twitter stream into high-velocity insights. Track brand health, emerging trends, and audience mood with precision gradients of data.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Link to="/analyze" className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-xl shadow-blue-500/25 flex items-center gap-3 hover:scale-105 transition-all">
                  Launch Analysis <Rocket size={20} />
                </Link>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-5 relative"
            >
              <div className="grid grid-cols-1 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[4rem] -translate-y-8 translate-x-8 transition-transform group-hover:scale-110" />
                  <div className="relative z-10 space-y-6">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                      <TrendingUp size={28} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-gray-900 leading-tight">Instant Sentiment Mapping</h3>
                      <p className="text-gray-500 font-medium font-bold">Upload any keyword and watch our AI decode the emotional landscape of the internet in milliseconds.</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[4rem] -translate-y-8 translate-x-8 transition-transform group-hover:scale-110" />
                  <div className="relative z-10 space-y-6">
                    <div className="w-14 h-14 bg-white/10 text-emerald-400 rounded-2xl flex items-center justify-center shadow-sm">
                      <ShieldCheck size={28} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-white leading-tight">Private & Secure</h3>
                      <p className="text-gray-400 font-medium">Your analyses are strictly isolated to your account. We never share your intelligence streams with third parties.</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-gray-50/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl font-black tracking-tight text-gray-900">Powerful Features, <span className="text-blue-600">Infinite Insights</span></h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">Precision-engineered tools to decode the global conversation.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[240px]">
              <div className="md:col-span-8 md:row-span-2 bg-white rounded-3xl p-10 flex flex-col justify-between shadow-sm border border-gray-100 relative overflow-hidden group">
                <div className="relative z-10">
                  <TrendingUp className="text-blue-600 mb-6" size={48} />
                  <h3 className="text-3xl font-black mb-4">Deep Neural Analysis</h3>
                  <p className="text-gray-500 max-w-md text-lg leading-relaxed">
                    Our proprietary LLM analyzes nuances in sarcasm, intent, and cultural context that standard scrapers miss. Get the "why" behind the numbers.
                  </p>
                </div>
                <button className="relative z-10 text-blue-600 font-bold flex items-center gap-2 group-hover:translate-x-2 transition-transform">
                  Explore Technology <ArrowRight size={20} />
                </button>
                <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-50 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
              </div>

              <div className="md:col-span-4 bg-emerald-500 rounded-3xl p-8 flex flex-col justify-between text-white shadow-lg shadow-emerald-500/10">
                <div className="flex justify-between items-start">
                  <Clock size={32} />
                  <div className="bg-white/20 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest">Updated 0.2s ago</div>
                </div>
                <div>
                  <h4 className="text-xl font-bold mb-1">0ms Latency</h4>
                  <p className="text-white/80 text-sm">Streaming socket architecture for truly instant data updates.</p>
                </div>
              </div>

              <div className="md:col-span-4 bg-gray-900 rounded-3xl p-8 flex flex-col justify-center gap-4 text-white">
                <div className="flex gap-2">
                  <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
                  <div className="w-2 h-12 bg-emerald-500 rounded-full"></div>
                  <div className="w-2 h-6 bg-blue-300 rounded-full"></div>
                </div>
                <h4 className="text-xl font-bold">Predictive Signals</h4>
                <p className="text-gray-400 text-sm">Detect shifts in public opinion up to 4 hours before they trend.</p>
              </div>

              <div className="md:col-span-4 bg-white rounded-3xl p-8 shadow-sm flex items-center justify-between border border-gray-100">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Platform Strength</div>
                  <div className="text-4xl font-black text-blue-600 tracking-tighter">Unlimited</div>
                  <div className="text-xs font-bold text-gray-500 mt-1">Queries per second</div>
                </div>
                <Database className="text-blue-100" size={48} />
              </div>
            </div>
          </div>
        </section>

        {/* Clarity Section */}
        <section className="py-32">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center">
            <div className="relative">
              <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 space-y-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 opacity-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl transition-colors group-hover:bg-blue-100" />
                <div className="relative z-10 space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                      <LayoutDashboard size={32} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black tracking-tight text-gray-900">Unified Dashboard</h4>
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Central Intelligence Hub</p>
                    </div>
                  </div>
                  <p className="text-lg font-medium text-gray-600 leading-relaxed">
                    Access all your sentiment data from one premium interface. We provide high-fidelity charts and granular breakdowns for every analysis you perform.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Persistence</div>
                      <div className="text-xl font-black text-gray-900">100% Secure</div>
                    </div>
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Isolation</div>
                      <div className="text-xl font-black text-gray-900">User Scoped</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <h2 className="text-5xl font-black leading-tight text-gray-900">
                Clarity in the <br /> <span className="text-blue-600 text-6xl">Information Storm</span>
              </h2>
              <p className="text-xl text-gray-500 leading-relaxed">
                Stop guessing what your customers are thinking. Our visualization engine maps emotional trajectories with unprecedented accuracy, allowing you to pivot strategies in seconds.
              </p>
              <div className="space-y-4">
                {[
                  'Multi-Language Semantics',
                  'Automated Crisis Alerts',
                  'Competitive Benchmarking'
                ].map((item) => (
                  <div key={item} className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <CheckCircle2 size={16} />
                    </div>
                    <span className="font-bold text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white pt-24 pb-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Logo className="w-10 h-10" />
              <div className="flex flex-col">
                <span className="text-2xl font-black text-gray-900 leading-none">TweetPulse</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mt-1">Sentiment Intelligence</span>
              </div>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              High-performance sentiment architecture for the modern web. Built for speed, designed for clarity.
            </p>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors cursor-pointer">
                <Send size={18} />
              </div>
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors cursor-pointer">
                <Users size={18} />
              </div>
            </div>
          </div>
          <div>
            <h5 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-6">Product</h5>
            <ul className="space-y-4 text-sm font-bold text-gray-600">
              <li><Link to="/features" className="hover:text-blue-600">Features</Link></li>
              <li><Link to="/integrations" className="hover:text-blue-600">Integrations</Link></li>
              <li><Link to="/pricing" className="hover:text-blue-600">Pricing</Link></li>
              <li><Link to="/changelog" className="hover:text-blue-600">Changelog</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-6">Resources</h5>
            <ul className="space-y-4 text-sm font-bold text-gray-600">
              <li><Link to="/docs" className="hover:text-blue-600">Documentation</Link></li>
              <li><Link to="/api" className="hover:text-blue-600">API Reference</Link></li>
              <li><Link to="/case-studies" className="hover:text-blue-600">Case Studies</Link></li>
              <li><Link to="/community" className="hover:text-blue-600">Community</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-6">Subscribe</h5>
            <p className="text-sm text-gray-500 mb-4">Get the weekly sentiment report.</p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="Email address" 
                className="bg-gray-50 border-none rounded-xl text-sm px-4 py-3 focus:ring-2 focus:ring-blue-600 w-full"
              />
              <button className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
          <p>© 2024 TweetPulse. All rights reserved.</p>
          <div className="flex gap-8">
            <Link to="/privacy" className="hover:text-gray-900">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-gray-900">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
