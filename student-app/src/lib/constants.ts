export const APP_NAME = 'DAKKHO';
export const APP_DESCRIPTION = "Bangladesh's Premier Polytechnic Student Streaming Platform";

// LiveKit public URL for client SDK — credentials are stored in KV on backend
export const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://dakkho-u74kq16n.livekit.cloud';

export const COLORS = {
  primary: '#0ea5e9',
  primaryDeep: '#2563eb',
  background: '#f0f9ff',
  cardBg: 'rgba(255,255,255,0.7)',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  accent: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  gradient: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
} as const;

// Technologies are now fetched from Worker API: GET /api/technologies
// This constant is removed — use technologyApi.list() from api-client.ts

export const LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;

export const OTP_LENGTH = 6;
export const OTP_RESEND_COOLDOWN = 60;

export const SIDEBAR_WIDTH = 260;
export const TOPBAR_HEIGHT = 64;
export const BOTTOM_NAV_HEIGHT = 64;

// Map old department page IDs to D1 technology short_codes
export const DEPT_TO_TECHNOLOGY: Record<string, string> = {
  'dept-cse': 'CST',
  'dept-eee': 'ET',
  'dept-me': 'MT',
  'dept-ce': 'CT',
  'dept-ete': 'EnT',
  'dept-power': 'PT',
  'dept-architecture': 'CT',       // Architecture → Civil (closest in D1)
  'dept-textile': 'CST',           // Textile → CST (no Textile tech, default to CST)
  'dept-chemical': 'CST',          // Chemical → CST (no Chemical tech, default to CST)
  'dept-automobile': 'MT',         // Automobile → Mechanical (under Mech faculty)
  'dept-rac': 'MT',                // Refrigeration & AC → Mechanical (under Mech faculty)
  'dept-glass-ceramic': 'MT',      // Glass & Ceramic → Mechanical (thermal/materials processing)
  'dept-printing': 'CST',          // Printing → CST (no Printing tech, default to CST)
  'dept-surveying': 'CT',          // Surveying → Civil (sub-field of Civil)
  'dept-mechatronics': 'EnT',      // Mechatronics → Electronics (cross E&M, closest to EnT)
  'dept-mining': 'MT',             // Mining → Mechanical (involves heavy machinery)
  'dept-metallurgical': 'MT',      // Metallurgical → Mechanical (materials processing)
  'dept-instrumentation': 'EnT',   // Instrumentation → Electronics (closest to EnT)
  'dept-food': 'CST',              // Food → CST (no Food tech, default to CST)
  'dept-leather': 'CST',           // Leather → CST (no Leather tech, default to CST)
};

// Technology short_code to display name mapping (D1 data)
export const TECHNOLOGY_SHORT_NAMES: Record<string, string> = {
  CT: 'Civil Technology',
  CST: 'Computer Science & Technology',
  ET: 'Electrical Technology',
  EMT: 'Electro Medical Technology',
  EnT: 'Electronics Technology',
  MT: 'Mechanical Technology',
  PT: 'Power Technology',
};
