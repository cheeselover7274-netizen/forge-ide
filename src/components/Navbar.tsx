'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, Plus, User as UserIcon, LogOut, Menu, X, Ghost, GitBranch } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/');
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-blue-600/20">
            <Ghost className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-black tracking-tighter text-white hidden sm:block">
            GhostMarket
          </span>
        </Link>

        {/* Search - Desktop */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search the future..."
            className="pl-10 h-10 bg-slate-900/50 border-slate-800 focus:ring-blue-500/50"
          />
        </form>

        {/* Desktop Nav Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/repositories">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-2">
              <GitBranch className="w-4 h-4" />
              Trends
            </Button>
          </Link>
          {user ? (
            <>
              <Link href="/wants/create">
                <Button variant="premium" size="sm" className="gap-2 px-5">
                  <Plus className="w-4 h-4" />
                  Post Idea
                </Button>
              </Link>
              <div className="h-6 w-px bg-slate-800 mx-2" />
              <Link
                href={`/profile/${user.user_metadata?.username || user.id}`}
                className={cn(
                  "w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 hover:border-blue-500 transition-colors",
                  pathname.includes('/profile') && "border-blue-500 ring-2 ring-blue-500/20"
                )}
              >
                <UserIcon className="w-4 h-4 text-slate-300" />
              </Link>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-red-400">
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-slate-300">Login</Button>
              </Link>
              <Link href="/signup">
                <Button variant="default" size="sm">Get Started</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 text-slate-400"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-slate-800 bg-slate-950 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="pl-10"
                />
              </form>
              {user ? (
                <div className="grid grid-cols-1 gap-2">
                  <Link href="/wants/create" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="premium" className="w-full">Post Idea</Button>
                  </Link>
                  <Link href={`/profile/${user.user_metadata?.username}`} onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">My Profile</Button>
                  </Link>
                  <Button variant="ghost" onClick={handleLogout} className="w-full text-red-400">Logout</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">Login</Button>
                  </Link>
                  <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="default" className="w-full">Sign Up</Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
