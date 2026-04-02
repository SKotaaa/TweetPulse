import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../App';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { User, Moon, Sun, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Settings() {
  const { theme, toggleTheme } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      try {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            username: data.username || '',
            email: data.email || auth.currentUser.email || '',
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${auth.currentUser.uid}`);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(docRef, {
        firstName: profile.firstName,
        lastName: profile.lastName,
        username: profile.username.toLowerCase().replace(/\s+/g, ''),
        updatedAt: new Date().toISOString(),
      });
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser.uid}`);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Settings</h2>
          <p className="text-gray-500 dark:text-gray-400">Manage your account and application preferences</p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <div className="w-4 h-4 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Syncing...</span>
          </div>
        )}
      </header>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <p className="font-bold">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-5 h-5" />
          <p className="font-bold">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1 space-y-2">
          {[
            { id: 'profile', label: 'Profile', icon: User, active: true },
            { id: 'appearance', label: 'Appearance', icon: theme === 'dark' ? Moon : Sun },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => item.id === 'appearance' && toggleTheme()}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all
                ${item.active ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}
              `}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.id === 'appearance' && (
                <span className="ml-auto text-[10px] uppercase tracking-widest opacity-50">
                  {theme}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="md:col-span-3 space-y-6">
          <Card className="space-y-6">
            <h4 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">Profile Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="First Name" 
                placeholder="Alex" 
                value={profile.firstName}
                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
              />
              <Input 
                label="Last Name" 
                placeholder="Rivera" 
                value={profile.lastName}
                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
              />
              <Input 
                label="User ID (Username)" 
                placeholder="arivera" 
                value={profile.username}
                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
              />
              <Input 
                label="Email Address" 
                placeholder="alex@example.com" 
                value={profile.email}
                disabled
              />
            </div>
            <div className="pt-4 flex justify-end">
              <Button onClick={handleSave} loading={saving}>Save Changes</Button>
            </div>
          </Card>

          <Card className="space-y-6">
            <h4 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">Appearance</h4>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'}`}>
                  {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Dark Mode</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Switch between light and dark themes</p>
                </div>
              </div>
              <button 
                onClick={toggleTheme}
                className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
