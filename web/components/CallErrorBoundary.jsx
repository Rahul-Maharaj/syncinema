'use client';
import React from 'react';
import { Video, RefreshCw } from 'lucide-react';

export default class CallErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('CallErrorBoundary captured exception:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="rounded-2xl border border-rose-500/30 bg-black/70 p-4 text-center space-y-2.5 backdrop-blur-md shadow-xl my-2">
          <div className="h-9 w-9 rounded-full bg-rose-500/20 text-rose-300 mx-auto flex items-center justify-center">
            <Video className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">{this.props.title || 'Video stream encountered a temporary hiccup'}</p>
            <p className="text-[10px] text-slate-400">Audio and controls remain functional in background</p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-md transition active:scale-95"
          >
            <RefreshCw className="h-3 w-3" />
            <span>{this.props.resetLabel || 'Reload Camera Feed'}</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
