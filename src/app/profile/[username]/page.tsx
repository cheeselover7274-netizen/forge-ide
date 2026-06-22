'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { Profile, Want } from '@/types/database';
import { Loader2, User as UserIcon, Calendar, ThumbsUp, Layers, Link as LinkIcon, MessageSquare } from 'lucide-react';
import { formatDate } from '@/lib/format';
import WantCard from '@/components/WantCard';
import Link from 'next/link';

export default function ProfilePage() {
  const { username } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wants, setWants] = useState<Want[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (profileData) {
        setProfile(profileData);

        const { data: wantData } = await supabase
          .from('wants')
          .select('*, profiles(*), categories(*)')
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: false });

        if (wantData) setWants(wantData);
      }
      setLoading(false);
    }
    fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">User not found</h1>
        <Link href="/" className="text-blue-500 hover:underline">Go back home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white pb-20">
      <nav className="border-b border-[#30363D] bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-xl">👻</span>
            </div>
            <span className="text-xl font-black tracking-tighter">GhostMarket</span>
          </Link>
        </div>
      </nav>

      <div className="bg-[#161B22] border-b border-[#30363D]">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center border-4 border-[#0B0F19] shadow-2xl overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-16 h-16 text-white" />
              )}
            </div>
            <div className="flex-1 text-center md:text-left space-y-2">
              <h1 className="text-4xl font-black">{profile.username}</h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {formatDate(profile.created_at)}</span>
                </div>
                {profile.website && (
                  <a href={profile.website} target="_blank" className="flex items-center gap-1.5 hover:text-white">
                    <LinkIcon className="w-4 h-4" />
                    <span>{profile.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
              </div>
              <p className="text-gray-300 max-w-2xl mx-auto md:mx-0 pt-2">
                {profile.bio || "No bio yet."}
              </p>
            </div>
            <div className="flex gap-4">
               <div className="bg-[#0B0F19] border border-[#30363D] rounded-xl px-6 py-3 text-center">
                  <div className="text-xl font-bold">{profile.total_support_received}</div>
                  <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Support Received</div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center gap-2 mb-8 text-gray-400">
          <Layers className="w-5 h-5" />
          <h2 className="text-lg font-bold">Ideas Posted ({wants.length})</h2>
        </div>

        {wants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wants.map(want => (
              <WantCard key={want.id} want={want} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-[#161B22] border border-[#30363D] rounded-2xl">
            <p className="text-gray-400">This user hasn&apos;t posted any ideas yet.</p>
          </div>
        )}
      </main>
    </div>
  );
}
