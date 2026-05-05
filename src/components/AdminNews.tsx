import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Megaphone, Loader2, LogIn, LogOut, Shield, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { db, auth } from '../lib/firebase';

const ADMIN_EMAIL = 'chukwuebukankemena@gmail.com';

interface NewsNode {
  id?: string;
  text: string;
}

export default function AdminNews() {
  const [news, setNews] = useState<NewsNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    const q = query(collection(db, 'news'), orderBy('createdAt', 'asc'));
    const unsubscribeStore = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        text: doc.data().text
      }));
      setNews(items);
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
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      setMessage('ERROR: LOGIN_FAILED');
    }
  };

  const handleLogout = () => signOut(auth);

  const handleAdd = () => {
    setNews([...news, { text: "" }]);
  };

  const handleRemove = (index: number) => {
    setNews(news.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, value: string) => {
    const nextNews = [...news];
    nextNews[index] = { ...nextNews[index], text: value };
    setNews(nextNews);
  };

  const handleSave = async () => {
    if (!user || user.email !== ADMIN_EMAIL) {
      setMessage('ERROR: INSUFFICIENT_PERMISSIONS');
      return;
    }

    setSaving(true);
    setMessage('');
    
    try {
      const batch = writeBatch(db);
      
      // Note: This implementation is simple. For a real production app, 
      // we'd track exactly which docs changed. Here we'll just handle 
      // additions and updates. Deletions are trickier with this pattern 
      // because we lost track of which IDs were removed from the array 
      // but still exist in Firestore.
      
      // Let's optimize: fetch current IDs in Firestore first
      // Actually, for simplicity in this specific context, we'll just 
      // perform writes for what we have and assume the user manages them.
      
      // A better way: delete all and re-add? No, that's expensive and messy.
      // Let's do it right: we already have IDs for existing ones.
      
      // 1. Find all items in Firestore
      // 2. Compare with our 'news' state
      // 3. Delete those NOT in news state, update those in both, add those without ID.
      
      const newsCollection = collection(db, 'news');
      
      // For now, let's just use the simple add/update logic 
      // and let the 'remove' button handle direct deletions if possible?
      // No, let's keep the "Save & Broadcast" behavior as requested.
      
      // I'll do a simple loop and manage existing docs vs new ones.
      for (const item of news) {
        if (item.id) {
          // Update
          batch.update(doc(db, 'news', item.id), {
            text: item.text,
            updatedAt: serverTimestamp()
          });
        } else if (item.text.trim() !== '') {
          // Add
          const newDocRef = doc(newsCollection);
          batch.set(newDocRef, {
            text: item.text,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }

      await batch.commit();
      setMessage('INTEL_BROADCAST_SUCCESSFUL');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setMessage('ERROR: BROADCAST_FAILURE');
    } finally {
      setSaving(false);
    }
  };

  // Dedicated removal for Firestore items
  const handleDocDelete = async (item: NewsNode, index: number) => {
    if (!item.id) {
      handleRemove(index);
      return;
    }

    if (!user || user.email !== ADMIN_EMAIL) return;
    
    try {
      await deleteDoc(doc(db, 'news', item.id));
      // Local state will be updated by onSnapshot
    } catch (err) {
      console.error(err);
      setMessage('ERROR: DELETION_FAILED');
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 className="animate-spin text-tactical-amber mb-4" size={48} />
      <div className="font-mono text-[10px] tracking-widest animate-pulse">CONNECTING_TO_KEMENA_INTEL_NETWORK...</div>
    </div>
  );

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="max-w-4xl mx-auto py-24 px-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/20 border border-white/5 p-12 backdrop-blur-sm"
        >
          <Shield size={48} className="text-tactical-amber mx-auto mb-6" />
          <h1 className="font-army text-3xl uppercase text-tactical-cyan mb-4">RESTRICTED_ACCESS</h1>
          <p className="font-mono text-[11px] text-army-light uppercase tracking-widest mb-8">
            This console is restricted to #KEMENA_HIGH_COMMAND.
          </p>
          <button 
            onClick={handleLogin}
            className="flex items-center gap-3 bg-tactical-cyan text-army-dark px-8 py-3 mx-auto font-mono text-[11px] uppercase font-bold hover:bg-tactical-amber hover:text-white transition-all active:scale-95"
          >
            <LogIn size={18} /> AUTHENTICATE_USER
          </button>
          
          {user && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-red-400 font-mono text-[9px] uppercase">
                <AlertTriangle size={14} /> 
                IDENT_MISMATCH: {user.email}
              </div>
              <button onClick={handleLogout} className="text-tactical-cyan hover:text-tactical-amber font-mono text-[9px] uppercase underline">
                DISCONNECT_SIGNAL
              </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="mb-12 border-b border-white/10 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="hud-label text-tactical-amber mb-2">OPERATIONS_CENTER</div>
          <h1 className="font-army text-4xl sm:text-5xl uppercase tracking-tighter text-tactical-cyan">NEWS_TICKER_CRM</h1>
          <p className="font-mono text-[11px] text-army-light mt-2 uppercase tracking-widest">
            Logged in as: <span className="text-tactical-cyan">{user.email}</span>
          </p>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 border border-white/10 text-white/40 px-4 py-2 font-mono text-[9px] uppercase hover:border-red-500 hover:text-red-500 transition-all active:scale-95"
        >
          <LogOut size={14} /> LOGOUT
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-black/20 border border-white/5 p-6 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <Megaphone size={20} className="text-tactical-cyan" />
              <h2 className="font-mono text-xs uppercase font-bold tracking-widest text-tactical-cyan">ACTIVE_FEEDS</h2>
            </div>
            <button 
              onClick={handleAdd}
              className="flex items-center gap-2 bg-tactical-cyan/10 border border-tactical-cyan/30 text-tactical-cyan px-4 py-2 font-mono text-[10px] uppercase font-bold hover:bg-tactical-cyan hover:text-army-dark transition-all active:scale-95"
            >
              <Plus size={14} /> NEW_ENTRY
            </button>
          </div>

          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {news.map((item, index) => (
                <motion.div 
                  key={item.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex gap-4"
                >
                  <div className="flex-1 relative">
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-tactical-cyan/30" />
                    <input 
                      type="text" 
                      value={item.text}
                      onChange={(e) => handleChange(index, e.target.value)}
                      placeholder="ENTER_INTEL_CONTENT..."
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 font-mono text-[12px] text-tactical-cyan focus:outline-none focus:border-tactical-amber transition-colors placeholder:text-white/10"
                    />
                  </div>
                  <button 
                    onClick={() => handleDocDelete(item, index)}
                    className="p-3 border border-white/10 text-white/40 hover:border-red-500 hover:text-red-500 transition-all active:scale-90"
                    title="DELETE_ENTRY"
                  >
                    <Trash2 size={18} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {news.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-white/5 opacity-40 font-mono text-[10px] uppercase tracking-[0.3em]">
                NO_ACTIVE_FEEDS_DETECTED
              </div>
            )}
          </div>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-white/5">
            <div className="font-mono text-[10px] text-army-light uppercase tracking-widest">
              {message ? (
                <span className={message.startsWith('ERROR') ? 'text-red-500' : 'text-tactical-amber'}>
                  [ STATUS ]: {message}
                </span>
              ) : (
                <span>[ READY ]: PENDING_SYNC</span>
              )}
            </div>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-3 bg-tactical-amber text-army-dark px-12 py-4 font-mono text-[12px] uppercase font-bold hover:bg-tactical-amber/80 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-tactical-amber/10"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              SAVE_&_BROADCAST
            </button>
          </div>
        </div>

        <div className="bg-tactical-cyan/5 border border-tactical-cyan/10 p-6">
          <div className="flex items-center gap-3 mb-4 text-tactical-cyan">
            <span className="animate-pulse">●</span>
            <span className="font-mono text-[10px] uppercase font-bold tracking-[0.2em]">OPERATIONAL_GUIDELINES</span>
          </div>
          <ul className="space-y-2 font-mono text-[10px] text-army-light uppercase tracking-wider">
            <li className="flex gap-2"><span>-</span> Entries are broadcasted live to the news ticker on the home interface.</li>
            <li className="flex gap-2"><span>-</span> Maximum recommended length per entry: 120 characters for optimal display.</li>
            <li className="flex gap-2"><span>-</span> Authentication via Google is required for signal authorization.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
