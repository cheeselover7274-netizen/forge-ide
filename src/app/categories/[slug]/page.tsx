'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import { Want, Category } from '@/types/database';
import { Loader2, ArrowLeft, Layers } from 'lucide-react';
import WantCard from '@/components/WantCard';
import Link from 'next/link';

export default function CategoryPage() {
  const { slug } = useParams();
  const [category, setCategory] = useState<Category | null>(null);
  const [wants, setWants] = useState<Want[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .single();

      if (catData) {
        setCategory(catData);

        const { data: wantData } = await supabase
          .from('wants')
          .select('*, profiles(*), categories(*)')
          .eq('category_id', catData.id)
          .order('support_count', { ascending: false });

        if (wantData) setWants(wantData);
      }
      setLoading(false);
    }
    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Category not found</h1>
        <Link href="/" className="text-blue-500 hover:underline">Go back home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white pb-20">
      <nav className="border-b border-[#30363D] bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>All Categories</span>
          </Link>
        </div>
      </nav>

      <header className="bg-[#161B22] border-b border-[#30363D] py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-4 mb-4">
             <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500 border border-blue-500/20">
                <Layers className="w-8 h-8" />
             </div>
             <h1 className="text-4xl font-black">{category.name}</h1>
          </div>
          <p className="text-gray-400 text-lg max-w-2xl">
            {category.description || `Browse all unmet demand for ${category.name.toLowerCase()}.`}
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {wants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wants.map(want => (
              <WantCard key={want.id} want={want} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-[#161B22] border border-[#30363D] rounded-2xl">
            <p className="text-gray-400">No ideas posted in this category yet.</p>
            <Link href="/wants/create" className="text-blue-500 hover:underline mt-4 inline-block font-bold">
              Be the first to post one →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
