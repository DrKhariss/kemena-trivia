import { useState, useEffect } from 'react';
import { Save, Loader2, LogIn, LogOut, Shield, AlertTriangle, Image as ImageIcon, FileText, Music } from 'lucide-react';
import { motion } from 'motion/react';
import { 
  doc, 
  onSnapshot, 
  setDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { db, auth } from '../lib/firebase';

const ADMIN_EMAILS = ['chukwuebukankemena@gmail.com', 'admin@kemena.com'];

interface ConfigData {
  heroImageUrl: string;
  bioText: string;
  battleMusicUrl: string;
}

export default function AdminConsole() {
  const [config, setConfig] = useState<ConfigData>({
    heroImageUrl: '',
    bioText: '',
    battleMusicUrl: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    const docRef = doc(db, 'config', 'mainPage');
    const unsubscribeStore = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setConfig({
          heroImageUrl: data.heroImageUrl || '',
          bioText: data.bioText || '',
          battleMusicUrl: data.battleMusicUrl || '',
        });
      }
      setLoading(false);
    }, (err) => {
      console.error('Firestore Error:', err);
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeStore();
    };
  }, []);

  const handleLogin = async () => {
    if (username !== 'admin' || password !== 'kemenaconsole123') {
      setMessage('ERROR: INVALID_CREDENTIALS');
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, 'admin@kemena.com', password);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        try {
          await createUserWithEmailAndPassword(auth, 'admin@kemena.com', password);
        } catch (createErr) {
          console.error(createErr);
          setMessage('ERROR: ACCOUNT_CREATION_FAILED');
        }
      } else {
        console.error(err);
        setMessage('ERROR: LOGIN_FAILED');
      }
    }
  };

  const handleLogout = () => signOut(auth);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800000) { // ~800KB limit for base64 in Firestore (1MB doc limit)
      setMessage('ERROR: FILE_TOO_LARGE_MAX_800KB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setConfig({ ...config, heroImageUrl: reader.result as string });
      setMessage('IMAGE_STAGED_FOR_UPLOAD');
      setTimeout(() => setMessage(''), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
      setMessage('ERROR: INSUFFICIENT_PERMISSIONS');
      return;
    }

    // Word count check
    const wordCount = config.bioText.trim().split(/\s+/).length;
    if (wordCount > 250) {
      setMessage(`ERROR: BIO_EXCEEDS_250_WORDS (${wordCount} words)`);
      return;
    }

    setSaving(true);
    setMessage('');
    
    try {
      await setDoc(doc(db, 'config', 'mainPage'), {
        heroImageUrl: config.heroImageUrl,
        bioText: config.bioText,
        battleMusicUrl: config.battleMusicUrl,
        updatedAt: serverTimestamp()
      });

      setMessage('SYSTEM_CONFIG_UPDATED_SUCCESSFULLY');
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      console.error(err);
      setMessage('ERROR: SYNC_FAILURE');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 className="animate-spin text-tactical-amber mb-4" size={48} />
      <div className="font-mono text-[10px] tracking-widest animate-pulse">ESTABLISHING_SECURE_LINK...</div>
    </div>
  );

  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    return (
      <div className="max-w-4xl mx-auto py-12 sm:py-24 px-4 sm:px-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/20 border border-white/5 p-6 sm:p-12 backdrop-blur-sm"
        >
          <Shield size={48} className="text-tactical-amber mx-auto mb-6" />
          <h1 className="font-army text-3xl uppercase text-tactical-cyan mb-4">RESTRICTED_CONSOLE</h1>
          <p className="font-mono text-[11px] text-army-light uppercase tracking-widest mb-8">
            Signal restricted to #KEMENA_HIGH_COMMAND authorized relay nodes only.
          </p>
          <div className="flex flex-col gap-4 mb-8">
            <input 
              type="text" 
              placeholder="USERNAME" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full max-w-sm mx-auto bg-white/5 border border-white/10 px-4 py-3 font-mono text-[11px] text-tactical-cyan focus:outline-none focus:border-tactical-amber text-center"
            />
            <input 
              type="password" 
              placeholder="PASSWORD" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full max-w-sm mx-auto bg-white/5 border border-white/10 px-4 py-3 font-mono text-[11px] text-tactical-cyan focus:outline-none focus:border-tactical-amber text-center"
            />
          </div>
          <button 
            onClick={handleLogin}
            className="flex items-center justify-center gap-3 bg-tactical-cyan text-army-dark px-8 py-3 mx-auto font-mono text-[11px] uppercase font-bold hover:bg-tactical-amber hover:text-white transition-all active:scale-95 w-full max-w-sm"
          >
            <LogIn size={18} /> AUTHENTICATE_OPERATOR
          </button>
          
          {user && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-red-500 font-mono text-[9px] uppercase">
                <AlertTriangle size={14} /> 
                IDENT_MISMATCH: {user.email}
              </div>
              <button onClick={handleLogout} className="text-tactical-cyan hover:text-tactical-amber font-mono text-[9px] uppercase underline">
                TERMINATE_SIGNAL
              </button>
            </div>
          )}
          
          {message && (
             <div className="mt-6 text-red-500 font-mono text-[10px] uppercase tracking-widest">{message}</div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
      <div className="mb-8 sm:mb-12 border-b border-white/10 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <div className="hud-label text-tactical-amber mb-2">SYSTEM_OVERRIDE_CENTER</div>
          <h1 className="font-army text-3xl sm:text-5xl uppercase tracking-tighter text-tactical-cyan">LANDING_PAGE_CTRL</h1>
          <p className="font-mono text-[11px] text-army-light mt-2 uppercase tracking-widest">
            OPERATOR: <span className="text-tactical-cyan">{user.email}</span>
          </p>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 border border-white/10 text-white/40 px-4 py-2 font-mono text-[9px] uppercase hover:border-red-500 hover:text-red-500 transition-all active:scale-95"
        >
          <LogOut size={14} /> LOGOUT
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {/* Image Section */}
        <div className="bg-black/20 border border-white/5 p-5 sm:p-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-8">
            <ImageIcon size={20} className="text-tactical-cyan" />
            <h2 className="font-mono text-xs uppercase font-bold tracking-widest text-tactical-cyan">HERO_IMAGE_CONFIG</h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
            <div className="w-full sm:w-48 h-48 sm:h-64 bg-white/5 border border-white/10 overflow-hidden relative group shrink-0">
              {config.heroImageUrl ? (
                <img src={config.heroImageUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/10 italic font-mono text-[10px]">NO_IMAGE</div>
              )}
            </div>
            
            <div className="flex-1 space-y-4">
              <div className="hud-label">Source Selection</div>
              <input 
                type="text" 
                value={config.heroImageUrl}
                onChange={(e) => setConfig({ ...config, heroImageUrl: e.target.value })}
                placeholder="ENTER_IMAGE_URL_OR_UPLOAD_BELOW..."
                className="w-full bg-white/5 border border-white/10 px-4 py-3 font-mono text-[11px] text-tactical-cyan focus:outline-none focus:border-tactical-amber transition-colors"
              />
              <div className="flex flex-col gap-2">
                 <label className="btn-primary !w-auto flex items-center justify-center gap-2 py-2 cursor-pointer text-[10px]">
                   <ImageIcon size={14} /> UPLOAD_LOCAL_FILE
                   <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                 </label>
                 <p className="font-mono text-[8px] text-army-light uppercase">Max size: 800KB (Encoded for Firestore limits)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bio Text Section */}
        <div className="bg-black/20 border border-white/5 p-5 sm:p-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-8">
            <FileText size={20} className="text-tactical-cyan" />
            <h2 className="font-mono text-xs uppercase font-bold tracking-widest text-tactical-cyan">BIOGRAPHY_DATA_STREAM</h2>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div className="hud-label">TEXT_PAYLOAD (MAX 250 WORDS)</div>
              <div className="font-mono text-[10px] text-army-light">
                WORDS: <span className={config.bioText.trim().split(/\s+/).filter(Boolean).length > 250 ? 'text-red-500' : 'text-tactical-cyan'}>
                  {config.bioText.trim().split(/\s+/).filter(Boolean).length}
                </span> / 250
              </div>
            </div>
            <textarea 
              value={config.bioText}
              onChange={(e) => setConfig({ ...config, bioText: e.target.value })}
              rows={8}
              placeholder="ENTER_ARTIST_BIOGRAPHY_HERE..."
              className="w-full bg-white/5 border border-white/10 px-6 py-4 font-mono text-[13px] leading-relaxed text-tactical-cyan focus:outline-none focus:border-tactical-amber transition-colors resize-none"
            />
          </div>
        </div>

        {/* Battle Music Section */}
        <div className="bg-black/20 border border-white/5 p-5 sm:p-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-8">
            <Music size={20} className="text-tactical-cyan" />
            <h2 className="font-mono text-xs uppercase font-bold tracking-widest text-tactical-cyan">BATTLE_MUSIC_FEED</h2>
          </div>

          <div className="space-y-4">
            <div className="hud-label">AUDIO SOURCE URL (MP3/WAV)</div>
            <input 
              type="text" 
              value={config.battleMusicUrl}
              onChange={(e) => setConfig({ ...config, battleMusicUrl: e.target.value })}
              placeholder="ENTER_AUDIO_URL_HERE..."
              className="w-full bg-white/5 border border-white/10 px-6 py-4 font-mono text-[13px] text-tactical-cyan focus:outline-none focus:border-tactical-amber transition-colors"
            />
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 sm:p-8 bg-tactical-cyan/5 border border-tactical-cyan/10">
          <div className="font-mono text-[11px] text-army-light uppercase tracking-widest text-center sm:text-left">
            {message ? (
              <span className={message.startsWith('ERROR') ? 'text-red-500' : 'text-tactical-amber'}>
                [ STATUS ]: {message}
              </span>
            ) : (
              <span>[ STANDBY ]: READY_FOR_SYNC</span>
            )}
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-3 bg-tactical-amber text-army-dark px-8 sm:px-16 py-4 font-mono text-[12px] uppercase font-bold hover:bg-tactical-amber/80 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-tactical-amber/20"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            COMMIT_TO_DATABASE
          </button>
        </div>

      </div>
    </div>
  );
}
