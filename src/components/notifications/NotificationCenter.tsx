import React, { useState, useRef, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import { Bell, Check, X, Shield, ArrowRight, Radio, Compass, RefreshCw } from 'lucide-react';

export const NotificationCenter: React.FC = () => {
  const {
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
    selectEvent,
    joinRoom,
    joinCustomRoom,
    events,
    rooms,
    emitEvent,
  } = useSession();

  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Emit NOTIFICATION_SHOWN when panel is opened with notifications
  const handleToggle = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && notifications.length > 0) {
      emitEvent('NOTIFICATION_SHOWN', { count: notifications.length, unread: unreadNotificationCount });
    }
  };

  const handleNotificationClick = (id: string, fixtureId?: string, roomId?: string) => {
    markNotificationRead(id);

    if (fixtureId) {
      const match = events.find(e => e.id === fixtureId);
      if (match) {
        selectEvent(match);
      }
    }

    if (roomId) {
      const customRoom = rooms.find(r => r.roomId === roomId);
      if (customRoom) {
        joinCustomRoom(customRoom);
      } else if (fixtureId) {
        const fixture = events.find(e => e.id === fixtureId);
        if (fixture) {
          joinRoom(fixture);
        }
      }
    }

    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={panelRef}>
      {/* In-App Notification Bell Button */}
      <button
        onClick={handleToggle}
        title="Waypoint In-App Notifications"
        aria-label="Contextual notifications"
        className="relative p-2 rounded-lg bg-[#1447a6] hover:bg-[#113a88] border border-blue-400/40 text-blue-100 hover:text-white transition flex items-center justify-center"
      >
        <Bell className="w-4 h-4" />
        {unreadNotificationCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#ffd000] text-slate-950 font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse">
            {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#15151e] border border-[#2d2d40] rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col text-zinc-200 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="px-4 py-3 bg-[#1a1a26] border-b border-[#2d2d40] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                Contextual Notifications
              </h3>
            </div>
            {unreadNotificationCount > 0 && (
              <button
                onClick={() => markAllNotificationsRead()}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold transition"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#202030]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 flex flex-col items-center gap-2">
                <Bell className="w-6 h-6 opacity-30" />
                <span className="text-xs">No notifications yet</span>
                <span className="text-[11px] text-zinc-600">
                  Updates will appear as you explore matches and live rooms.
                </span>
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  className={`p-3 text-xs flex items-start justify-between gap-3 transition cursor-pointer hover:bg-[#1f1f30] ${
                    notif.read ? 'bg-transparent text-zinc-400' : 'bg-[#181824] text-zinc-100 font-medium'
                  }`}
                  onClick={() => handleNotificationClick(notif.id, notif.fixtureId, notif.roomId)}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        notif.read ? 'bg-zinc-700' : 'bg-[#ffd000]'
                      }`}
                    />
                    <div className="flex flex-col gap-1 min-w-0">
                      <p className="text-xs leading-snug">{notif.text}</p>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                        <span className="uppercase text-[9px] font-bold px-1 rounded bg-[#252538] text-zinc-400">
                          {notif.category}
                        </span>
                        <span>{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissNotification(notif.id);
                    }}
                    title="Dismiss"
                    className="text-zinc-500 hover:text-zinc-300 p-1 shrink-0 rounded transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Responsible Intelligence Disclosure Footer */}
          <div className="px-3 py-2 bg-[#12121a] border-t border-[#242436] text-[10px] text-zinc-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" />
              Responsible Intelligence Guarded
            </span>
            <span className="text-zinc-600">Local runtime</span>
          </div>
        </div>
      )}
    </div>
  );
};
