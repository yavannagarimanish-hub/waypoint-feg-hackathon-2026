import {
  UserProfile,
  UserAchievement,
  LoginStreak,
  RoomParticipant,
  RoomLeaderboardEntry,
  RoomPrediction,
} from '../types/social';

export const STORAGE_KEY_USER = 'waypoint_prototype_user';
export const STORAGE_KEY_AUTH = 'waypoint_auth_session';
export const STORAGE_KEY_ACCOUNTS = 'waypoint_prototype_accounts';
export const STORAGE_KEY_STREAK = 'waypoint_prototype_streak';

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
let memoryAccountsFallback: Record<string, UserProfile> = {};
let memoryAuthSessionFallback: UserProfile | null = null;

export function _resetAuthForTesting(): void {
  memoryAccountsFallback = {};
  memoryAuthSessionFallback = null;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_AUTH);
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_ACCOUNTS);
    }
  } catch {}
}

/**
 * Validates email format
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const trimmed = (email || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Email address is required.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }
  return { valid: true };
}

/**
 * Validates password format for prototype interaction.
 * NOTE: Passwords are NEVER persisted or stored.
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.trim().length === 0) {
    return { valid: false, error: 'Password is required.' };
  }
  if (password.length < 4) {
    return { valid: false, error: 'Password must be at least 4 characters.' };
  }
  return { valid: true };
}

/**
 * Saves authenticated customer session to localStorage.
 */
export function saveAuthSession(user: UserProfile): void {
  memoryAuthSessionFallback = user;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    }
  } catch {}
}

/**
 * Retrieves active authenticated customer session from localStorage.
 */
export function getAuthSession(): UserProfile | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_AUTH) || localStorage.getItem(STORAGE_KEY_USER);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch {}
  return memoryAuthSessionFallback;
}

/**
 * Clears active authenticated customer session on logout.
 */
export function clearAuthSession(): void {
  memoryAuthSessionFallback = null;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_AUTH);
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  } catch {}
}

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
 * Looks up a prototype user by username or email from the accounts registry map.
 */
export function findPrototypeAccount(identifier: string): UserProfile | null {
  const accounts = getStoredPrototypeAccounts();
  const normalized = identifier.trim().toLowerCase();
  const allAccounts = { ...memoryAccountsFallback, ...accounts };
  const direct = allAccounts[normalized];
  if (direct) return direct;
  return Object.values(allAccounts).find(
    acc => (acc.email && acc.email.toLowerCase() === normalized) || acc.username.toLowerCase() === normalized
  ) || null;
}

/**
 * Authenticates into prototype account using email or username + password.
 * NOTE: Password is required for realistic UX interaction, but NEVER stored.
 */
export function authenticatePrototypeUser(
  emailOrUsername: string,
  password?: string
): { success: boolean; user?: UserProfile; error?: string } {
  const trimmed = (emailOrUsername || '').trim();
  if (!trimmed) {
    return { success: false, error: 'Email or username is required.' };
  }

  // If email was entered, validate syntax
  if (trimmed.includes('@')) {
    const emailCheck = validateEmail(trimmed);
    if (!emailCheck.valid) return { success: false, error: emailCheck.error };
  }

  // Validate password non-empty
  const passCheck = validatePassword(password || '');
  if (!passCheck.valid) {
    return { success: false, error: passCheck.error };
  }

  const defaultUser = createDefaultUser();
  const isDemoMatch =
    trimmed.toLowerCase() === defaultUser.email?.toLowerCase() ||
    trimmed.toLowerCase() === defaultUser.username.toLowerCase();

  const existing = findPrototypeAccount(trimmed) || (isDemoMatch ? defaultUser : null);
  const todayStr = new Date().toISOString().split('T')[0];

  if (existing) {
    const updatedStreak = calculateLoginStreak(existing.loginStreak, todayStr);
    const updatedUser: UserProfile = {
      ...existing,
      lastLoginAt: Date.now(),
      loginStreak: updatedStreak,
    };
    savePrototypeAccount(updatedUser);
    saveAuthSession(updatedUser);
    return { success: true, user: updatedUser };
  }

  // Auto-provision prototype profile for demo flexibility
  const cleanUsername = trimmed.includes('@')
    ? trimmed.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_')
    : trimmed.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');

  const newUser: UserProfile = {
    id: `usr-${cleanUsername}-${Math.random().toString(36).substring(2, 6)}`,
    username: cleanUsername,
    displayName: cleanUsername.charAt(0).toUpperCase() + cleanUsername.slice(1),
    email: trimmed.includes('@') ? trimmed.toLowerCase() : `${cleanUsername}@waypoint.psk`,
    avatar: '🦁',
    bio: 'Waypoint sportsbook customer.',
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
    loginStreak: {
      currentStreak: 1,
      longestStreak: 1,
      lastLoginDate: todayStr,
    },
    stats: {
      roomsParticipated: 1,
      roomsCreated: 0,
      predictionsMade: 0,
      predictionsCorrect: 0,
      roomWins: 0,
      totalPoints: 10,
    },
    achievements: [INITIAL_ACHIEVEMENTS[0]],
  };

  savePrototypeAccount(newUser);
  saveAuthSession(newUser);
  return { success: true, user: newUser };
}

/**
 * Registers a new prototype customer profile.
 * NOTE: Password is confirmed and validated, but NEVER stored.
 */
export function registerPrototypeUser(
  name: string,
  email: string,
  password?: string,
  confirmPassword?: string
): { success: boolean; user?: UserProfile; error?: string } {
  const trimmedName = (name || '').trim();
  if (!trimmedName || trimmedName.length < 2) {
    return { success: false, error: 'Name must be at least 2 characters.' };
  }

  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) return { success: false, error: emailCheck.error };

  const passCheck = validatePassword(password || '');
  if (!passCheck.valid) return { success: false, error: passCheck.error };

  if (password !== confirmPassword) {
    return { success: false, error: 'Passwords do not match.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');

  if (findPrototypeAccount(cleanEmail) || findPrototypeAccount(cleanUsername)) {
    return { success: false, error: 'An account with this email is already registered.' };
  }

  const todayStr = new Date().toISOString().split('T')[0];

  const newUser: UserProfile = {
    id: `usr-${cleanUsername}-${Math.random().toString(36).substring(2, 6)}`,
    username: cleanUsername,
    displayName: trimmedName,
    email: cleanEmail,
    avatar: '🦁',
    bio: 'Waypoint sportsbook customer.',
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
    loginStreak: {
      currentStreak: 1,
      longestStreak: 1,
      lastLoginDate: todayStr,
    },
    stats: {
      roomsParticipated: 1,
      roomsCreated: 0,
      predictionsMade: 0,
      predictionsCorrect: 0,
      roomWins: 0,
      totalPoints: 10,
    },
    achievements: [INITIAL_ACHIEVEMENTS[0]],
  };

  savePrototypeAccount(newUser);
  saveAuthSession(newUser);
  return { success: true, user: newUser };
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
    email: 'luka.fan@waypoint.psk',
    avatar: '🦁',
    bio: 'Tactical football follower. Watching UEFA Champions League & Nations League.',
    createdAt: Date.now() - 86400000 * 5,
    lastLoginAt: Date.now(),
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
