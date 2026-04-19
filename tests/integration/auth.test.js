/**
 * Practical integration tests (Postman-style) mapped to TC-01 … TC-31.
 * Requires DATABASE_URL and a running PostgreSQL instance.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const prisma = require('../../src/db');
const config = require('../../src/config');

const api = () => request(app);

const uniqueEmail = (label) =>
  `tc_${label}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.com`;

const strongPassword = 'password12';

describe('Auth integration', () => {
  /** TC-01 */
  it('TC-01: successful signup creates user, store, OWNER link, settings, trial', async () => {
    const email = uniqueEmail('01');
    const res = await api()
      .post('/api/auth/signup')
      .send({
        name: 'Oshi',
        email,
        password: strongPassword,
        storeName: 'Oshi Store',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.store.role).toBe('OWNER');
    expect(res.body.data.store.trialEndsAt).toBeTruthy();

    const dbUser = await prisma.user.findUnique({ where: { email } });
    expect(dbUser).toBeTruthy();
    expect(dbUser.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(dbUser.passwordHash).not.toContain(strongPassword);

    const settings = await prisma.storeSetting.findUnique({
      where: { storeId: res.body.data.store.id },
    });
    expect(settings).toBeTruthy();
  });

  /** TC-02 */
  it('TC-02: duplicate email returns 409', async () => {
    const email = uniqueEmail('02');
    await api()
      .post('/api/auth/signup')
      .send({
        name: 'A',
        email,
        password: strongPassword,
        storeName: 'S',
      })
      .expect(201);

    const res = await api()
      .post('/api/auth/signup')
      .send({
        name: 'B',
        email,
        password: strongPassword,
        storeName: 'T',
      })
      .expect(409);

    expect(res.body.error.code).toBe('EMAIL_CONFLICT');
    expect(res.body.error.message).toMatch(/exists/i);
  });

  /** TC-03 */
  it('TC-03: weak password returns 400', async () => {
    const res = await api()
      .post('/api/auth/signup')
      .send({
        name: 'A',
        email: uniqueEmail('03'),
        password: '123',
        storeName: 'S',
      })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  /** TC-04 */
  it('TC-04: missing fields returns 400', async () => {
    const res = await api()
      .post('/api/auth/signup')
      .send({ email: uniqueEmail('04') })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  describe('login', () => {
    let email;
    let password;

    beforeEach(async () => {
      email = uniqueEmail('login');
      password = strongPassword;
      await api()
        .post('/api/auth/signup')
        .send({
          name: 'Login User',
          email,
          password,
          storeName: 'Login Store',
        })
        .expect(201);
    });

    /** TC-05 */
    it('TC-05: successful login returns tokens, user, store', async () => {
      const res = await api()
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);

      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.refreshToken).toBeTruthy();
      expect(res.body.data.user.email).toBe(email);
      expect(res.body.data.store).toBeTruthy();
    });

    /** TC-06 */
    it('TC-06: wrong password returns 401', async () => {
      const res = await api()
        .post('/api/auth/login')
        .send({ email, password: 'wrongpass12' })
        .expect(401);

      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    /** TC-07 */
    it('TC-07: unknown user returns 401 (no user enumeration)', async () => {
      const res = await api()
        .post('/api/auth/login')
        .send({ email: 'nobody@nowhere.test', password: strongPassword })
        .expect(401);

      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    /** TC-08 */
    it('TC-08: empty credentials return 400', async () => {
      const res = await api()
        .post('/api/auth/login')
        .send({ email: '', password: '' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('JWT middleware', () => {
    let tokens;

    beforeEach(async () => {
      const email = uniqueEmail('jwt');
      const res = await api()
        .post('/api/auth/signup')
        .send({
          name: 'JWT User',
          email,
          password: strongPassword,
          storeName: 'JWT Store',
        })
        .expect(201);
      tokens = res.body.data;
    });

    /** TC-09 */
    it('TC-09: valid token allows GET /api/auth/me', async () => {
      const res = await api()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.data.user.email).toBeTruthy();
    });

    /** TC-10 */
    it('TC-10: missing token returns 401', async () => {
      const res = await api().get('/api/auth/me').expect(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    /** TC-11 */
    it('TC-11: invalid token returns 401', async () => {
      const res = await api()
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-valid-jwt')
        .expect(401);

      expect(res.body.error.code).toBe('INVALID_ACCESS_TOKEN');
    });

    /** TC-12 */
    it('TC-12: expired token returns 401', async () => {
      const { userId, role, storeId } = jwt.verify(
        tokens.accessToken,
        config.jwt.accessSecret,
        { issuer: 'zomaal-api' }
      );

      const expired = jwt.sign(
        { userId, role, storeId },
        config.jwt.accessSecret,
        { expiresIn: '-60s', issuer: 'zomaal-api' }
      );

      const res = await api()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expired}`)
        .expect(401);

      expect(res.body.error.code).toBe('INVALID_ACCESS_TOKEN');
    });
  });

  describe('refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      const email = uniqueEmail('refresh');
      const res = await api()
        .post('/api/auth/signup')
        .send({
          name: 'R',
          email,
          password: strongPassword,
          storeName: 'R Store',
        })
        .expect(201);
      refreshToken = res.body.data.refreshToken;
    });

    /** TC-13 */
    it('TC-13: valid refresh returns new access token', async () => {
      const res = await api()
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.refreshToken).toBeTruthy();
      expect(res.body.data.refreshToken).not.toBe(refreshToken);

      const dec = jwt.verify(res.body.data.accessToken, config.jwt.accessSecret, {
        issuer: 'zomaal-api',
      });
      expect(dec.userId).toBeTruthy();
      expect(dec.role).toBeTruthy();
      expect(dec.storeId).toBeTruthy();
    });

    /** TC-14 */
    it('TC-14: invalid refresh token returns 401', async () => {
      const res = await api()
        .post('/api/auth/refresh')
        .send({ refreshToken: 'deadbeef'.repeat(16) })
        .expect(401);

      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    /** TC-15 */
    it('TC-15: expired refresh session returns 401', async () => {
      const hash = require('crypto')
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      await prisma.session.updateMany({
        where: { refreshTokenHash: hash },
        data: { expiresAt: new Date(Date.now() - 60_000) },
      });

      const res = await api()
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    /** TC-16 */
    it('TC-16: refresh not in DB returns 401', async () => {
      const hash = require('crypto')
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');
      await prisma.session.deleteMany({ where: { refreshTokenHash: hash } });

      const res = await api()
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('logout', () => {
    let refreshToken;

    beforeEach(async () => {
      const email = uniqueEmail('logout');
      const res = await api()
        .post('/api/auth/signup')
        .send({
          name: 'L',
          email,
          password: strongPassword,
          storeName: 'L Store',
        })
        .expect(201);
      refreshToken = res.body.data.refreshToken;
    });

    /** TC-17 */
    it('TC-17: logout removes session from DB', async () => {
      const hash = require('crypto')
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');
      expect(await prisma.session.count({ where: { refreshTokenHash: hash } })).toBe(1);

      await api().post('/api/auth/logout').send({ refreshToken }).expect(200);

      expect(await prisma.session.count({ where: { refreshTokenHash: hash } })).toBe(0);
    });

    /** TC-18 */
    it('TC-18: logout with unknown refresh token returns 401', async () => {
      const res = await api()
        .post('/api/auth/logout')
        .send({ refreshToken: 'deadbeef'.repeat(16) })
        .expect(401);

      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('multi-store & roles', () => {
    /** TC-19 */
    it('TC-19: access route for wrong storeId returns 403', async () => {
      const email = uniqueEmail('ms19');
      const signup = await api()
        .post('/api/auth/signup')
        .send({
          name: 'MS',
          email,
          password: strongPassword,
          storeName: 'MS',
        })
        .expect(201);

      const token = signup.body.data.accessToken;
      const wrongStoreId = '00000000-0000-4000-8000-000000000001';

      const res = await api()
        .get(`/api/stores/${wrongStoreId}/settings-preview`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.error.code).toBe('STORE_MISMATCH');
    });

    /** TC-20 */
    it('TC-20: access own store on protected route succeeds', async () => {
      const email = uniqueEmail('ms20');
      const signup = await api()
        .post('/api/auth/signup')
        .send({
          name: 'MS',
          email,
          password: strongPassword,
          storeName: 'MS20',
        })
        .expect(201);

      const { accessToken, store } = signup.body.data;

      const res = await api()
        .get(`/api/stores/${store.id}/settings-preview`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.storeId).toBe(store.id);
    });

    /** TC-21 */
    it('TC-21: STAFF cannot access OWNER/ADMIN route', async () => {
      const email = uniqueEmail('staff');
      const signup = await api()
        .post('/api/auth/signup')
        .send({
          name: 'Staff',
          email,
          password: strongPassword,
          storeName: 'Staff Store',
        })
        .expect(201);

      const userId = signup.body.data.user.id;
      const storeId = signup.body.data.store.id;

      await prisma.storeUser.update({
        where: { userId_storeId: { userId, storeId } },
        data: { role: 'STAFF' },
      });

      const login = await api()
        .post('/api/auth/login')
        .send({ email, password: strongPassword })
        .expect(200);

      const res = await api()
        .get(`/api/stores/${storeId}/settings-preview`)
        .set('Authorization', `Bearer ${login.body.data.accessToken}`)
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    /** TC-22 */
    it('TC-22: ADMIN can access OWNER/ADMIN route', async () => {
      const email = uniqueEmail('admin');
      const signup = await api()
        .post('/api/auth/signup')
        .send({
          name: 'Admin',
          email,
          password: strongPassword,
          storeName: 'Admin Store',
        })
        .expect(201);

      const userId = signup.body.data.user.id;
      const storeId = signup.body.data.store.id;

      await prisma.storeUser.update({
        where: { userId_storeId: { userId, storeId } },
        data: { role: 'ADMIN' },
      });

      const login = await api()
        .post('/api/auth/login')
        .send({ email, password: strongPassword })
        .expect(200);

      await api()
        .get(`/api/stores/${storeId}/settings-preview`)
        .set('Authorization', `Bearer ${login.body.data.accessToken}`)
        .expect(200);
    });
  });

  describe('security', () => {
    /** TC-23 — covered in TC-01 DB assertion; explicit */
    it('TC-23: password is never stored plaintext', async () => {
      const email = uniqueEmail('sec23');
      const password = 'mySecretPass99';
      await api()
        .post('/api/auth/signup')
        .send({
          name: 'S',
          email,
          password,
          storeName: 'S',
        })
        .expect(201);

      const u = await prisma.user.findUnique({ where: { email } });
      expect(u.passwordHash).not.toContain(password);
      expect(u.passwordHash).toMatch(/^\$2[aby]\$/);
    });

    /** TC-24 */
    it('TC-24: JWT payload is minimal (no password / PII)', async () => {
      const email = uniqueEmail('sec24');
      const res = await api()
        .post('/api/auth/signup')
        .send({
          name: 'S',
          email,
          password: strongPassword,
          storeName: 'S',
        })
        .expect(201);

      const decoded = jwt.decode(res.body.data.accessToken);
      const keys = Object.keys(decoded).filter((k) => !['iat', 'exp', 'iss'].includes(k));
      expect(keys.sort()).toEqual(['role', 'storeId', 'userId'].sort());
      expect(decoded).not.toHaveProperty('password');
      expect(decoded).not.toHaveProperty('email');
    });

    /** TC-25 — optional rate limiting; not implemented */
    it.skip('TC-25: brute-force / rate limit (optional — not implemented in MVP)', () => {});
  });

  describe('edge cases', () => {
    /** TC-26 */
    it('TC-26: multiple logins create multiple sessions', async () => {
      const email = uniqueEmail('multi');
      await api()
        .post('/api/auth/signup')
        .send({
          name: 'M',
          email,
          password: strongPassword,
          storeName: 'M',
        })
        .expect(201);

      const a = await api()
        .post('/api/auth/login')
        .send({ email, password: strongPassword })
        .expect(200);
      const b = await api()
        .post('/api/auth/login')
        .send({ email, password: strongPassword })
        .expect(200);

      expect(a.body.data.refreshToken).not.toBe(b.body.data.refreshToken);

      const userId = a.body.data.user.id;
      const count = await prisma.session.count({ where: { userId } });
      expect(count).toBeGreaterThanOrEqual(2);
    });

    /** TC-27 */
    it('TC-27: logout removes only one session', async () => {
      const email = uniqueEmail('edge27');
      await api()
        .post('/api/auth/signup')
        .send({
          name: 'E',
          email,
          password: strongPassword,
          storeName: 'E',
        })
        .expect(201);

      const first = await api()
        .post('/api/auth/login')
        .send({ email, password: strongPassword })
        .expect(200);
      const second = await api()
        .post('/api/auth/login')
        .send({ email, password: strongPassword })
        .expect(200);

      await api()
        .post('/api/auth/logout')
        .send({ refreshToken: first.body.data.refreshToken })
        .expect(200);

      const secondOk = await api()
        .post('/api/auth/refresh')
        .send({ refreshToken: second.body.data.refreshToken })
        .expect(200);

      expect(secondOk.body.data.accessToken).toBeTruthy();
    });

    /** TC-28 */
    it('TC-28: deleted user — access token rejected', async () => {
      const email = uniqueEmail('del28');
      const signup = await api()
        .post('/api/auth/signup')
        .send({
          name: 'D',
          email,
          password: strongPassword,
          storeName: 'D',
        })
        .expect(201);

      const { accessToken, user } = signup.body.data;
      await prisma.user.delete({ where: { id: user.id } });

      const res = await api()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      expect(res.body.error.code).toBe('USER_REVOKED');
    });

    /** TC-29 */
    it('TC-29: deleted store — access blocked', async () => {
      const email = uniqueEmail('del29');
      const signup = await api()
        .post('/api/auth/signup')
        .send({
          name: 'D',
          email,
          password: strongPassword,
          storeName: 'D29',
        })
        .expect(201);

      const { accessToken, store } = signup.body.data;
      await prisma.store.delete({ where: { id: store.id } });

      const res = await api()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(res.body.error.code).toBe('STORE_NOT_FOUND');
    });
  });

  describe('subscription / trial', () => {
    /** TC-30 — trial expiry not enforced in MVP */
    it.skip('TC-30: expired trial blocks access (not enforced in MVP)', () => {});

    /** TC-31 */
    it('TC-31: active trial — signup sets trialEndsAt in future', async () => {
      const email = uniqueEmail('trial');
      const res = await api()
        .post('/api/auth/signup')
        .send({
          name: 'T',
          email,
          password: strongPassword,
          storeName: 'T',
          trialDays: 14,
        })
        .expect(201);

      const end = new Date(res.body.data.store.trialEndsAt);
      expect(end.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
