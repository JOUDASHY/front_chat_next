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
import {
  closeIncomingCallNotification,
  ensureCallNotificationPermission,
  showIncomingCallNotification,
} from '@/lib/callNotifications';
import { startCallRingtone, stopCallRingtone } from '@/lib/callRingtone';
import { Capacitor } from '@capacitor/core';

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
  startCall: (recipientId: number, callType: CallType, peerHint?: Partial<CallPeer>) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  isMuted: boolean;
  isCameraOff: boolean;
  toggleMute: () => void;
  toggleCamera: () => void;
  audioInputDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];
  activeAudioInput: string | null;
  activeAudioOutput: string | null;
  switchDevice: (kind: 'audioinput' | 'audiooutput', deviceId: string) => Promise<void>;
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

  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeAudioInput, setActiveAudioInput] = useState<string | null>(null);
  const [activeAudioOutput, setActiveAudioOutput] = useState<string | null>(null);

  const roomRef = useRef<import('livekit-client').Room | null>(null);
  const pusherRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);
  const userIdRef = useRef<number | null>(null);
  const phaseRef = useRef<CallPhase>('idle');
  const sessionRef = useRef<ActiveCallSession | null>(null);
  const incomingRef = useRef<IncomingCallPayload | null>(null);
  const endedRoomsRef = useRef<Set<string>>(new Set());
  const activeAudioOutputRef = useRef<string | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    incomingRef.current = incoming;
  }, [incoming]);

  useEffect(() => {
    activeAudioOutputRef.current = activeAudioOutput;
  }, [activeAudioOutput]);

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
    stopCallRingtone();
    closeIncomingCallNotification();
    await detachRoom();
    setPhase('idle');
    setCallType(null);
    setPeer(null);
    setSession(null);
    setIncoming(null);
    setError(null);
    setIsMuted(false);
    setIsCameraOff(false);
    audioElementsRef.current = [];
    setAudioInputDevices([]);
    setAudioOutputDevices([]);
    setActiveAudioInput(null);
    setActiveAudioOutput(null);
  }, [detachRoom]);

  const notifyCallHistoryChanged = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('call-history-changed'));
    }
  }, []);

  const notifyBackendCallEnd = useCallback(
    async (roomName: string, peerId: number) => {
      if (endedRoomsRef.current.has(roomName)) return;
      endedRoomsRef.current.add(roomName);
      try {
        await api.post('/api/chat/calls/end/', {
          room_name: roomName,
          peer_id: peerId,
        });
        notifyCallHistoryChanged();
      } catch {
        endedRoomsRef.current.delete(roomName);
      }
    },
    [notifyCallHistoryChanged]
  );

  const switchDevice = useCallback(async (kind: 'audioinput' | 'audiooutput', deviceId: string) => {
    const room = roomRef.current;
    if (!room) return;
    
    if (kind === 'audiooutput') {
      // On Android native, use AudioManager via the native plugin
      if (Capacitor.isNativePlatform()) {
        try {
          const { AudioRouterPlugin } = await import('@/plugins/AudioRouterPlugin');
          const isSpeaker = deviceId === 'speaker';
          await AudioRouterPlugin.setSpeakerOn({ enabled: isSpeaker });
        } catch (err) {
          console.warn('AudioRouterPlugin not available, falling back to setSinkId', err);
        }
      } else {
        // On PC Web: apply setSinkId() directly on each tracked audio element
        for (const el of audioElementsRef.current) {
          if ('setSinkId' in el) {
            await (el as any).setSinkId(deviceId).catch(() => {});
          }
        }
        // Also tell LiveKit for future elements
        await room.switchActiveDevice('audioinput', deviceId).catch(() => {});
      }
      setActiveAudioOutput(deviceId);
    } else {
      await room.switchActiveDevice(kind, deviceId);
      setActiveAudioInput(deviceId);
    }
  }, []);

  const attachTrack = useCallback(
    (
      track: import('livekit-client').RemoteTrack | import('livekit-client').LocalTrack,
      target: 'local' | 'remote'
    ) => {
      const el = target === 'local' ? localVideoRef.current : remoteVideoRef.current;
      if (!el || track.kind !== 'video') return false;
  
      track.attach(el);
  
      return true;
    },
    []
  );

  const syncRoomTracks = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    const { Track } = await import('livekit-client');

    room.localParticipant.videoTrackPublications.forEach((publication) => {
      const track = publication.track;
      if (track) attachTrack(track, 'local');
    });

    room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((publication) => {
        const track = publication.track;
        if (!track || !publication.isSubscribed) return;
        if (track.kind === Track.Kind.Video) {
          attachTrack(track, 'remote');
        } else if (track.kind === Track.Kind.Audio) {
          const audioEl = track.attach();
          void room.startAudio().then(() => audioEl.play()).catch(() => {});
        }
      });
    });
  }, [attachTrack]);

  const waitForVideoElements = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

  const connectRoom = useCallback(
    async (livekitUrl: string, token: string, type: CallType, activateImmediately = true) => {
      await detachRoom();
      const { Room, RoomEvent, Track } = await import('livekit-client');
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      const handleTrack = (
        track: import('livekit-client').RemoteTrack | import('livekit-client').LocalTrack,
        participant?: { isLocal: boolean }
      ) => {
        if (participant?.isLocal) {
          if (track.kind === Track.Kind.Video) attachTrack(track, 'local');
          return;
        }
        if (track.kind === Track.Kind.Video) attachTrack(track, 'remote');
        if (track.kind === Track.Kind.Audio) {
          const audioEl = track.attach() as HTMLAudioElement;
          audioElementsRef.current.push(audioEl);
          // Apply current output device if one is selected (PC Web)
          const currentSink = activeAudioOutputRef.current;
          if (currentSink && 'setSinkId' in audioEl) {
            (audioEl as any).setSinkId(currentSink).catch(() => {});
          }
          void room.startAudio().then(() => audioEl.play()).catch(() => {});
        }
      };

      room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
        handleTrack(track, participant);
      });

      room.on(RoomEvent.LocalTrackPublished, (publication) => {
        const track = publication.track;
        if (track) handleTrack(track, { isLocal: true });
      });

      room.on(RoomEvent.ParticipantConnected, () => {
        void syncRoomTracks();
      });

      room.on(RoomEvent.Disconnected, () => {
        const current = sessionRef.current;
        if (current) {
          void notifyBackendCallEnd(current.roomName, current.peer.id);
        }
        void resetCall();
      });

      if (activateImmediately) setPhase('active');

      await waitForVideoElements();
      await room.connect(livekitUrl, token);
      await room.startAudio().catch(() => {});

      await room.localParticipant.setMicrophoneEnabled(true);
      if (type === 'video') {
        await room.localParticipant.setCameraEnabled(true);
      } else {
        await room.localParticipant.setCameraEnabled(false);
      }

      // Fetch and set devices
      try {
        const aIn = await Room.getLocalDevices('audioinput');
        const aOut = await Room.getLocalDevices('audiooutput');
        setAudioInputDevices(aIn);
        setAudioOutputDevices(aOut);
        setActiveAudioInput(room.getActiveDevice('audioinput') ?? null);
        setActiveAudioOutput(room.getActiveDevice('audiooutput') ?? null);
      } catch (err) {
        console.error('Error fetching devices:', err);
      }

      // Force earpiece on Android for voice calls — must happen AFTER WebRTC starts
      // (WebRTC overrides AudioManager, so we wait 500ms for it to settle first)
      if (type === 'audio' && Capacitor.isNativePlatform()) {
        setTimeout(async () => {
          try {
            const { AudioRouterPlugin } = await import('@/plugins/AudioRouterPlugin');
            await AudioRouterPlugin.setSpeakerOn({ enabled: false });
          } catch (err) {
            console.warn('AudioRouterPlugin not available:', err);
          }
        }, 500);
      }

      await waitForVideoElements();
      await syncRoomTracks();
    },
    [attachTrack, detachRoom, notifyBackendCallEnd, resetCall, syncRoomTracks]
  );

  const endCall = useCallback(async () => {
    const current = sessionRef.current;
    if (current) {
      await notifyBackendCallEnd(current.roomName, current.peer.id);
    }
    await resetCall();
  }, [notifyBackendCallEnd, resetCall]);

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
        startCallRingtone('incoming');
        showIncomingCallNotification(data.caller.display_name, data.call_type);
      });

      channel.bind('call-accepted', (data: {
        room_name: string;
        user?: { display_name?: string; username?: string; image?: string | null };
      }) => {
        if (sessionRef.current?.roomName === data.room_name) {
          // L'appelant voit que l'appel a été accepté
          stopCallRingtone();
          closeIncomingCallNotification();
          if (data.user) {
            setPeer((prev) =>
              prev
                ? {
                    ...prev,
                    display_name: data.user?.display_name || prev.display_name,
                    username: data.user?.username ?? prev.username,
                    image: data.user?.image ?? prev.image,
                  }
                : prev
            );
          }
          setPhase('active');
          void syncRoomTracks();
        } else if (incomingRef.current?.room_name === data.room_name) {
          // L'appelé a accepté sur UN AUTRE appareil, cet appareil doit arrêter de sonner
          notifyCallHistoryChanged();
          void resetCall();
        }
      });

      channel.bind('call-rejected', async (data: { room_name: string }) => {
        const currentRoom = sessionRef.current?.roomName || incomingRef.current?.room_name;
        if (currentRoom === data.room_name) {
          if (sessionRef.current) {
            setError('Appel refusé');
          }
          notifyCallHistoryChanged();
          await resetCall();
        }
      });

      channel.bind('call-ended', async (data: { room_name: string }) => {
        const currentRoom = sessionRef.current?.roomName || incomingRef.current?.room_name;
        if (currentRoom === data.room_name) {
          notifyCallHistoryChanged();
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
  }, [detachRoom, syncRoomTracks]);

  useEffect(() => {
    if ((phase === 'active' || phase === 'outgoing') && callType === 'video') {
      void syncRoomTracks();
    }
  }, [phase, callType, syncRoomTracks]);

  useEffect(() => {
    if (phase === 'active') {
      stopCallRingtone();
      closeIncomingCallNotification();
    }
  }, [phase]);

  useEffect(() => {
    void ensureCallNotificationPermission();
  }, []);

  const startCall = useCallback(
    async (recipientId: number, type: CallType, peerHint?: Partial<CallPeer>) => {
      setError(null);

      const hintedPeer: CallPeer = {
        id: recipientId,
        display_name: peerHint?.display_name || 'Utilisateur',
        image: peerHint?.image ?? null,
        username: peerHint?.username,
      };
        setPeer(hintedPeer);
        setCallType(type);
        setPhase('outgoing');
        startCallRingtone('outgoing');

        try {
        const { data } = await api.post('/api/chat/calls/start/', {
          recipient_id: recipientId,
          call_type: type,
        });

        const peer: CallPeer = {
          id: data.recipient?.id ?? recipientId,
          display_name: data.recipient?.display_name || hintedPeer.display_name,
          image: data.recipient?.image ?? hintedPeer.image ?? null,
          username: data.recipient?.username ?? hintedPeer.username,
        };

        const nextSession: ActiveCallSession = {
          roomName: data.room_name,
          callType: type,
          token: data.token,
          livekitUrl: data.livekit_url,
          peer,
          isOutgoing: true,
        };

        setSession(nextSession);
        endedRoomsRef.current.delete(data.room_name);
        setPeer(peer);
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
      setCallType(incoming.call_type);
      setPeer(nextSession.peer);
      // Afficher l'UI vidéo AVANT la connexion LiveKit (sinon les <video> n'existent pas)
      setPhase('active');
      await waitForVideoElements();
      await connectRoom(data.livekit_url, data.token, incoming.call_type, false);
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
      notifyCallHistoryChanged();
    } catch {
      /* ignore */
    }
    await resetCall();
  }, [incoming, notifyCallHistoryChanged, resetCall]);

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
        audioInputDevices,
        audioOutputDevices,
        activeAudioInput,
        activeAudioOutput,
        switchDevice,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
