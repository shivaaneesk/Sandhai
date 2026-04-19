import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');

      localStorage.setItem('zencart_token', data.token);
      localStorage.setItem('zencart_user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] flex flex-col items-center justify-center duration-700 ease-in-out transition-all animate-in zoom-in-95 duration-500">
      <h1 className="font-heading text-5xl font-extrabold tracking-tight text-center mb-12 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-300 dark:via-purple-300 dark:to-pink-300 drop-shadow-md">
        Sandhai
      </h1>
      
      <form onSubmit={handleLogin} className="w-full glass-card rounded-3xl p-10 md:p-12 space-y-8 shadow-[0_20px_50px_-20px_rgba(139,92,246,0.2)] dark:shadow-[0_20px_50px_-20px_rgba(139,92,246,0.3)]">
        <div className="group">
          <label className="block text-indigo-700 dark:text-indigo-300/80 font-medium mb-2 text-sm ml-2 group-focus-within:text-pink-600 dark:group-focus-within:text-pink-300 transition-colors">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-black/5 dark:bg-black/20 border border-black/10 dark:border-white/5 rounded-2xl py-4 px-6 text-lg font-light outline-none focus:border-purple-500/50 focus:shadow-[0_0_20px_rgba(168,85,247,0.2)] dark:focus:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/20"
            placeholder="you@example.com"
          />
        </div>
        
        <div className="group">
          <label className="block text-indigo-700 dark:text-indigo-300/80 font-medium mb-2 text-sm ml-2 group-focus-within:text-pink-600 dark:group-focus-within:text-pink-300 transition-colors">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-black/5 dark:bg-black/20 border border-black/10 dark:border-white/5 rounded-2xl py-4 px-6 text-lg font-light outline-none focus:border-purple-500/50 focus:shadow-[0_0_20px_rgba(168,85,247,0.2)] dark:focus:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/20"
            placeholder="••••••••"
          />
        </div>

        {error && <div className="text-red-700 dark:text-red-300 text-sm ml-2 font-medium bg-red-100 dark:bg-red-900/40 p-3 rounded-xl border border-red-500/20">✨ {error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 bg-gradient-to-r from-indigo-500 hover:from-indigo-600 via-purple-500 hover:via-purple-600 to-pink-500 hover:to-pink-600 dark:from-indigo-500 dark:hover:from-indigo-400 dark:via-purple-500 dark:hover:via-purple-400 dark:to-pink-500 dark:hover:to-pink-400 text-white rounded-2xl py-4 text-lg font-semibold shadow-[0_0_15px_rgba(168,85,247,0.3)] dark:shadow-none hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] transition-all flex items-center justify-center transform active:scale-[0.98]"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Log In'}
        </button>
        
        <div className="text-center text-sm text-indigo-700/60 dark:text-indigo-200/60 mt-6 pt-4 border-t border-black/10 dark:border-white/10">
          Don't have an account? {' '}
          <Link to="/signup" className="text-fuchsia-600 dark:text-fuchsia-300 font-medium hover:text-fuchsia-800 dark:hover:text-white hover:underline transition-colors">
            Sign up
          </Link>
        </div>
      </form>
    </div>
  );
};

export default Login;
