
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import { InstitutionalNav } from './components/Institutional/InstitutionalNav';
import { LandingPage } from './components/LandingPage';
import { InstitutionalOverview } from './components/InstitutionalOverview';
import { MarketIntelPage } from './components/Pages/MarketIntelPage';
import { PortfolioPage } from './components/Pages/PortfolioPage';
import { MacroPage } from './components/Pages/MacroPage';
import { LabPage } from './components/Pages/LabPage';
import Dashboard from './components/Dashboard';
import { InstitutionalDashboard } from './src/components/InstitutionalDashboard';
import { InstitutionalTerminal } from './components/InstitutionalTerminal';
import { Login, Register } from './components/Auth';
import { User } from './types';
import BackgroundMotion from './components/BackgroundMotion';

const AppContent: React.FC<{ user: User | null; setUser: (u: User | null) => void; logout: () => void }> = ({ user, setUser, logout }) => {
  const location = useLocation();

  // Determine which nav to show
  const isInstitutional = location.pathname.startsWith('/terminal');
  const showNav = !location.pathname.includes('/login') && !location.pathname.includes('/register');

  return (
    <div className="relative min-h-screen bg-[#0A0E14]">
      <BackgroundMotion />

      {showNav && (
        isInstitutional ?
          <InstitutionalNav user={user} logout={logout} /> :
          <Navbar user={user} logout={logout} />
      )}

      <Routes>
        {/* Original Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Institutional Terminal (5 Tabs) */}
        <Route path="/terminal" element={<InstitutionalTerminal />}>
          <Route path=":module" element={<InstitutionalTerminal />} />
        </Route>

        {/* NEW Institutional Dashboard (Week 0) */}
        <Route path="/amb" element={<InstitutionalDashboard />} />

        {/* Dashboard (old) */}
        <Route
          path="/dashboard"
          element={user ? <Dashboard /> : <Navigate to="/login" />}
        />

        {/* Auth */}
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<Register setUser={setUser} />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fm_user');
      if (saved) setUser(JSON.parse(saved));
    } catch (e) {
      console.error("Local storage initialization error:", e);
      localStorage.removeItem('fm_user');
    } finally {
      setInitialized(true);
    }
  }, []);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('fm_user');
  };

  if (!initialized) return null;

  return (
    <HashRouter>
      <AppContent user={user} setUser={setUser} logout={logout} />
    </HashRouter>
  );
};

export default App;
