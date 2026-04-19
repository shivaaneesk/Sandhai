import React, { useState, useMemo } from 'react';
import BudgetToggle from './BudgetToggle';
import SummaryMode from './SummaryMode';
import { Star, MapPin, IndianRupee, DollarSign, Euro, PoundSterling, Store, Bookmark, Sparkles } from 'lucide-react';

const VisualDecisionMatrix = ({ data, user }) => {
  const [budgetMode, setBudgetMode] = useState(false);
  const [savedItems, setSavedItems] = useState(new Set());

  const { products, summary, best_product_name } = data;

  const getCurrencyFallback = (location) => {
    const loc = (location || '').toLowerCase();
    if (loc.includes('india') || loc.includes('chennai') || loc.includes('mumbai') || loc.includes('delhi') || loc.includes('bangalore') || loc.includes('hyderabad') || loc.includes('tamil nadu') || loc.includes('pune')) return '₹';
    if (loc.includes('uk') || loc.includes('united kingdom')) return '£';
    if (loc.includes('europe') || loc.includes('france') || loc.includes('germany') || loc.includes('italy') || loc.includes('spain') || loc.includes('rome')) return '€';
    return '$';
  };

  const getPrice = (p) => {
    if (typeof p.price === 'number') return p.price;
    if (!p.price) return 0;
    const parsed = parseFloat(String(p.price).replace(/[^0-9.]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  const sortedProducts = useMemo(() => {
    if (!products) return [];
    const arr = [...products];
    if (budgetMode) {
      return arr.sort((a, b) => getPrice(a) - getPrice(b));
    }
    return arr.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (a.distance_miles !== b.distance_miles) return (a.distance_miles || 0) - (b.distance_miles || 0);
      return getPrice(a) - getPrice(b);
    });
  }, [products, budgetMode]);

  const handleSave = async (p) => {
    const token = localStorage.getItem('zencart_token');
    if (!token) return;
    
    // OPTIMISTIC UPDATE: Make the UI feel instantly responsive
    setSavedItems(prev => new Set([...prev, p.name]));
    
    try {
      const res = await fetch('/api/user/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deal: p })
      });
      
      if (!res.ok) {
        // Revert on failure
        setSavedItems(prev => {
          const next = new Set(prev);
          next.delete(p.name);
          return next;
        });
      }
    } catch (e) {
      console.error('Failed to save', e);
      // Revert on failure
      setSavedItems(prev => {
        const next = new Set(prev);
        next.delete(p.name);
        return next;
      });
    }
  };

  if (!products || products.length === 0) {
    return <div className="text-zinc-400 p-4 glass rounded-xl text-center">No products found.</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Verdict on top */}
      <SummaryMode summary={summary} />

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-indigo-300 drop-shadow-md">Market Results</h2>
        <BudgetToggle isActive={budgetMode} onToggle={() => setBudgetMode(!budgetMode)} />
      </div>

      <div className="glass-card rounded-[2rem] overflow-x-auto overflow-y-hidden border border-black/5 dark:border-white/5">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-black/5 dark:bg-white/5 uppercase text-indigo-700 dark:text-indigo-200/60 font-semibold text-xs tracking-widest border-b border-black/5 dark:border-white/5">
            <tr>
              <th className="px-6 py-5">Product</th>
              <th className="px-6 py-5">Price</th>
              <th className="px-6 py-5">Rating</th>
              <th className="px-6 py-5 text-right w-32">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {sortedProducts.map((p, idx) => {
              const isBest = best_product_name && p.name.includes(best_product_name);
              const isSaved = savedItems.has(p.name);
              
              return (
                <tr key={idx} className={`transition-all duration-300 group hover:-translate-y-0.5 relative ${isBest ? 'bg-pink-500/10 hover:bg-pink-500/20' : 'hover:bg-black/5 dark:hover:bg-white/[0.08]'}`}>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-xl object-cover border border-zinc-200 dark:border-white/10 shadow-lg" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center border border-black/5 dark:border-white/5">
                          <Store className="w-5 h-5 text-zinc-400 dark:text-white/20" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <div className={`font-semibold text-zinc-900 dark:text-white truncate max-w-[200px] text-[15px] transition-colors ${isBest ? 'text-pink-600 dark:text-pink-100 group-hover:text-pink-700 dark:group-hover:text-pink-300' : 'group-hover:text-indigo-600 dark:group-hover:text-indigo-200'}`} title={p.name}>
                            {p.name}
                          </div>
                          {isBest && <Sparkles className="w-4 h-4 text-pink-500 dark:text-pink-400 animate-pulse" title="AI Recommendation" />}
                        </div>
                        <div className="text-xs mt-1 text-zinc-500 dark:text-white/50 flex flex-col gap-0.5">
                           <span>{p.source}</span>
                           {isBest && <span className="text-pink-600/80 dark:text-pink-300/80 font-medium">Top Pick</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 w-fit">
                      <span className="font-sans mr-0.5 font-bold">{p.currencySymbol || getCurrencyFallback(user?.location)}</span>
                      {getPrice(p).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 w-fit">
                      <Star className="w-4 h-4 text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.3)] dark:drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]" />
                      <span className="font-bold text-amber-700 dark:text-amber-100">{p.rating || 'N/A'}</span>
                      <span className="text-amber-700/60 dark:text-amber-200/50 text-xs font-medium">({p.reviews || 0})</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleSave(p)}
                      disabled={isSaved}
                      className={`p-2 rounded-xl border transition-all duration-300 ${isSaved ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-500 dark:border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.6)]' : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'}`}
                      title={isSaved ? "Saved" : "Save Deal"}
                    >
                      <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                    </button>
                    {p.link && (
                      <a href={p.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center bg-indigo-500/10 dark:bg-indigo-500/20 hover:bg-indigo-500 dark:hover:bg-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.6)] text-indigo-700 dark:text-indigo-100 hover:text-white px-5 py-2 rounded-xl transition-all duration-300 font-medium border border-indigo-500/30">
                        View
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VisualDecisionMatrix;
