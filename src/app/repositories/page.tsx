'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { Star, GitFork, ExternalLink, GitBranch, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageTransition, SlideIn, FadeIn } from '@/components/ui/Motion';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  owner: {
    avatar_url: string;
    login: string;
  };
}

function RepositoriesContent() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrendingRepos() {
      try {
        // Fetching popular JS/TS repos as a proxy for trending inspiration
        const response = await fetch(
          'https://api.github.com/search/repositories?q=stars:>1000+language:typescript&sort=stars&order=desc&per_page=12'
        );
        const data = await response.json();
        setRepos(data.items || []);
      } catch (err) {
        console.error('Failed to fetch repositories:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTrendingRepos();
  }, []);

  return (
    <>
      <Navbar />

      <PageTransition>
        <header className="relative py-20 px-4 overflow-hidden border-b border-slate-800/50">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-blue-600/5 blur-[120px] pointer-events-none rounded-full" />

          <div className="max-w-7xl mx-auto relative z-10 text-center">
            <SlideIn direction="up">
              <Badge variant="premium" className="mb-6 px-4 py-1.5 uppercase tracking-widest">
                <GitBranch className="w-4 h-4 mr-2" />
                GitHub Trending
              </Badge>
              <h1 className="text-5xl md:text-6xl font-black text-white mb-6">
                Builder <span className="text-gradient">Inspiration</span>
              </h1>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
                Discover what the world is building right now. Top repositories to inspire your next GhostMarket project.
              </p>
            </SlideIn>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-16">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <p className="text-slate-500 font-medium animate-pulse">Scanning the horizons...</p>
            </div>
          ) : (
            <FadeIn>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {repos.map((repo, i) => (
                  <SlideIn key={repo.id} delay={i * 0.05}>
                    <Card className="h-full flex flex-col group border-slate-800/50 hover:border-blue-500/30 transition-all duration-300 p-6">
                      <div className="flex items-center gap-4 mb-6">
                        <Image
                          src={repo.owner.avatar_url}
                          alt={repo.owner.login}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-xl border border-slate-800 shadow-xl"
                        />
                        <div className="min-w-0">
                          <h3 className="font-black text-white text-lg truncate group-hover:text-blue-400 transition-colors">
                            {repo.name}
                          </h3>
                          <p className="text-xs text-slate-500 font-bold truncate">@{repo.owner.login}</p>
                        </div>
                      </div>

                      <p className="text-slate-400 text-sm line-clamp-3 mb-8 flex-1 leading-relaxed">
                        {repo.description || "No description provided."}
                      </p>

                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Star className="w-4 h-4 text-yellow-500/80" />
                            <span className="text-sm font-bold">{(repo.stargazers_count / 1000).toFixed(1)}k</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <GitFork className="w-4 h-4 text-blue-500/80" />
                            <span className="text-sm font-bold">{(repo.forks_count / 1000).toFixed(1)}k</span>
                          </div>
                        </div>

                        {repo.language && (
                          <Badge variant="outline" className="border-slate-800 text-[10px]">
                            {repo.language}
                          </Badge>
                        )}
                      </div>

                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-6"
                      >
                        <Button variant="secondary" className="w-full h-11 rounded-xl group/btn">
                          View Repository
                          <ExternalLink className="w-4 h-4 ml-2 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                        </Button>
                      </a>
                    </Card>
                  </SlideIn>
                ))}
              </div>
            </FadeIn>
          )}

          <div className="mt-20 p-12 rounded-3xl bg-gradient-to-br from-slate-900 to-blue-950/20 border border-slate-800 text-center">
            <h2 className="text-3xl font-black text-white mb-4">See a tech stack you love?</h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              Combine trending technologies with unmet GhostMarket demand to build the next big thing.
            </p>
            <Link href="/wants/create">
              <Button variant="premium" size="lg" className="px-12">
                Post an Idea
              </Button>
            </Link>
          </div>
        </main>
      </PageTransition>
    </>
  );
}

export default function RepositoriesPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
        <RepositoriesContent />
      </Suspense>
    </div>
  );
}
