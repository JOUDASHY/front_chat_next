'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import api from '@/lib/axiosClient';

export type CallType = 'audio' | 'video';
export type CallPhase = 'idle' | 'outgoing' | 'incoming' | 'active';

export interface CallPeer {
  id: number;
  display_name: string;
  username?: string;
  image?: string | null;
}

interface ActiveCallSession {
  roomName: string;
  callType: CallType;
  token: string;
  livekitUrl: string;
  peer: CallPeer;
  isOutgoing: boolean;
}

interface IncomingCallPayload {
  room_name: string;
  call_type: CallType;
  caller: CallPeer & { image?: string | null };
  livekit_url: string;
}

interface CallContextValue {
  phase: CallPhase;
  callType: CallType | null;
  peer: CallPeer | null;
  error: string | null;
  startCall: (recipientId: number, callType: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  isMuted: boolean;
  isCameraOff: boolean;
  toggleMute: () => void;
  toggleCamera: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
}

export function CallProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [callType, setCallType] = useState<CallType | null>(null);
  const [peer, setPeer] = useState<CallPeer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<ActiveCallSession | null>(null);
  const [incoming, setIncoming] = useState<IncomingCallPayload | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const roomRef = useRef<import('livekit-client').Room | null>(null);
  const pusherRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const userIdRef = useRef<number | null>(null);
  const phaseRef = useRef<CallPhase>('idle');
  const sessionRef = useRef<ActiveCallSession | null>(null);
  const incomingRef = useRef<IncomingCallPayload | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    incomingRef.current = incoming;
  }, [incoming]);

  const detachRoom = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      try {
        room.removeAllListeners();
        await room.disconnect();
      } catch {
        /* ignore */
      }
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  const resetCall = useCallback(async () => {
    await detachRoom();
    setPhase('idle');
    setCallType(null);
    setPeer(null);
    setSession(null);
    setIncoming(null);
    setError(null);
    setIsMuted(false);
    setIsCameraOff(false);
  }, [detachRoom]);

  const attachTrack = useCallback(
    (track: import('livekit-client').RemoteTrack | import('livekit-client').LocalTrack, target: 'local' | 'remote') => {
      const el = target === 'local' ? localVideoRef.current : remoteVideoRef.current;
      if (!el || track.kind !== 'video') return;
      track.attach(el);
    },
    []
  );

  const connectRoom = useCallback(
    async (livekitUrl: string, token: string, type: CallType, activateImmediately = true) => {
      await detachRoom();
      const { Room, RoomEvent, Track } = await import('livekit-client');
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
        if (participant.isLocal) return;
        if (track.kind === Track.Kind.Video) attachTrack(track, 'remote');
        if (track.kind === Track.Kind.Audio) {
          const audioEl = track.attach();
          audioEl.play().catch(() => {});
        }
      });

      room.on(RoomEvent.LocalTrackPublished, (publication) => {
        const track = publication.track;
        if (track?.kind === Track.Kind.Video) attachTrack(track, 'local');
      });

      room.on(RoomEvent.Disconnected, () => {
        void resetCall();
      });

      await room.connect(livekitUrl, token);
      await room.localParticipant.setMicrophoneEnabled(true);
      if (type === 'video') {
        await room.localParticipant.setCameraEnabled(true);
      } else {
        await room.localParticipant.setCameraEnabled(false);
      }
      if (activateImmediately) setPhase('active');
    },
    [attachTrack, detachRoom, resetCall]
  );

  const endCall = useCallback(async () => {
    const current = session;
    if (current) {
      try {
        await api.post('/api/chat/calls/end/', {
          room_name: current.roomName,
          peer_id: current.peer.id,
        });
      } catch {
        /* ignore */
      }
    }
    await resetCall();
  }, [resetCall, session]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) return;
    const user = JSON.parse(userData);
    userIdRef.current = user.id;

    let mounted = true;

    const init = async () => {
      const PusherModule = await import('pusher-js');
      const Pusher = PusherModule.default;
      if (!mounted) return;

      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        forceTLS: true,
        authEndpoint: `${process.env.NEXT_PUBLIC_API_URL}/api/chat/pusher/auth/`,
        auth: {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        },
      });
      pusherRef.current = pusher;

      const channel = pusher.subscribe(`user-${user.id}-calls`);

      channel.bind('incoming-call', (data: IncomingCallPayload) => {
        if (phaseRef.current !== 'idle') return;
        setIncoming(data);
        setCallType(data.call_type);
        setPeer({
          id: data.caller.id,
          display_name: data.caller.display_name,
          username: data.caller.username,
          image: data.caller.image,
        });
        setPhase('incoming');
      });

      channel.bind('call-accepted', (data: { room_name: string }) => {
        setSession((current) => {
          if (current?.roomName === data.room_name) setPhase('active');
          return current;
        });
      });

      channel.bind('call-rejected', async (data: { room_name: string }) => {
        if (sessionRef.current?.roomName === data.room_name) {
          setError('Appel refusé');
          await resetCall();
        }
      });

      channel.bind('call-ended', async (data: { room_name: string }) => {
        const currentRoom = sessionRef.current?.roomName || incomingRef.current?.room_name;
        if (currentRoom === data.room_name) {
          await resetCall();
        }
      });
    };

    void init();

    return () => {
      mounted = false;
      pusherRef.current?.disconnect();
      void detachRoom();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCall = useCallback(
    async (recipientId: number, type: CallType) => {
      setError(null);
      try {
        const { data } = await api.post('/api/chat/calls/start/', {
          recipient_id: recipientId,
          call_type: type,
        });

        const nextSession: ActiveCallSession = {
          roomName: data.room_name,
          callType: type,
          token: data.token,
          livekitUrl: data.livekit_url,
          peer: {
            id: recipientId,
            display_name: data.recipient?.display_name || 'Utilisateur',
          },
          isOutgoing: true,
        };

        setSession(nextSession);
        setCallType(type);
        setPeer(nextSession.peer);
        setPhase('outgoing');
        await connectRoom(data.livekit_url, data.token, type, false);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Impossible de démarrer l\'appel.';
        setError(msg);
        await resetCall();
      }
    },
    [connectRoom, resetCall]
  );

  const acceptCall = useCallback(async () => {
    if (!incoming) return;
    setError(null);
    try {
      const { data } = await api.post('/api/chat/calls/respond/', {
        room_name: incoming.room_name,
        action: 'accept',
        caller_id: incoming.caller.id,
      });

      const nextSession: ActiveCallSession = {
        roomName: incoming.room_name,
        callType: incoming.call_type,
        token: data.token,
        livekitUrl: data.livekit_url,
        peer: {
          id: incoming.caller.id,
          display_name: incoming.caller.display_name,
          username: incoming.caller.username,
          image: incoming.caller.image,
        },
        isOutgoing: false,
      };

      setSession(nextSession);
      setIncoming(null);
      await connectRoom(data.livekit_url, data.token, incoming.call_type);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Impossible d\'accepter l\'appel.';
      setError(msg);
      await resetCall();
    }
  }, [connectRoom, incoming, resetCall]);

  const rejectCall = useCallback(async () => {
    if (!incoming) return;
    try {
      await api.post('/api/chat/calls/respond/', {
        room_name: incoming.room_name,
        action: 'reject',
        caller_id: incoming.caller.id,
      });
    } catch {
      /* ignore */
    }
    await resetCall();
  }, [incoming, resetCall]);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const enabled = room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(!enabled);
    setIsMuted(enabled);
  }, []);

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room || callType !== 'video') return;
    const enabled = room.localParticipant.isCameraEnabled;
    await room.localParticipant.setCameraEnabled(!enabled);
    setIsCameraOff(enabled);
  }, [callType]);

  return (
    <CallContext.Provider
      value={{
        phase,
        callType,
        peer,
        error,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        localVideoRef,
        remoteVideoRef,
        isMuted,
        isCameraOff,
        toggleMute,
        toggleCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
