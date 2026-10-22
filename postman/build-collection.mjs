import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

function item(name, method, path, { body, tests, csrf = method !== 'GET' } = {}) {
  const headers = [];
  if (csrf) headers.push({ key: 'X-Requested-With', value: 'XMLHttpRequest' });
  if (body !== undefined) headers.push({ key: 'Content-Type', value: 'application/json' });
  const request = {
    method,
    header: headers,
    url: `{{baseUrl}}${path}`,
  };
  if (body !== undefined) request.body = { mode: 'raw', raw: body };
  return {
    name,
    request,
    event: [{ listen: 'test', script: { type: 'text/javascript', exec: tests } }],
  };
}

function expectStatus(code) {
  return `pm.test('status ${code}', function () { pm.response.to.have.status(${code}); });`;
}

function expectCode(code) {
  return [
    'const payload = pm.response.json();',
    `pm.test('error ${code}', function () { pm.expect(payload.success).to.eql(false); pm.expect(payload.error.code).to.eql('${code}'); });`,
  ];
}

function expectSuccess() {
  return [
    'const payload = pm.response.json();',
    "pm.test('success envelope', function () { pm.expect(payload.success).to.eql(true); pm.expect(payload.data).to.be.an('object'); });",
  ];
}

const tests = {
  health: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('process is up', function () { pm.expect(payload.data.status).to.eql('ok'); });",
  ],
  unauthenticated: [expectStatus(401), ...expectCode('UNAUTHENTICATED')],
  validation: [expectStatus(400), ...expectCode('VALIDATION_ERROR')],
  csrf: [expectStatus(403), ...expectCode('CSRF_REJECTED')],
  badLogin: [expectStatus(401), ...expectCode('INVALID_CREDENTIALS')],
  registered: [
    expectStatus(201),
    ...expectSuccess(),
    "pm.test('student profile hides the password hash', function () { pm.expect(payload.data.user.role).to.eql('student'); pm.expect(payload.data.user.passwordHash).to.eql(undefined); pm.expect(payload.data.user.email).to.eql(pm.collectionVariables.get('email')); });",
    "pm.collectionVariables.set('studentId', payload.data.user.id);",
  ],
  studentLogin: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('logged-in student', function () { pm.expect(payload.data.user.username).to.eql(pm.collectionVariables.get('username')); });",
  ],
  me: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('session profile', function () { pm.expect(payload.data.user.username).to.eql(pm.collectionVariables.get('username')); });",
  ],
  profileUpdated: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('display name saved', function () { pm.expect(payload.data.user.displayName).to.eql('Postman Player'); });",
  ],
  stats: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('dashboard payload', function () { pm.expect(payload.data.stats).to.be.an('object'); pm.expect(payload.data.leaderboardPreview).to.be.an('array'); });",
  ],
  history: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('history page', function () { pm.expect(payload.data.games).to.be.an('array'); pm.expect(payload.data.pagination.page).to.eql(1); });",
  ],
  board: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('ranked rows hide email', function () { pm.expect(payload.data.players).to.be.an('array'); if (payload.data.players[0]) pm.expect(payload.data.players[0].email).to.eql(undefined); });",
  ],
  myRank: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('caller rank payload', function () { pm.expect(payload.data).to.have.property('rank'); });",
  ],
  started: [
    expectStatus(201),
    ...expectSuccess(),
    "pm.test('chosen rounds and base points, solution hidden', function () { pm.expect(payload.data.game.totalRounds).to.eql(3); pm.expect(payload.data.game.basePoints).to.eql(30); pm.expect(payload.data.game.mode).to.eql('practice'); pm.expect(payload.data.puzzle.solution).to.eql(undefined); });",
    "pm.collectionVariables.set('gameId', payload.data.game.id);",
    "pm.collectionVariables.set('puzzleId', payload.data.puzzle.id);",
  ],
  active: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('active game matches the one just started', function () { pm.expect(payload.data.game.id).to.eql(pm.collectionVariables.get('gameId')); });",
  ],
  owned: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('owned session', function () { pm.expect(payload.data.game.id).to.eql(pm.collectionVariables.get('gameId')); });",
  ],
  currentPuzzle: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('current puzzle is the open round', function () { pm.expect(payload.data.puzzle.id).to.eql(pm.collectionVariables.get('puzzleId')); pm.expect(payload.data.puzzle.solution).to.eql(undefined); });",
  ],
  puzzleMeta: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('puzzle metadata', function () { pm.expect(payload.data.puzzle.id).to.eql(pm.collectionVariables.get('puzzleId')); pm.expect(payload.data.puzzle.imagePath).to.include('/image'); });",
  ],
  image: [
    expectStatus(200),
    "pm.test('image bytes', function () { const type = pm.response.headers.get('Content-Type') || ''; pm.expect(type).to.match(/image|svg/); pm.expect(pm.response.responseSize).to.be.above(20); });",
  ],
  hint: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('hint is attached to the open round', function () { pm.expect(payload.data.game.hintUsed).to.eql(true); pm.expect(payload.data.game.hintText).to.be.a('string').and.not.empty; });",
  ],
  stillOpen: [expectStatus(400), ...expectCode('ROUND_STILL_OPEN')],
  submitted: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('round locks and reveals the solution', function () { pm.expect(payload.data.attempt.solution).to.be.a('number'); pm.expect(payload.data.attempt).to.have.property('correct'); });",
  ],
  nextRound: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('next puzzle stays unsolved', function () { pm.expect(payload.data.game.currentRound).to.eql(2); pm.expect(payload.data.puzzle.solution).to.eql(undefined); });",
  ],
  quit: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('quit abandons the session', function () { pm.expect(payload.data.game.status).to.eql('abandoned'); });",
  ],
  noActive: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('no game left to resume', function () { pm.expect(payload.data.game).to.eql(null); });",
  ],
  forbidden: [expectStatus(403), ...expectCode('FORBIDDEN')],
  adminLogin: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('administrator session', function () { pm.expect(payload.data.user.role).to.eql('admin'); });",
    "pm.collectionVariables.set('adminId', payload.data.user.id);",
  ],
  adminStats: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('admin counts', function () { pm.expect(payload.data.students).to.be.a('number'); pm.expect(payload.data).to.have.property('attempts'); });",
  ],
  adminHealth: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('admin health', function () { pm.expect(payload.data.database).to.eql('connected'); pm.expect(payload.data.bananaApi).to.be.an('object'); });",
  ],
  adminUsers: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('accounts omit password hashes', function () { pm.expect(payload.data.users).to.be.an('array'); pm.expect(JSON.stringify(payload.data.users)).to.not.include('passwordHash'); });",
  ],
  adminActivity: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('activity page', function () { pm.expect(payload.data.events).to.be.an('array'); });",
  ],
  suspended: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('student suspended', function () { pm.expect(payload.data.accountStatus).to.eql('suspended'); pm.expect(payload.data.id).to.eql(pm.collectionVariables.get('studentId')); });",
  ],
  restored: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('student restored', function () { pm.expect(payload.data.accountStatus).to.eql('active'); pm.expect(payload.data.role).to.eql('student'); });",
  ],
  duplicate: [expectStatus(409), ...expectCode('DUPLICATE_SUBMISSION')],
  missingGame: [expectStatus(404), ...expectCode('GAME_NOT_FOUND')],
  cannotDemote: [expectStatus(400), ...expectCode('INVALID_ACTION')],
  password: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('password change keeps a profile', function () { pm.expect(payload.data.user.username).to.eql(pm.collectionVariables.get('username')); });",
  ],
  loggedOut: [
    expectStatus(200),
    ...expectSuccess(),
    "pm.test('logged out', function () { pm.expect(payload.data.loggedOut).to.eql(true); });",
  ],
};

const collection = {
  info: {
    name: 'Banana Math API',
    description: 'Validates every /api/v1 endpoint. Run with Newman against a local API. Mutating requests send X-Requested-With. The cookie jar carries the session.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    { key: 'baseUrl', value: 'http://127.0.0.1:5000/api/v1' },
  ],
  event: [{
    listen: 'prerequest',
    script: {
      type: 'text/javascript',
      exec: [
        "if (!pm.collectionVariables.get('username')) {",
        "  const stamp = Date.now().toString().slice(-8);",
        "  pm.collectionVariables.set('username', 'pm' + stamp);",
        "  pm.collectionVariables.set('email', 'pm' + stamp + '@school.test');",
        "  pm.collectionVariables.set('password', 'Testpass1');",
        '}',
      ],
    },
  }],
  item: [
    { name: 'Public and rejected calls', item: [
      item('Health', 'GET', '/health', { tests: tests.health }),
      item('Me without a session', 'GET', '/auth/me', { tests: tests.unauthenticated }),
      item('Register with an empty body', 'POST', '/auth/register', { body: '{}', tests: tests.validation }),
      item('Register without the browser header', 'POST', '/auth/register', { body: '{"username":"abc","email":"a@b.co","password":"Testpass1"}', tests: tests.csrf, csrf: false }),
      item('Login with a wrong password', 'POST', '/auth/login', { body: '{"email":"{{adminEmail}}","password":"wrong-password"}', tests: tests.badLogin }),
    ] },
    { name: 'Student session', item: [
      item('Register', 'POST', '/auth/register', { body: '{"username":"{{username}}","email":"{{email}}","password":"{{password}}"}', tests: tests.registered }),
      item('Login', 'POST', '/auth/login', { body: '{"email":"{{email}}","password":"{{password}}"}', tests: tests.studentLogin }),
      item('Current user', 'GET', '/auth/me', { tests: tests.me }),
      item('Profile', 'GET', '/users/me', { tests: tests.me }),
      item('Update profile', 'PATCH', '/users/me', { body: '{"displayName":"Postman Player","avatarKey":"ocean","theme":"light"}', tests: tests.profileUpdated }),
      item('Dashboard stats', 'GET', '/users/me/stats', { tests: tests.stats }),
      item('History', 'GET', '/users/me/history?page=1&limit=5', { tests: tests.history }),
      item('Leaderboard', 'GET', '/leaderboard?page=1&limit=10', { tests: tests.board }),
      item('My rank', 'GET', '/leaderboard/me', { tests: tests.myRank }),
    ] },
    { name: 'Game', item: [
      item('Unknown game', 'GET', '/games/000000000000000000000000', { tests: tests.missingGame }),
      item('Start with a bad difficulty', 'POST', '/games/start', { body: '{"difficulty":"extreme","mode":"practice"}', tests: tests.validation }),
      item('Start a 3-round practice game', 'POST', '/games/start', { body: '{"difficulty":"easy","mode":"practice","totalRounds":3,"basePoints":30}', tests: tests.started }),
      item('Active game', 'GET', '/games/active', { tests: tests.active }),
      item('Game by id', 'GET', '/games/{{gameId}}', { tests: tests.owned }),
      item('Current puzzle', 'GET', '/puzzles/new', { tests: tests.currentPuzzle }),
      item('Puzzle metadata', 'GET', '/puzzles/{{puzzleId}}', { tests: tests.puzzleMeta }),
      item('Puzzle image', 'GET', '/puzzles/{{puzzleId}}/image', { tests: tests.image }),
      item('Hint', 'POST', '/games/{{gameId}}/hint', { body: '{}', tests: tests.hint }),
      item('Expire while time remains', 'POST', '/games/{{gameId}}/expire', { body: '{}', tests: tests.stillOpen }),
      item('Submit a non-integer', 'POST', '/games/{{gameId}}/submit', { body: '{"answer":"nope"}', tests: tests.validation }),
      item('Submit an answer', 'POST', '/games/{{gameId}}/submit', { body: '{"answer":0}', tests: tests.submitted }),
      item('Submit the same round again', 'POST', '/games/{{gameId}}/submit', { body: '{"answer":1}', tests: tests.duplicate }),
      item('Next puzzle', 'POST', '/games/{{gameId}}/next', { body: '{}', tests: tests.nextRound }),
      item('Quit', 'POST', '/games/{{gameId}}/quit', { body: '{}', tests: tests.quit }),
      item('Active game after quit', 'GET', '/games/active', { tests: tests.noActive }),
    ] },
    { name: 'Administrator', item: [
      item('Student cannot read admin stats', 'GET', '/admin/stats', { tests: tests.forbidden }),
      item('Change password', 'PATCH', '/users/me/password', { body: '{"currentPassword":"{{password}}","newPassword":"Testpass2"}', tests: tests.password }),
      item('Login as administrator', 'POST', '/auth/login', { body: '{"email":"{{adminEmail}}","password":"{{adminPassword}}"}', tests: tests.adminLogin }),
      item('Admin stats', 'GET', '/admin/stats', { tests: tests.adminStats }),
      item('Admin health', 'GET', '/admin/health', { tests: tests.adminHealth }),
      item('Admin users', 'GET', '/admin/users?page=1&limit=20', { tests: tests.adminUsers }),
      item('Admin activity', 'GET', '/admin/activity?page=1&limit=10', { tests: tests.adminActivity }),
      item('Suspend the Postman student', 'PATCH', '/admin/users/{{studentId}}', { body: '{"accountStatus":"suspended"}', tests: tests.suspended }),
      item('Restore the Postman student', 'PATCH', '/admin/users/{{studentId}}', { body: '{"accountStatus":"active","role":"student"}', tests: tests.restored }),
      item('Administrator cannot demote self', 'PATCH', '/admin/users/{{adminId}}', { body: '{"role":"student"}', tests: tests.cannotDemote }),
      item('Logout', 'POST', '/auth/logout', { body: '{}', tests: tests.loggedOut }),
      item('Me after logout', 'GET', '/auth/me', { tests: tests.unauthenticated }),
    ] },
  ],
};

writeFileSync(join(root, 'banana-math.postman_collection.json'), JSON.stringify(collection, null, 2));
console.log('wrote collection');
