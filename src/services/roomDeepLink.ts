import { LiveMatchRoom, SportsEvent } from '../types/canonical';

export interface RoomDeepLinkPayload {
  roomCode: string;
  eventId: string;
  sportId: string;
  roomName: string;
  privacy?: 'friends_with_link' | 'public';
}

export interface RoomResolutionResult {
  success: boolean;
  room?: LiveMatchRoom;
  event?: SportsEvent;
  error?: string;
}

/**
 * Generates a clean, shareable hash-based deep link URL for a Live Match Room.
 * Format: /#/room/<roomCode>?eventId=<eventId>&sportId=<sportId>&name=<encodedName>&privacy=<privacy>
 */
export function generateRoomUrl(
  room: Pick<LiveMatchRoom, 'roomCode' | 'eventId' | 'sportId' | 'roomName' | 'privacy'>,
  origin: string = typeof window !== 'undefined' ? window.location.origin : 'https://waypoint.live'
): string {
  const params = new URLSearchParams();
  params.set('eventId', room.eventId);
  params.set('sportId', room.sportId);
  params.set('name', room.roomName);
  if (room.privacy) {
    params.set('privacy', room.privacy);
  }

  return `${origin}/#/room/${encodeURIComponent(room.roomCode)}?${params.toString()}`;
}

/**
 * Parses a hash or pathname string to extract room deep-link parameters.
 * Supports:
 * - /#/room/:roomCode?...
 * - #/room/:roomCode?...
 * - /room/:roomCode?...
 */
export function parseRoomUrl(urlOrHash: string): RoomDeepLinkPayload | null {
  if (!urlOrHash || typeof urlOrHash !== 'string') return null;

  try {
    let raw = urlOrHash.trim();

    // Check if full URL or relative path/hash
    let pathAndQuery = raw;
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      const parsedUrl = new URL(raw);
      if (parsedUrl.hash && parsedUrl.hash.includes('/room/')) {
        pathAndQuery = parsedUrl.hash.replace(/^#/, '');
      } else {
        pathAndQuery = parsedUrl.pathname + parsedUrl.search;
      }
    } else if (raw.startsWith('#')) {
      pathAndQuery = raw.replace(/^#/, '');
    }

    // Must match /room/:roomCode pattern
    const match = pathAndQuery.match(/\/room\/([A-Za-z0-9_-]+)(\?.*)?$/);
    if (!match) return null;

    const roomCode = match[1].trim().toUpperCase();
    if (!roomCode || roomCode.length < 3) return null;

    const queryString = match[2] ? match[2].substring(1) : '';
    const params = new URLSearchParams(queryString);

    const eventId = params.get('eventId')?.trim() || '';
    const sportId = params.get('sportId')?.trim() || '';
    const rawName = params.get('name')?.trim() || '';
    const privacy = (params.get('privacy')?.trim() as 'friends_with_link' | 'public') || 'friends_with_link';

    return {
      roomCode,
      eventId,
      sportId,
      roomName: rawName ? decodeURIComponent(rawName) : '',
      privacy: privacy === 'public' ? 'public' : 'friends_with_link',
    };
  } catch {
    return null;
  }
}

/**
 * Resolves a parsed deep-link payload against the available event catalogue.
 * Reconstructs a valid LiveMatchRoom object if valid, or returns a descriptive error.
 */
export function resolveRoomDeepLink(
  payload: RoomDeepLinkPayload | null,
  availableEvents: SportsEvent[],
  localSessionId: string
): RoomResolutionResult {
  if (!payload) {
    return {
      success: false,
      error: 'The room link is invalid or malformed.',
    };
  }

  const { roomCode, eventId, sportId, roomName, privacy } = payload;

  if (!roomCode || roomCode.length < 3) {
    return {
      success: false,
      error: 'The room link is missing a valid room code.',
    };
  }

  if (!eventId) {
    return {
      success: false,
      error: 'The room link is invalid or the match is no longer available.',
    };
  }

  // Resolve anchored event from catalogue
  const matchedEvent = availableEvents.find(e => e.id === eventId);
  if (!matchedEvent) {
    return {
      success: false,
      error: 'The room link is invalid or the match is no longer available.',
    };
  }

  // Verify sport ID compatibility if provided
  if (sportId && matchedEvent.sportId !== sportId) {
    return {
      success: false,
      error: 'The room link is invalid or the match is no longer available.',
    };
  }

  const resolvedName = roomName.trim() || `${matchedEvent.homeTeam} vs ${matchedEvent.awayTeam} Room`;

  // Reconstruct minimal LiveMatchRoom object (deep-link reconstructed prototype room state)
  const room: LiveMatchRoom = {
    roomId: `room-dl-${roomCode.toLowerCase()}`,
    roomCode,
    roomName: resolvedName,
    eventId: matchedEvent.id,
    sportId: matchedEvent.sportId,
    createdAt: Date.now(),
    creatorSessionId: `external-creator-${roomCode}`,
    privacy: privacy || 'friends_with_link',
    participantCount: 2, // Creator + joining user
  };

  return {
    success: true,
    room,
    event: matchedEvent,
  };
}
