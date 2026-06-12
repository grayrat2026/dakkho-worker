'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, VideoOff, Mic, MicOff, Monitor, MonitorOff,
  PhoneOff, MessageSquare, Users, ArrowLeft, Loader2,
  AlertCircle, Wifi, Hand, Send, X, Headphones,
  Crown, GraduationCap, Eye, Smile, BarChart3, Check,
  ChevronUp, ChevronDown, Radio,
} from 'lucide-react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  useTracks,
  useParticipants,
  useLocalParticipant,
  useDataChannel,
  useRoomContext,
  FocusLayout,
  FocusLayoutContainer,
  TrackToggle,
  DisconnectButton,
} from '@livekit/components-react';
import {
  Track, ConnectionState as ConnectionStateEnum,
  ConnectionQuality, ParticipantEvent,
} from 'livekit-client';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';
import { REACTION_TYPES } from '@/lib/reactions-config';
import '@livekit/components-styles';

// ─── Types ────────────────────────────────────────────────────

interface StudentLiveClassRoomProps {
  roomName: string;
  livekitToken: string;
  livekitUrl: string;
  courseName?: string;
  isVoiceOnly?: boolean;
  onLeave?: () => void;
}

interface ChatMsg {
  id: string;
  name: string;
  message: string;
  timestamp: number;
  isSystem?: boolean;
}

interface Reaction {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

// ─── Data Channel Message ─────────────────────────────────────

interface DataMessage {
  type: 'chat' | 'reaction' | 'raise-hand' | 'hand-lower' | 'poll' | 'poll-response' | 'system';
  payload: any;
  sender: string;
  senderName: string;
  timestamp: number;
}

// ─── Reaction Overlay ─────────────────────────────────────────

function ReactionOverlay({ reactions }: { reactions: Reaction[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            className="absolute text-3xl"
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -120, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            style={{ left: r.x, top: r.y }}
          >
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Student Chat Panel ────────────────────────────────────────

function StudentChatPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const encoder = useRef(new TextEncoder());
  const room = useRoomContext();

  const onMessage = useCallback((msg: any) => {
    try {
      const data: DataMessage = JSON.parse(new TextDecoder().decode(msg.payload as Uint8Array));
      if (data.type === 'chat') {
        setMessages(prev => [...prev, {
          id: `${data.timestamp}-${data.sender}`,
          name: data.senderName,
          message: data.payload,
          timestamp: data.timestamp,
        }]);
      } else if (data.type === 'system') {
        setMessages(prev => [...prev, {
          id: `${data.timestamp}-sys`,
          name: 'System',
          message: data.payload,
          timestamp: data.timestamp,
          isSystem: true,
        }]);
      }
    } catch {}
  }, []);

  useDataChannel(onMessage);

  const sendMessage = useCallback(() => {
    if (!input.trim()) return;
    const data: DataMessage = {
      type: 'chat',
      payload: input.trim(),
      sender: room.localParticipant.identity,
      senderName: room.localParticipant.name || room.localParticipant.identity,
      timestamp: Date.now(),
    };
    room.localParticipant.publishData(encoder.current.encode(JSON.stringify(data)), { reliable: true });
    setInput('');
  }, [input, room]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: 320 }}
      animate={{ x: 0 }}
      exit={{ x: 320 }}
      className="w-80 bg-gray-900 border-l border-white/10 flex flex-col h-full"
    >
      <div className="p-3 border-b border-white/10 flex items-center justify-between">
        <span className="text-white text-sm font-semibold">Chat</span>
        <button onClick={onClose} className="text-white/60 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg) => (
          <div key={msg.id} className={`text-sm ${msg.isSystem ? 'text-center text-white/40 text-xs' : ''}`}>
            {msg.isSystem ? msg.message : (
              <div>
                <span className="text-blue-400 font-semibold text-xs">{msg.name}</span>
                <span className="text-white/80 ml-2">{msg.message}</span>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-3 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 bg-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none placeholder:text-white/40"
          />
          <button onClick={sendMessage} className="p-2 bg-blue-600 rounded-lg hover:bg-blue-500">
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Student Inner Room ────────────────────────────────────────

function StudentRoomInner({ isVoiceOnly }: { isVoiceOnly?: boolean }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  const [focusTrack, setFocusTrack] = useState<typeof tracks[0] | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState(ConnectionQuality.Excellent);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showReactions, setShowReactions] = useState(false);
  const encoder = useRef(new TextEncoder());

  // Auto-focus on screen share
  useEffect(() => {
    const screenShare = tracks.find(t => t.source === Track.Source.ScreenShare);
    if (screenShare) setFocusTrack(screenShare);
    else if (tracks.length > 0 && !focusTrack) setFocusTrack(tracks[0]);
  }, [tracks]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Connection quality
  useEffect(() => {
    const handle = (q: ConnectionQuality) => setConnectionQuality(q);
    localParticipant.on(ParticipantEvent.ConnectionQualityChanged, handle);
    return () => { localParticipant.off(ParticipantEvent.ConnectionQualityChanged, handle); };
  }, [localParticipant]);

  // Data channel
  const onMessage = useCallback((msg: any) => {
    try {
      const data: DataMessage = JSON.parse(new TextDecoder().decode(msg.payload as Uint8Array));
      if (data.type === 'reaction') {
        const r: Reaction = {
          id: `${data.timestamp}-${data.sender}`,
          emoji: data.payload.emoji,
          x: Math.random() * 80 + 10,
          y: Math.random() * 60 + 20,
        };
        setReactions(prev => [...prev, r]);
        setTimeout(() => setReactions(prev => prev.filter(x => x.id !== r.id)), 2500);
      } else if (data.type === 'raise-hand') {
        // Show notification that someone raised hand
      }
    } catch {}
  }, []);

  useDataChannel(onMessage);

  const sendReaction = useCallback((emoji: string) => {
    const data: DataMessage = {
      type: 'reaction',
      payload: { emoji },
      sender: localParticipant.identity,
      senderName: localParticipant.name || localParticipant.identity,
      timestamp: Date.now(),
    };
    localParticipant.publishData(encoder.current.encode(JSON.stringify(data)), { reliable: true });
  }, [localParticipant]);

  const toggleRaiseHand = useCallback(() => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    const data: DataMessage = {
      type: newState ? 'raise-hand' : 'hand-lower',
      payload: {},
      sender: localParticipant.identity,
      senderName: localParticipant.name || localParticipant.identity,
      timestamp: Date.now(),
    };
    localParticipant.publishData(encoder.current.encode(JSON.stringify(data)), { reliable: true });
  }, [isHandRaised, localParticipant]);

  const qualityColor = connectionQuality === ConnectionQuality.Excellent ? 'text-green-400' :
                       connectionQuality === ConnectionQuality.Good ? 'text-yellow-400' : 'text-red-400';
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col relative">
      <ReactionOverlay reactions={reactions} />

      <div className="flex-1 flex relative overflow-hidden">
        <div className={`flex-1 ${isVoiceOnly ? 'flex items-center justify-center' : ''}`}>
          {isVoiceOnly ? (
            <div className="flex flex-wrap items-center justify-center gap-4 p-6 max-w-2xl mx-auto">
              {participants.map((p) => (
                <motion.div
                  key={p.identity}
                  className="flex flex-col items-center"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold ${
                    p.isMicrophoneEnabled ? '' : 'opacity-50'
                  }`}>
                    {(p.name || p.identity).charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white text-xs mt-1 truncate max-w-[80px]">
                    {p.name || p.identity}
                  </span>
                  {p.isMicrophoneEnabled && (
                    <div className="flex items-end gap-0.5 h-3">
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-green-400 rounded-full"
                          animate={{ height: [4, 12, 6, 10, 4] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <FocusLayoutContainer className="h-full">
              {focusTrack && (
                <FocusLayout trackRef={focusTrack} className="h-full">
                  <ParticipantTile trackRef={focusTrack} className="h-full" />
                </FocusLayout>
              )}
              {tracks.filter(t => t !== focusTrack).length > 0 && (
                <div className="grid grid-cols-3 gap-1 p-1">
                  {tracks.filter(t => t !== focusTrack).map((track) => (
                    <ParticipantTile key={track.participant.identity} trackRef={track} />
                  ))}
                </div>
              )}
            </FocusLayoutContainer>
          )}
        </div>

        <StudentChatPanel isOpen={showChat} onClose={() => setShowChat(false)} />
      </div>

      <RoomAudioRenderer />

      {/* Bottom control bar */}
      <div className="bg-gray-900/95 border-t border-white/10 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <motion.div
                className="w-2 h-2 rounded-full bg-red-500"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-white text-xs font-mono">{formatTime(elapsedTime)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Wifi className={`w-3.5 h-3.5 ${qualityColor}`} />
              <span className={`text-xs ${qualityColor}`}>
                {connectionQuality === ConnectionQuality.Excellent ? 'Excellent' :
                 connectionQuality === ConnectionQuality.Good ? 'Good' : 'Poor'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TrackToggle source={Track.Source.Microphone} />
            {!isVoiceOnly && <TrackToggle source={Track.Source.Camera} />}

            {/* Raise hand */}
            <button
              onClick={toggleRaiseHand}
              className={`p-2 rounded-lg transition-colors ${
                isHandRaised ? 'bg-yellow-500/20 text-yellow-400' : 'hover:bg-white/10 text-white/60'
              }`}
            >
              <Hand className="w-5 h-5" />
            </button>

            <DisconnectButton className="p-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors">
              <PhoneOff className="w-5 h-5" />
            </DisconnectButton>
          </div>

          <div className="flex items-center gap-2">
            {showReactions && (
              <div className="flex items-center gap-1">
                {REACTION_TYPES.slice(0, 5).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => sendReaction(r.emoji)}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-all hover:scale-110"
                  >
                    <span className="text-lg">{r.emoji}</span>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowReactions(!showReactions)}
              className={`p-2 rounded-lg transition-colors ${showReactions ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/60'}`}
            >
              <Smile className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-2 rounded-lg transition-colors ${showChat ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/60'}`}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Student Live Class Room ──────────────────────────────

export function StudentLiveClassRoom({
  roomName,
  livekitToken,
  livekitUrl,
  courseName,
  isVoiceOnly,
  onLeave,
}: StudentLiveClassRoomProps) {
  const [connectionState, setConnectionState] = useState<string>('disconnected');

  return (
    <div className="h-[calc(100vh-64px)] -m-4 md:-m-6 flex flex-col bg-black">
      <div className="flex items-center gap-3 px-4 py-2 bg-black/80 border-b border-white/10 z-10">
        <button onClick={onLeave} className="p-1.5 rounded-lg hover:bg-white/10">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h3 className="text-white text-sm font-semibold">{courseName || roomName}</h3>
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-400 capitalize">{connectionState}</span>
            <span className="text-xs text-white/30">·</span>
            <GraduationCap className="w-3 h-3 text-blue-400" />
            <span className="text-xs text-blue-400">Student</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <LiveKitRoom
          video={!isVoiceOnly}
          audio={true}
          token={livekitToken}
          serverUrl={livekitUrl}
          onDisconnected={() => setConnectionState('disconnected')}
          onConnected={() => setConnectionState('connected')}
          adaptDynacast={true}
          autoSubscribe={true}
          style={{ height: '100%', width: '100%' }}
        >
          <StudentRoomInner isVoiceOnly={isVoiceOnly} />
        </LiveKitRoom>
      </div>
    </div>
  );
}
