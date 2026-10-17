'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Heart,
  Home as HomeIcon,
  PlusCircle,
  Link2,
  Bookmark,
  Clock,
  Settings,
  Search,
  Bell,
  Check,
  Play,
  Share2,
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,
  Flame,
  Film,
  Tv,
  Youtube,
  Radio,
  Trophy,
  Music2,
  MessageSquare,
  Users,
  Calendar,
  Sparkles,
  ArrowRight,
  X,
  Copy,
  ChevronRight,
  KeyRound,
  RefreshCw,
  LogOut,
  HelpCircle,
  Zap,
  Star,
  Clapperboard,
  Compass,
} from 'lucide-react';
import { serverUrl, safeId } from '@/lib/socket';

const slug = (v) => {
  if (!v) return '';
  let str = String(v).trim();
  str = str.split('?')[0].split('#')[0];
  const last = str.split('/').filter(Boolean).pop() || '';
  return last.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
};

const sanitizeInput = (str) => {
  if (!str) return '';
  return String(str).replace(/[<>'"`;()]/g, '').trim().slice(0, 80);
};

// Rich, verified Movie Suggestions with official TMDB poster banners
const MOVIE_SUGGESTIONS = [
  {
    id: 'interstellar',
    title: 'Interstellar',
    genres: 'Sci-Fi • Drama',
    rating: '8.7',
    year: '2014',
    poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    category: 'scifi',
    query: 'Interstellar',
  },
  {
    id: 'your-name',
    title: 'Your Name',
    genres: 'Anime • Romance',
    rating: '8.5',
    year: '2016',
    poster: 'https://image.tmdb.org/t/p/w500/q719jXXEzOoYaps6qFsR8llRaQ.jpg',
    category: 'romance',
    query: 'Your Name Kimi no Na wa',
  },
  {
    id: 'deadpool-wolverine',
    title: 'Deadpool & Wolverine',
    genres: 'Action • Comedy',
    rating: '8.0',
    year: '2024',
    poster: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    category: 'action',
    query: 'Deadpool and Wolverine',
  },
  {
    id: 'spiderman-no-way-home',
    title: 'Spider-Man: No Way Home',
    genres: 'Action • Adventure',
    rating: '8.2',
    year: '2021',
    poster: 'https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg',
    category: 'action',
    query: 'Spider-Man No Way Home',
  },
  {
    id: 'the-notebook',
    title: 'The Notebook',
    genres: 'Romance • Drama',
    rating: '7.9',
    year: '2004',
    poster: 'https://image.tmdb.org/t/p/w500/rNzQyW4ZZnmRuNkEuZqi3OkK9Q6.jpg',
    category: 'romance',
    query: 'The Notebook',
  },
  {
    id: 'stranger-things',
    title: 'Stranger Things',
    genres: 'Sci-Fi • Thriller',
    rating: '8.7',
    year: '2022',
    poster: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    category: 'shows',
    query: 'Stranger Things',
  },
  {
    id: 'la-la-land',
    title: 'La La Land',
    genres: 'Romance • Musical',
    rating: '8.3',
    year: '2016',
    poster: 'https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkVJt0Rf0.jpg',
    category: 'romance',
    query: 'La La Land',
  },
  {
    id: 'inception',
    title: 'Inception',
    genres: 'Sci-Fi • Action',
    rating: '8.8',
    year: '2010',
    poster: 'https://image.tmdb.org/t/p/w500/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg',
    category: 'scifi',
    query: 'Inception',
  },
  {
    id: 'dune-part-two',
    title: 'Dune: Part Two',
    genres: 'Sci-Fi • Adventure',
    rating: '8.6',
    year: '2024',
    poster: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    category: 'scifi',
    query: 'Dune Part Two',
  },
  {
    id: 'oppenheimer',
    title: 'Oppenheimer',
    genres: 'Biography • Drama',
    rating: '8.9',
    year: '2023',
    poster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    category: 'trending',
    query: 'Oppenheimer',
  },
  {
    id: 'titanic',
    title: 'Titanic',
    genres: 'Romance • Drama',
    rating: '8.4',
    year: '1997',
    poster: 'https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg',
    category: 'romance',
    query: 'Titanic',
  },
  {
    id: 'avengers-endgame',
    title: 'Avengers: Endgame',
    genres: 'Action • Sci-Fi',
    rating: '8.4',
    year: '2019',
    poster: 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
    category: 'action',
    query: 'Avengers Endgame',
  },
  {
    id: 'breaking-bad',
    title: 'Breaking Bad',
    genres: 'Crime • Drama',
    rating: '9.5',
    year: '2013',
    poster: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
    category: 'shows',
    query: 'Breaking Bad',
  },
  {
    id: 'jujutsu-kaisen',
    title: 'Jujutsu Kaisen',
    genres: 'Anime • Action',
    rating: '8.6',
    year: '2023',
    poster: 'https://image.tmdb.org/t/p/w500/hFWP5HkbVEe40hrXgtCe5xQCJjo.jpg',
    category: 'trending',
    query: 'Jujutsu Kaisen',
  },
  {
    id: 'spirited-away',
    title: 'Spirited Away',
    genres: 'Animation • Fantasy',
    rating: '8.6',
    year: '2001',
    poster: 'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
    category: 'trending',
    query: 'Spirited Away Sen to Chihiro',
  },
  {
    id: 'past-lives',
    title: 'Past Lives',
    genres: 'Romance • Drama',
    rating: '8.1',
    year: '2023',
    poster: 'https://image.tmdb.org/t/p/w500/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg',
    category: 'romance',
    query: 'Past Lives',
  },
];

const SUGGESTION_CATEGORIES = [
  { id: 'all', label: 'All Suggestions', icon: Sparkles },
  { id: 'trending', label: 'Trending Hits', icon: Flame },
  { id: 'romance', label: 'Date Night & Romance', icon: Heart },
  { id: 'action', label: 'Action & Adventure', icon: Zap },
  { id: 'scifi', label: 'Sci-Fi & Thriller', icon: Compass },
  { id: 'shows', label: 'Top Binge Shows', icon: Tv },
];

export default function SynCinemaPlatform() {
  const router = useRouter();

  // Welcome Screen is the primary first experience
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);

  // Navigation & Modals
  const [activeNav, setActiveNav] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // User Profile
  const [userName, setUserName] = useState('Rahul');
  const [partnerName, setPartnerName] = useState('Anushka');

  // Search & Link Input
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLinkDetected, setSearchLinkDetected] = useState('');
  const [quickCodeInput, setQuickCodeInput] = useState('');

  // Create Room State
  const [roomName, setRoomName] = useState('');
  const [roomPass, setRoomPass] = useState('');
  const [showRoomPass, setShowRoomPass] = useState(false);
  const [maxSeats, setMaxSeats] = useState(2);
  const [createError, setCreateError] = useState('');

  // Join Room State
  const [joinCode, setJoinCode] = useState('');
  const [joinPass, setJoinPass] = useState('');
  const [showJoinPass, setShowJoinPass] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Active Rooms & Storage State
  const [activeRooms, setActiveRooms] = useState([]);
  const [lastRoom, setLastRoom] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [history, setHistory] = useState([]);
  const [toastMessage, setToastMessage] = useState('');

  const searchInputRef = useRef(null);

  // Initialize storage
  useEffect(() => {
    try {
      const u = localStorage.getItem('sc_user_name');
      if (u) setUserName(u);
      const p = localStorage.getItem('sc_partner_name');
      if (p) setPartnerName(p);
      const lr = localStorage.getItem('lastRoom');
      if (lr) setLastRoom(lr);
      const wl = JSON.parse(localStorage.getItem('sc_watchlist') || '[]');
      setWatchlist(wl);
      const h = JSON.parse(localStorage.getItem('hist') || '[]');
      setHistory(h);
    } catch {}
  }, []);

  // Poll Active Rooms from backend
  const fetchActiveRooms = async () => {
    try {
      const res = await fetch(`${serverUrl()}/api/rooms`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.rooms)) {
          setActiveRooms(data.rooms);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchActiveRooms();
    const interval = setInterval(fetchActiveRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (showWelcomeScreen) setShowWelcomeScreen(false);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setShowCreateModal(false);
        setShowJoinModal(false);
        setShowWatchlistModal(false);
        setShowHistoryModal(false);
        setShowSettingsModal(false);
        setShowNotifications(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWelcomeScreen]);

  const notify = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const generatePasscode = () => {
    const chars = '23456789abcdefghjkmnpqrstuvwxyz';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setRoomPass(code);
    setShowRoomPass(true);
    setCreateError('');
    notify('Generated secure password 🔐');
  };

  // Launch / Create Room with Security Verification
  const handleCreateRoom = (e) => {
    e?.preventDefault?.();
    setCreateError('');
    const p = roomPass.trim();
    if (!p || p.length < 4) {
      setCreateError('A room password (at least 4 characters) is required to secure your room.');
      return;
    }
    let id = roomName.trim();
    if (id) {
      id = slug(id);
      if (id.length < 2 || id.length > 64) {
        setCreateError('Room name must be between 2 and 64 letters, numbers, or dashes.');
        return;
      }
    } else {
      id = safeId(12);
    }

    try {
      sessionStorage.setItem('rp_' + id, p);
      sessionStorage.setItem('is_create_' + id, '1');
      sessionStorage.setItem('max_users_' + id, String(maxSeats));
      localStorage.setItem('rp_' + id, p);
      localStorage.setItem('lastRoom', id);
    } catch {}

    router.push(`/room/${id}#pass=${encodeURIComponent(p)}&create=1&max=${maxSeats}`);
  };

  // Join Room with sanitization
  const handleJoinRoom = (e) => {
    e?.preventDefault?.();
    const c = slug(joinCode);
    if (!c || c.length < 2) {
      setJoinError('Please enter a valid room code or link.');
      return;
    }
    const p = joinPass.trim();
    if (!p || p.length < 4) {
      setJoinError('Room password is required to enter (at least 4 characters).');
      return;
    }

    try {
      sessionStorage.setItem('rp_' + c, p);
      localStorage.setItem('rp_' + c, p);
      localStorage.setItem('lastRoom', c);
    } catch {}

    router.push(`/room/${c}#pass=${encodeURIComponent(p)}`);
  };

  const handleQuickJoin = (e) => {
    e?.preventDefault?.();
    const raw = quickCodeInput.trim();
    if (!raw) return;
    const clean = slug(raw);
    if (!clean) return;
    setJoinCode(clean);
    setShowJoinModal(true);
  };

  // 1-Click Instant Watch for any movie banner or pasted video link
  const handleInstantWatch = (titleOrUrl) => {
    const query = (titleOrUrl || '').trim();
    if (!query) return;

    const roomId = safeId(10);
    const pass = Math.random().toString(36).substring(2, 8);

    try {
      sessionStorage.setItem('rp_' + roomId, pass);
      sessionStorage.setItem('is_create_' + roomId, '1');
      sessionStorage.setItem('max_users_' + roomId, '2');
      sessionStorage.setItem('init_video_' + roomId, query);
      localStorage.setItem('rp_' + roomId, pass);
      localStorage.setItem('lastRoom', roomId);

      const newHist = [query, ...history.filter((x) => x !== query)].slice(0, 20);
      setHistory(newHist);
      localStorage.setItem('hist', JSON.stringify(newHist));
    } catch {}

    notify(`🎬 Starting 1080p stream for "${query}"!`);
    router.push(`/room/${roomId}#pass=${encodeURIComponent(pass)}&create=1&max=2`);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    const clean = val.trim();
    if (
      /^(https?:\/\/|www\.)/i.test(clean) ||
      clean.includes('netflix.com') ||
      clean.includes('hotstar.com') ||
      clean.includes('primevideo.com') ||
      clean.includes('jiocinema.com') ||
      clean.includes('zee5.com') ||
      clean.includes('sonyliv.com') ||
      clean.includes('youtube.com') ||
      clean.includes('youtu.be') ||
      /\.(mp4|m3u8|webm)(\?|$)/i.test(clean)
    ) {
      setSearchLinkDetected(clean);
    } else {
      setSearchLinkDetected('');
    }
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault?.();
    if (searchLinkDetected) {
      handleInstantWatch(searchLinkDetected);
      return;
    }
    if (searchQuery.trim()) {
      handleInstantWatch(searchQuery.trim());
    }
  };

  const handleToggleWatchlist = (movie) => {
    const exists = watchlist.some((m) => m.id === movie.id);
    let updated;
    if (exists) {
      updated = watchlist.filter((m) => m.id !== movie.id);
      notify(`Removed "${movie.title}" from Watchlist`);
    } else {
      updated = [...watchlist, movie];
      notify(`Added "${movie.title}" to Watchlist ⭐`);
    }
    setWatchlist(updated);
    try {
      localStorage.setItem('sc_watchlist', JSON.stringify(updated));
    } catch {}
  };

  // Filtered movie suggestions
  const filteredMovies = MOVIE_SUGGESTIONS.filter((m) => {
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'trending' && m.category !== 'trending' && m.id !== 'interstellar' && m.id !== 'deadpool-wolverine') return false;
      if (selectedCategory === 'romance' && m.category !== 'romance') return false;
      if (selectedCategory === 'action' && m.category !== 'action') return false;
      if (selectedCategory === 'scifi' && m.category !== 'scifi') return false;
      if (selectedCategory === 'shows' && m.category !== 'shows') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return m.title.toLowerCase().includes(q) || m.genres.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#070814] text-slate-100 font-sans selection:bg-purple-600 selection:text-white flex flex-col antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium text-xs sm:text-sm shadow-2xl shadow-purple-950/60 flex items-center gap-2 border border-white/20 animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. CINEMATIC WELCOME SCREEN (Shown first before dashboard) */}
      {/* ======================================================== */}
      {showWelcomeScreen ? (
        <div className="min-h-screen flex flex-col justify-between p-6 sm:p-10 relative overflow-hidden bg-gradient-to-b from-[#0c0d24] via-[#080918] to-[#05050e]">
          {/* Ambient Background Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-pink-600/15 rounded-full blur-[140px] pointer-events-none" />

          {/* Top Bar on Welcome Screen */}
          <header className="relative z-10 flex items-center justify-between max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-500 p-0.5 shadow-xl shadow-purple-600/30 flex items-center justify-center">
                <div className="h-full w-full rounded-[14px] bg-[#070814] flex items-center justify-center">
                  <Heart className="h-6 w-6 fill-rose-500 text-rose-500 animate-pulse" />
                </div>
              </div>
              <div>
                <h1 className="font-extrabold text-xl text-white tracking-tight flex items-center gap-1.5">
                  <span>SynCinema</span>
                </h1>
                <p className="text-[11px] text-pink-400 font-semibold tracking-wider uppercase">Watch Together</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowWelcomeScreen(false)}
              className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs sm:text-sm font-semibold backdrop-blur-md transition flex items-center gap-2 active:scale-95"
            >
              <span>Skip to Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </header>

          {/* Hero Welcome Content */}
          <div className="relative z-10 max-w-4xl mx-auto w-full text-center space-y-7 py-12">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold tracking-wide backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-pink-400" />
              <span>THE PRIVATE VIRTUAL CINEMA FOR COUPLES &amp; CLOSE FRIENDS</span>
            </div>

            <h2 className="text-4xl sm:text-6xl xl:text-7xl font-black text-white tracking-tight leading-[1.08]">
              Same movie.{' '}
              <span className="bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 bg-clip-text text-transparent">
                Different cities.
              </span>
              <br />
              One private couch.
            </h2>

            <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
              Stream movies, YouTube, anime, series, and video links in millisecond synchronization. In-room video calls, romantic gestures, and encrypted rooms.
            </p>

            {/* 3 Pillars / Social Proof Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-3xl mx-auto pt-2 text-left">
              <div className="p-4 rounded-3xl bg-[#0f1028]/80 border border-slate-800/80 backdrop-blur-md space-y-1.5 shadow-xl">
                <div className="flex items-center gap-2 text-pink-400">
                  <Zap className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">Zero Drift Sync</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sub-second clock synchronization keeps both devices playing at the exact same millisecond.
                </p>
              </div>

              <div className="p-4 rounded-3xl bg-[#0f1028]/80 border border-slate-800/80 backdrop-blur-md space-y-1.5 shadow-xl">
                <div className="flex items-center gap-2 text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">Bank-Grade Private</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Locked rooms with host passwords, scrypt encryption, and peer-to-peer data protection.
                </p>
              </div>

              <div className="p-4 rounded-3xl bg-[#0f1028]/80 border border-slate-800/80 backdrop-blur-md space-y-1.5 shadow-xl">
                <div className="flex items-center gap-2 text-purple-400">
                  <Film className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">1080p HD Streaming</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Instant streaming of video links and curated movie suggestions with 0 setup or logins.
                </p>
              </div>
            </div>

            {/* Main Call to Action Button */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={() => setShowWelcomeScreen(false)}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:brightness-110 text-white font-extrabold text-sm sm:text-base shadow-2xl shadow-purple-600/40 flex items-center justify-center gap-3 transition active:scale-95 cursor-pointer"
              >
                <span>Enter SynCinema Dashboard</span>
                <ArrowRight className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setRoomName('');
                  setRoomPass('');
                  generatePasscode();
                  setShowWelcomeScreen(false);
                  setShowCreateModal(true);
                }}
                className="w-full sm:w-auto px-6 py-4 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-sm sm:text-base backdrop-blur-md flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Create Instant Room</span>
              </button>
            </div>
          </div>

          {/* Welcome Screen Footer */}
          <footer className="relative z-10 text-center text-xs text-slate-500 py-4 max-w-7xl mx-auto w-full border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>SynCinema • High Security Real-Time Synchronized Cinema</span>
            <span className="text-pink-400/80">Different places... Same screen. 💖</span>
          </footer>
        </div>
      ) : (
        /* ======================================================== */
        /* 2. MAIN MODERN DASHBOARD (Matching reference UI/UX)      */
        /* ======================================================== */
        <div className="flex-1 flex max-w-[1920px] w-full mx-auto animate-in fade-in duration-300">
          {/* Left Sidebar */}
          <aside className="w-64 xl:w-72 shrink-0 border-r border-slate-800/80 bg-[#070814] p-5 flex flex-col justify-between hidden md:flex sticky top-0 h-screen overflow-y-auto">
            <div className="space-y-7">
              {/* Brand Header */}
              <div className="flex items-center gap-3 px-2">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-500 p-0.5 shadow-lg shadow-purple-600/30 flex items-center justify-center">
                  <div className="h-full w-full rounded-[14px] bg-[#070814] flex items-center justify-center">
                    <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />
                  </div>
                </div>
                <div>
                  <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                    <span>SynCinema</span>
                  </h1>
                  <p className="text-[11px] text-slate-400 font-medium">Watch Together</p>
                </div>
              </div>

              {/* Sidebar Navigation */}
              <nav className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setActiveNav('home')}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-semibold text-sm transition ${
                    activeNav === 'home'
                      ? 'bg-[#1b1942] text-white border border-purple-500/30 shadow-md shadow-purple-950/50'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <HomeIcon className={`h-4 w-4 ${activeNav === 'home' ? 'text-purple-400' : 'text-slate-400'}`} />
                  <span>Home</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRoomName('');
                    setRoomPass('');
                    generatePasscode();
                    setShowCreateModal(true);
                  }}
                  className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-medium text-sm text-slate-400 hover:text-white hover:bg-slate-800/40 transition text-left"
                >
                  <PlusCircle className="h-4 w-4 text-slate-400" />
                  <span>Create Room</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setJoinCode('');
                    setJoinPass('');
                    setJoinError('');
                    setShowJoinModal(true);
                  }}
                  className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-medium text-sm text-slate-400 hover:text-white hover:bg-slate-800/40 transition text-left"
                >
                  <Link2 className="h-4 w-4 text-slate-400" />
                  <span>Join Room</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowWatchlistModal(true)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl font-medium text-sm text-slate-400 hover:text-white hover:bg-slate-800/40 transition"
                >
                  <div className="flex items-center gap-3.5">
                    <Bookmark className="h-4 w-4 text-slate-400" />
                    <span>Watchlist</span>
                  </div>
                  {watchlist.length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                      {watchlist.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-medium text-sm text-slate-400 hover:text-white hover:bg-slate-800/40 transition text-left"
                >
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>History</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-medium text-sm text-slate-400 hover:text-white hover:bg-slate-800/40 transition text-left"
                >
                  <Settings className="h-4 w-4 text-slate-400" />
                  <span>Settings</span>
                </button>
              </nav>
            </div>

            {/* Sidebar Bottom Cozy Card */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowWelcomeScreen(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Welcome Experience</span>
              </button>

              <div className="rounded-2xl border border-indigo-950/60 bg-gradient-to-b from-[#0f102a] to-[#0a0b1c] p-4 text-center relative overflow-hidden group shadow-lg">
                <div className="relative mx-auto mb-3 h-20 w-full rounded-xl overflow-hidden border border-purple-500/20 bg-black/60 flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-900/40 via-transparent to-pink-900/20" />
                  <Heart className="h-7 w-7 text-pink-400 fill-pink-500/30 animate-pulse relative z-10" />
                </div>
                <p className="text-xs text-slate-300 font-medium">Different places...</p>
                <p className="text-xs font-bold text-pink-400 flex items-center justify-center gap-1 mt-0.5">
                  <span>Same screen.</span>
                  <span>💖</span>
                </p>
              </div>
            </div>
          </aside>

          {/* Center Main Workspace */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top Search & Header */}
            <header className="px-5 py-4 border-b border-slate-800/80 bg-[#070814]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between gap-4">
              <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl relative">
                <div className="relative flex items-center">
                  <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search movies, shows, or paste a link..."
                    className="w-full pl-10 pr-24 py-2.5 rounded-2xl bg-[#0f1026] border border-slate-800/90 hover:border-slate-700 focus:border-purple-500/80 text-xs sm:text-sm text-white placeholder-slate-400 outline-none transition shadow-inner"
                  />
                  {searchLinkDetected ? (
                    <button
                      type="submit"
                      className="absolute right-2 px-3 py-1 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[11px] font-bold flex items-center gap-1 shadow-md hover:brightness-110"
                    >
                      <Play className="h-3 w-3 fill-white" />
                      <span>Play Link</span>
                    </button>
                  ) : (
                    <div className="absolute right-3 hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[10px] text-slate-400 font-mono">
                      <span>Ctrl</span>
                      <span>+</span>
                      <span>K</span>
                    </div>
                  )}
                </div>
              </form>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowWelcomeScreen(true)}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#0f1026] border border-slate-800 text-xs text-slate-300 hover:text-white transition"
                  title="Show Welcome Landing"
                >
                  <Sparkles className="h-3.5 w-3.5 text-pink-400" />
                  <span>Welcome</span>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2.5 rounded-2xl bg-[#0f1026] border border-slate-800/90 hover:border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                    title="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#070814]" />
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-800 bg-[#0c0d22] p-4 shadow-2xl z-50 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                          Notifications
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowNotifications(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200">
                          <p className="font-semibold text-white">🎬 Movie Night Scheduled</p>
                          <p className="text-[11px] text-purple-300/80 mt-0.5">Tomorrow at 9:00 PM with {partnerName}.</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
                          <p className="font-semibold text-white">⚡ 1080p Ultra HD Mirrors</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">VidSrc &amp; AutoEmbed are running at 0ms sync latency.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div
                  onClick={() => setShowSettingsModal(true)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-[#0f1026] border border-slate-800/90 hover:border-slate-700 cursor-pointer transition"
                >
                  <div className="relative">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#070814]" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-white leading-tight">{userName}</p>
                    <p className="text-[10px] text-emerald-400 font-medium leading-tight">● Online</p>
                  </div>
                </div>
              </div>
            </header>

            {/* Dashboard Content Area */}
            <main className="flex-1 p-5 sm:p-6 lg:p-7 overflow-y-auto space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
                {/* Center Main Column */}
                <div className="lg:col-span-8 space-y-8">
                  {/* Hero Card */}
                  <div className="relative rounded-3xl overflow-hidden border border-indigo-900/40 bg-gradient-to-br from-[#0e0f2b] via-[#121338] to-[#090a1e] min-h-[300px] flex items-center p-6 sm:p-8 xl:p-10 shadow-2xl">
                    <div className="absolute right-0 top-0 bottom-0 w-full sm:w-3/5 opacity-40 sm:opacity-75 pointer-events-none overflow-hidden">
                      <img
                        src="https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&h=700&q=80"
                        alt="Couple Watching Movie Together"
                        className="h-full w-full object-cover object-center mix-blend-screen scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#0e0f2b] via-[#0e0f2b]/80 to-transparent" />
                      <div className="absolute right-6 top-8 text-right hidden xl:block">
                        <p className="font-serif italic text-pink-300 text-sm opacity-80 tracking-wide">
                          Good Movies Better Together 💖
                        </p>
                      </div>
                    </div>

                    <div className="relative z-10 max-w-lg space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[11px] font-bold tracking-widest uppercase">
                        <span>WATCH TOGETHER</span>
                      </div>

                      <h2 className="font-extrabold text-3xl sm:text-4xl xl:text-5xl text-white tracking-tight leading-[1.12]">
                        Your Next{' '}
                        <span className="bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 bg-clip-text text-transparent">
                          Movie Date
                        </span>{' '}
                        Is Just a Link Away
                      </h2>

                      <p className="text-slate-300 text-xs sm:text-sm font-medium">
                        Share. Watch. Chat. Feel Closer.
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRoomName('');
                            setRoomPass('');
                            generatePasscode();
                            setShowCreateModal(true);
                          }}
                          className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:brightness-110 text-white font-semibold text-xs sm:text-sm shadow-xl shadow-pink-600/25 flex items-center gap-2 transition active:scale-95 cursor-pointer"
                        >
                          <span>Create a Room</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setJoinCode('');
                            setJoinPass('');
                            setShowJoinModal(true);
                          }}
                          className="px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white font-medium text-xs sm:text-sm backdrop-blur-md flex items-center gap-2 transition active:scale-95 cursor-pointer"
                        >
                          <Link2 className="h-4 w-4" />
                          <span>Join Room</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ======================================================== */}
                  {/* MOVIES SUGGESTIONS WITH VERIFIED TMDB BANNERS             */}
                  {/* ======================================================== */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
                          <Clapperboard className="h-5 w-5 text-purple-400" />
                          <span>Movie &amp; Show Suggestions</span>
                        </h3>
                        <p className="text-xs text-slate-400">
                          Click any banner to start a 1080p private watch party instantly
                        </p>
                      </div>

                      {/* Filter Shelf Tabs */}
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                        {SUGGESTION_CATEGORIES.map((cat) => {
                          const Icon = cat.icon;
                          const active = selectedCategory === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setSelectedCategory(cat.id)}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition cursor-pointer ${
                                active
                                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                                  : 'bg-[#0f1026] text-slate-400 hover:text-white border border-slate-800'
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              <span>{cat.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Movie Suggestions Banners Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filteredMovies.map((movie) => {
                        const isSaved = watchlist.some((m) => m.id === movie.id);
                        return (
                          <div
                            key={movie.id}
                            className="group relative rounded-2xl overflow-hidden bg-[#0d0e24] border border-slate-800/80 hover:border-pink-500/60 transition duration-300 flex flex-col shadow-xl"
                          >
                            {/* Movie Banner Poster */}
                            <div className="relative aspect-[2/3] w-full overflow-hidden bg-black">
                              <img
                                src={movie.poster}
                                alt={movie.title}
                                className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                                loading="lazy"
                              />

                              {/* Rating Badge */}
                              <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-amber-300 text-[10px] font-bold flex items-center gap-1 shadow-md">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                <span>{movie.rating}</span>
                              </div>

                              {/* Year Badge */}
                              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-slate-300 text-[10px] font-bold shadow-md">
                                {movie.year}
                              </div>

                              {/* Interactive Hover Actions */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition duration-200 flex flex-col justify-end p-3.5 gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleInstantWatch(movie.query)}
                                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/50 hover:brightness-110 active:scale-95 cursor-pointer"
                                >
                                  <Play className="h-4 w-4 fill-white" />
                                  <span>Stream 1080p HD</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleWatchlist(movie)}
                                  className="w-full py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[11px] font-medium flex items-center justify-center gap-1.5 backdrop-blur-md transition cursor-pointer"
                                >
                                  <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-pink-400 text-pink-400' : ''}`} />
                                  <span>{isSaved ? 'In Watchlist' : 'Add to Watchlist'}</span>
                                </button>
                              </div>
                            </div>

                            {/* Movie Metadata */}
                            <div className="p-3 space-y-1">
                              <h4 className="font-bold text-xs sm:text-sm text-white truncate" title={movie.title}>
                                {movie.title}
                              </h4>
                              <p className="text-[11px] text-slate-400 truncate">{movie.genres}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="space-y-3.5">
                    <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                      <span>🕒 Recent Activity</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-2xl bg-[#0d0e24] border border-slate-800/80 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                          <Youtube className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">You opened a link</p>
                          <p className="text-[11px] text-slate-400 truncate">youtube.com • 2 hours ago</p>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#0d0e24] border border-slate-800/80 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl overflow-hidden bg-slate-800 shrink-0">
                          <img
                            src="https://image.tmdb.org/t/p/w200/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg"
                            alt="Interstellar"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">You watched together</p>
                          <p className="text-[11px] text-slate-400 truncate">Interstellar • 3 hours ago</p>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#0d0e24] border border-slate-800/80 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                          <MessageSquare className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">New message</p>
                          <p className="text-[11px] text-slate-400 truncate">from {partnerName} • 5 hours ago</p>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#0d0e24] border border-slate-800/80 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                          <Users className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">Room created</p>
                          <p className="text-[11px] text-slate-400 truncate">Movie Night • 6 hours ago</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Dashboard Panel */}
                <div className="lg:col-span-4 space-y-5">
                  {/* Quick Start Card */}
                  <div className="rounded-3xl border border-slate-800/80 bg-[#0d0e24] p-5 space-y-4 shadow-xl">
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        <Zap className="h-4 w-4 text-purple-400" />
                        <span>Quick Start</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Create a new room and invite your partner
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setRoomName('');
                        setRoomPass('');
                        generatePasscode();
                        setShowCreateModal(true);
                      }}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:brightness-110 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                    >
                      <PlusCircle className="h-4 w-4" />
                      <span>Create Room</span>
                    </button>

                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                      <div className="flex-1 border-t border-slate-800" />
                      <span>or</span>
                      <div className="flex-1 border-t border-slate-800" />
                    </div>

                    <form onSubmit={handleQuickJoin} className="relative flex items-center">
                      <Link2 className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        value={quickCodeInput}
                        onChange={(e) => setQuickCodeInput(e.target.value)}
                        placeholder="Paste room code or link..."
                        className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-[#070814] border border-slate-800 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
                      />
                      <button
                        type="submit"
                        className="absolute right-2 p-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition cursor-pointer"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </div>

                  {/* Your Room Active Status Card */}
                  <div className="rounded-3xl border border-slate-800/80 bg-[#0d0e24] p-5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        <Film className="h-4 w-4 text-purple-400" />
                        <span>Your Room</span>
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                        Active
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#070814] border border-slate-800/80 flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-800 shrink-0">
                        <img
                          src="https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=300&h=200&q=80"
                          alt="Movie Night"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">Movie Night</p>
                        <p className="text-[11px] text-slate-400 truncate">with {partnerName}</p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-purple-400" /> 2
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-pink-400" /> 01:24:36
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const target = lastRoom || 'movie-night';
                          router.push(`/room/${target}`);
                        }}
                        className="py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5 fill-white" />
                        <span>Join</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSettingsModal(true)}
                        className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        <span>Manage</span>
                      </button>
                    </div>
                  </div>

                  {/* Upcoming Dates Section */}
                  <div className="rounded-3xl border border-slate-800/80 bg-[#0d0e24] p-5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-400" />
                        <span>Upcoming</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => notify('Calendar sync active')}
                        className="text-xs font-semibold text-purple-400 hover:text-purple-300"
                      >
                        See All →
                      </button>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="p-3 rounded-2xl bg-[#070814] border border-slate-800/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                            <Music2 className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="font-semibold text-white">Anniversary</p>
                            <p className="text-[11px] text-slate-400">25 Jan 2026</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-rose-400">132 days left</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#070814] border border-slate-800/80 flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <Film className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">Movie Night</p>
                          <p className="text-[11px] text-slate-400">Tomorrow • 9:00 PM</p>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#070814] border border-slate-800/80 flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <Heart className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">Date with {partnerName}</p>
                          <p className="text-[11px] text-slate-400">8 Feb 2026 • 8:00 PM</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Better Together Card */}
                  <div className="rounded-3xl border border-pink-500/20 bg-gradient-to-br from-[#121338] via-[#1a1236] to-[#250d30] p-5 relative overflow-hidden shadow-xl">
                    <div className="relative z-10 space-y-2">
                      <div className="flex items-center gap-2 text-pink-400">
                        <Heart className="h-5 w-5 fill-pink-500 text-pink-400" />
                        <span className="font-bold text-sm text-white">Better Together</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Turn your screen time into quality time.
                      </p>
                    </div>
                    <div className="absolute right-3 bottom-2 opacity-30 pointer-events-none">
                      <Heart className="h-20 w-20 text-pink-400 fill-pink-500/20 blur-[1px]" />
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      )}

      {/* CREATE ROOM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#0d0e24] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <PlusCircle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Create Private Room</h3>
                  <p className="text-xs text-slate-400">Encrypted room with high security</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Room Name (Optional)</label>
                <input
                  value={roomName}
                  onChange={(e) => setRoomName(sanitizeInput(e.target.value))}
                  placeholder="e.g. Couples Movie Night"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070814] border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-300">Room Password (Required)</label>
                  <button
                    type="button"
                    onClick={generatePasscode}
                    className="text-purple-400 hover:underline flex items-center gap-1"
                  >
                    <KeyRound className="h-3 w-3" />
                    <span>Generate Strong</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showRoomPass ? 'text' : 'password'}
                    value={roomPass}
                    onChange={(e) => setRoomPass(e.target.value)}
                    placeholder="Enter at least 4 characters"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[#070814] border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRoomPass(!showRoomPass)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    {showRoomPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-300">
                  <span className="font-semibold">Room Capacity</span>
                  <span className="font-bold text-purple-400">{maxSeats} seats</span>
                </div>
                <div className="flex gap-2">
                  {[2, 4, 8, 16, 30].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setMaxSeats(s)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        maxSeats === s
                          ? 'bg-purple-600 text-white border-purple-500'
                          : 'bg-[#070814] border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {createError && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                  {createError}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:brightness-110 text-white font-bold text-sm shadow-xl shadow-purple-600/30 transition active:scale-95 cursor-pointer"
              >
                Create &amp; Enter Room
              </button>
            </form>
          </div>
        </div>
      )}

      {/* JOIN ROOM MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#0d0e24] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <Link2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Join Private Room</h3>
                  <p className="text-xs text-slate-400">Enter room code and password</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Room Code or Link</label>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Paste room code or full URL"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070814] border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Room Password</label>
                <div className="relative">
                  <input
                    type={showJoinPass ? 'text' : 'password'}
                    value={joinPass}
                    onChange={(e) => setJoinPass(e.target.value)}
                    placeholder="Enter password given by host"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[#070814] border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowJoinPass(!showJoinPass)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    {showJoinPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {joinError && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                  {joinError}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-bold text-sm shadow-xl shadow-purple-600/30 transition active:scale-95 cursor-pointer"
              >
                Join Room
              </button>
            </form>
          </div>
        </div>
      )}

      {/* WATCHLIST MODAL */}
      {showWatchlistModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-[#0d0e24] p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-purple-400" />
                <span>Your Watchlist ({watchlist.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowWatchlistModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {watchlist.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Bookmark className="h-8 w-8 mx-auto text-slate-600" />
                  <p className="text-sm font-semibold">Your watchlist is empty</p>
                  <p className="text-xs text-slate-500">
                    Hover on any movie banner and tap &quot;Add to Watchlist&quot; to save for later!
                  </p>
                </div>
              ) : (
                watchlist.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-2xl bg-[#070814] border border-slate-800/80 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-14 w-10 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                        <img src={item.poster} alt={item.title} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs sm:text-sm text-white truncate">{item.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">{item.genres}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleInstantWatch(item.query)}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 shadow-md cursor-pointer"
                      >
                        <Play className="h-3 w-3 fill-white" />
                        <span>Play</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleWatchlist(item)}
                        className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-rose-400 cursor-pointer"
                        title="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* WATCH HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-[#0d0e24] p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-400" />
                <span>Recently Played History</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {history.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Clock className="h-8 w-8 mx-auto text-slate-600" />
                  <p className="text-sm font-semibold">No recent history</p>
                  <p className="text-xs text-slate-500">
                    Movies and links played in your rooms will appear here automatically.
                  </p>
                </div>
              ) : (
                history.map((url, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-[#070814] border border-slate-800/80 flex items-center justify-between gap-3"
                  >
                    <p className="text-xs text-slate-300 font-mono truncate flex-1">{url}</p>
                    <button
                      type="button"
                      onClick={() => handleInstantWatch(url)}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="h-3 w-3 fill-white" />
                      <span>Replay</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#0d0e24] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Settings className="h-4 w-4 text-purple-400" />
                <span>Profile &amp; Cinema Settings</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Your Name</label>
                <input
                  value={userName}
                  onChange={(e) => {
                    const clean = sanitizeInput(e.target.value);
                    setUserName(clean);
                    localStorage.setItem('sc_user_name', clean);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070814] border border-slate-800 text-xs sm:text-sm text-white outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Partner&apos;s Name</label>
                <input
                  value={partnerName}
                  onChange={(e) => {
                    const clean = sanitizeInput(e.target.value);
                    setPartnerName(clean);
                    localStorage.setItem('sc_partner_name', clean);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070814] border border-slate-800 text-xs sm:text-sm text-white outline-none focus:border-purple-500"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Bank-Grade Encryption Active
                </p>
                <p className="text-[11px] text-purple-300/80">
                  Every room is protected with host passwords, salted scrypt encryption, and peer-to-peer WebRTC video calls.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowWelcomeScreen(true);
                    setShowSettingsModal(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 font-semibold cursor-pointer"
                >
                  View Welcome Screen Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
