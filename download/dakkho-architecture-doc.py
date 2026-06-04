#!/usr/bin/env python3
"""DAKKHO Platform — Full Architecture Document (PDF)"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, Image
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ─── Font Registration ───
pdfmetrics.registerFont(TTFont('NotoSerifSC', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSansMono', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))

registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans-Bold')

# ─── Palette ───
ACCENT       = colors.HexColor('#1e7693')
TEXT_PRIMARY  = colors.HexColor('#1f2022')
TEXT_MUTED    = colors.HexColor('#81868d')
BG_SURFACE   = colors.HexColor('#e0e4e8')
BG_PAGE      = colors.HexColor('#f3f4f5')
TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = BG_SURFACE

# ─── Styles ───
W = A4[0]
H = A4[1]
LEFT_M = 1.0 * inch
RIGHT_M = 1.0 * inch
available_width = W - LEFT_M - RIGHT_M

title_style = ParagraphStyle(
    'DocTitle', fontName='NotoSerifSC', fontSize=24, leading=32,
    alignment=TA_CENTER, textColor=ACCENT, spaceAfter=6
)
subtitle_style = ParagraphStyle(
    'DocSubtitle', fontName='NotoSerifSC', fontSize=14, leading=20,
    alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=24
)
h1_style = ParagraphStyle(
    'H1', fontName='NotoSerifSC', fontSize=18, leading=26,
    textColor=ACCENT, spaceBefore=18, spaceAfter=10
)
h2_style = ParagraphStyle(
    'H2', fontName='NotoSerifSC', fontSize=14, leading=20,
    textColor=TEXT_PRIMARY, spaceBefore=12, spaceAfter=6
)
h3_style = ParagraphStyle(
    'H3', fontName='NotoSerifSC', fontSize=12, leading=18,
    textColor=ACCENT, spaceBefore=8, spaceAfter=4
)
body_style = ParagraphStyle(
    'Body', fontName='NotoSerifSC', fontSize=10.5, leading=18,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, wordWrap='CJK',
    spaceAfter=6, firstLineIndent=21
)
body_en_style = ParagraphStyle(
    'BodyEN', fontName='DejaVuSans', fontSize=10.5, leading=18,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, wordWrap='CJK',
    spaceAfter=6
)
code_style = ParagraphStyle(
    'Code', fontName='DejaVuSans', fontSize=8.5, leading=13,
    alignment=TA_LEFT, textColor=colors.HexColor('#c7254e'),
    backColor=colors.HexColor('#f9f2f4'), wordWrap='CJK',
    spaceAfter=4, leftIndent=12, rightIndent=12,
    spaceBefore=2, borderPadding=4
)
header_cell_style = ParagraphStyle(
    'HeaderCell', fontName='NotoSerifSC', fontSize=9.5, leading=14,
    textColor=TABLE_HEADER_TEXT, alignment=TA_CENTER, wordWrap='CJK'
)
cell_style = ParagraphStyle(
    'Cell', fontName='NotoSerifSC', fontSize=9, leading=13,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK'
)
cell_en_style = ParagraphStyle(
    'CellEN', fontName='DejaVuSans', fontSize=9, leading=13,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT
)

# ─── Helper ───
def make_table(data, col_ratios=None):
    if col_ratios:
        col_widths = [r * available_width for r in col_ratios]
    else:
        col_widths = None
    t = Table(data, colWidths=col_widths, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

# ─── Build ───
output_path = '/home/z/my-project/download/DAKKHO_Platform_Architecture.pdf'
doc = SimpleDocTemplate(
    output_path, pagesize=A4,
    leftMargin=LEFT_M, rightMargin=RIGHT_M,
    topMargin=0.8*inch, bottomMargin=0.8*inch,
    title='DAKKHO Platform Architecture',
    author='Z.ai'
)

story = []

# ═══════════════════════════════════════════════════════════════
# COVER
# ═══════════════════════════════════════════════════════════════
story.append(Spacer(1, 100))
story.append(Paragraph('<b>DAKKHO Platform</b>', title_style))
story.append(Paragraph('<b>Full Architecture Document</b>', ParagraphStyle(
    'Title2', fontName='NotoSerifSC', fontSize=20, leading=28,
    alignment=TA_CENTER, textColor=TEXT_PRIMARY
)))
story.append(Spacer(1, 16))
story.append(Paragraph('Admin Panel + Student Panel + Cloudflare Workers + Appwrite', subtitle_style))
story.append(Spacer(1, 40))

meta_data = [
    [Paragraph('<b>Item</b>', header_cell_style), Paragraph('<b>Details</b>', header_cell_style)],
    [Paragraph('Project', cell_style), Paragraph('DAKKHO Learning Platform', cell_style)],
    [Paragraph('Backend', cell_style), Paragraph('Cloudflare Workers (Hono Framework)', cell_style)],
    [Paragraph('Frontend', cell_style), Paragraph('Next.js 16 + React 19 + Zustand + shadcn/ui', cell_style)],
    [Paragraph('Database', cell_style), Paragraph('Appwrite (dakkho_main) + D1 (sessions/audit)', cell_style)],
    [Paragraph('Storage', cell_style), Paragraph('R2 (4 buckets: videos/thumbnails/avatars/resources)', cell_style)],
    [Paragraph('Auth', cell_style), Paragraph('Appwrite Auth + D1 Session Tokens', cell_style)],
    [Paragraph('Email', cell_style), Paragraph('Resend API', cell_style)],
    [Paragraph('Date', cell_style), Paragraph('2026-06-04', cell_style)],
]
story.append(make_table(meta_data, [0.25, 0.75]))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════
# 1. SYSTEM OVERVIEW
# ═══════════════════════════════════════════════════════════════
story.append(Paragraph('<b>1. System Overview</b>', h1_style))
story.append(Paragraph(
    'DAKKHO একটি বাংলাদেশ-ভিত্তিক ই-লার্নিং প্ল্যাটফর্ম যেখানে ভিডিও কোর্স, ইনস্ট্রাক্টর, এবং ইনস্টিটিউট ম্যানেজ করা হয়। '
    'পুরো সিস্টেম Cloudflare ইকোসিস্টেমে চলে — Workers ব্যাকএন্ড, Pages ফ্রন্টএন্ড, R2 স্টোরেজ, D1 ডাটাবেস, KV ক্যাশ। '
    'Appwrite প্রাইমারি ডাটাবেস এবং অথ প্রোভাইডার হিসেবে কাজ করে। ফ্রন্টএন্ড Next.js 16 দিয়ে স্ট্যাটিক এক্সপোর্ট হয় এবং Cloudflare Pages-এ হোস্ট হয়।',
    body_style
))
story.append(Paragraph(
    'আর্কিটেকচারের মূল নীতি: ফ্রন্টএন্ড সম্পূর্ণ স্ট্যাটিক (SPA), সব ডাটা API দিয়ে আসে। কোনো সার্ভার-সাইড রেন্ডারিং নেই। '
    'Admin Panel এবং Student Panel দুটো আলাদা SPA — একই Workers API শেয়ার করে, কিন্তু আলাদা auth model ব্যবহার করে। '
    'Admin D1 session token দিয়ে auth করে, Student সরাসরি Appwrite session ব্যবহার করবে।',
    body_style
))

story.append(Spacer(1, 8))
story.append(Paragraph('<b>Architecture Diagram (Text)</b>', h3_style))
arch_data = [
    [Paragraph('<b>Layer</b>', header_cell_style), Paragraph('<b>Component</b>', header_cell_style), Paragraph('<b>Technology</b>', header_cell_style), Paragraph('<b>Role</b>', header_cell_style)],
    [Paragraph('Frontend', cell_style), Paragraph('Admin Panel', cell_style), Paragraph('Next.js + Zustand + shadcn/ui', cell_style), Paragraph('Admin dashboard SPA', cell_style)],
    [Paragraph('Frontend', cell_style), Paragraph('Student Panel', cell_style), Paragraph('Next.js + Zustand + shadcn/ui', cell_style), Paragraph('Student learning SPA', cell_style)],
    [Paragraph('CDN/Hosting', cell_style), Paragraph('Cloudflare Pages', cell_style), Paragraph('Static site hosting', cell_style), Paragraph('Frontend delivery', cell_style)],
    [Paragraph('API', cell_style), Paragraph('Cloudflare Workers', cell_style), Paragraph('Hono framework', cell_style), Paragraph('REST API backend', cell_style)],
    [Paragraph('Database', cell_style), Paragraph('Appwrite', cell_style), Paragraph('Cloud (SGP region)', cell_style), Paragraph('Primary data + auth', cell_style)],
    [Paragraph('Database', cell_style), Paragraph('D1', cell_style), Paragraph('Cloudflare native', cell_style), Paragraph('Sessions + audit + config', cell_style)],
    [Paragraph('Storage', cell_style), Paragraph('R2', cell_style), Paragraph('4 buckets', cell_style), Paragraph('Videos/thumbnails/avatars/resources', cell_style)],
    [Paragraph('Cache', cell_style), Paragraph('Workers KV', cell_style), Paragraph('Cloudflare native', cell_style), Paragraph('Config cache + broadcast', cell_style)],
    [Paragraph('Email', cell_style), Paragraph('Resend', cell_style), Paragraph('REST API', cell_style), Paragraph('Transactional email', cell_style)],
]
story.append(make_table(arch_data, [0.12, 0.18, 0.30, 0.40]))

# ═══════════════════════════════════════════════════════════════
# 2. AUTH FLOW
# ═══════════════════════════════════════════════════════════════
story.append(Paragraph('<b>2. Authentication Flow</b>', h1_style))

story.append(Paragraph('<b>2.1 Admin Auth (Current)</b>', h2_style))
story.append(Paragraph(
    'Admin লগইন করার সময় ফ্রন্টএন্ড POST /admin/auth/login কল করে email এবং password পাঠায়। '
    'Worker প্রথমে Appwrite-এ ইমেইল সেশন তৈরি করে, তারপর ইউজারের prefs.role চেক করে অ্যাডমিন কিনা দেখে। '
    'যদি অ্যাডমিন হয়, D1-তে একটি নতুন সেশন রো তৈরি হয় (id = UUID, user_id = Appwrite user ID)। '
    'Appwrite সেশন তারপর ডিলিট হয়ে যায় — Worker নিজে D1 সেশন দিয়ে auth চালায়। '
    'ফ্রন্টএন্ড localStorage-এ token (sessionId) সেভ করে এবং প্রতিটি API রিকোয়েস্টে Authorization: Bearer header পাঠায়।',
    body_style
))

auth_steps = [
    [Paragraph('<b>Step</b>', header_cell_style), Paragraph('<b>Action</b>', header_cell_style), Paragraph('<b>Detail</b>', header_cell_style)],
    [Paragraph('1', cell_style), Paragraph('Appwrite Login', cell_style), Paragraph('POST /account/sessions/email with email+password, get sessionCookie', cell_style)],
    [Paragraph('2', cell_style), Paragraph('Get Account', cell_style), Paragraph('GET /account with sessionCookie, verify prefs.role === "admin"', cell_style)],
    [Paragraph('3', cell_style), Paragraph('Create D1 Session', cell_style), Paragraph('DELETE old sessions for user_id, INSERT new session (id=UUID, expires_at=+7d)', cell_style)],
    [Paragraph('4', cell_style), Paragraph('Delete Appwrite Session', cell_style), Paragraph('DELETE /account/sessions/current (we use our own token model)', cell_style)],
    [Paragraph('5', cell_style), Paragraph('Return Token', cell_style), Paragraph('{ success: true, token: sessionId, user: {id, email, name, role} }', cell_style)],
    [Paragraph('6', cell_style), Paragraph('Frontend Stores', cell_style), Paragraph('localStorage.setItem("dakkho_admin_token", sessionId)', cell_style)],
]
story.append(make_table(auth_steps, [0.08, 0.20, 0.72]))

story.append(Paragraph('<b>2.2 Student Auth (Recommended)</b>', h2_style))
story.append(Paragraph(
    'Student Panel-এর জন্য অ্যাডমিন auth model ব্যবহার করা যাবে না কারণ স্টুডেন্টদের সংখ্যা অনেক বেশি এবং D1 সেশন ম্যানেজমেন্ট স্কেলেবল নয়। '
    'পরিবর্তে স্টুডেন্টরা সরাসরি Appwrite Auth ব্যবহার করবে। Worker স্টুডেন্ট লগইনে Appwrite সেশন তৈরি করবে এবং সেশন কুকি ক্লায়েন্টকে দেবে। '
    'প্রতিটি Student API রিকোয়েস্টে সেই কুকি ব্যবহার হবে user-scoped Appwrite queries চালানোর জন্য। '
    'এই মডেলে স্টুডেন্ট শুধু নিজের ডাটা অ্যাক্সেস করতে পারবে — Appwrite অটোমেটিক্যালি permission enforce করবে।',
    body_style
))

student_auth = [
    [Paragraph('<b>Aspect</b>', header_cell_style), Paragraph('<b>Admin Panel</b>', header_cell_style), Paragraph('<b>Student Panel</b>', header_cell_style)],
    [Paragraph('Auth Provider', cell_style), Paragraph('D1 Session Token', cell_style), Paragraph('Appwrite Session Cookie', cell_style)],
    [Paragraph('Token Storage', cell_style), Paragraph('localStorage', cell_style), Paragraph('httpOnly Cookie or localStorage', cell_style)],
    [Paragraph('Token Format', cell_style), Paragraph('UUID (sessionId)', cell_style), Paragraph('Appwrite session token', cell_style)],
    [Paragraph('Auth Header', cell_style), Paragraph('Authorization: Bearer {id}', cell_style), Paragraph('Cookie: a_session_dakkho={token}', cell_style)],
    [Paragraph('Permission Model', cell_style), Paragraph('API key (full access)', cell_style), Paragraph('User-scoped (own data only)', cell_style)],
    [Paragraph('Session Store', cell_style), Paragraph('D1 admin_sessions table', cell_style), Paragraph('Appwrite internal', cell_style)],
    [Paragraph('Expiry', cell_style), Paragraph('7 days', cell_style), Paragraph('Appwrite default (1 year)', cell_style)],
]
story.append(make_table(student_auth, [0.18, 0.41, 0.41]))

# ═══════════════════════════════════════════════════════════════
# 3. API ENDPOINTS
# ═══════════════════════════════════════════════════════════════
story.append(Paragraph('<b>3. API Endpoints Reference</b>', h1_style))
story.append(Paragraph(
    'সব API endpoint Cloudflare Workers-এ হোস্ট হয়: https://dakkho-admin-api.dakkho-admin.workers.dev/। '
    'Admin routes /admin/ prefix-এ মাউন্ট হয় এবং Bearer token auth লাগে। Student routes /student/ prefix-এ মাউন্ট হবে এবং Appwrite session auth ব্যবহার করবে। '
    'CORS শুধু অনুমোদিত origins (Cloudflare Pages, localhost) থেকে রিকোয়েস্ট allow করে।',
    body_style
))

story.append(Paragraph('<b>3.1 Admin API (Current)</b>', h2_style))
admin_api = [
    [Paragraph('<b>Method</b>', header_cell_style), Paragraph('<b>Endpoint</b>', header_cell_style), Paragraph('<b>Auth</b>', header_cell_style), Paragraph('<b>Description</b>', header_cell_style)],
    [Paragraph('POST', cell_style), Paragraph('/admin/auth/login', cell_style), Paragraph('No', cell_style), Paragraph('Login with email+password, returns token+user', cell_style)],
    [Paragraph('POST', cell_style), Paragraph('/admin/auth/check', cell_style), Paragraph('Bearer', cell_style), Paragraph('Verify if session is valid', cell_style)],
    [Paragraph('DELETE', cell_style), Paragraph('/admin/auth/logout', cell_style), Paragraph('Bearer', cell_style), Paragraph('Invalidate admin session', cell_style)],
    [Paragraph('GET', cell_style), Paragraph('/admin/users', cell_style), Paragraph('Bearer', cell_style), Paragraph('List users (page, limit, search, role, status)', cell_style)],
    [Paragraph('PUT', cell_style), Paragraph('/admin/users', cell_style), Paragraph('Bearer', cell_style), Paragraph('Update user (userId + updates)', cell_style)],
    [Paragraph('DELETE', cell_style), Paragraph('/admin/users', cell_style), Paragraph('Bearer', cell_style), Paragraph('Delete user by id', cell_style)],
    [Paragraph('GET', cell_style), Paragraph('/admin/courses', cell_style), Paragraph('Bearer', cell_style), Paragraph('List courses (page, limit, search, level, published, featured)', cell_style)],
    [Paragraph('POST', cell_style), Paragraph('/admin/courses', cell_style), Paragraph('Bearer', cell_style), Paragraph('Create course', cell_style)],
    [Paragraph('PUT', cell_style), Paragraph('/admin/courses', cell_style), Paragraph('Bearer', cell_style), Paragraph('Update course (courseId + updates)', cell_style)],
    [Paragraph('DELETE', cell_style), Paragraph('/admin/courses', cell_style), Paragraph('Bearer', cell_style), Paragraph('Delete course by id', cell_style)],
    [Paragraph('GET', cell_style), Paragraph('/admin/videos', cell_style), Paragraph('Bearer', cell_style), Paragraph('List videos (page, limit, courseId, published)', cell_style)],
    [Paragraph('POST', cell_style), Paragraph('/admin/videos', cell_style), Paragraph('Bearer', cell_style), Paragraph('Create video', cell_style)],
    [Paragraph('PUT', cell_style), Paragraph('/admin/videos', cell_style), Paragraph('Bearer', cell_style), Paragraph('Update video', cell_style)],
    [Paragraph('DELETE', cell_style), Paragraph('/admin/videos', cell_style), Paragraph('Bearer', cell_style), Paragraph('Delete video', cell_style)],
    [Paragraph('GET', cell_style), Paragraph('/admin/instructors', cell_style), Paragraph('Bearer', cell_style), Paragraph('List instructors (page, limit, search)', cell_style)],
    [Paragraph('GET', cell_style), Paragraph('/admin/categories', cell_style), Paragraph('Bearer', cell_style), Paragraph('List categories (limit, orderAsc by sort_order)', cell_style)],
    [Paragraph('GET', cell_style), Paragraph('/admin/institutes', cell_style), Paragraph('Bearer', cell_style), Paragraph('List institutes', cell_style)],
    [Paragraph('GET', cell_style), Paragraph('/admin/config', cell_style), Paragraph('Bearer', cell_style), Paragraph('Get full ServerConfig (KV cache then D1)', cell_style)],
    [Paragraph('PUT', cell_style), Paragraph('/admin/config', cell_style), Paragraph('Bearer', cell_style), Paragraph('Update ServerConfig (D1 upsert + KV update)', cell_style)],
    [Paragraph('GET', cell_style), Paragraph('/admin/notifications', cell_style), Paragraph('Bearer', cell_style), Paragraph('List notifications (page, limit, userId)', cell_style)],
    [Paragraph('POST', cell_style), Paragraph('/admin/notifications', cell_style), Paragraph('Bearer', cell_style), Paragraph('Create notification (targetAll/targetUserId/targetInstitute)', cell_style)],
    [Paragraph('GET', cell_style), Paragraph('/admin/analytics', cell_style), Paragraph('Bearer', cell_style), Paragraph('Stats: users, courses, videos, enrollments, sessions', cell_style)],
    [Paragraph('POST', cell_style), Paragraph('/admin/upload', cell_style), Paragraph('Bearer', cell_style), Paragraph('Upload file to R2 (FormData: file, bucket, prefix)', cell_style)],
    [Paragraph('POST', cell_style), Paragraph('/admin/email/test', cell_style), Paragraph('Bearer', cell_style), Paragraph('Send test email via Resend', cell_style)],
    [Paragraph('GET', cell_style), Paragraph('/admin/system/status', cell_style), Paragraph('No', cell_style), Paragraph('Health check: appwrite, r2, d1, kv, email', cell_style)],
    [Paragraph('POST', cell_style), Paragraph('/admin/system/api-key', cell_style), Paragraph('Bearer', cell_style), Paragraph('Update Appwrite API key in KV', cell_style)],
]
story.append(make_table(admin_api, [0.08, 0.30, 0.08, 0.54]))

story.append(Paragraph('<b>3.2 Student API (Recommended — New)</b>', h2_style))
story.append(Paragraph(
    'Student Panel-এর জন্য নতুন /student/ route group তৈরি করতে হবে Worker-এ। এই routes Appwrite session cookie দিয়ে auth করবে, '
    'API key দিয়ে নয়। স্টুডেন্ট শুধু নিজের এনরোলড কোর্স, watch progress, bookmarks, notifications দেখতে পারবে। '
    'নিচে recommended endpoints দেওয়া হলো:',
    body_style
))

student_api = [
    [Paragraph('<b>Method</b>', header_cell_style), Paragraph('<b>Endpoint</b>', header_cell_style), Paragraph('<b>Description</b>', header_cell_style)],
    [Paragraph('POST', cell_style), Paragraph('/student/auth/login', cell_style), Paragraph('Login with email+password, returns Appwrite session cookie', cell_style)],
    [Paragraph('POST', cell_style), Paragraph('/student/auth/check', cell_style), Paragraph('Verify Appwrite session, return user profile', cell_style)],
    [Paragraph('DELETE', cell_style), Paragraph('/student/auth/logout', cell_style), Paragraph('Delete Appwrite session', cell_style)],
    [Paragraph('GET', cell_style), Paragraph('/student/profile', cell_style), Paragraph('Get own profile from Appwrite users collection', cell_style)],
    [Paragraph('PUT', cell_style), Paragraph('/student/profile', cell_style), Paragraph('Update own profile (name, avatarUrl, etc.)', cell_style)],
    [Paragraph('GET', cell_style), Paragraph('/student/courses', cell_style), Paragraph('List enrolled courses with progress', cell_style)],
    [Paragraph('GET', cell_style), Paragraph('/student/courses/all', cell_style), Paragraph('List all published courses (catalog)', cell_style)],
    [Paragraph('POST', cell_style), Paragraph('/student/enroll', cell_style), Paragraph('Enroll in a course (create enrollment doc)', cell_style)],
    [Paragraph('GET', cell_style), Paragraph('/student/videos', cell_style), Paragraph('List videos for enrolled course (courseId required)', cell_style)],
    [Paragraph('GET', cell_style), Paragraph('/student/watch-progress', cell_style), Paragraph('Get watch progress (videoId, courseId)', cell_style)],
    [Paragraph('POST', cell_style), Paragraph('/student/watch-progress', cell_style), Paragraph('Update watch progress (position, completed)', cell_style)],
    [Paragraph('GET', cell_style), Paragraph('/student/bookmarks', cell_style), Paragraph('List bookmarked courses', cell_style)],
    [Paragraph('POST', cell_style), Paragraph('/student/bookmarks', cell_style), Paragraph('Add course bookmark', cell_style)],
    [Paragraph('DELETE', cell_style), Paragraph('/student/bookmarks', cell_style), Paragraph('Remove bookmark (courseId)', cell_style)],
    [Paragraph('GET', cell_style), Paragraph('/student/notifications', cell_style), Paragraph('List own notifications (unread first)', cell_style)],
    [Paragraph('PUT', cell_style), Paragraph('/student/notifications/read', cell_style), Paragraph('Mark notification(s) as read', cell_style)],
    [Paragraph('GET', cell_style), Paragraph('/student/discussions', cell_style), Paragraph('List discussions for a course', cell_style)],
    [Paragraph('POST', cell_style), Paragraph('/student/discussions', cell_style), Paragraph('Create discussion/reply', cell_style)],
    [Paragraph('GET', cell_style), Paragraph('/student/settings', cell_style), Paragraph('Get user settings', cell_style)],
    [Paragraph('PUT', cell_style), Paragraph('/student/settings', cell_style), Paragraph('Update user settings', cell_style)],
    [Paragraph('GET', cell_style), Paragraph('/student/categories', cell_style), Paragraph('List all categories (public)', cell_style)],
    [Paragraph('GET', cell_style), Paragraph('/student/instructors', cell_style), Paragraph('List instructors (public)', cell_style)],
    [Paragraph('GET', cell_style), Paragraph('/student/config', cell_style), Paragraph('Get ServerConfig (feature toggles, nav, style, protection)', cell_style)],
]
story.append(make_table(student_api, [0.08, 0.35, 0.57]))

# ═══════════════════════════════════════════════════════════════
# 4. APPWRITE COLLECTIONS
# ═══════════════════════════════════════════════════════════════
story.append(Paragraph('<b>4. Appwrite Collections Schema</b>', h1_style))
story.append(Paragraph(
    'Appwrite project: dakkho, Database: dakkho_main, Endpoint: https://sgp.cloud.appwrite.io/v1। '
    'মোট 12টি collection আছে যা Admin এবং Student Panel দুটোই ব্যবহার করবে। প্রতিটি collection-এ Appwrite-এর অটো-generated fields ($id, $createdAt, $updatedAt, $permissions) থাকে। '
    'Student Panel-এর জন্য documents-এ read permission "any" বা user-specific হতে হবে।',
    body_style
))

collections_data = [
    [Paragraph('<b>Collection</b>', header_cell_style), Paragraph('<b>Key Fields</b>', header_cell_style), Paragraph('<b>Student Use</b>', header_cell_style)],
    [Paragraph('users', cell_style), Paragraph('fullName, email, institute, technology, avatarUrl, role, emailVerified, isActive, enrolledCourseIds', cell_style), Paragraph('Profile + enrollment', cell_style)],
    [Paragraph('courses', cell_style), Paragraph('title, slug, description, thumbnailUrl, previewVideoUrl, categoryId, instructorId, level, language, duration, totalVideos, rating, totalReviews, totalStudents, isFeatured, isPublished, tags', cell_style), Paragraph('Catalog + enrolled', cell_style)],
    [Paragraph('videos', cell_style), Paragraph('title, slug, description, courseId, videoUrl, thumbnailUrl, duration, order, isPreview, isPublished', cell_style), Paragraph('Watch + progress', cell_style)],
    [Paragraph('instructors', cell_style), Paragraph('name, email, bio, avatarUrl, coverUrl, specialization, rating, totalStudents, totalCourses', cell_style), Paragraph('Public profiles', cell_style)],
    [Paragraph('institutes', cell_style), Paragraph('name, code, address', cell_style), Paragraph('Filter users', cell_style)],
    [Paragraph('categories', cell_style), Paragraph('name, slug, icon, color, parentId, order, courseCount', cell_style), Paragraph('Course catalog', cell_style)],
    [Paragraph('enrollments', cell_style), Paragraph('userId, courseId, progress, completed', cell_style), Paragraph('Track enrollment + progress', cell_style)],
    [Paragraph('notifications', cell_style), Paragraph('userId, title, message, type, isRead, actionUrl', cell_style), Paragraph('In-app notifications', cell_style)],
    [Paragraph('discussions', cell_style), Paragraph('title, body, courseId, authorId, tags, isAnswered, repliesCount', cell_style), Paragraph('Q&A forum', cell_style)],
    [Paragraph('user_settings', cell_style), Paragraph('userId, streamingQuality, downloadQuality, autoDownload, wifiOnly, dataSaverMode, pushNotifications, emailNotifications, themeMode, appLanguage, profileVisibility', cell_style), Paragraph('Personalization', cell_style)],
    [Paragraph('bookmarks', cell_style), Paragraph('userId, courseId', cell_style), Paragraph('Save courses', cell_style)],
    [Paragraph('watch_progress', cell_style), Paragraph('userId, videoId, courseId, progress, lastPosition, completed', cell_style), Paragraph('Resume watching', cell_style)],
]
story.append(make_table(collections_data, [0.14, 0.60, 0.26]))

story.append(Spacer(1, 6))
story.append(Paragraph('<b>Enum Values</b>', h3_style))
enum_data = [
    [Paragraph('<b>Field</b>', header_cell_style), Paragraph('<b>Values</b>', header_cell_style)],
    [Paragraph('users.role', cell_style), Paragraph('student | instructor | admin', cell_style)],
    [Paragraph('courses.level', cell_style), Paragraph('beginner | intermediate | advanced | expert', cell_style)],
    [Paragraph('courses.language', cell_style), Paragraph('bangla | english | hindi', cell_style)],
    [Paragraph('notifications.type', cell_style), Paragraph('info | success | warning | error | announcement | course-update', cell_style)],
]
story.append(make_table(enum_data, [0.30, 0.70]))

# ═══════════════════════════════════════════════════════════════
# 5. D1 DATABASE
# ═══════════════════════════════════════════════════════════════
story.append(Paragraph('<b>5. D1 Database (Cloudflare Native)</b>', h1_style))
story.append(Paragraph(
    'D1 শুধু Admin Panel-এর জন্য ব্যবহার হয় — sessions, audit logs, এবং config cache। Student Panel-এ D1 এর দরকার নেই কারণ Appwrite নিজেই user auth এবং document storage হ্যান্ডেল করে। '
    'তিনটি টেবিল আছে: admin_sessions (auth), app_config (server-driven config), audit_logs (admin activity log)।',
    body_style
))

d1_data = [
    [Paragraph('<b>Table</b>', header_cell_style), Paragraph('<b>Columns</b>', header_cell_style), Paragraph('<b>Purpose</b>', header_cell_style)],
    [Paragraph('admin_sessions', cell_style), Paragraph('id (PK UUID), user_id (UNIQUE), email, name, role, ip_address, user_agent, created_at, expires_at, is_active', cell_style), Paragraph('Admin session tokens (7-day expiry, single session per user)', cell_style)],
    [Paragraph('app_config', cell_style), Paragraph('key (PK), value (JSON), description, updated_by, updated_at, created_at', cell_style), Paragraph('Server-driven config cache (KV fallback, seeded with 4 default keys)', cell_style)],
    [Paragraph('audit_logs', cell_style), Paragraph('id (PK UUID), action, resource_type, resource_id, user_id, user_email, details (JSON), ip_address, created_at', cell_style), Paragraph('Admin activity tracking (non-blocking, never fails requests)', cell_style)],
]
story.append(make_table(d1_data, [0.16, 0.54, 0.30]))

# ═══════════════════════════════════════════════════════════════
# 6. FRONTEND ARCHITECTURE
# ═══════════════════════════════════════════════════════════════
story.append(Paragraph('<b>6. Frontend Architecture</b>', h1_style))

story.append(Paragraph('<b>6.1 API Client Pattern</b>', h2_style))
story.append(Paragraph(
    'ফ্রন্টএন্ডে api-client.ts সব API কল হ্যান্ডেল করে। দুটো মোড আছে: Remote (Workers) এবং Local (Next.js API routes)। '
    'Remote mode-এ NEXT_PUBLIC_API_BASE_URL env var সেট করলে সব রিকোয়েস্ট Workers-এ যায়, নাহলে local Next.js routes-এ। '
    'URL construction pattern: buildUrl("/users?limit=20") returns "https://dakkho-admin-api.xxx.workers.dev/admin/users?limit=20"। '
    'Auth header অটোমেটিক inject হয়: if IS_REMOTE_API then headers["Authorization"] = "Bearer " + localStorage token।',
    body_style
))

api_client_fns = [
    [Paragraph('<b>Function</b>', header_cell_style), Paragraph('<b>Signature</b>', header_cell_style), Paragraph('<b>Use Case</b>', header_cell_style)],
    [Paragraph('apiGet', cell_style), Paragraph('apiGet<T>(path): Promise<T>', cell_style), Paragraph('Read data (GET)', cell_style)],
    [Paragraph('apiPost', cell_style), Paragraph('apiPost<T>(path, body): Promise<T>', cell_style), Paragraph('Create/login (POST + JSON body)', cell_style)],
    [Paragraph('apiPut', cell_style), Paragraph('apiPut<T>(path, body): Promise<T>', cell_style), Paragraph('Update (PUT + JSON body)', cell_style)],
    [Paragraph('apiDelete', cell_style), Paragraph('apiDelete<T>(path): Promise<T>', cell_style), Paragraph('Remove (DELETE)', cell_style)],
    [Paragraph('apiUpload', cell_style), Paragraph('apiUpload<T>(path, formData): Promise<T>', cell_style), Paragraph('File upload (POST + FormData, no Content-Type)', cell_style)],
    [Paragraph('apiRaw', cell_style), Paragraph('apiRaw(path, init?): Promise<Response>', cell_style), Paragraph('Advanced use (raw Response)', cell_style)],
    [Paragraph('setAuthToken', cell_style), Paragraph('setAuthToken(token): void', cell_style), Paragraph('Save token to localStorage after login', cell_style)],
    [Paragraph('getAuthToken', cell_style), Paragraph('getAuthToken(): string | null', cell_style), Paragraph('Read token from localStorage', cell_style)],
    [Paragraph('clearAuthToken', cell_style), Paragraph('clearAuthToken(): void', cell_style), Paragraph('Remove token on logout', cell_style)],
]
story.append(make_table(api_client_fns, [0.14, 0.44, 0.42]))

story.append(Paragraph('<b>6.2 State Management (Zustand)</b>', h2_style))
story.append(Paragraph(
    'Admin Panel-এ Zustand store (useAdminStore) ব্যবহার হয়। Student Panel-এর জন্য নতুন useStudentStore তৈরি করতে হবে। '
    'Admin store-এ adminUser, serverConfig, sidebarCollapsed, currentPage, isLoading আছে। '
    'Student store-এ studentUser, enrolledCourses, watchProgress, notifications, settings থাকবে। '
    'Page routing single-page — currentPage state দিয়ে কোন component render হবে তা decide হয়, Next.js router ব্যবহার হয় না।',
    body_style
))

story.append(Paragraph('<b>6.3 Component Architecture</b>', h2_style))
story.append(Paragraph(
    'Admin Panel-এ 14টি React component আছে: LoginForm, Sidebar, Header, Dashboard, UsersTable, CoursesTable, VideosTable, InstructorsTable, CategoriesTable, InstitutesTable, NotificationsPanel, ConfigPanel, EmailPanel, AnalyticsPanel, SettingsPanel। '
    'Student Panel-এর জন্য অনুরূপ কিন্তু ভিন্ন component লাগবে: StudentLogin, CourseCatalog, CourseDetail, VideoPlayer, WatchProgress, BookmarksPanel, DiscussionForum, ProfileSettings, NotificationCenter। '
    'সব component shadcn/ui + Tailwind CSS + Framer Motion দিয়ে বানানো, dark glassmorphism theme ব্যবহার হয়।',
    body_style
))

# ═══════════════════════════════════════════════════════════════
# 7. DEPLOYMENT
# ═══════════════════════════════════════════════════════════════
story.append(Paragraph('<b>7. Deployment Configuration</b>', h1_style))

deploy_data = [
    [Paragraph('<b>Component</b>', header_cell_style), Paragraph('<b>Platform</b>', header_cell_style), Paragraph('<b>URL / Detail</b>', header_cell_style)],
    [Paragraph('Admin Frontend', cell_style), Paragraph('Cloudflare Pages', cell_style), Paragraph('https://dakkho-admin.pages.dev/', cell_style)],
    [Paragraph('Student Frontend', cell_style), Paragraph('Cloudflare Pages', cell_style), Paragraph('https://dakkho-student.pages.dev/ (to be created)', cell_style)],
    [Paragraph('API Worker', cell_style), Paragraph('Cloudflare Workers', cell_style), Paragraph('https://dakkho-admin-api.dakkho-admin.workers.dev/', cell_style)],
    [Paragraph('Code Repo', cell_style), Paragraph('GitHub (Private)', cell_style), Paragraph('github.com/grayrat2026/dakkho-admin', cell_style)],
    [Paragraph('CI/CD', cell_style), Paragraph('GitHub Actions', cell_style), Paragraph('.github/workflows/deploy.yml', cell_style)],
    [Paragraph('Build Command', cell_style), Paragraph('Next.js static export', cell_style), Paragraph('output: "export", NEXT_PUBLIC_API_BASE_URL set', cell_style)],
]
story.append(make_table(deploy_data, [0.18, 0.22, 0.60]))

story.append(Spacer(1, 6))
story.append(Paragraph('<b>Environment Variables</b>', h3_style))
env_data = [
    [Paragraph('<b>Variable</b>', header_cell_style), Paragraph('<b>Admin Panel Value</b>', header_cell_style), Paragraph('<b>Student Panel Value</b>', header_cell_style)],
    [Paragraph('NEXT_PUBLIC_API_BASE_URL', cell_style), Paragraph('https://dakkho-admin-api.dakkho-admin.workers.dev', cell_style), Paragraph('Same Worker URL', cell_style)],
    [Paragraph('NEXT_PUBLIC_BASE_PATH', cell_style), Paragraph('(empty, no basePath)', cell_style), Paragraph('(empty, no basePath)', cell_style)],
    [Paragraph('NEXT_PUBLIC_STATIC_MODE', cell_style), Paragraph('(not needed)', cell_style), Paragraph('(not needed)', cell_style)],
]
story.append(make_table(env_data, [0.28, 0.36, 0.36]))

# ═══════════════════════════════════════════════════════════════
# 8. STUDENT PANEL PROMPT
# ═══════════════════════════════════════════════════════════════
story.append(Paragraph('<b>8. Student Panel Build Prompt</b>', h1_style))
story.append(Paragraph(
    'নিচের প্রম্পটটি ব্যবহার করে Student Panel তৈরি করা যাবে। এটি বর্তমান Admin Panel এর আর্কিটেকচার, কম্পোনেন্ট প্যাটার্ন, API ক্লায়েন্ট, এবং স্টাইলিং ফলো করবে:',
    body_style
))

prompt_text = """Build a DAKKHO Student Panel — a Next.js 16 App Router SPA with static export (output: "export"), deployed on Cloudflare Pages.

TECH STACK: Next.js 16 + React 19 + TypeScript + Zustand + shadcn/ui + Tailwind CSS 4 + Framer Motion. Dark glassmorphism theme (bg: #0F0F1A, glass-card: bg-white/5 backdrop-blur-xl border-white/10).

BACKEND: Cloudflare Workers API at https://dakkho-admin-api.dakkho-admin.workers.dev/. You need to ADD /student/* route group to the existing Worker.

APPWRITE: Project "dakkho", Database "dakkho_main", Endpoint https://sgp.cloud.appwrite.io/v1. 12 collections: users, courses, videos, instructors, institutes, categories, enrollments, notifications, discussions, user_settings, bookmarks, watch_progress.

AUTH: Students login via Appwrite email session. Worker creates session, returns session cookie. Student API requests use Cookie: a_session_dakkho={token} header. NOT Bearer token like Admin.

API CLIENT: Same pattern as Admin — apiGet/apiPost/apiPut/apiDelete/apiUpload functions. URL pattern: {BASE_URL}/student/{path}. Auth header: Cookie instead of Authorization Bearer.

PAGES (single-page, Zustand currentPage routing):
1. Login — email/password form
2. Home — featured courses, continue watching, categories
3. Course Catalog — search/filter courses by category/level/language
4. Course Detail — overview, curriculum (video list), instructor info, enroll button
5. Video Player — video playback with progress tracking, next/prev navigation
6. My Courses — enrolled courses with progress bars
7. Bookmarks — saved courses
8. Discussions — Q&A forum per course
9. Notifications — in-app notification center
10. Profile — edit name/avatar/institute/technology
11. Settings — streaming quality, download, notifications, theme, language

COMPONENTS: Same glass-card style, gradient-primary buttons (bg-gradient-to-r from-blue-500 to-purple-500), dakkho-blue accent (#3B82F6). Sidebar navigation with collapse toggle. Responsive design.

DEPLOY: Cloudflare Pages, project name "dakkho-student". Same CI/CD as Admin (GitHub Actions). Build: next build (output: "export"), then wrangler pages deploy out/."""

# Write prompt as preformatted
for line in prompt_text.strip().split('\n'):
    story.append(Paragraph(line, ParagraphStyle(
        'PromptLine', fontName='NotoSerifSC', fontSize=9, leading=14,
        textColor=TEXT_PRIMARY, wordWrap='CJK', leftIndent=12
    )))

# ═══════════════════════════════════════════════════════════════
# 9. KEY IMPLEMENTATION NOTES
# ═══════════════════════════════════════════════════════════════
story.append(Spacer(1, 8))
story.append(Paragraph('<b>9. Key Implementation Notes</b>', h1_style))

notes_data = [
    [Paragraph('<b>Topic</b>', header_cell_style), Paragraph('<b>Detail</b>', header_cell_style)],
    [Paragraph('Appwrite Query Format', cell_style), Paragraph('Appwrite v1.9+ requires JSON format queries: {"method":"limit","values":[20]}. Old string format like limit(20) does NOT work. Use JSON.stringify() in Query helpers.', cell_style)],
    [Paragraph('CORS Configuration', cell_style), Paragraph('Worker CORS must include all frontend origins: dakkho-admin.pages.dev, dakkho-student.pages.dev, localhost:3000. Allow credentials: true for cookies.', cell_style)],
    [Paragraph('R2 Public URLs', cell_style), Paragraph('Use getPublicUrl(env, bucketType, key) helper. Do NOT hardcode .r2.dev URLs. If R2_PUBLIC_URL env var is set, it takes precedence.', cell_style)],
    [Paragraph('Config Broadcast', cell_style), Paragraph('ServerConfig changes are written to D1 (source of truth) + KV (cache). Frontend polls GET /student/config periodically. KV key "config_updated_at" tracks last update timestamp.', cell_style)],
    [Paragraph('Student Auth Middleware', cell_style), Paragraph('New studentAuthMiddleware: validate Appwrite session cookie, get account info, set c.set("studentUser", {...}). Reject if not student role.', cell_style)],
    [Paragraph('Error Handling', cell_style), Paragraph('All Worker routes use try/catch with getErrorMessage(). Return { error: string } on failure. Frontend catches ApiError with status/code/message.', cell_style)],
    [Paragraph('Static Export', cell_style), Paragraph('Next.js output: "export" means NO server-side features (no API routes, no ISR, no middleware). All data fetching via client-side API calls in useEffect/hooks.', cell_style)],
    [Paragraph('Session Cookie', cell_style), Paragraph('Appwrite session cookie name: a_session_dakkho. For Worker-to-Appwrite requests, send as Cookie header. Worker must pass this through from client request.', cell_style)],
]
story.append(make_table(notes_data, [0.22, 0.78]))

# ─── Build PDF ───
doc.build(story)
print(f"PDF generated: {output_path}")
