'use client';

import { Want } from '@/types/database';
import { ThumbsUp, MessageSquare, DollarSign, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/format';

interface WantCardProps {
  want: Want;
}

export default function WantCard({ want }: WantCardProps) {
  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden hover:border-blue-500/50 transition-all group">
      <Link href={`/wants/${want.id}`} className="block p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-wrap gap-2">
            {want.categories && (
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded text-[10px] font-bold uppercase tracking-wider">
                {want.categories.name}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">{formatDate(want.created_at)}</div>
        </div>

        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-500 transition-colors">
          {want.title}
        </h3>
        <p className="text-gray-400 text-sm line-clamp-2 mb-6">
          {want.description}
        </p>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-gray-400">
              <ThumbsUp className="w-4 h-4" />
              <span className="text-sm font-bold">{want.support_count}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-bold">{want.comment_count}</span>
            </div>
          </div>

          {want.price_id_pay && (
            <div className="flex items-center gap-1 text-green-400 font-bold">
              <span className="text-xs">£</span>
              <span>{want.price_id_pay}</span>
            </div>
          )}
        </div>
      </Link>

      <div className="px-6 py-3 bg-[#0B0F19]/50 border-t border-[#30363D] flex items-center justify-between">
        <Link href={`/profile/${want.profiles?.username}`} className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors">
          <div className="w-5 h-5 bg-[#30363D] rounded-full flex items-center justify-center">
            <UserIcon className="w-3 h-3" />
          </div>
          <span>{want.profiles?.username}</span>
        </Link>
        <Link href={`/wants/${want.id}`} className="text-xs text-blue-500 font-bold hover:underline">
          View Demand →
        </Link>
      </div>
    </div>
  );
}
