'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { Category } from '@/types/database';
import Link from 'next/link';

export default function EditWantPage() {
  const { id } = useParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [tags, setTags] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      // Get categories
      const { data: catData } = await supabase.from('categories').select('*');
      if (catData) setCategories(catData);

      // Get want
      const { data: wantData } = await supabase
        .from('wants')
        .select('*')
        .eq('id', id)
        .single();

      if (wantData) {
        setTitle(wantData.title);
        setDescription(wantData.description);
        setCategoryId(wantData.category_id || '');
        setPrice(wantData.price_id_pay?.toString() || '');
        setTags(wantData.tags?.join(', ') || '');

        // Check if user is owner
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.id !== wantData.user_id) {
          router.push(`/wants/${id}`);
        }
      }
      setLoading(false);
    }
    fetchData();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 1. Update the Want
      const { error } = await supabase.from('wants').update({
        title,
        description,
        category_id: categoryId || null,
        price_id_pay: price ? parseFloat(price) : null,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        updated_at: new Date().toISOString(),
      }).eq('id', id);

      if (error) {
        alert(error.message);
      } else {
        router.push(`/wants/${id}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update want. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white pb-20">
      <nav className="border-b border-[#30363D] bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={`/wants/${id}`} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Cancel</span>
          </Link>
          <h1 className="font-bold text-lg">Edit Your Idea</h1>
          <div className="w-20"></div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 pt-10">
        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-blue-500">
              <span className="bg-blue-500/10 p-1.5 rounded-lg">1</span>
              Update your vision
            </h2>
            <div className="space-y-4 bg-[#161B22] p-6 rounded-xl border border-[#30363D]">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. A device that automatically folds laundry"
                  className="w-full bg-[#0B0F19] border border-[#30363D] rounded-lg py-2.5 px-4 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={5}
                  placeholder="Describe what it is, why it should exist, and who it's for..."
                  className="w-full bg-[#0B0F19] border border-[#30363D] rounded-lg py-2.5 px-4 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-blue-500">
              <span className="bg-blue-500/10 p-1.5 rounded-lg">2</span>
              Details & Value
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#161B22] p-6 rounded-xl border border-[#30363D]">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-[#30363D] rounded-lg py-2.5 px-4 focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                >
                  <option value="">Select a category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Price I&apos;d Pay (£)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 200"
                  className="w-full bg-[#0B0F19] border border-[#30363D] rounded-lg py-2.5 px-4 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. hardware, home, automation"
                  className="w-full bg-[#0B0F19] border border-[#30363D] rounded-lg py-2.5 px-4 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 text-lg"
          >
            {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : (
              <>
                <Save className="w-6 h-6" />
                Save Changes
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
