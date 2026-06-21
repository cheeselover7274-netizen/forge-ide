'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { Want, Comment, Profile } from '@/types/database';
import { Loader2, MessageSquare, Share2, ThumbsUp, User as UserIcon, Calendar, Tag, DollarSign, ArrowLeft, MoreVertical, Trash, Edit } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/format';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function WantDetailPage() {
  const { id } = useParams();
  const [want, setWant] = useState<Want | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [hasSupported, setHasSupported] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      // 1. Get user
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // 2. Get Want details
      const { data: wantData } = await supabase
        .from('wants')
        .select('*, profiles(*), categories(*)')
        .eq('id', id)
        .single();

      if (wantData) {
        setWant(wantData);

        // 3. Check if user supported
        if (user) {
          const { data: supportData } = await supabase
            .from('supports')
            .select('*')
            .eq('user_id', user.id)
            .eq('want_id', id)
            .single();
          setHasSupported(!!supportData);
        }

        // 4. Get comments
        const { data: commentData } = await supabase
          .from('comments')
          .select('*, profiles(*)')
          .eq('want_id', id)
          .order('created_at', { ascending: false });

        if (commentData) setComments(commentData);
      }
      setLoading(false);
    }
    fetchData();
  }, [id]);

  const toggleSupport = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (hasSupported) {
      await supabase.from('supports').delete().eq('user_id', user.id).eq('want_id', id);
      setWant(prev => prev ? { ...prev, support_count: prev.support_count - 1 } : null);
    } else {
      await supabase.from('supports').insert([{ user_id: user.id, want_id: id }]);
      setWant(prev => prev ? { ...prev, support_count: prev.support_count + 1 } : null);
    }
    setHasSupported(!hasSupported);
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !commentText.trim()) return;

    setSubmittingComment(true);
    const { data, error } = await supabase
      .from('comments')
      .insert([
        { user_id: user.id, want_id: id, content: commentText }
      ])
      .select('*, profiles(*)')
      .single();

    if (data) {
      setComments(prev => [data, ...prev]);
      setCommentText('');
      setWant(prev => prev ? { ...prev, comment_count: prev.comment_count + 1 } : null);
    }
    setSubmittingComment(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!want) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Want not found</h1>
        <Link href="/" className="text-blue-500 hover:underline">Go back home</Link>
      </div>
    );
  }

  const [showOptions, setShowOptions] = useState(false);
  const isOwner = user?.id === want.user_id;

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this idea?')) return;
    const { error } = await supabase.from('wants').delete().eq('id', id);
    if (!error) router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white pb-20">
      <nav className="border-b border-[#30363D] bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Home</span>
          </Link>
          <div className="flex gap-2">
            <button className="p-2 text-gray-400 hover:text-white transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setShowOptions(!showOptions)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {showOptions && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl py-2 z-50">
                    <Link href={`/wants/${id}/edit`} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-[#0B0F19] transition-colors">
                      <Edit className="w-4 h-4" /> Edit Idea
                    </Link>
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-[#0B0F19] transition-colors"
                    >
                      <Trash className="w-4 h-4" /> Delete Idea
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 pt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Details */}
        <div className="md:col-span-2 space-y-8">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {want.categories && (
                <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-xs font-bold border border-blue-500/20">
                  {want.categories.name}
                </span>
              )}
              {want.tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-[#161B22] text-gray-400 rounded-full text-xs border border-[#30363D]">
                  #{tag}
                </span>
              ))}
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">{want.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <Link href={`/profile/${want.profiles?.username}`} className="flex items-center gap-2 hover:text-white transition-colors">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-[10px]">
                  {want.profiles?.avatar_url ? <img src={want.profiles.avatar_url} className="rounded-full" /> : <UserIcon className="w-3 h-3 text-white" />}
                </div>
                <span>{want.profiles?.username}</span>
              </Link>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(want.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">
              {want.description}
            </p>
          </div>

          {want.images.length > 0 && (
            <div className="grid grid-cols-1 gap-4">
              {want.images.map((img, i) => (
                <img key={i} src={img} alt="Want visual" className="rounded-xl border border-[#30363D] w-full" />
              ))}
            </div>
          )}

          <hr className="border-[#30363D]" />

          <section className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              Comments ({want.comment_count})
            </h3>

            <form onSubmit={handleComment} className="space-y-4">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={user ? "What do you think of this idea?" : "Login to join the conversation"}
                disabled={!user}
                rows={3}
                className="w-full bg-[#161B22] border border-[#30363D] rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500 transition-colors resize-none disabled:opacity-50"
              />
              {user && (
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingComment || !commentText.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {submittingComment && <Loader2 className="w-4 h-4 animate-spin" />}
                    Post Comment
                  </button>
                </div>
              )}
            </form>

            <div className="space-y-6">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-4">
                  <div className="w-10 h-10 bg-[#161B22] rounded-full flex-shrink-0 flex items-center justify-center border border-[#30363D]">
                    {comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} className="rounded-full" /> : <UserIcon className="w-5 h-5 text-gray-500" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{comment.profiles?.username}</span>
                      <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Sidebar Actions */}
        <div className="space-y-6">
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 sticky top-24 space-y-6">
            <div className="space-y-2 text-center">
              <div className="text-4xl font-black text-white">{want.support_count}</div>
              <div className="text-sm font-medium text-gray-400 uppercase tracking-widest">Supporters</div>
            </div>

            <button
              onClick={toggleSupport}
              className={cn(
                "w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3",
                hasSupported
                  ? "bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20"
              )}
            >
              <ThumbsUp className={cn("w-6 h-6", hasSupported && "fill-current")} />
              {hasSupported ? 'Following Demand' : 'I Want This'}
            </button>

            {want.price_id_pay && (
              <div className="bg-[#0B0F19] rounded-xl p-4 border border-[#30363D] flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <DollarSign className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase">Price I&apos;d Pay</span>
                </div>
                <div className="text-xl font-bold text-green-400">
                  {formatCurrency(want.price_id_pay)}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[#30363D] space-y-4">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Potential Demand</span>
                <span className="text-white font-bold">{formatCurrency((want.price_id_pay || 0) * want.support_count)}</span>
              </div>
              <div className="w-full bg-[#30363D] h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full" style={{ width: '65%' }}></div>
              </div>
              <p className="text-[10px] text-center text-gray-500">
                When 1,000 people support this, we&apos;ll notify relevant manufacturers.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
