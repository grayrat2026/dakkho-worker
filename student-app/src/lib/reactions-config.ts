export interface EmojiReaction {
  id: string;
  emoji: string;
  label: string;
  color: string;
}

export const REACTION_TYPES: EmojiReaction[] = [
  { id: 'like', emoji: '👍', label: 'Like', color: '#3B82F6' },
  { id: 'love', emoji: '❤️', label: 'Love', color: '#EF4444' },
  { id: 'clap', emoji: '👏', label: 'Clap', color: '#F59E0B' },
  { id: 'fire', emoji: '🔥', label: 'Fire', color: '#F97316' },
  { id: 'laugh', emoji: '😂', label: 'Laugh', color: '#10B981' },
  { id: 'wow', emoji: '😮', label: 'Wow', color: '#8B5CF6' },
  { id: 'think', emoji: '🤔', label: 'Think', color: '#6366F1' },
  { id: 'raise', emoji: '✋', label: 'Raise Hand', color: '#14B8A6' },
  { id: 'celebration', emoji: '🎉', label: 'Celebrate', color: '#EC4899' },
  { id: '100', emoji: '💯', label: '100', color: '#EF4444' },
];
