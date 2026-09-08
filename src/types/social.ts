// SOCIAL IDENTITY, PROFILES, LEADERBOARDS & ACHIEVEMENTS DATA MODELS

export interface UserStats {
  roomsParticipated: number;
  roomsCreated: number;
  predictionsMade: number;
  predictionsCorrect: number;
  roomWins: number;
  totalPoints: number;
}

export interface UserAchievement {
  id: string;
  title: string;
  description: string;
  icon: string; // emoji or icon identifier
  unlockedAt: number;
  category: 'social' | 'prediction' | 'streak' | 'easter_egg';
}

export interface LoginStreak {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string; // YYYY-MM-DD
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string; // URL, data URL, or preset id
  bio: string;
  createdAt: number;
  loginStreak: LoginStreak;
  stats: UserStats;
  achievements: UserAchievement[];
}

export interface RoomParticipant {
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  role: 'host' | 'participant';
  joinedAt: number;
  score: number;
  predictionsCount: number;
  correctCount: number;
  rank: number;
  streakDays: number;
  topBadge?: string;
}

export interface RoomLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  score: number; // calculated from prediction correct (+10) + participation (+1)
  correctPredictions: number;
  totalPredictions: number;
  accuracy: number; // 0 - 100%
  wins: number;
  topBadge?: string;
  isCurrentUser?: boolean;
}

export interface PredictionOption {
  id: string;
  text: string;
}

export interface RoomPrediction {
  id: string;
  roomId: string;
  eventId: string;
  question: string;
  options: PredictionOption[];
  status: 'OPEN' | 'RESOLVED' | 'CANCELLED';
  correctOptionId?: string;
  createdAt: number;
  resolvedAt?: number;
  userVotes?: Record<string, string>; // userId -> optionId
}
