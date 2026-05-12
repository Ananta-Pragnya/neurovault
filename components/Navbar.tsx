
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar: React.FC<{ user: any; logout: () => void }> = ({ user, logout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isLanding = location.pathname === '/';

  return (
    <nav className={`fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between transition-all duration-300 ${isLanding ? 'bg-transparent' : 'glass border-b border-white/5'
      }`}>
      <div
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => navigate('/')}
      >
        <div className="w-9 h-9 bg-gold-gradient rounded-lg flex items-center justify-center font-bold text-black text-sm group-hover:scale-105 transition-transform">
          F
        </div>
        <span className="text-xl font-bold tracking-tight font-heading text-white">FinTech <span className="text-gold-primary">Institutional</span></span>
      </div>

      <div className="hidden md:flex items-center gap-8">
        <a href="#" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Home</a>
        <a href="#presence" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Markets</a>
        <a href="#performance" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Performance</a>
        <a href="#plans" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Plans</a>
        <button
          onClick={() => navigate('/terminal')}
          className="text-sm font-medium text-gold-primary hover:text-gold-primary/80 transition-colors"
        >
          Terminal →
        </button>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-xs font-medium text-gold-primary/80">{user.name}</span>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2 bg-gold-gradient hover:opacity-90 text-black text-xs font-bold uppercase tracking-wide rounded-lg transition-all"
            >
              Dashboard
            </button>
            <button
              onClick={logout}
              className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <button className="px-6 py-2 bg-white/5 text-white font-medium rounded-lg border border-white/10 hover:bg-gold-primary/10 hover:border-gold-primary/40 transition-all text-sm">
              Partner With Us
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-6 py-2 bg-gold-gradient text-black text-sm font-bold rounded-lg hover:scale-105 transition-all"
            >
              Get Access
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
