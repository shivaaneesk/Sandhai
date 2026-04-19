import React, { useState, useEffect } from 'react';
import { Search, User as UserIcon, LogOut, Bookmark, Star, ExternalLink, IndianRupee, Sun, Moon, Trash2 } from 'lucide-react';
import CommandBar from './CommandBar';

const ThemeToggle = ({ isDark, setIsDark }) => (
  <button
    onClick={() => setIsDark(!isDark)}
    className="relative w-14 h-7 flex items-center bg-black/10 dark:bg-white/10 rounded-full p-1 transition-colors duration-500 border border-black/5 dark:border-white/10 shadow-inner group"
    aria-label="Toggle Theme"
  >
    <div className={`absolute left-1 w-5 h-5 rounded-full bg-white dark:bg-zinc-800 shadow-md transform transition-transform duration-500 ease-spring flex items-center justify-center ${isDark ? 'translate-x-7' : 'translate-x-0'}`}>
      {isDark ? <Moon className="w-3 h-3 text-indigo-400" /> : <Sun className="w-3 h-3 text-amber-500" />}
    </div>
  </button>
);

const SavedDealsView = ({ user }) => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  const getCurrencyFallback = (location) => {
    const loc = (location || '').toLowerCase();
    if (loc.includes('india') || loc.includes('chennai') || loc.includes('mumbai') || loc.includes('delhi') || loc.includes('bangalore') || loc.includes('hyderabad') || loc.includes('tamil nadu') || loc.includes('pune')) return '₹';
    if (loc.includes('uk') || loc.includes('united kingdom')) return '£';
    if (loc.includes('europe') || loc.includes('france') || loc.includes('germany') || loc.includes('italy') || loc.includes('spain') || loc.includes('rome')) return '€';
    return '$';
  };

  const formatPrice = (price) => {
    if (!price) return '0';
    const cleanStr = String(price).replace(/[^0-9.]/g, '');
    const num = parseFloat(cleanStr);
    if (isNaN(num)) return '0';
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
  };

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const token = localStorage.getItem('zencart_token');
        const res = await fetch('/api/user/saved', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.savedDeals) setDeals(data.savedDeals);
      } catch (err) {
        console.error('Failed to fetch saved deals', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeals();
  }, []);

  const handleRemove = async (dealName) => {
    // OPTIMISTIC UPDATE: Hide the card instantly
    const previousDeals = [...deals];
    setDeals(prev => prev.filter(deal => deal.name !== dealName));

    try {
      const token = localStorage.getItem('zencart_token');
      const res = await fetch('/api/user/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dealName })
      });
      const data = await res.json();
      
      if (!data.success) {
        // Revert if server failed
        setDeals(previousDeals);
      } else {
        // Sync with actual server state silently
        setDeals(data.savedDeals);
      }
    } catch (err) {
      console.error('Failed to remove deal', err);
      setDeals(previousDeals);
    }
  };

  if (loading) return <div className="text-center mt-20 text-emerald-600 dark:text-emerald-300 animate-pulse">Loading saved finds...</div>;
  if (deals.length === 0) return <div className="text-center mt-20 text-zinc-500 dark:text-white/50 glass-card p-10 rounded-3xl w-max mx-auto">No saved items yet. Start discovering!</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {deals.map((deal, idx) => (
        <div key={idx} className="glass-card rounded-[2rem] p-6 hover:-translate-y-1 dark:hover:shadow-[0_10px_30px_rgba(52,211,153,0.15)] transition-all group relative">

          <button
            onClick={() => handleRemove(deal.name)}
            className="absolute top-4 right-4 z-10 p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
            title="Remove from saved"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {deal.imageUrl && (
            <div className="w-full h-40 rounded-xl overflow-hidden mb-4 border border-zinc-200 dark:border-white/10">
              <img src={deal.imageUrl} alt={deal.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
          )}
          <h3 className="text-zinc-900 dark:text-white font-semibold mb-1 line-clamp-2 pr-8" title={deal.name}>{deal.name}</h3>
          <p className="text-emerald-600/70 dark:text-emerald-200/50 text-xs mb-4">{deal.source}</p>

          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              <span className="font-sans mr-0.5 font-bold">{deal.currencySymbol || getCurrencyFallback(user?.location)}</span>
              {formatPrice(deal.price)}
            </div>
            {deal.link && (
              <a href={deal.link} target="_blank" rel="noopener noreferrer" className="p-2 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500 hover:text-white rounded-lg transition-colors border border-indigo-500/20 dark:border-indigo-500/30">
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const DashboardLayout = ({ user, handleLogout }) => {
  const [activeTab, setActiveTab] = useState('discover');
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const tabs = [
    { id: 'discover', label: 'Discover', icon: Search, activeColor: 'text-emerald-600 dark:text-emerald-300', glow: 'shadow-[0_0_15px_rgba(52,211,153,0.1)] dark:shadow-[0_0_15px_rgba(52,211,153,0.2)]' },
    { id: 'saved', label: 'Saved Items', icon: Bookmark, activeColor: 'text-pink-600 dark:text-pink-300', glow: 'shadow-[0_0_15px_rgba(244,114,182,0.1)] dark:shadow-[0_0_15px_rgba(244,114,182,0.2)]' }
  ];

  return (
    <div className="w-full max-w-[1400px] flex flex-col md:flex-row gap-4 md:gap-8 h-[95dvh] md:h-[85vh]">

      {/* Sidebar Navigation */}
      <aside className="w-64 glass rounded-[2.5rem] p-8 flex flex-col justify-between hidden md:flex border-black/5 dark:border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-purple-500/5 pointer-events-none" />

        <div className="space-y-12 relative z-10">
          <div className="text-center">
            <h1 className="font-heading text-4xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 via-emerald-600 to-teal-600 dark:from-indigo-300 dark:via-emerald-300 dark:to-teal-300 drop-shadow-md">
              Sandhai
            </h1>
            <p className="text-emerald-600/70 dark:text-emerald-200/50 text-xs mt-1 font-medium tracking-widest uppercase">Intelligence</p>
          </div>

          <nav className="space-y-4">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${isActive ? `bg-black/5 dark:bg-white/10 ${tab.glow} border border-black/5 dark:border-white/10` : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'}`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? tab.activeColor : 'text-zinc-500 dark:text-zinc-400'}`} />
                  <span className={`font-medium ${isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-4 relative z-10 pt-8 border-t border-zinc-200 dark:border-white/5">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all">
            <span className="font-medium text-sm text-zinc-600 dark:text-emerald-100/60">Theme</span>
            <ThemeToggle isDark={isDark} setIsDark={setIsDark} />
          </div>

          <div className="flex items-center gap-3 px-2 pt-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
              <UserIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">{user.email.split('@')[0]}</span>
              <span className="text-xs text-zinc-500 dark:text-white/40 truncate w-32">{user.location}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-300 hover:text-red-700 dark:hover:text-red-200 rounded-2xl transition-all border border-red-500/10 hover:border-red-500/30"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-3 md:p-4 glass rounded-2xl mb-4 shrink-0 shadow-lg">
          <h1 className="font-heading text-2xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 via-emerald-600 to-teal-600 dark:from-indigo-300 dark:via-emerald-300 dark:to-teal-300 drop-shadow-md">
            Sandhai
          </h1>
          <div className="flex items-center gap-3">
            <ThemeToggle isDark={isDark} setIsDark={setIsDark} />
            <button onClick={handleLogout} className="p-2 text-red-600 dark:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-full transition-colors">
              <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-1 md:px-2 pb-24 md:pb-20 custom-scrollbar rounded-2xl md:rounded-[2.5rem]">
          <div className="max-w-4xl mx-auto pt-10 md:pt-20">
            {activeTab === 'discover' ? (
              <>
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-light text-zinc-900 dark:text-white mb-4">What shall we find today?</h2>
                  <p className="text-emerald-600/70 dark:text-emerald-200/50">Searching the finest deals around {user.location.split(',')[0]}...</p>
                </div>
                <CommandBar user={user} />
              </>
            ) : (
              <>
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-light text-zinc-900 dark:text-white mb-4">Your Saved Treasury</h2>
                  <p className="text-pink-600/70 dark:text-pink-200/50">Market finds secured in your vault.</p>
                </div>
                <SavedDealsView user={user} />
              </>
            )}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-4 left-4 right-4 glass !bg-white/70 dark:!bg-black/50 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-2xl flex items-center justify-around p-2 z-50 shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl transition-all duration-300 ${isActive ? `bg-black/5 dark:bg-white/10 ${tab.activeColor}` : 'text-zinc-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110 drop-shadow-md' : 'opacity-70'} transition-all`} />
                <span className="text-[10px] font-semibold tracking-wide uppercase">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </main>

    </div>
  );
};

export default DashboardLayout;
