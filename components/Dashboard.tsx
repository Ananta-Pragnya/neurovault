import React, { useState, useEffect } from 'react';
import axios from 'axios';
import HeroMarketBrain from './HeroMarketBrain';
import DecisionMode, { Action } from './DecisionMode';
import CardGlass from './CardGlass';

// Mock Initial Data (for instant load "10s rule")
const INITIAL_DATA = {
  regime: "RISK-ON",
  regime_desc: "Market consolidating. Awaiting key economic data.",
  digest: {
    top_bullets: [
      "Nasdaq leadership intact; semi-conductors showing relative strength.",
      "Energy converging on supply concerns.",
      "Turkey FX pressure spreading to regional EMs."
    ]
  },
  actions: [
    { action: "increase", text: "Increase energy ETFs 5-7%", priority: 0.9, confidence: 0.78 },
    { action: "hedge", text: "Hedge EM exposure 40%", priority: 0.8, confidence: 0.82 },
    { action: "hold", text: "Hold tech through CPI data", priority: 0.7, confidence: 0.65 }
  ]
};

const Dashboard: React.FC = () => {
  const [data, setData] = useState(INITIAL_DATA);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // In real app, fetch from backend here.
    // For now, we simulate the "instant load" experience by using initial data immediately.
    // Background fetch could update this.
    const fetchLive = async () => {
      try {
        // const res = await axios.get('http://localhost:8000/api/v1/overview');
        // setData(res.data);
      } catch (e) {
        console.error("AMB Offline, using cached intelligence.");
      }
    };
    fetchLive();
  }, []);

  return (
    <div className="min-h-screen pt-24 px-6 pb-20 max-w-7xl mx-auto space-y-12 animate-fade-in">

      {/* TOP NAV / LOGO PLACEHOLDER would go here in layout */}

      {/* HERO SECTION */}
      <section>
        <HeroMarketBrain
          regime={data.regime}
          desc={INITIAL_DATA.regime_desc} // Using mock desc for now as API might provide simple "Risk-On"
          bullets={data.digest.top_bullets}
        />
      </section>

      {/* DECISION ENGINE */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px bg-white/10 flex-1"></div>
          <h3 className="text-xs font-bold text-[#9CA3AF] uppercase tracking-[0.2em]">Recommended Actions</h3>
          <div className="h-px bg-white/10 flex-1"></div>
        </div>
        <DecisionMode actions={data.actions} />
      </section>

      {/* METRICS / CONTEXT (Keeping it minimal as per spec) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CardGlass className="space-y-4">
          <h3 className="text-xs font-bold text-[#C6A85A] uppercase tracking-widest">Portfolio Impact</h3>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-[#EAEAEA]">-0.4%</span>
            <span className="text-sm text-[#9CA3AF] mb-1">expected if no action taken</span>
          </div>
          <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-2">
            <div className="bg-[#EAEAEA] w-1/3 h-full"></div>
          </div>
        </CardGlass>

        <CardGlass>
          <h3 className="text-xs font-bold text-[#C6A85A] uppercase tracking-widest mb-4">Systems Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
              <span className="text-[#9CA3AF]">Amb Engine</span>
              <span className="text-[#EAEAEA] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
              </span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
              <span className="text-[#9CA3AF]">Data Freshness</span>
              <span className="text-[#EAEAEA]">Cached (3m ago)</span>
            </div>
          </div>
        </CardGlass>
      </section>

      {/* DISCLAIMER FOOTER */}
      <footer className="text-center space-y-2 pt-12 opacity-40 hover:opacity-100 transition-opacity">
        <p className="text-[10px] text-[#9CA3AF] uppercase tracking-widest">Autonomous Market Brain v3.0</p>
        <p className="text-[10px] text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed">
          Decision support only. Not financial advice. Validate all signals independently.
          Past performance is not indicative of future results.
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;
