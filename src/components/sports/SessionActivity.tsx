import React from 'react';
import { loadSessionActivity } from '../../services/customerContextService';
import { History, Eye, CheckCircle2, ShieldAlert, Users, Radio, ChevronRight } from 'lucide-react';

function timeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export const SessionActivity: React.FC = () => {
  const activities = loadSessionActivity();

  if (activities.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#15151c] border border-[#242430] rounded p-3 shadow flex flex-col gap-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-[#1752bf]" />
          <h3 className="text-xs font-black uppercase tracking-wider text-white">
            SESSION ACTIVITY
          </h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-500">
          Last {activities.length} actions
        </span>
      </div>

      {/* Activity Timeline List */}
      <div className="flex flex-col divide-y divide-[#20202e]">
        {activities.map(act => {
          return (
            <div
              key={act.id}
              className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1752bf] shrink-0" />
                <span className="text-zinc-200 truncate font-medium">
                  {act.description}
                </span>
                {act.badge && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0">
                    {act.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] font-mono text-zinc-500 shrink-0 whitespace-nowrap">
                {timeAgo(act.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

