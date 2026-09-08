import React, { useState } from 'react';
import { useSession } from '../../context/SessionContext';
import { PRESET_AVATARS, validateUsername, findPrototypeAccount } from '../../services/socialUserService';
import {
  User,
  X,
  Flame,
  Trophy,
  Award,
  Calendar,
  LogOut,
  Upload,
  Check,
  Shield,
  Edit2,
  Lock,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenLogin,
}) => {
  const { user, updateUserProfile, logoutUser } = useSession();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || '🦁');
  const [isEditing, setIsEditing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
        <div className="bg-[#15151c] border border-[#2d2d3d] rounded-lg shadow-2xl max-w-sm w-full p-6 text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#1752bf]/20 border border-[#1752bf]/40 flex items-center justify-center text-blue-400">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Guest Session</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Create a prototype identity to participate in room leaderboards and track match predictions.
            </p>
          </div>
          <div className="flex gap-2 w-full pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded bg-[#20202b] text-xs font-bold text-zinc-300 hover:text-white transition"
            >
              Continue Guest
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenLogin();
              }}
              className="flex-1 py-2 rounded bg-[#1752bf] hover:bg-blue-600 text-xs font-bold text-white transition shadow"
            >
              Log In / Create
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      displayName: displayName.trim() || user.displayName,
      bio: bio.trim() || user.bio,
      avatar: selectedAvatar,
    });
    setIsEditing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setUploadError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    // Limit size to 500KB for prototype local storage safety
    if (file.size > 500 * 1024) {
      setUploadError('Image size exceeds 500KB limit for local prototype storage.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSelectedAvatar(result);
      updateUserProfile({ avatar: result });
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const accuracy =
    user.stats.predictionsMade > 0
      ? Math.round((user.stats.predictionsCorrect / user.stats.predictionsMade) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#15151c] border border-[#2d2d3d] rounded-lg shadow-2xl max-w-lg w-full overflow-hidden text-zinc-200">
        {/* Header Bar */}
        <div className="bg-[#1c1c25] px-4 py-3 border-b border-[#262635] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Waypoint Social Profile
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">• Prototype Identity</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-[#252533] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5 max-h-[80vh] overflow-y-auto">
          {/* Identity Card */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 bg-[#101015] border border-[#252533] p-4 rounded-lg">
            <div className="relative group shrink-0">
              <div className="w-16 h-16 rounded-full bg-[#1c1c27] border-2 border-[#ffd000] flex items-center justify-center text-3xl overflow-hidden shadow">
                {user.avatar.startsWith('data:') || user.avatar.startsWith('/') ? (
                  <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" />
                ) : (
                  <span>{user.avatar}</span>
                )}
              </div>
              <label
                htmlFor="avatar-upload"
                title="Upload custom picture"
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#1752bf] text-white flex items-center justify-center cursor-pointer shadow hover:bg-blue-500 transition"
              >
                <Upload className="w-3 h-3" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    {user.displayName}
                  </h3>
                  <span className="text-xs text-zinc-400 font-mono">@{user.username}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-950/40 border border-[#ffd000]/40 px-2.5 py-1 rounded text-xs font-bold text-[#ffd000]">
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>{user.loginStreak.currentStreak} Day Login Streak</span>
                </div>
              </div>

              <p className="text-xs text-zinc-300 mt-2 bg-[#171722] p-2 rounded border border-[#242435]">
                {user.bio}
              </p>

              {uploadError && (
                <p className="text-[11px] text-[#d01111] font-medium mt-1">{uploadError}</p>
              )}
            </div>
          </div>

          {/* Edit Profile Form / Preset Avatars */}
          {isEditing ? (
            <form onSubmit={handleSave} className="bg-[#121218] border border-[#252535] p-3 rounded flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 uppercase">Edit Profile</span>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-[11px] text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 font-bold">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full bg-[#1a1a24] border border-[#303045] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  maxLength={30}
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 font-bold">Short Bio</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={2}
                  className="w-full bg-[#1a1a24] border border-[#303045] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none resize-none"
                  maxLength={120}
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 font-bold">Preset Avatars</label>
                <div className="flex gap-2">
                  {PRESET_AVATARS.map(av => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setSelectedAvatar(av.url)}
                      className={
                        'w-9 h-9 rounded text-lg flex items-center justify-center border transition overflow-hidden p-1 ' +
                        (selectedAvatar === av.url
                          ? 'bg-[#1752bf]/30 border-[#ffd000] scale-105'
                          : 'bg-[#1a1a24] border-[#2d2d3d] hover:bg-[#252535]')
                      }
                    >
                      {av.url.startsWith('/') ? (
                        <img src={av.url} alt={av.label} className="w-full h-full object-contain" />
                      ) : (
                        <span>{av.url}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#1752bf] hover:bg-blue-600 text-white rounded text-xs font-bold"
                >
                  Save Profile
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-end">
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold"
              >
                <Edit2 className="w-3 h-3" />
                Edit Profile Info
              </button>
            </div>
          )}

          {/* Social Stats Matrix */}
          <div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">
              Match Knowledge & Social Stats
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-[#101015] border border-[#252533] p-2.5 rounded flex flex-col">
                <span className="text-[10px] text-zinc-500 font-bold uppercase">Accuracy</span>
                <span className="text-base font-mono font-black text-emerald-400">{accuracy}%</span>
                <span className="text-[10px] text-zinc-400">
                  {user.stats.predictionsCorrect}/{user.stats.predictionsMade} correct
                </span>
              </div>
              <div className="bg-[#101015] border border-[#252533] p-2.5 rounded flex flex-col">
                <span className="text-[10px] text-zinc-500 font-bold uppercase">Room Wins</span>
                <span className="text-base font-mono font-black text-[#ffd000]">{user.stats.roomWins}</span>
                <span className="text-[10px] text-zinc-400">Leaderboard #1</span>
              </div>
              <div className="bg-[#101015] border border-[#252533] p-2.5 rounded flex flex-col">
                <span className="text-[10px] text-zinc-500 font-bold uppercase">Rooms</span>
                <span className="text-base font-mono font-black text-blue-400">
                  {user.stats.roomsParticipated}
                </span>
                <span className="text-[10px] text-zinc-400">{user.stats.roomsCreated} hosted</span>
              </div>
              <div className="bg-[#101015] border border-[#252533] p-2.5 rounded flex flex-col">
                <span className="text-[10px] text-zinc-500 font-bold uppercase">Social Points</span>
                <span className="text-base font-mono font-black text-indigo-300">
                  {user.stats.totalPoints}
                </span>
                <span className="text-[10px] text-zinc-400">Match score</span>
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-[#ffd000]" />
                Achievements & Milestones ({user.achievements.length})
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Non-Monetary</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
              {user.achievements.map(ach => (
                <div
                  key={ach.id}
                  className="bg-[#101015] border border-[#222230] p-2 rounded flex items-start gap-2.5"
                >
                  <span className="text-xl shrink-0 mt-0.5">{ach.icon}</span>
                  <div>
                    <span className="text-xs font-bold text-white block leading-tight">
                      {ach.title}
                    </span>
                    <span className="text-[10px] text-zinc-400 block leading-snug">
                      {ach.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Responsible Notice */}
          <div className="bg-[#101015] border border-[#20202b] p-2.5 rounded text-[11px] text-zinc-400 flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Responsible Social Play:</strong> Login streaks and leaderboard ranks are earned through regular daily visits, match discussion, and prediction accuracy. They never require wagering or financial commitments.
            </span>
          </div>

          {/* Logout / Switch */}
          <div className="pt-2 border-t border-[#252535] flex items-center justify-between">
            <button
              onClick={() => {
                logoutUser();
                onClose();
              }}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-bold"
            >
              <LogOut className="w-3.5 h-3.5" />
              Log Out
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[#20202b] hover:bg-[#2b2b3b] text-white text-xs font-bold rounded"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { loginUser } = useSession();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🦁');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUsernameChange = (val: string) => {
    setUsername(val);
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    const validation = validateUsername(cleanUser);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid username format.');
      return;
    }

    // If Sign In mode, check if account exists
    const existing = findPrototypeAccount(cleanUser);
    if (authMode === 'signin' && !existing) {
      // In prototype mode, allow signing in with new username or notify
      // We will automatically create or switch seamlessly
    }

    loginUser(
      cleanUser,
      displayName.trim() || (existing ? existing.displayName : cleanUser),
      selectedAvatar || (existing ? existing.avatar : '🦁')
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#15151c] border border-[#2d2d3d] rounded-lg shadow-2xl max-w-sm w-full overflow-hidden text-zinc-200">
        {/* Header */}
        <div className="bg-[#1c1c25] px-4 py-3 border-b border-[#262635] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#ffd000]" />
            <h3 className="font-bold text-sm text-white">
              {authMode === 'signin' ? 'Sign In to Waypoint' : 'Create Prototype Profile'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-[#252533] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher: Sign In vs Create Profile */}
        <div className="flex border-b border-[#242430] bg-[#121217]">
          <button
            type="button"
            onClick={() => {
              setAuthMode('signin');
              setValidationError(null);
            }}
            className={
              'flex-1 py-2.5 text-xs font-bold transition border-b-2 ' +
              (authMode === 'signin'
                ? 'text-white border-[#1752bf] bg-[#181824]'
                : 'text-zinc-400 border-transparent hover:text-zinc-200')
            }
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setValidationError(null);
            }}
            className={
              'flex-1 py-2.5 text-xs font-bold transition border-b-2 ' +
              (authMode === 'signup'
                ? 'text-white border-[#1752bf] bg-[#181824]'
                : 'text-zinc-400 border-transparent hover:text-zinc-200')
            }
          >
            Create Profile
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3.5">
          <div className="bg-[#101015] p-2.5 rounded border border-[#222230] text-[11px] text-zinc-400">
            <strong>Prototype Account:</strong>{' '}
            {authMode === 'signin'
              ? 'Enter your prototype username to restore your local profile, achievements, and login streak.'
              : 'Choose a unique username to establish your local profile identity. No password required.'}
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
              Username *
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-zinc-500 font-mono text-xs select-none">@</span>
              <input
                type="text"
                value={username}
                onChange={e => handleUsernameChange(e.target.value)}
                placeholder="e.g. luka_zg"
                required
                maxLength={20}
                className="w-full bg-[#101015] border border-[#2d2d3d] focus:border-[#1752bf] rounded pl-7 pr-3 py-2 text-xs text-white focus:outline-none font-mono"
              />
            </div>
            {validationError ? (
              <p className="text-[11px] text-[#d01111] font-medium mt-1">{validationError}</p>
            ) : (
              <span className="text-[10px] text-zinc-500 mt-1 block">
                3–20 characters, letters, numbers, and underscores only.
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
              Display Name {authMode === 'signin' ? '(Optional)' : ''}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. Luka Modric Fan"
              maxLength={30}
              className="w-full bg-[#101015] border border-[#2d2d3d] focus:border-[#1752bf] rounded px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          {authMode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                Select Avatar
              </label>
              <div className="flex gap-2 justify-between">
                {PRESET_AVATARS.map(av => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setSelectedAvatar(av.url)}
                    className={
                      'w-9 h-9 rounded text-lg flex items-center justify-center border transition overflow-hidden p-1 ' +
                      (selectedAvatar === av.url
                        ? 'bg-[#1752bf]/30 border-[#ffd000] scale-105'
                        : 'bg-[#101015] border-[#2d2d3d] hover:bg-[#1a1a24]')
                    }
                  >
                    {av.url.startsWith('/') ? (
                      <img src={av.url} alt={av.label} className="w-full h-full object-contain" />
                    ) : (
                      <span>{av.url}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262635]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs font-bold text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!username.trim()}
              className="px-4 py-1.5 bg-[#1752bf] hover:bg-blue-600 disabled:opacity-50 text-white rounded text-xs font-bold uppercase tracking-wider transition shadow"
            >
              {authMode === 'signin' ? 'Sign In' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ParticipantCardModal: React.FC<{
  participant: any | null;
  onClose: () => void;
}> = ({ participant, onClose }) => {
  if (!participant) return null;

  const accuracy =
    participant.predictionsCount > 0
      ? Math.round((participant.correctCount / participant.predictionsCount) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#15151c] border border-[#2d2d3d] rounded-lg shadow-2xl max-w-xs w-full overflow-hidden text-zinc-200">
        <div className="bg-[#1c1c25] px-4 py-2.5 border-b border-[#262635] flex items-center justify-between">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Room Participant
          </span>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-[#252533] transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#1c1c27] border-2 border-[#ffd000] flex items-center justify-center text-2xl overflow-hidden shrink-0">
              {participant.avatar?.startsWith('data:') || participant.avatar?.startsWith('/') ? (
                <img src={participant.avatar} alt={participant.displayName} className="w-full h-full object-cover" />
              ) : (
                <span>{participant.avatar || '🦁'}</span>
              )}
            </div>
            <div>
              <h4 className="text-sm font-bold text-white leading-tight">
                {participant.displayName}
              </h4>
              <span className="text-xs text-zinc-400 font-mono">@{participant.username}</span>
            </div>
          </div>

          {participant.bio && (
            <p className="text-xs text-zinc-300 bg-[#101015] p-2 rounded border border-[#222230]">
              {participant.bio}
            </p>
          )}

          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-[#101015] p-2 rounded border border-[#222230]">
              <span className="text-[9px] font-bold text-zinc-500 uppercase block">Rank</span>
              <span className="font-mono text-sm font-black text-[#ffd000]">#{participant.rank}</span>
            </div>
            <div className="bg-[#101015] p-2 rounded border border-[#222230]">
              <span className="text-[9px] font-bold text-zinc-500 uppercase block">Accuracy</span>
              <span className="font-mono text-sm font-black text-emerald-400">{accuracy}%</span>
            </div>
            <div className="bg-[#101015] p-2 rounded border border-[#222230]">
              <span className="text-[9px] font-bold text-zinc-500 uppercase block">Score</span>
              <span className="font-mono text-sm font-black text-blue-400">{participant.score}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-[#ffd000] text-[10px] font-bold">
              🔥 {participant.streakDays || 1}d Streak
            </span>
            {participant.topBadge && (
              <span className="px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/40 text-blue-300 text-[10px] font-bold">
                {participant.topBadge}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
