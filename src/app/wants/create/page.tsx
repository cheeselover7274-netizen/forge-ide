'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, ArrowLeft } from 'lucide-react';
import ImageUpload, { ImageUploadRef } from '@/components/ImageUpload';
import { Category } from '@/types/database';
import Link from 'next/link';

export default function CreateWantPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [tags, setTags] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCategories, setFetchingCategories] = useState(true);
  const router = useRouter();
  const imageUploadRef = useRef<ImageUploadRef>(null);

  useEffect(() => {
    async function getCategories() {
      const { data } = await supabase.from('categories').select('*');
      if (data) setCategories(data);
      setFetchingCategories(false);
    }
    getCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      // 2. Trigger image upload if any
      const imageUrls = await imageUploadRef.current?.upload() || [];

      // 3. Create the Want
      const { data, error } = await supabase.from('wants').insert([
        {
          user_id: user.id,
          title,
          description,
          category_id: categoryId || null,
          price_id_pay: price ? parseFloat(price) : null,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          images: imageUrls,
        }
      ]).select();

      if (error) {
        alert(error.message);
      } else if (data) {
        router.push(`/wants/${data[0].id}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create want. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white pb-20">
      <nav className="border-b border-[#30363D] bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </Link>
          <h1 className="font-bold text-lg">Post a Want</h1>
          <div className="w-20"></div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 pt-10">
        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-blue-500">
              <span className="bg-blue-500/10 p-1.5 rounded-lg">1</span>
              What do you wish existed?
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

          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-blue-500">
              <span className="bg-blue-500/10 p-1.5 rounded-lg">3</span>
              Visuals (Optional)
            </h2>
            <div className="bg-[#161B22] p-6 rounded-xl border border-[#30363D]">
              <ImageUpload ref={imageUploadRef} />
            </div>
          </section>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 text-lg"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
              <>
                <Plus className="w-6 h-6" />
                Post My Idea
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
