import React, { Component, ReactNode } from "react";
import { ShieldAlert, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  tabName: string;
}

interface State {
  hasError: boolean;
  error: string | null;
}

export class TabErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error) {
    console.error(`[${this.props.tabName}] Tab crashed:`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-20 animate-in fade-in zoom-in duration-500 bg-slate-950/50 rounded-3xl border border-red-500/20 m-6">
          <ShieldAlert size={48} className="text-red-500 mb-6" />
          <h3 className="text-xl font-bold text-white tracking-tighter mb-2 uppercase">
            {this.props.tabName} Render Conflict
          </h3>
          <p className="text-slate-400 font-mono text-[10px] uppercase tracking-widest max-w-lg text-center mb-8">
            An internal runtime exception has isolated this module. Adjacent operational zones remain secure and active.
            <br/><br/>
            <span className="text-red-400/80 lowercase">{this.state.error}</span>
          </p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-white/10 text-white font-bold rounded-lg transition-all border border-white/10 text-xs uppercase tracking-widest"
          >
            <RefreshCw size={14} /> Resume Operation
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
