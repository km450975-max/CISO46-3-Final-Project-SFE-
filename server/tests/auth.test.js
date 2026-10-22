import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';

const app = createApp();

function stamp(prefix) {
  return `${prefix}${Math.random().toString(36).slice(2, 8)}`;
}

async function register(agent, overrides = {}) {
  const credentials = {
    username: overrides.username || stamp('player'),
    email: overrides.email || `${stamp('player')}@school.test`,
    password: overrides.password || 'Password1',
  };
  const response = await agent
    .post('/api/v1/auth/register')
    .set('X-Requested-With', 'XMLHttpRequest')
    .send(credentials);
  return { response, credentials };
}

describe('authentication', () => {
  let agent;

  beforeAll(() => {
    agent = request.agent(app);
  });

  it('registers a student and returns a profile without the password hash', async () => {
    const { response, credentials } = await register(agent);
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.username).toBe(credentials.username);
    expect(response.body.data.user.role).toBe('student');
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(response.headers['set-cookie']?.join(';')).toContain('HttpOnly');
  });

  it('rejects a weak password and duplicate email', async () => {
    const weak = await request(app)
      .post('/api/v1/auth/register')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ username: stamp('weak'), email: `${stamp('weak')}@school.test`, password: 'short' });
    expect(weak.status).toBe(400);
    expect(weak.body.error.code).toBe('VALIDATION_ERROR');

    const first = await register(request.agent(app));
    const duplicate = await request(app)
      .post('/api/v1/auth/register')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ ...first.credentials, username: stamp('other') });
    expect(duplicate.status).toBe(409);
  });

  it('rejects invalid credentials and accepts a valid login', async () => {
    const guest = request.agent(app);
    const { credentials } = await register(guest);
    await guest.post('/api/v1/auth/logout').set('X-Requested-With', 'XMLHttpRequest');

    const invalid = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ email: credentials.email, password: 'Wrongpass1' });
    expect(invalid.status).toBe(401);

    const valid = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ email: credentials.email, password: credentials.password });
    expect(valid.status).toBe(200);
    expect(valid.body.data.user.email).toBe(credentials.email);
  });

  it('protects private routes and invalidates the session on logout', async () => {
    const anonymous = await request(app).get('/api/v1/auth/me');
    expect(anonymous.status).toBe(401);

    const player = request.agent(app);
    const created = await register(player);
    const cookie = created.response.headers['set-cookie'];
    const logout = await player.post('/api/v1/auth/logout').set('X-Requested-With', 'XMLHttpRequest');
    expect(logout.status).toBe(200);

    const after = await player.get('/api/v1/auth/me');
    expect(after.status).toBe(401);

    const reused = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
    expect(reused.status).toBe(401);
  });

  it('rejects state-changing requests that do not include the browser header', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ada@school.test', password: 'Password1' });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('CSRF_REJECTED');
  });
});

describe('roles', () => {
  it('blocks students from the admin API and allows an administrator', async () => {
    const student = request.agent(app);
    await register(student, { username: 'studentone' });
    const forbidden = await student.get('/api/v1/admin/stats');
    expect(forbidden.status).toBe(403);

    const adminAgent = request.agent(app);
    const created = await register(adminAgent, { username: 'rootadmin', email: 'rootadmin@school.test' });
    await User.updateOne({ email: created.credentials.email }, { role: 'admin' });
    const stats = await adminAgent.get('/api/v1/admin/stats');
    expect(stats.status).toBe(200);
    expect(stats.body.data.students).toBeGreaterThanOrEqual(1);

    const health = await adminAgent.get('/api/v1/admin/health');
    expect(health.status).toBe(200);
    expect(health.body.data.bananaApi.mode).toBe('mock');
    expect(health.body.data.database).toBe('connected');
  });

  it('lets an administrator suspend a student account', async () => {
    const adminAgent = request.agent(app);
    const admin = await register(adminAgent, { username: 'suspender' });
    await User.updateOne({ email: admin.credentials.email }, { role: 'admin' });

    const studentAgent = request.agent(app);
    const student = await register(studentAgent, { username: 'suspendedstu' });
    const user = await User.findOne({ email: student.credentials.email });

    const updated = await adminAgent
      .patch(`/api/v1/admin/users/${user._id}`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ accountStatus: 'suspended' });
    expect(updated.status).toBe(200);

    const blocked = await studentAgent.get('/api/v1/users/me');
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });
});
