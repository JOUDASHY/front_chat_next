'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

async function warmUpMediaAccess(type: CallType): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: type === 'video',
  });
  stream.getTracks().forEach((track) => track.stop());
}

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
  isGroupCall?: boolean;
  roomId?: number;
  peers?: CallPeer[];
}

interface IncomingCallPayload {
  room_name: string;
  call_type: CallType;
  caller: CallPeer & { image?: string | null };
  livekit_url: string;
}

interface IncomingGroupCallPayload {
  room_name: string;
  call_type: CallType;
  caller: CallPeer & { image?: string | null };
  livekit_url: string;
  room_id: number;
  participants: (CallPeer & { image?: string | null })[];
}

export interface OngoingGroupCall {
  active?: boolean;
  room_name: string;
  call_type: CallType;
  caller: CallPeer & { image?: string | null };
  room_id: number;
  status?: 'ringing' | 'active';
  livekit_url?: string;
  joined_count?: number;
  participants?: (CallPeer & { image?: string | null })[];
}

interface CallContextValue {
  phase: CallPhase;
  callType: CallType | null;
  peer: CallPeer | null;
  peers: CallPeer[];
  error: string | null;
  isGroupCall: boolean;
  startCall: (recipientId: number, callType: CallType, peerHint?: Partial<CallPeer>) => Promise<void>;
  startGroupCall: (roomId: number, callType: CallType) => Promise<void>;
  joinGroupCall: (call: OngoingGroupCall) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  isMuted: boolean;
  isCameraOff: boolean;
  toggleMute: () => void;
  toggleCamera: () => void;
  connectedPeers: CallPeer[];
  remoteDisplayPeers: CallPeer[];
  getRemoteVideoRef: (peerId: number) => React.RefObject<HTMLVideoElement | null>;
  registerRemoteVideoElement: (peerId: number, el: HTMLVideoElement | null) => void;
  audioInputDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];
  activeAudioInput: string | null;
  activeAudioOutput: string | null;
  switchDevice: (kind: 'audioinput' | 'audiooutput', deviceId: string) => Promise<void>;
}

const CallContext = createContext<CallContextValue | null>(null);

let livekitModule: typeof import('livekit-client') | null = null;
async function getLiveKitModule() {
  if (!livekitModule) {
    livekitModule = await import('livekit-client');
  }
  return livekitModule;
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
}



export function CallProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [callType, setCallType] = useState<CallType | null>(null);
  const [peer, setPeer] = useState<CallPeer | null>(null);
  const [peers, setPeers] = useState<CallPeer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<ActiveCallSession | null>(null);
  const [incoming, setIncoming] = useState<IncomingCallPayload | IncomingGroupCallPayload | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isGroupCall, setIsGroupCall] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState<CallPeer[]>([]);

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
  const incomingRef = useRef<IncomingCallPayload | IncomingGroupCallPayload | null>(null);
  const endedRoomsRef = useRef<Set<string>>(new Set());
  const activeAudioOutputRef = useRef<string | null>(null);
  const remoteVideoRefsRef = useRef<Map<number, React.RefObject<HTMLVideoElement | null>>>(new Map());
  const peerInfoByIdRef = useRef<Map<number, CallPeer>>(new Map());
  const pendingVideoTracksRef = useRef<Map<number, import('livekit-client').RemoteTrack>>(new Map());
  const syncRoomTracksRef = useRef<() => Promise<void>>(async () => {});

  const rememberPeer = useCallback((peerInfo: CallPeer) => {
    if (!peerInfo.id || peerInfo.id === userIdRef.current) return;
    peerInfoByIdRef.current.set(peerInfo.id, peerInfo);
  }, []);

  const getRemoteVideoRef = useCallback((peerId: number) => {
    if (!remoteVideoRefsRef.current.has(peerId)) {
      remoteVideoRefsRef.current.set(peerId, createRef<HTMLVideoElement>());
    }
    return remoteVideoRefsRef.current.get(peerId)!;
  }, []);

  const syncConnectedPeers = useCallback(() => {
    const room = roomRef.current;
    const currentUserId = userIdRef.current;
    if (!room || !currentUserId) {
      setConnectedPeers([]);
      return;
    }

    const next: CallPeer[] = [];
    const seen = new Set<number>();

    room.remoteParticipants.forEach((participant) => {
      const peerId = Number(participant.identity);
      if (!peerId || peerId === currentUserId || seen.has(peerId)) return;
      seen.add(peerId);

      getRemoteVideoRef(peerId);

      const known = peerInfoByIdRef.current.get(peerId);
      next.push(
        known ?? {
          id: peerId,
          display_name: participant.name || `Utilisateur ${peerId}`,
          image: null,
        }
      );
    });

    setConnectedPeers(next);
  }, [getRemoteVideoRef]);

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
    remoteVideoRefsRef.current.forEach((ref) => {
      if (ref.current) ref.current.srcObject = null;
    });
    remoteVideoRefsRef.current.clear();
    peerInfoByIdRef.current.clear();
    pendingVideoTracksRef.current.clear();
    setConnectedPeers([]);
  }, []);

  const resetCall = useCallback(async () => {
    stopCallRingtone();
    closeIncomingCallNotification();
    await detachRoom();

    if (Capacitor.isNativePlatform()) {
      try {
        const { AudioRouterPlugin } = await import('@/plugins/AudioRouterPlugin');
        await AudioRouterPlugin.setSpeakerOn({ enabled: false });
      } catch { /* ignore */ }
    }

    setPhase('idle');
    setCallType(null);
    setPeer(null);
    setPeers([]);
    setSession(null);
    setIncoming(null);
    setError(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsGroupCall(false);
    setConnectedPeers([]);
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
    async (roomName: string, peerId: number, isGroup?: boolean) => {
      if (endedRoomsRef.current.has(roomName)) return;
      endedRoomsRef.current.add(roomName);
      try {
        const endpoint = isGroup ? '/api/chat/group-calls/end/' : '/api/chat/calls/end/';
        const payload: Record<string, any> = { room_name: roomName };
        if (!isGroup) payload.peer_id = peerId;
        await api.post(endpoint, payload);
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
      if (Capacitor.isNativePlatform()) {
        try {
          const { AudioRouterPlugin } = await import('@/plugins/AudioRouterPlugin');
          const isSpeaker = deviceId === 'speaker';
          await AudioRouterPlugin.setSpeakerOn({ enabled: isSpeaker });
        } catch (err) {
          console.warn('AudioRouterPlugin not available, falling back to setSinkId', err);
        }
      } else {
        for (const el of audioElementsRef.current) {
          if ('setSinkId' in el) {
            await (el as any).setSinkId(deviceId).catch(() => {});
          }
        }
        await room.switchActiveDevice('audioinput', deviceId).catch(() => {});
      }
      setActiveAudioOutput(deviceId);
    } else {
      await room.switchActiveDevice(kind, deviceId);
      setActiveAudioInput(deviceId);
    }
  }, []);

  const attachTrackToVideo = useCallback(
    (
      track: import('livekit-client').RemoteTrack | import('livekit-client').LocalTrack,
      videoEl: HTMLVideoElement | null
    ) => {
      if (!videoEl || track.kind !== 'video') return false;
      track.attach(videoEl);
      void videoEl.play().catch(() => {});
      return true;
    },
    []
  );

  const registerRemoteVideoElement = useCallback(
    (peerId: number, el: HTMLVideoElement | null) => {
      const refObj = getRemoteVideoRef(peerId);
      refObj.current = el;
      if (!el) return;

      const pending = pendingVideoTracksRef.current.get(peerId);
      if (pending) {
        pending.attach(el);
        void el.play().catch(() => {});
        pendingVideoTracksRef.current.delete(peerId);
      }

      const room = roomRef.current;
      if (!room) return;

      room.remoteParticipants.forEach((participant) => {
        if (Number(participant.identity) !== peerId) return;
        participant.trackPublications.forEach((publication) => {
          const track = publication.track;
          if (track?.kind === 'video' && publication.isSubscribed) {
            attachTrackToVideo(track, el);
          }
        });
      });
    },
    [attachTrackToVideo, getRemoteVideoRef]
  );

  const syncRoomTracks = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    const { Track } = await getLiveKitModule();

    room.localParticipant.videoTrackPublications.forEach((publication) => {
      const track = publication.track;
      if (track) attachTrackToVideo(track, localVideoRef.current);
    });

    room.remoteParticipants.forEach((participant) => {
      const peerId = Number(participant.identity);
      const videoRef = remoteVideoRefsRef.current.get(peerId);
      const videoEl = videoRef?.current ?? remoteVideoRef.current;

      participant.trackPublications.forEach((publication) => {
        const track = publication.track;
        if (!track || !publication.isSubscribed) return;
        if (track.kind === Track.Kind.Video) {
          getRemoteVideoRef(peerId);
          if (videoEl) {
            attachTrackToVideo(track, videoEl);
          } else {
            pendingVideoTracksRef.current.set(peerId, track as import('livekit-client').RemoteTrack);
          }
        } else if (track.kind === Track.Kind.Audio) {
          const audioEl = track.attach();
          audioElementsRef.current.push(audioEl);
          const currentSink = activeAudioOutputRef.current;
          if (currentSink && 'setSinkId' in audioEl) {
            (audioEl as any).setSinkId(currentSink).catch(() => {});
          }
          void room.startAudio().then(() => audioEl.play()).catch(() => {});
        }
      });
    });

    syncConnectedPeers();
  }, [attachTrackToVideo, syncConnectedPeers]);

  useEffect(() => {
    syncRoomTracksRef.current = syncRoomTracks;
  }, [syncRoomTracks]);

  const remoteDisplayPeers = useMemo(() => {
    const uid = userIdRef.current;
    const map = new Map<number, CallPeer>();

    for (const p of peers) {
      if (p.id && p.id !== uid) map.set(p.id, p);
    }
    for (const p of connectedPeers) {
      if (p.id && p.id !== uid) map.set(p.id, p);
    }
    if (isGroupCall && peer?.id && peer.id !== uid) {
      map.set(peer.id, peer);
    }

    return Array.from(map.values());
  }, [peers, connectedPeers, peer, isGroupCall]);

  useEffect(() => {
    if (!isGroupCall) return;
    remoteDisplayPeers.forEach((p) => getRemoteVideoRef(p.id));
  }, [isGroupCall, remoteDisplayPeers, getRemoteVideoRef]);

  const waitForVideoElements = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

  const attachLocalPublishedTracks = useCallback(
    (room: import('livekit-client').Room) => {
      room.localParticipant.videoTrackPublications.forEach((publication) => {
        if (publication.track) {
          attachTrackToVideo(publication.track, localVideoRef.current);
        }
      });
    },
    [attachTrackToVideo]
  );

  const publishLocalTracks = useCallback(
    async (room: import('livekit-client').Room, type: CallType) => {
      const { Track, createLocalTracks } = await getLiveKitModule();

      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        if (type === 'video') {
          await room.localParticipant.setCameraEnabled(true);
        } else {
          await room.localParticipant.setCameraEnabled(false);
        }
      } catch (err) {
        console.warn('LiveKit enable mic/camera failed, fallback publishTrack:', err);
      }

      const micPublication = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      const camPublication = room.localParticipant.getTrackPublication(Track.Source.Camera);
      const needsMic = !micPublication?.track;
      const needsCam = type === 'video' && !camPublication?.track;

      if (needsMic || needsCam) {
        try {
          const tracks = await createLocalTracks({
            audio: needsMic,
            video: needsCam,
          });
          for (const track of tracks) {
            const source =
              track.kind === Track.Kind.Video ? Track.Source.Camera : Track.Source.Microphone;
            await room.localParticipant.publishTrack(track, { source });
            if (track.kind === Track.Kind.Video) {
              attachTrackToVideo(track, localVideoRef.current);
            }
          }
        } catch (err) {
          console.error('Failed to publish local tracks:', err);
          throw err;
        }
      }

      attachLocalPublishedTracks(room);
      setIsMuted(!room.localParticipant.isMicrophoneEnabled);
      setIsCameraOff(type === 'video' ? !room.localParticipant.isCameraEnabled : true);
    },
    [attachLocalPublishedTracks, attachTrackToVideo]
  );

  const connectRoom = useCallback(
    async (livekitUrl: string, token: string, type: CallType, activateImmediately = true) => {
      await detachRoom();
      const { Room, RoomEvent, ParticipantEvent, Track } = await getLiveKitModule();
      const room = new Room({
        adaptiveStream: false,
        dynacast: true,
      });
      roomRef.current = room;

      const handleTrack = (
        track: import('livekit-client').RemoteTrack | import('livekit-client').LocalTrack,
        participant?: { isLocal: boolean; identity?: string }
      ) => {
        if (participant?.isLocal) {
          if (track.kind === Track.Kind.Video) attachTrackToVideo(track, localVideoRef.current);
          return;
        }
        if (track.kind === Track.Kind.Video) {
          const peerId = participant?.identity ? Number(participant.identity) : 0;
          getRemoteVideoRef(peerId);
          const videoRef = remoteVideoRefsRef.current.get(peerId);
          const videoEl = videoRef?.current ?? remoteVideoRef.current;
          if (videoEl) {
            attachTrackToVideo(track, videoEl);
          } else if ('mediaStreamTrack' in track) {
            pendingVideoTracksRef.current.set(peerId, track as import('livekit-client').RemoteTrack);
          }
          syncConnectedPeers();
        }
        if (track.kind === Track.Kind.Audio) {
          const audioEl = track.attach() as HTMLAudioElement;
          audioElementsRef.current.push(audioEl);
          const currentSink = activeAudioOutputRef.current;
          if (currentSink && 'setSinkId' in audioEl) {
            (audioEl as any).setSinkId(currentSink).catch(() => {});
          }
          void room.startAudio().then(() => audioEl.play()).catch(() => {});
        }
      };

      const watchRemoteParticipant = (
        participant: import('livekit-client').RemoteParticipant
      ) => {
        participant.on(ParticipantEvent.TrackPublished, () => {
          syncConnectedPeers();
          window.setTimeout(() => {
            void syncRoomTracksRef.current();
          }, 150);
        });
      };

      room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
        handleTrack(track, participant);
        syncConnectedPeers();
        void syncRoomTracks();
      });

      room.on(RoomEvent.LocalTrackPublished, (publication) => {
        const track = publication.track;
        if (track) handleTrack(track, { isLocal: true });
      });

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        watchRemoteParticipant(participant);
        const peerId = Number(participant.identity);
        if (peerId) getRemoteVideoRef(peerId);
        syncConnectedPeers();
        void syncRoomTracksRef.current();
      });

      room.on(RoomEvent.Connected, () => {
        room.remoteParticipants.forEach(watchRemoteParticipant);
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        const peerId = Number(participant.identity);
        remoteVideoRefsRef.current.delete(peerId);
        pendingVideoTracksRef.current.delete(peerId);
        syncConnectedPeers();
      });

      room.on(RoomEvent.Disconnected, () => {
        const current = sessionRef.current;
        if (current) {
          void notifyBackendCallEnd(current.roomName, current.peer.id, current.isGroupCall);
        }
        void resetCall();
      });

      if (activateImmediately) setPhase('active');

      await waitForVideoElements();
      await room.connect(livekitUrl, token, { autoSubscribe: true });
      await room.startAudio().catch(() => {});

      await publishLocalTracks(room, type);

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

      if (type === 'audio' && Capacitor.isNativePlatform()) {
        const forceEarpiece = async () => {
          try {
            const { AudioRouterPlugin } = await import('@/plugins/AudioRouterPlugin');
            await AudioRouterPlugin.setSpeakerOn({ enabled: false });
          } catch (err) {
            console.warn('AudioRouterPlugin not available:', err);
          }
        };
        setTimeout(forceEarpiece, 800);
        setTimeout(forceEarpiece, 2000);
      }

      await waitForVideoElements();
      attachLocalPublishedTracks(room);
      syncConnectedPeers();
      await syncRoomTracks();
      window.setTimeout(() => {
        attachLocalPublishedTracks(room);
        void syncRoomTracksRef.current();
      }, 600);
    },
    [
      attachLocalPublishedTracks,
      attachTrackToVideo,
      detachRoom,
      getRemoteVideoRef,
      notifyBackendCallEnd,
      publishLocalTracks,
      resetCall,
      syncConnectedPeers,
      syncRoomTracks,
    ]
  );

  const endCall = useCallback(async () => {
    const current = sessionRef.current;
    if (current) {
      await notifyBackendCallEnd(current.roomName, current.peer.id, current.isGroupCall);
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
        setIsGroupCall(false);
        setPeers([]);
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

      channel.bind('group-call-started', (data: IncomingGroupCallPayload) => {
        if (phaseRef.current !== 'idle') return;
        setIncoming(data);
        setCallType(data.call_type);
        setIsGroupCall(true);

        rememberPeer({
          id: data.caller.id,
          display_name: data.caller.display_name,
          username: data.caller.username,
          image: data.caller.image,
        });

        const callerPeers = (data.participants || [])
          .filter((p) => p.id !== user.id)
          .map((p) => {
            const peerInfo = {
              id: p.id,
              display_name: p.display_name,
              username: p.username,
              image: p.image,
            };
            rememberPeer(peerInfo);
            return peerInfo;
          });
        setPeers(callerPeers);

        setPeer({
          id: data.caller.id,
          display_name: data.caller.display_name,
          username: data.caller.username,
          image: data.caller.image,
        });
        setPhase('incoming');
        startCallRingtone('incoming');
        showIncomingCallNotification(`Appel de groupe: ${data.caller.display_name}`, data.call_type);
      });

      channel.bind('call-accepted', (data: {
        room_name: string;
        user?: { display_name?: string; username?: string; image?: string | null };
      }) => {
        if (sessionRef.current?.roomName === data.room_name) {
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
          notifyCallHistoryChanged();
          void resetCall();
        }
      });

      channel.bind('group-call-joined', (data: { room_name: string; user_id: number; user?: CallPeer & { image?: string | null } }) => {
        if (sessionRef.current?.roomName === data.room_name) {
          stopCallRingtone();
          closeIncomingCallNotification();
          if (data.user && data.user_id !== userIdRef.current) {
            const peerInfo = {
              id: data.user_id,
              display_name: data.user.display_name,
              username: data.user.username,
              image: data.user.image,
            };
            rememberPeer(peerInfo);
            setPeers((prev) => {
              if (prev.some((p) => p.id === data.user_id)) return prev;
              return [...prev, peerInfo];
            });
          }
          setPhase('active');
          syncConnectedPeers();
          void syncRoomTracks();
          window.setTimeout(() => void syncRoomTracksRef.current(), 800);
          window.setTimeout(() => void syncRoomTracksRef.current(), 2000);
        }
      });

      channel.bind('group-call-rejected', (data: { room_name: string; user_id: number }) => {
        if (sessionRef.current?.roomName === data.room_name) {
          setPeers((prev) => prev.filter(p => p.id !== data.user_id));
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

      channel.bind('group-call-ended', async (data: { room_name: string }) => {
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
  }, [phase, callType, connectedPeers, syncRoomTracks]);

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
      setPeers([]);
      setIsGroupCall(false);
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

  const startGroupCall = useCallback(
    async (roomId: number, type: CallType) => {
      setError(null);
      setIsGroupCall(true);
      setPeers([]);
      setCallType(type);
      setPhase('outgoing');
      startCallRingtone('outgoing');

      try {
        await warmUpMediaAccess(type);

        const { data } = await api.post('/api/chat/group-calls/start/', {
          room_id: roomId,
          call_type: type,
        });

        const allPeers: CallPeer[] = (data.participants || [])
          .filter((p: CallPeer) => p.id !== userIdRef.current)
          .map((p: CallPeer) => {
            rememberPeer(p);
            return p;
          });

        setPeers(allPeers);
        allPeers.forEach((p) => getRemoteVideoRef(p.id));

        const peer: CallPeer = allPeers.length > 0 ? allPeers[0] : {
          id: 0,
          display_name: 'Groupe',
          image: null,
        };

        const nextSession: ActiveCallSession = {
          roomName: data.room_name,
          callType: type,
          token: data.token,
          livekitUrl: data.livekit_url,
          peer,
          isOutgoing: true,
          isGroupCall: true,
          roomId: roomId,
          peers: allPeers,
        };

        setSession(nextSession);
        endedRoomsRef.current.delete(data.room_name);
        setPeer(peer);
        setPhase('outgoing');
        await connectRoom(data.livekit_url, data.token, type, false);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Impossible de démarrer l\'appel de groupe.';
        setError(msg);
        await resetCall();
      }
    },
    [connectRoom, getRemoteVideoRef, rememberPeer, resetCall]
  );

  const setupGroupCallFromPayload = useCallback(
    (
      payload: IncomingGroupCallPayload,
      token: string,
      livekitUrl: string,
      isOutgoing: boolean
    ): ActiveCallSession => {
      rememberPeer({
        id: payload.caller.id,
        display_name: payload.caller.display_name,
        username: payload.caller.username,
        image: payload.caller.image,
      });

      const allPeers = (payload.participants || [])
        .filter((p) => p.id !== userIdRef.current)
        .map((p) => {
          const peerInfo = {
            id: p.id,
            display_name: p.display_name,
            username: p.username,
            image: p.image,
          };
          rememberPeer(peerInfo);
          return peerInfo;
        });

      allPeers.forEach((p) => getRemoteVideoRef(p.id));

      const nextSession: ActiveCallSession = {
        roomName: payload.room_name,
        callType: payload.call_type,
        token,
        livekitUrl,
        peer: {
          id: payload.caller.id,
          display_name: payload.caller.display_name,
          username: payload.caller.username,
          image: payload.caller.image,
        },
        isOutgoing,
        isGroupCall: true,
        roomId: payload.room_id,
        peers: allPeers,
      };

      setPeers(allPeers);
      setIsGroupCall(true);
      setCallType(payload.call_type);
      setPeer(nextSession.peer);
      setSession(nextSession);
      sessionRef.current = nextSession;

      return nextSession;
    },
    [getRemoteVideoRef, rememberPeer]
  );

  const joinGroupCall = useCallback(
    async (call: OngoingGroupCall) => {
      if (phaseRef.current !== 'idle') {
        setError('Terminez l\'appel en cours avant d\'en rejoindre un autre.');
        return;
      }

      setError(null);
      stopCallRingtone();
      closeIncomingCallNotification();

      try {
        await warmUpMediaAccess(call.call_type);

        const { data } = await api.post('/api/chat/group-calls/join/', {
          room_name: call.room_name,
        });

        const payload: IncomingGroupCallPayload = {
          room_name: call.room_name,
          call_type: data.call_type ?? call.call_type,
          caller: data.caller ?? call.caller,
          livekit_url: data.livekit_url,
          room_id: data.room_id ?? call.room_id,
          participants: data.participants ?? call.participants ?? [],
        };

        setupGroupCallFromPayload(payload, data.token, data.livekit_url, false);
        setIncoming(null);
        setPhase('active');
        await waitForVideoElements();
        await connectRoom(data.livekit_url, data.token, payload.call_type, false);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Impossible de rejoindre l\'appel de groupe.';
        setError(msg);
        await resetCall();
      }
    },
    [connectRoom, resetCall, setupGroupCallFromPayload]
  );

  const acceptCall = useCallback(async () => {
    if (!incoming) return;
    setError(null);

    const isGroup = 'room_id' in incoming;

    try {
      await warmUpMediaAccess(incoming.call_type);

      const endpoint = isGroup ? '/api/chat/group-calls/respond/' : '/api/chat/calls/respond/';
      const payload: Record<string, any> = {
        room_name: incoming.room_name,
        action: 'accept',
      };
      if (!isGroup) {
        payload.caller_id = incoming.caller.id;
      }

      const { data } = await api.post(endpoint, payload);

      if (isGroup) {
        const groupIncoming = incoming as IncomingGroupCallPayload;
        const joinPayload: IncomingGroupCallPayload = {
          room_name: groupIncoming.room_name,
          call_type: groupIncoming.call_type,
          caller: data.caller ?? groupIncoming.caller,
          livekit_url: data.livekit_url,
          room_id: groupIncoming.room_id,
          participants: data.participants ?? groupIncoming.participants ?? [],
        };
        setupGroupCallFromPayload(joinPayload, data.token, data.livekit_url, false);
        setIncoming(null);
        setPhase('active');
        await waitForVideoElements();
        await connectRoom(data.livekit_url, data.token, groupIncoming.call_type, false);
        return;
      }

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
  }, [connectRoom, incoming, resetCall, setupGroupCallFromPayload]);

  const rejectCall = useCallback(async () => {
    if (!incoming) return;
    const isGroup = 'room_id' in incoming;
    try {
      const endpoint = isGroup ? '/api/chat/group-calls/respond/' : '/api/chat/calls/respond/';
      const payload: Record<string, any> = {
        room_name: incoming.room_name,
        action: 'reject',
      };
      if (!isGroup) {
        payload.caller_id = incoming.caller.id;
      }
      await api.post(endpoint, payload);
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
        peers,
        error,
        isGroupCall,
        startCall,
        startGroupCall,
        joinGroupCall,
        acceptCall,
        rejectCall,
        endCall,
        localVideoRef,
        remoteVideoRef,
        isMuted,
        isCameraOff,
        toggleMute,
        toggleCamera,
        connectedPeers,
        remoteDisplayPeers,
        getRemoteVideoRef,
        registerRemoteVideoElement,
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

function createRef<T>(): React.RefObject<T | null> {
  return { current: null } as React.RefObject<T | null>;
}
