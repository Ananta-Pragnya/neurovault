import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { marketService } from '../server/services/marketService';

// Fallback mock login since marketService may be server-side only in some setups
// Though the original Auth.tsx imported from '../services/marketService', which we'll mock if it fails.
const mockLogin = async (email: string) => {
    return new Promise<{user: any}>((resolve) => {
        setTimeout(() => {
            resolve({ user: { name: email.split('@')[0], email, role: 'premium' } });
        }, 800);
    });
};

export const Login: React.FC<{ setUser: (u: any) => void }> = ({ setUser }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        const { user } = await mockLogin(email);
        setUser(user);
        localStorage.setItem('fm_user', JSON.stringify(user));
        navigate('/terminal'); // Navigate to the main terminal instead of dashboard
    } catch {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E14] flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-gold-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="glass-gold p-10 md:p-12 rounded-3xl w-full max-w-md border border-gold-primary/20 relative z-10 shadow-[0_0_40px_rgba(212,175,55,0.05)]">
        <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-gold-gradient rounded-xl flex items-center justify-center font-bold text-black text-xl shadow-[0_0_15px_rgba(212,175,55,0.4)]">
               F
            </div>
        </div>
        
        <h2 className="text-3xl font-black font-heading mb-2 text-white text-center tracking-tight">Access Terminal</h2>
        <p className="text-slate-400 text-sm mb-10 text-center font-medium">Enter your institutional credentials</p>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="text-[10px] font-bold text-gold-primary uppercase tracking-widest block mb-2">Institutional Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#11161D] border border-white/10 rounded-xl px-4 py-3.5 text-white font-mono text-sm focus:ring-1 focus:ring-gold-primary focus:border-gold-primary outline-none transition-all placeholder:text-slate-600"
              placeholder="director@fund.com"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gold-primary uppercase tracking-widest block mb-2">Secure Passcode</label>
            <input 
              type="password" 
              required
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full bg-[#11161D] border border-white/10 rounded-xl px-4 py-3.5 text-white font-mono text-sm focus:ring-1 focus:ring-gold-primary focus:border-gold-primary outline-none transition-all placeholder:text-slate-600"
              placeholder="••••••••••••"
            />
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-2 bg-gold-gradient hover:opacity-90 text-black font-bold uppercase tracking-widest text-xs rounded-xl transition-all flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)]"
          >
            {loading ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : 'Authenticate'}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-white/5 flex justify-center">
          <p className="text-xs text-slate-500 font-medium">
            Requires provisioning? <button onClick={() => navigate('/register')} className="text-gold-primary font-bold hover:text-white transition-colors uppercase tracking-wider ml-2">Request Access</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export const Register: React.FC<{ setUser: (u: any) => void }> = ({ setUser }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        const { user } = await mockLogin(email);
        setUser(user);
        localStorage.setItem('fm_user', JSON.stringify(user));
        navigate('/terminal');
    } catch {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E14] flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-gold-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="glass-gold p-10 md:p-12 rounded-3xl w-full max-w-md border border-gold-primary/20 relative z-10 shadow-[0_0_40px_rgba(212,175,55,0.05)]">
        <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center font-bold text-white text-xl">
               F
            </div>
        </div>
        
        <h2 className="text-3xl font-black font-heading mb-2 text-white text-center tracking-tight">Request Access</h2>
        <p className="text-slate-400 text-sm mb-10 text-center font-medium">Apply for an institutional mandate</p>
        
        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Director Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#11161D] border border-white/10 rounded-xl px-4 py-3.5 text-white font-mono text-sm focus:ring-1 focus:ring-white/30 focus:border-white/30 outline-none transition-all placeholder:text-slate-600"
              placeholder="e.g. A. Sterling"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Institutional Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#11161D] border border-white/10 rounded-xl px-4 py-3.5 text-white font-mono text-sm focus:ring-1 focus:ring-white/30 focus:border-white/30 outline-none transition-all placeholder:text-slate-600"
              placeholder="director@fund.com"
            />
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-2 glass hover:bg-white/10 border border-white/20 text-white font-bold uppercase tracking-widest text-xs rounded-xl transition-all flex items-center justify-center"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Submit Application'}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-white/5 flex justify-center">
          <p className="text-xs text-slate-500 font-medium">
            Already provisioned? <button onClick={() => navigate('/login')} className="text-white font-bold hover:text-gold-primary transition-colors uppercase tracking-wider ml-2">Authenticate</button>
          </p>
        </div>
      </div>
    </div>
  );
};
