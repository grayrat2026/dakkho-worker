/**
 * Admin routes — GET /audit, DELETE /sessions, PUT /config/reset
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import type { AuthVariables } from '../lib/auth';
import { adminAuthMiddleware } from '../lib/auth';
import { logAudit } from '../lib/audit';
import { DEFAULT_CONFIG } from '../lib/types';
import { getErrorMessage } from '../lib/utils';

const adminRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Apply auth middleware to all admin routes
adminRoutes.use('*', adminAuthMiddleware);

// GET /audit — Get audit logs with pagination
adminRoutes.get('/audit', async (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
    const offset = parseInt(c.req.query('offset') || '0');
    const action = c.req.query('action');

    let query = 'SELECT id, action, resource_type, resource_id, user_id, user_email, details, created_at FROM audit_logs';
    const params: unknown[] = [];

    if (action) {
      query += ' WHERE action = ?';
      params.push(action);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const { results } = await c.env.DB.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM audit_logs';
    const countParams: unknown[] = [];
    if (action) {
      countQuery += ' WHERE action = ?';
      countParams.push(action);
    }
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ total: number }>();

    return c.json({
      logs: results,
      total: countResult?.total || 0,
      limit,
      offset,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// DELETE /sessions — Clear all admin sessions
adminRoutes.delete('/sessions', async (c) => {
  try {
    const user = c.get('user');

    await c.env.DB.prepare(
      'UPDATE admin_sessions SET is_active = 0 WHERE is_active = 1'
    ).run();

    await logAudit(c.env, user.id, 'CLEAR_SESSIONS', 'admin', undefined, { action: 'clear_all' });

    return c.json({ success: true, message: 'All sessions cleared' });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// ─── Exam Tips Admin Routes ───

// Default exam tips — shared between admin and student endpoints
const DEFAULT_EXAM_TIPS = {
  strategies: [
    { title: 'Active Recall Method', description: 'Instead of re-reading notes, close your book and try to recall the key concepts from memory. This strengthens neural connections and improves long-term retention.', tip: 'Try this: After each chapter, write down everything you remember without looking. Then check what you missed.' },
    { title: 'Spaced Repetition', description: 'Review material at increasing intervals (1 day, 3 days, 7 days, 14 days). This technique leverages the spacing effect for optimal memory retention.', tip: "Use DAKKHO's built-in review reminders to schedule your spaced repetition sessions automatically." },
    { title: 'Pomodoro Technique', description: 'Study in focused 25-minute blocks followed by 5-minute breaks. After 4 blocks, take a longer 15-30 minute break. This maintains concentration and prevents burnout.', tip: 'Set a timer on your phone. During the 25 minutes, eliminate all distractions — no phone, no social media.' },
    { title: 'Feynman Technique', description: "Explain the concept in simple terms as if teaching someone else. If you can't explain it simply, you don't understand it well enough.", tip: 'Try recording yourself explaining a topic. Listen back and notice where you hesitate or get confused.' },
    { title: 'Practice Testing', description: 'Take practice exams under realistic conditions. This not only tests your knowledge but also reduces exam anxiety by making the actual exam feel familiar.', tip: "Use DAKKHO's Practice Mode with timed sessions. Aim to complete practice tests faster than the actual time limit." },
  ],
  timeManagement: [
    { title: 'Create a Study Schedule', desc: 'Plan your study sessions at least 2 weeks before the exam. Allocate more time to difficult subjects.', priority: 'High' },
    { title: 'Use the 80/20 Rule', desc: 'Focus 80% of your time on the 20% of topics most likely to appear on the exam. Analyze past papers to identify patterns.', priority: 'High' },
    { title: 'Set Daily Goals', desc: "Break down your syllabus into daily chunks. Complete each day's target before moving on.", priority: 'Medium' },
    { title: 'Prioritize Weak Areas', desc: 'Start study sessions with your weakest topics when your mind is fresh.', priority: 'High' },
    { title: 'Review Before Sleep', desc: 'Study the most important material right before going to sleep. Your brain consolidates memories during sleep.', priority: 'Low' },
  ],
  commonMistakes: [
    { mistake: 'Cramming the night before', consequence: 'Information overload leads to confusion and anxiety.', fix: 'Start early and review regularly using spaced repetition.' },
    { mistake: 'Skipping practice problems', consequence: 'You may struggle to apply concepts under time pressure.', fix: 'Solve at least 10 practice problems for each topic.' },
    { mistake: 'Not reading questions carefully', consequence: 'Misunderstanding a question can cost you marks.', fix: 'Read each question twice. Underline key terms.' },
    { mistake: 'Not managing exam time', consequence: 'Spending too long on difficult questions means easier ones go unanswered.', fix: 'Allocate time per question. Skip difficult ones and return later.' },
  ],
  wellness: [
    { title: 'Sleep Well', desc: 'Aim for 7-8 hours of quality sleep. Avoid screens 30 minutes before bed.', time: 'Night' },
    { title: 'Stay Hydrated', desc: 'Drink at least 8 glasses of water daily. Dehydration impairs concentration by up to 30%.', time: 'All Day' },
    { title: 'Take Regular Breaks', desc: 'Follow the 50/10 rule: 50 minutes of study, 10 minutes of break.', time: 'Study Time' },
    { title: 'Practice Mindfulness', desc: '5 minutes of deep breathing or meditation before studying can significantly improve focus.', time: 'Before Study' },
  ],
};

// GET /exam-tips — Get exam tips (admin)
adminRoutes.get('/exam-tips', async (c) => {
  try {
    // Try D1 app_config table
    const row = await c.env.DB.prepare(
      "SELECT value FROM app_config WHERE key = 'exam_tips'"
    ).first<{ value: string }>();

    if (row?.value) {
      try {
        const tips = JSON.parse(row.value);
        return c.json({ tips, isDefault: false });
      } catch {
        // Invalid JSON, fall through to defaults
      }
    }

    // Return default tips so admin can see what students see and edit them
    return c.json({ tips: DEFAULT_EXAM_TIPS, isDefault: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// PUT /exam-tips — Update exam tips (admin)
adminRoutes.put('/exam-tips', async (c) => {
  try {
    const user = c.get('user');
    const tips = await c.req.json();

    const value = JSON.stringify(tips);

    // Upsert into app_config
    await c.env.DB.prepare(
      "INSERT INTO app_config (key, value, updated_at) VALUES ('exam_tips', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')"
    ).bind(value, value).run();

    // Update KV cache (5 min TTL)
    try {
      await c.env.KV_CONFIG.put('exam_tips', value, { expirationTtl: 300 });
    } catch {}

    // Audit log
    await logAudit(c.env, user.id, 'UPDATE_EXAM_TIPS', 'app_config', 'exam_tips', { action: 'update' });

    return c.json({ success: true, message: 'Exam tips updated' });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

export default adminRoutes;
