import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Camera } from 'lucide-react';
import VisualDecisionMatrix from './VisualDecisionMatrix';
import ErrorBoundary from './ErrorBoundary';

const CommandBar = ({ user }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('zencart-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let interval;
    if (isLoading) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.random() * 15;
        });
      }, 500);
    } else if (!isLoading && progress > 0) {
      setProgress(100);
      const timeout = setTimeout(() => setProgress(0), 800);
      return () => clearTimeout(timeout);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const lat = user ? user.lat : 12.9916;
  const lon = user ? user.lon : 80.2316;
  const locationName = user ? user.location : 'Chennai, Tamil Nadu, India';

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('http://localhost:3001/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, lat, lon, locationName })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to search');

      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setResults(null);
    setQuery('Analyzing image...');

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('lat', lat);
      formData.append('lon', lon);
      formData.append('locationName', locationName);

      const response = await fetch('http://localhost:3001/api/search/image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Image search failed');

      setQuery(data.queryIdentified || '');
      setResults(data);
    } catch (err) {
      setError(err.message);
      setQuery('');
    } finally {
      setIsLoading(false);
      // Reset input so they can upload the same image again if needed
      e.target.value = '';
    }
  };

  return (
    <div className="w-full space-y-10">
      <form onSubmit={handleSearch} className="relative w-full group">
        <div className="absolute inset-y-0 left-4 md:left-8 flex items-center pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-6 h-6 md:w-8 md:h-8 text-pink-400 animate-spin" />
          ) : (
            <Search className="w-6 h-6 md:w-8 md:h-8 text-indigo-400 group-focus-within:text-pink-400 transition-colors duration-500" />
          )}
        </div>
        
        <input
          id="zencart-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What are you looking for?"
          className="w-full bg-black/[0.02] dark:bg-white/[0.03] backdrop-blur-2xl border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] rounded-[2rem] py-5 md:py-8 pl-14 md:pl-24 pr-16 md:pr-36 text-xl md:text-3xl font-light outline-none shadow-2xl focus:shadow-[0_0_40px_rgba(139,92,246,0.3)] focus:border-purple-400/50 transition-all duration-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100 tracking-wide focus:-translate-y-1"
          autoComplete="off"
          autoFocus
          aria-label="Search items"
        />
        
        <div className="absolute inset-y-0 right-2 md:right-6 flex items-center space-x-1 md:space-x-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 md:p-3 hover:bg-purple-500/10 dark:hover:bg-purple-500/20 rounded-full transition-all duration-300 group/btn"
            title="Search by Image"
          >
            <Camera className="w-6 h-6 md:w-7 md:h-7 text-indigo-400 dark:text-indigo-300 group-hover/btn:text-pink-400 dark:group-hover/btn:text-pink-300 group-hover/btn:scale-110 transition-all" />
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />

          <button 
            type="submit"
            disabled={isLoading}
            className="text-sm md:text-lg font-mono text-indigo-700/80 dark:text-indigo-300/60 border border-indigo-400/30 dark:border-indigo-500/30 bg-indigo-500/10 dark:bg-indigo-900/40 hover:bg-indigo-500/20 dark:hover:bg-indigo-800/60 hover:text-indigo-900 dark:hover:text-indigo-200 transition-colors rounded-xl px-3 md:px-4 py-1.5 md:py-2 shadow-sm tracking-widest hidden sm:block disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            ENTER ↵
          </button>
        </div>
      </form>

      {/* Repositioned Loading Progress Bar */}
      {(isLoading || progress > 0) && (
        <div className="flex flex-col items-center justify-center animate-in fade-in duration-500 py-4">
          <div className="w-full max-w-sm h-1.5 md:h-2 overflow-hidden rounded-full glass border border-black/10 dark:border-white/10 relative bg-black/5 dark:bg-white/5">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(236,72,153,0.5)]" 
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
            <span className="text-xs md:text-sm font-medium text-indigo-600 dark:text-indigo-300/80 tracking-wide animate-pulse-slow">
              {progress < 100 ? 'Scanning providers & analyzing options...' : 'Securing the best deals...'}
            </span>
            <span className="font-mono text-xs text-indigo-500/70 border border-indigo-500/20 px-1.5 py-0.5 rounded-md min-w-[40px] text-center">
              {Math.floor(Math.min(progress, 100))}%
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="text-red-300 text-lg p-6 glass rounded-2xl border-red-500/30 font-medium flex items-center shadow-[0_0_20px_rgba(239,68,68,0.2)]">
          ✨ {error}
        </div>
      )}

      {results && (
        <ErrorBoundary>
          <VisualDecisionMatrix data={results} user={user} />
        </ErrorBoundary>
      )}
    </div>
  );
};

export default CommandBar;
