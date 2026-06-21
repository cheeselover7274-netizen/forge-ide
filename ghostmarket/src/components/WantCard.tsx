'use client';

import { motion } from 'framer-motion';
import { Want } from '@/types/database';
import { ThumbsUp, MessageSquare, User as UserIcon, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/format';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

interface WantCardProps {
  want: Want;
  index?: number;
}

export default function WantCard({ want, index = 0 }: WantCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Card className="h-full flex flex-col group border-slate-800/50 hover:border-blue-500/30 transition-all duration-300">
        <Link href={`/wants/${want.id}`} className="flex-1 p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex flex-wrap gap-2">
              {want.categories && (
                <Badge variant="premium" className="text-[10px] uppercase tracking-wider px-2">
                  {want.categories.name}
                </Badge>
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">{formatDate(want.created_at)}</span>
          </div>

          <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors line-clamp-2">
            {want.title}
          </h3>
          <p className="text-slate-400 text-sm line-clamp-3 mb-6 leading-relaxed">
            {want.description}
          </p>

          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-slate-400">
                <ThumbsUp className="w-3.5 h-3.5" />
                <span className="text-sm font-bold">{want.support_count}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="text-sm font-bold">{want.comment_count}</span>
              </div>
            </div>

            {want.price_id_pay && (
              <div className="bg-green-500/10 text-green-400 px-2 py-1 rounded-md font-bold text-sm">
                £{want.price_id_pay}
              </div>
            )}
          </div>
        </Link>

        <div className="px-6 py-4 bg-slate-900/30 border-t border-slate-800/50 flex items-center justify-between">
          <Link href={`/profile/${want.profiles?.username}`} className="flex items-center gap-2.5 text-xs text-slate-400 hover:text-white transition-colors">
            <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
              <UserIcon className="w-3 h-3" />
            </div>
            <span className="font-medium">{want.profiles?.username}</span>
          </Link>
          <Link href={`/wants/${want.id}`} className="text-xs text-blue-500 font-bold hover:text-blue-400 flex items-center gap-1 group/link">
            Details <ArrowRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}
