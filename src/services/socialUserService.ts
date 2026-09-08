import {
  UserProfile,
  UserAchievement,
  LoginStreak,
  RoomParticipant,
  RoomLeaderboardEntry,
  RoomPrediction,
} from '../types/social';

const STORAGE_KEY_USER = 'waypoint_prototype_user';
const STORAGE_KEY_STREAK = 'waypoint_prototype_streak';

export const PRESET_AVATARS = [
  { id: 'psk-blue', label: '🔵 PSK Blue Champion', url: '/assets/avatars/avatar_blue.svg' },
  { id: 'psk-orange', label: '🟠 PSK Flame Tactician', url: '/assets/avatars/avatar_orange.svg' },
  { id: 'psk-yellow', label: '🟡 PSK Gold Maestro', url: '/assets/avatars/avatar_yellow.svg' },
  { id: 'psk-green', label: '🟢 PSK Defense Anchor', url: '/assets/avatars/avatar_green.svg' },
  { id: 'lion', label: '🦁 Lion Striker', url: '🦁' },
  { id: 'crown', label: '👑 Room Leader', url: '👑' },
];

export const INITIAL_ACHIEVEMENTS: UserAchievement[] = [
  {
    id: 'ach-welcome',
    title: 'FIRST STEP',
    description: 'Entered the Waypoint prototype arena.',
    icon: '🎯',
    unlockedAt: Date.now() - 86400000 * 2,
    category: 'social',
  },
];

export const CATALOG_ACHIEVEMENTS: Omit<UserAchievement, 'unlockedAt'>[] = [
  {
    id: 'ach-first-pred',
    title: 'FIRST PREDICTION',
    description: 'Make your first match prediction.',
    icon: '🏆',
    category: 'prediction',
  },
  {
    id: 'ach-football-expert',
    title: 'FOOTBALL EXPERT',
    description: 'Get 5 football predictions correct.',
    icon: '⚽',
    category: 'prediction',
  },
  {
    id: 'ach-consistent',
    title: 'CONSISTENT',
    description: 'Maintain a 5-day login streak.',
    icon: '🔥',
    category: 'streak',
  },
  {
    id: 'ach-room-champ',
    title: 'ROOM CHAMPION',
    description: 'Finish #1 in a room leaderboard.',
    icon: '👑',
    category: 'social',
  },
  {
    id: 'ach-sharp-eye',
    title: 'SHARP EYE',
    description: 'Get 3 predictions correct consecutively.',
    icon: '🎯',
    category: 'prediction',
  },
  {
    id: 'ach-first-room',
    title: 'FIRST ROOM',
    description: 'Create your first Live Match Room.',
    icon: '🎉',
    category: 'social',
  },
  {
    id: 'ach-host',
    title: 'HOST',
    description: 'Create 3 Live Match Rooms.',
    icon: '🤝',
    category: 'social',
  },
  {
    id: 'ach-first-action',
    title: 'FIRST ACTION',
    description: 'Your Waypoint journey has officially begun.',
    icon: '🎯',
    category: 'easter_egg',
  },
  {
    id: 'ach-lifeboat',
    title: 'LIFEBOAT ACTIVATED',
    description: 'Your action was protected.',
    icon: '🛟',
    category: 'easter_egg',
  },
  {
    id: 'ach-waypoint',
    title: 'WAYPOINT FOUND',
    description: 'The session found its way.',
    icon: '🧭',
    category: 'easter_egg',
  },
];

const STORAGE_KEY_ACCOUNTS = 'waypoint_prototype_accounts';

/**
 * Validates username format:
 * - 3 to 20 characters
 * - Letters, numbers, underscores only
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 20) {
    return {
      valid: false,
      error: 'Username must be 3 to 20 characters long.',
    };
  }
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(trimmed)) {
    return {
      valid: false,
      error: 'Username can only contain letters, numbers, and underscores.',
    };
  }
  return { valid: true };
}

// In-memory fallback map for non-browser / node test environments
const memoryAccountsFallback: Record<string, UserProfile> = {};

/**
 * Retrieves the prototype accounts registry map from localStorage.
 */
export function getStoredPrototypeAccounts(): Record<string, UserProfile> {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem) {
      const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch {}
  return { ...memoryAccountsFallback };
}

/**
 * Saves or updates a prototype user in the accounts registry map.
 */
export function savePrototypeAccount(user: UserProfile): void {
  const norm = user.username.toLowerCase();
  memoryAccountsFallback[norm] = user;
  try {
    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      const accounts = getStoredPrototypeAccounts();
      accounts[norm] = user;
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
    }
  } catch {}
}

/**
 * Looks up a prototype user by username from the accounts registry map.
 */
export function findPrototypeAccount(username: string): UserProfile | null {
  const accounts = getStoredPrototypeAccounts();
  const normalized = username.trim().toLowerCase();
  return accounts[normalized] || memoryAccountsFallback[normalized] || null;
}

/**
 * Calculates updated login streak based on consecutive calendar dates (YYYY-MM-DD).
 * Rule: Login streak depends ONLY on daily access. No wagers required.
 * Same-day login does not double-increment.
 */
export function calculateLoginStreak(
  currentStreak: LoginStreak,
  todayStr: string = new Date().toISOString().split('T')[0]
): LoginStreak {
  if (!currentStreak.lastLoginDate) {
    return {
      currentStreak: 1,
      longestStreak: 1,
      lastLoginDate: todayStr,
    };
  }

  if (currentStreak.lastLoginDate === todayStr) {
    // Already logged in today, do not increment
    return currentStreak;
  }

  const last = new Date(currentStreak.lastLoginDate);
  const today = new Date(todayStr);
  const diffDays = Math.round((today.getTime() - last.getTime()) / (1000 * 3600 * 24));

  if (diffDays === 1) {
    // Consecutive day
    const nextStreak = currentStreak.currentStreak + 1;
    return {
      currentStreak: nextStreak,
      longestStreak: Math.max(nextStreak, currentStreak.longestStreak),
      lastLoginDate: todayStr,
    };
  } else if (diffDays > 1) {
    // Streak broken naturally
    return {
      currentStreak: 1,
      longestStreak: currentStreak.longestStreak,
      lastLoginDate: todayStr,
    };
  }

  return currentStreak;
}

/**
 * Generates default prototype user.
 */
export function createDefaultUser(): UserProfile {
  const todayStr = new Date().toISOString().split('T')[0];
  return {
    id: 'usr-demo-01',
    username: 'luka_zg',
    displayName: 'Luka Modric Fan',
    avatar: '🦁',
    bio: 'Tactical football follower. Watching UEFA Champions League & Nations League.',
    createdAt: Date.now() - 86400000 * 5,
    loginStreak: {
      currentStreak: 5,
      longestStreak: 5,
      lastLoginDate: todayStr,
    },
    stats: {
      roomsParticipated: 4,
      roomsCreated: 1,
      predictionsMade: 8,
      predictionsCorrect: 6,
      roomWins: 2,
      totalPoints: 64,
    },
    achievements: [
      INITIAL_ACHIEVEMENTS[0],
      {
        id: 'ach-first-pred',
        title: 'FIRST PREDICTION',
        description: 'Make your first match prediction.',
        icon: '🏆',
        unlockedAt: Date.now() - 86400000 * 3,
        category: 'prediction',
      },
      {
        id: 'ach-consistent',
        title: 'CONSISTENT',
        description: 'Maintain a 5-day login streak.',
        icon: '🔥',
        unlockedAt: Date.now() - 86400000,
        category: 'streak',
      },
    ],
  };
}

/**
 * Calculates deterministic social points for leaderboard.
 * Formula: (correctPredictions * 10) + (totalPredictions * 1) + (isHost ? 2 : 0)
 * Non-monetary, strictly match knowledge & participation.
 */
export function calculateSocialScore(correct: number, total: number, isHost = false): number {
  return correct * 10 + total * 1 + (isHost ? 2 : 0);
}

/**
 * Generates initial deterministic mock participants for a room.
 */
export function getInitialRoomParticipants(currentUser: UserProfile, isHost: boolean): RoomParticipant[] {
  const currentScore = calculateSocialScore(
    currentUser.stats.predictionsCorrect,
    currentUser.stats.predictionsMade,
    isHost
  );

  const participants: RoomParticipant[] = [
    {
      userId: currentUser.id,
      username: currentUser.username,
      displayName: currentUser.displayName,
      avatar: currentUser.avatar,
      bio: currentUser.bio,
      role: isHost ? 'host' : 'participant',
      joinedAt: Date.now(),
      score: currentScore,
      predictionsCount: currentUser.stats.predictionsMade,
      correctCount: currentUser.stats.predictionsCorrect,
      rank: 2,
      streakDays: currentUser.loginStreak.currentStreak,
      topBadge: '🔥 ' + currentUser.loginStreak.currentStreak + 'd Streak',
    },
    {
      userId: 'usr-peer-rahul',
      username: 'rahul_99',
      displayName: 'Rahul Sharma',
      avatar: '👑',
      bio: 'Premier League enthusiast. Match momentum analyst.',
      role: isHost ? 'participant' : 'host',
      joinedAt: Date.now() - 1800000,
      score: 84,
      predictionsCount: 9,
      correctCount: 8,
      rank: 1,
      streakDays: 8,
      topBadge: '👑 Room Leader',
    },
    {
      userId: 'usr-peer-manish',
      username: 'manish_k',
      displayName: 'Manish Kumar',
      avatar: '⚽',
      bio: 'In-play stats and corner predictions.',
      role: 'participant',
      joinedAt: Date.now() - 1200000,
      score: 52,
      predictionsCount: 6,
      correctCount: 5,
      rank: 3,
      streakDays: 4,
      topBadge: '🎯 Sharp Eye',
    },
    {
      userId: 'usr-peer-priya',
      username: 'priya_tactics',
      displayName: 'Priya Patel',
      avatar: '🧙',
      bio: 'Midfield dynamics & defensive discipline.',
      role: 'participant',
      joinedAt: Date.now() - 600000,
      score: 33,
      predictionsCount: 4,
      correctCount: 3,
      rank: 4,
      streakDays: 3,
      topBadge: '🛡️ Tactician',
    },
  ];

  // Re-rank dynamically based on score descending
  participants.sort((a, b) => b.score - a.score);
  return participants.map((p, idx) => ({ ...p, rank: idx + 1 }));
}

/**
 * Builds deterministic RoomLeaderboard entries from participants.
 */
export function buildRoomLeaderboard(
  participants: RoomParticipant[],
  currentUserId: string
): RoomLeaderboardEntry[] {
  const sorted = [...participants].sort((a, b) => b.score - a.score);
  return sorted.map((p, index) => {
    const accuracy = p.predictionsCount > 0 ? Math.round((p.correctCount / p.predictionsCount) * 100) : 0;
    return {
      rank: index + 1,
      userId: p.userId,
      username: p.username,
      displayName: p.displayName,
      avatar: p.avatar,
      score: p.score,
      correctPredictions: p.correctCount,
      totalPredictions: p.predictionsCount,
      accuracy,
      wins: p.rank === 1 ? 1 : 0,
      topBadge: p.topBadge,
      isCurrentUser: p.userId === currentUserId,
    };
  });
}
