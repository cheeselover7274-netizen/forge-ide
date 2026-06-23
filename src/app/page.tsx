'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Want, Category } from '@/types/database';
import { TrendingUp, Sparkles, Layers, ArrowRight, Ghost } from 'lucide-react';
import WantCard from '@/components/WantCard';
import Navbar from '@/components/Navbar';
import { WantCardSkeleton } from '@/components/Skeletons';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { FadeIn, SlideIn, PageTransition } from '@/components/ui/Motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';

function HomeContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q');

  const [wants, setWants] = useState<Want[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trending' | 'new'>('trending');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      // Get categories
      const { data: catData } = await supabase.from('categories').select('*');
      if (catData) setCategories(catData);

      // Get wants
      let query = supabase.from('wants').select('*, profiles(*), categories(*)');

      if (q) {
        query = query.or(`title.ilike.%\${q}%,description.ilike.%\${q}%`);
      }

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
  }, [activeTab, q]);

  return (
    <>
      <Navbar />

      <PageTransition>
        {/* Hero Section */}
        <header className="relative py-24 px-4 overflow-hidden">
          {/* Ambient Background Glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-600/10 blur-[120px] pointer-events-none rounded-full" />
          <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-indigo-600/5 blur-[100px] pointer-events-none rounded-full" />

          <div className="max-w-5xl mx-auto text-center relative z-10">
            <SlideIn direction="up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-8 uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" />
                The Future is Unwritten
              </div>
            </SlideIn>

            <SlideIn direction="up" delay={0.1}>
              <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9] mb-8 text-white">
                What Do You Wish <br />
                <span className="text-gradient">Existed?</span>
              </h1>
            </SlideIn>

            <SlideIn direction="up" delay={0.2}>
              <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-12">
                GhostMarket turns unmet demand into a searchable marketplace. Post things you want to buy, and help bring them to life.
              </p>
            </SlideIn>

            <SlideIn direction="up" delay={0.3}>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/wants/create">
                  <Button variant="premium" size="lg" className="h-14 px-10 rounded-2xl group">
                    Post Your Idea
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="h-14 px-10 rounded-2xl border-slate-800 hover:bg-slate-900">
                  Explore Opportunities
                </Button>
              </div>
            </SlideIn>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-4 gap-12 pb-32">
          {/* Categories Sidebar */}
          <aside className="hidden lg:block space-y-8">
            <div className="sticky top-28 space-y-8">
              <section>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Categories</h3>
                <div className="space-y-1">
                  <Link href="/" className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-500/10 text-blue-400 font-bold text-sm transition-all border border-blue-500/20 shadow-lg shadow-blue-500/5">
                    <Layers className="w-4 h-4" />
                    All Ideas
                  </Link>
                  {categories.map(cat => (
                    <Link
                      key={cat.id}
                      href={`/categories/${cat.slug}`}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900/50 text-sm font-medium transition-all group"
                    >
                      <Sparkles className="w-4 h-4 text-slate-600 group-hover:text-blue-500 transition-colors" />
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </section>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 space-y-4 shadow-2xl">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-white">For Builders</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Discover startup opportunities with real, validated demand. Stop guessing what users want.
                </p>
                <Button variant="outline" className="w-full text-xs h-9 border-slate-800">
                  Claim Opportunities
                </Button>
              </div>
            </div>
          </aside>

          {/* Feed */}
          <div className="lg:col-span-3 space-y-10">
            <div className="flex items-center justify-between border-b border-slate-800/50 pb-0">
              <div className="flex gap-8">
                <button
                  onClick={() => setActiveTab('trending')}
                  className={cn(
                    "flex items-center gap-2 text-sm font-bold transition-all pb-4 relative",
                    activeTab === 'trending' ? "text-white" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  <TrendingUp className={cn("w-4 h-4", activeTab === 'trending' && "text-blue-500")} />
                  Trending
                  {activeTab === 'trending' && (
                    <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('new')}
                  className={cn(
                    "flex items-center gap-2 text-sm font-bold transition-all pb-4 relative",
                    activeTab === 'new' ? "text-white" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  <Sparkles className={cn("w-4 h-4", activeTab === 'new' && "text-blue-500")} />
                  Newest
                  {activeTab === 'new' && (
                    <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                  )}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => <WantCardSkeleton key={i} />)}
              </div>
            ) : wants.length > 0 ? (
              <FadeIn>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {wants.map((want, i) => (
                    <WantCard key={want.id} want={want} index={i} />
                  ))}
                </div>
              </FadeIn>
            ) : (
              <div className="text-center py-32 rounded-3xl border border-dashed border-slate-800">
                <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Ghost className="w-8 h-8 text-slate-700" />
                </div>
                <p className="text-slate-500 font-medium mb-6 text-lg">No ideas found. Be the first to post!</p>
                <Link href="/wants/create">
                  <Button variant="outline">Post an Idea</Button>
                </Link>
              </div>
            )}
          </div>
        </main>
      </PageTransition>
    </>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-blue-500/30">
      <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
        <HomeContent />
      </Suspense>
    </div>
  );
}
