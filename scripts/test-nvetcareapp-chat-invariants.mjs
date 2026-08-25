import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [messagesRoute, chatPanel, dashboardPage] = await Promise.all([
  read('src/app/api/nvetcareapp/chat/[appointmentId]/messages/route.ts'),
  read('src/app/nvetcareapp/dashboard/chat-panel.tsx'),
  read('src/app/nvetcareapp/dashboard/page.tsx'),
]);

// The BFF chat route must require a session cookie on both GET and POST
// before ever contacting the backend.
assert.match(messagesRoute, /export async function GET[\s\S]*?if \(!accessToken\)/, 'Chat messages GET route must reject requests with no session cookie.');
assert.match(messagesRoute, /export async function POST[\s\S]*?if \(!accessToken\)/, 'Chat messages POST route must reject requests with no session cookie.');
assert.match(messagesRoute, /status: 401/, 'Chat messages route must respond 401 when unauthenticated.');

// The POST route must validate content length as defense in depth
// (mirrors the backend's SendMessageDto: 1-2000 chars) before forwarding.
assert.match(messagesRoute, /content\.length < 1 \|\| content\.length > 2000/, 'Chat messages POST route must bound content length (1-2000 chars).');

// The route must never read an identity/role claim from the request body —
// the backend's own ChatMembershipGuard (participant-only) and
// EmailVerifiedGuard, keyed off the JWT, are the only authorization
// sources; this route only forwards a validated `content` string.
assert.doesNotMatch(
  messagesRoute,
  /body\.(role|isAdmin|userId|senderId)/,
  'Chat messages route must never read an identity/role claim from the request body — the JWT is the only identity source.',
);

// Chat is REST + polling, not the WebSocket gateway (ROADMAP.md Phase 5:
// ChatGateway's WsJwtGuard verifies the same long-lived access token, with
// no existing endpoint to mint a separately-scoped one) — the client must
// never hold the raw access token or open a socket connection.
assert.doesNotMatch(chatPanel, /io\(|socket\.io|WebSocket\(/, 'Chat panel must use REST + polling, not a WebSocket connection.');
assert.match(chatPanel, /setInterval/, 'Chat panel must poll for new messages on an interval.');
assert.match(chatPanel, /clearInterval/, 'Chat panel must clear its polling interval on close/unmount.');

// The client write (and the poll) must route through the shared
// refresh-and-retry helper, not a bare fetch — same bug class as the other
// four write components (Codex review finding on PR #192).
assert.match(chatPanel, /nvetFetchWithRefresh/, 'Chat panel must route its requests through nvetFetchWithRefresh.');
assert.doesNotMatch(
  chatPanel,
  /(?<!nvetFetchWith)fetch\(`\/api\/nvetcareapp/,
  'Chat panel must not bypass nvetFetchWithRefresh with a bare fetch to /api/nvetcareapp.',
);

// The dashboard must wire the chat panel into both the client's and the
// vet's appointment views, passing the session's own user id so the panel
// can distinguish the caller's own messages without guessing from role.
assert.match(dashboardPage, /<ChatPanel appointmentId=\{appointment\.id\} currentUserId=\{currentUserId\}/g, 'Both appointment panels must render ChatPanel with the appointment id and current user id.');
assert.equal(
  (dashboardPage.match(/<ChatPanel appointmentId=\{appointment\.id\} currentUserId=\{currentUserId\}/g) ?? []).length,
  2,
  'ChatPanel must be wired into both AppointmentTrackingPanel (CLIENT) and VetAgendaPanel (VET).',
);

console.log('Nvet Care chat invariants: PASS');
