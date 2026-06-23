'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { Want, Comment } from '@/types/database';
import {
  MessageSquare, ThumbsUp, User as UserIcon, Calendar,
  DollarSign, ArrowLeft, MoreVertical, Trash, Edit, TrendingUp, BarChart3, Info
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/format';
import { Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageTransition, SlideIn } from '@/components/ui/Motion';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
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
  const [showOptions, setShowOptions] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const { data: wantData } = await supabase
        .from('wants')
        .select('*, profiles(*), categories(*)')
        .eq('id', id)
        .single();

      if (wantData) {
        setWant(wantData);
        if (user) {
          const { data: supportData } = await supabase
            .from('supports')
            .select('*')
            .eq('user_id', user.id)
            .eq('want_id', id)
            .single();
          setHasSupported(!!supportData);
        }
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
      toast.success('Demand removed');
    } else {
      await supabase.from('supports').insert([{ user_id: user.id, want_id: id }]);
      setWant(prev => prev ? { ...prev, support_count: prev.support_count + 1 } : null);
      toast.success('Demand joined!');
    }
    setHasSupported(!hasSupported);
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !commentText.trim()) return;

    setSubmittingComment(true);
    const { data } = await supabase
      .from('comments')
      .insert([{ user_id: user.id, want_id: id, content: commentText }])
      .select('*, profiles(*)')
      .single();

    if (data) {
      setComments(prev => [data, ...prev]);
      setCommentText('');
      setWant(prev => prev ? { ...prev, comment_count: prev.comment_count + 1 } : null);
      toast.success('Comment posted');
    }
    setSubmittingComment(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this idea?')) return;
    const { error } = await supabase.from('wants').delete().eq('id', id);
    if (!error) {
      toast.success('Idea deleted');
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!want) return <div className="text-center py-20">Idea not found.</div>;

  const isOwner = user?.id === want.user_id;
  const potentialRevenue = (want.price_id_pay || 0) * want.support_count;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Navbar />

      <PageTransition>
        <main className="max-w-7xl mx-auto px-4 py-12 lg:grid lg:grid-cols-12 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-12">
            <header className="space-y-6">
              <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> Back to marketplace
              </Link>

              <div className="flex flex-wrap gap-3">
                {want.categories && <Badge variant="premium" className="px-3 py-1">{want.categories.name}</Badge>}
                {want.tags.map(tag => <Badge key={tag} variant="outline" className="px-3 py-1">#{tag}</Badge>)}
              </div>

              <div className="flex justify-between items-start gap-4">
                <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">{want.title}</h1>
                {isOwner && (
                  <div className="relative">
                    <Button variant="ghost" size="icon" onClick={() => setShowOptions(!showOptions)} className="text-slate-400">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                    {showOptions && (
                      <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50 overflow-hidden">
                        <Link href={`/wants/${id}/edit`} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
                          <Edit className="w-4 h-4" /> Edit Idea
                        </Link>
                        <button onClick={handleDelete} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-slate-800 transition-colors text-left">
                          <Trash className="w-4 h-4" /> Delete Idea
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6 text-sm text-slate-500">
                <Link href={`/profile/${want.profiles?.username}`} className="flex items-center gap-2.5 hover:text-white transition-colors group">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center relative overflow-hidden">
                    {want.profiles?.avatar_url ? <Image src={want.profiles.avatar_url} alt={want.profiles.username} fill className="object-cover" /> : <UserIcon className="w-4 h-4 text-white" />}
                  </div>
                  <span className="font-bold">{want.profiles?.username}</span>
                </Link>
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {formatDate(want.created_at)}</div>
              </div>
            </header>

            <div className="space-y-8">
              <section className="prose prose-invert max-w-none">
                <p className="text-slate-300 text-xl leading-relaxed whitespace-pre-wrap">{want.description}</p>
              </section>

              {want.images.length > 0 && (
                <div className="grid grid-cols-1 gap-6">
                  {want.images.map((img, i) => (
                    <div key={i} className="relative aspect-video w-full rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
                      <Image src={img} alt="Product vision" fill className="object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <hr className="border-slate-800/50" />

            <section className="space-y-10">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black flex items-center gap-3">
                  <MessageSquare className="w-6 h-6 text-blue-500" /> Comments
                  <span className="text-slate-600 text-lg">({want.comment_count})</span>
                </h3>
              </div>

              <div className="bg-slate-900/30 p-1 rounded-2xl border border-slate-800/50">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={user ? "Join the conversation..." : "Login to comment"}
                  disabled={!user}
                  rows={4}
                  className="w-full bg-transparent border-none focus:ring-0 py-4 px-6 text-slate-200 resize-none disabled:opacity-50"
                />
                <div className="flex justify-between items-center p-3 border-t border-slate-800/50">
                  <span className="text-xs text-slate-500 px-3">Be kind and constructive</span>
                  <Button
                    onClick={handleComment}
                    disabled={submittingComment || !commentText.trim()}
                    size="sm"
                  >
                    {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post Comment'}
                  </Button>
                </div>
              </div>

              <div className="space-y-8">
                {comments.map(comment => (
                  <SlideIn key={comment.id}>
                    <div className="flex gap-5">
                      <Link href={`/profile/${comment.profiles?.username}`} className="flex-shrink-0">
                        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700 shadow-xl relative overflow-hidden">
                          {comment.profiles?.avatar_url ? <Image src={comment.profiles.avatar_url} alt={comment.profiles.username} fill className="object-cover" /> : <UserIcon className="w-6 h-6 text-slate-500" />}
                        </div>
                      </Link>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-black text-sm text-white">{comment.profiles?.username}</span>
                          <span className="text-xs text-slate-600">•</span>
                          <span className="text-xs text-slate-500 font-medium">{formatDate(comment.created_at)}</span>
                        </div>
                        <p className="text-slate-300 text-base leading-relaxed bg-slate-900/50 p-4 rounded-2xl border border-slate-800/30">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  </SlideIn>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar Analytics */}
          <aside className="lg:col-span-4 space-y-8 mt-12 lg:mt-0">
            <div className="sticky top-28 space-y-8">
              <Card className="p-8 space-y-8 border-slate-800 bg-slate-900/50 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Support Score</span>
                    <div className="text-5xl font-black text-white">{want.support_count}</div>
                  </div>
                  <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                    <TrendingUp className="w-8 h-8 text-blue-500" />
                  </div>
                </div>

                <Button
                  variant={hasSupported ? "outline" : "premium"}
                  size="lg"
                  className={cn("w-full h-16 rounded-2xl text-lg font-black gap-3", hasSupported && "bg-slate-900 border-slate-800")}
                  onClick={toggleSupport}
                >
                  <ThumbsUp className={cn("w-6 h-6", hasSupported && "fill-current")} />
                  {hasSupported ? 'Supported' : 'I Want This'}
                </Button>

                <div className="space-y-6 pt-6 border-t border-slate-800/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Target Price</span>
                    </div>
                    <span className="text-2xl font-black text-green-400">{formatCurrency(want.price_id_pay || 0)}</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-500 uppercase tracking-widest">Market Value</span>
                      <span className="text-white text-lg">{formatCurrency(potentialRevenue)}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (want.support_count / 1000) * 100)}%` }}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-600 font-bold uppercase">
                      <span>Launch Target</span>
                      <span>1,000 Supporters</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 flex gap-4">
                  <Info className="w-5 h-5 text-blue-500 shrink-0" />
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Higher demand scores attract builders. Share this idea to reach the 1k milestone faster.
                  </p>
                </div>
              </Card>

              <Card className="p-6 border-slate-800 bg-slate-900/50 space-y-4">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Insights
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-500 mb-1">Growth</div>
                    <div className="text-sm font-bold text-green-400">+12%</div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-500 mb-1">Activity</div>
                    <div className="text-sm font-bold text-blue-400">High</div>
                  </div>
                </div>
              </Card>
            </div>
          </aside>
        </main>
      </PageTransition>
    </div>
  );
}
