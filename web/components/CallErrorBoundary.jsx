'use client';
import React from 'react';
import { Video, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';

export default class CallErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, countdown: 2, autoHealed: false };
    this.timer = null;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('CallErrorBoundary auto-healing exception:', error, errorInfo);
    this.startAutoHealing();
  }

  startAutoHealing = () => {
    clearInterval(this.timer);
    this.setState({ countdown: 2, autoHealed: false });

    this.timer = setInterval(() => {
      this.setState((prev) => {
        if (prev.countdown <= 1) {
          clearInterval(this.timer);
          this.handleReset();
          return { countdown: 0, autoHealed: true };
        }
        return { countdown: prev.countdown - 1 };
      });
    }, 1000);
  };

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  handleReset = () => {
    clearInterval(this.timer);
    this.setState({ hasError: false, error: null, autoHealed: true });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="rounded-2xl border border-pink-500/30 bg-[#222222]/95 p-4 text-center space-y-2.5 backdrop-blur-md shadow-xl my-2">
          <div className="h-9 w-9 rounded-full bg-pink-500/20 text-pink-100 mx-auto flex items-center justify-center border border-pink-500/30">
            <Video className="h-4 w-4 text-pink-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-pink-100 flex items-center justify-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-pink-400 animate-pulse" />
              <span>{this.props.title || 'Video Stream Auto-Healing Engine Active'}</span>
            </p>
            <p className="text-[11px] text-pink-200/80 mt-0.5">
              Auto-restoring feed in {this.state.countdown}s &bull; Audio and controls active
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="btn-pink px-4 py-1.5 rounded-xl text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-pink-500/30 transition active:scale-95"
          >
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Instant Resume</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
