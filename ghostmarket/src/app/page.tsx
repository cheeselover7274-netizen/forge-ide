'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Want, Category } from '@/types/database';
import { Loader2, Search, TrendingUp, Sparkles, Layers, Plus } from 'lucide-react';
import WantCard from '@/components/WantCard';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const [wants, setWants] = useState<Want[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trending' | 'new'>('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Get categories
      const { data: catData } = await supabase.from('categories').select('*');
      if (catData) setCategories(catData);

      // Get wants
      let query = supabase.from('wants').select('*, profiles(*), categories(*)');

      if (activeTab === 'trending') {
        query = query.order('support_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data: wantData } = await query.limit(20);
      if (wantData) setWants(wantData);
      setLoading(false);
    }
    fetchData();
  }, [activeTab]);

  const filteredWants = wants.filter(w =>
    w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      {/* Navbar */}
      <nav className="border-b border-[#30363D] bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-xl">👻</span>
            </div>
            <span className="text-xl font-black tracking-tighter hidden sm:block">GhostMarket</span>
          </Link>

          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search unmet demand..."
              className="w-full bg-[#161B22] border border-[#30363D] rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link href="/wants/create" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Post Idea</span>
                </Link>
                <Link href={`/profile/${user.user_metadata?.username}`} className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                   <span className="text-[10px] font-bold">ME</span>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="text-gray-400 hover:text-white text-sm font-medium px-4 py-2">Login</Link>
                <Link href="/signup" className="bg-white text-black hover:bg-gray-200 text-sm font-bold px-4 py-2 rounded-lg">Join</Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="py-20 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/5 radial-gradient pointer-events-none"></div>
        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight">
            What Do You Wish <br />
            <span className="text-blue-500">Existed?</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
            GhostMarket is where unmet demand becomes a searchable marketplace. Post things you want to buy, and help bring them to life.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link href="/wants/create" className="bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-8 rounded-xl text-lg shadow-xl shadow-blue-600/20 transition-all transform hover:scale-105">
              Post Your Idea
            </Link>
            <button className="bg-[#161B22] hover:bg-[#1C2128] text-white font-bold py-4 px-8 rounded-xl text-lg border border-[#30363D]">
              Explore Opportunities
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-4 gap-8 pb-20">
        {/* Left Sidebar: Categories */}
        <aside className="hidden lg:block space-y-6">
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-4">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 px-2">Categories</h3>
            <div className="space-y-1">
              <Link href="/" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-500 font-bold text-sm text-left">
                <Layers className="w-4 h-4" />
                All Wants
              </Link>
              {categories.map(cat => (
                <Link key={cat.id} href={`/categories/${cat.slug}`} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1C2128] text-gray-400 hover:text-white text-sm text-left transition-colors">
                  <Sparkles className="w-4 h-4" />
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white space-y-4">
            <h3 className="font-bold">Are you a builder?</h3>
            <p className="text-sm opacity-90 leading-relaxed">
              Discover startup opportunities with real, validated demand. Stop guessing what users want.
            </p>
            <button className="w-full bg-white text-blue-600 font-bold py-2 rounded-lg text-sm">
              Claim Opportunities
            </button>
          </div>
        </aside>

        {/* Feed */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between border-b border-[#30363D] pb-4">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('trending')}
                className={cn(
                  "flex items-center gap-2 text-sm font-bold transition-colors pb-4 -mb-4 relative",
                  activeTab === 'trending' ? "text-blue-500" : "text-gray-500 hover:text-white"
                )}
              >
                <TrendingUp className="w-4 h-4" />
                Trending
                {activeTab === 'trending' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"></div>}
              </button>
              <button
                onClick={() => setActiveTab('new')}
                className={cn(
                  "flex items-center gap-2 text-sm font-bold transition-colors pb-4 -mb-4 relative",
                  activeTab === 'new' ? "text-blue-500" : "text-gray-500 hover:text-white"
                )}
              >
                <Sparkles className="w-4 h-4" />
                Newest
                {activeTab === 'new' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"></div>}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
          ) : filteredWants.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredWants.map(want => (
                <WantCard key={want.id} want={want} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-[#161B22] border border-[#30363D] rounded-2xl">
              <p className="text-gray-400">No wants found. Be the first to post one!</p>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        .radial-gradient {
          background: radial-gradient(circle at center, rgba(37, 99, 235, 0.15) 0%, transparent 70%);
        }
      `}</style>
    </div>
  );
}
