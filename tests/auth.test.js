'use strict';

const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/data/db');
const { generateDeviceToken, generateUserToken } = require('../src/helpers/token');
const { deviceWriteGuard } = require('../src/middleware/deviceGuard');
const { enforceDistrictScope, enforceProvinceScope, applyJurisdictionFilter } = require('../src/middleware/jurisdictionGuard');

describe('Phase 4: Security Layer, JWT Scopes & Content Negotiation Tests', () => {
  beforeAll(async () => {
    await connectDB();
  }, 30000);

  afterAll(async () => {
    await disconnectDB();
  });

  describe('1. Human User Authentication & JWT Issuance (POST /api/v1/auth/login)', () => {
    test('should authenticate admin_national and issue JWT with read:national scope', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'admin_national',
          password: 'Password@123'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.token_type).toBe('Bearer');
      expect(res.body.user.role).toBe('national_analyst');
      expect(res.body.user.scopes).toContain('read:national');
    });

    test('should authenticate op_western and issue JWT with read:province:1 scope', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'op_western',
          password: 'Password@123'
        });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('provincial_operator');
      expect(res.body.user.jurisdiction_id).toBe(1);
      expect(res.body.user.scopes).toContain('read:province:1');
    });

    test('should authenticate op_colombo and issue JWT with read:district:1 scope', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'op_colombo',
          password: 'Password@123'
        });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('district_operator');
      expect(res.body.user.jurisdiction_id).toBe(1);
      expect(res.body.user.scopes).toContain('read:district:1');
    });

    test('should return 401 with WWW-Authenticate header on incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'admin_national',
          password: 'WrongPassword999'
        });

      expect(res.status).toBe(401);
      expect(res.headers['www-authenticate']).toContain('Bearer');
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
      expect(res.body).toHaveProperty('timestamp');
    });

    test('should return 401 with WWW-Authenticate header on non-existent username', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'ghost_user',
          password: 'Password@123'
        });

      expect(res.status).toBe(401);
      expect(res.headers['www-authenticate']).toContain('Bearer');
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    test('should return 400 Bad Request on missing username or password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'admin_national'
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('2. Autonomous Smart Meter Device Token Issuance (POST /api/v1/auth/device-token)', () => {
    test('should issue write-only JWT for a valid solar installation and meter_id', async () => {
      const res = await request(app)
        .post('/api/v1/auth/device-token')
        .send({
          installation_id: 1,
          meter_id: 'MTR-COL-001'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.device.installation_id).toBe(1);
      expect(res.body.device.scopes).toContain('installation:write');
    });

    test('should return 404 when installation or meter_id does not match', async () => {
      const res = await request(app)
        .post('/api/v1/auth/device-token')
        .send({
          installation_id: 99999,
          meter_id: 'MTR-FAKE-999'
        });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('INSTALLATION_NOT_FOUND');
    });

    test('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/device-token')
        .send({
          installation_id: 1
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('3. Token Verification & Identity Introspection (GET /api/v1/auth/me)', () => {
    let validToken;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'admin_national',
          password: 'Password@123'
        });
      validToken = res.body.token;
    });

    test('should return 200 OK and identity profile for valid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(true);
      expect(res.body.identity.username).toBe('admin_national');
      expect(res.body.identity.scopes).toContain('read:national');
    });

    test('should return 401 with WWW-Authenticate header when Authorization header is missing', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.headers['www-authenticate']).toContain('Bearer');
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    test('should return 401 with WWW-Authenticate header when token is tampered', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer tampered.invalid.token');

      expect(res.status).toBe(401);
      expect(res.headers['www-authenticate']).toContain('Bearer');
      expect(res.body.code).toBe('INVALID_TOKEN');
    });
  });

  describe('4. Device Write-Isolation Guard (TASK-018 & Brief §2)', () => {
    test('should permit write when token installation_id matches target URL id', () => {
      const token1 = generateDeviceToken(1);
      const req = {
        params: { id: '1' },
        user: {
          installation_id: 1,
          scopes: ['installation:write']
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      deviceWriteGuard(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject with 403 when smart meter attempts to write to another installation ID', () => {
      const req = {
        params: { id: '2' }, // Requesting installation 2
        user: {
          installation_id: 1, // Token is strictly for installation 1
          scopes: ['installation:write']
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      deviceWriteGuard(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'DEVICE_WRITE_VIOLATION'
        })
      );
    });

    test('should reject with 403 when token lacks installation:write scope', () => {
      const req = {
        params: { id: '1' },
        user: {
          installation_id: 1,
          scopes: ['read:district:1'] // Read scope only
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      deviceWriteGuard(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('5. Jurisdiction-Scoped Read Authorization (TASK-019 & Rubric Dim 5)', () => {
    test('should allow national analyst to access any district', () => {
      const req = {
        params: { id: '4' }, // Kandy
        user: {
          jurisdiction_level: 'national',
          scopes: ['read:national']
        }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      const guard = enforceDistrictScope();
      guard(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('should allow district operator to access their own district', () => {
      const req = {
        params: { id: '1' }, // Colombo
        user: {
          jurisdiction_level: 'district',
          jurisdiction_id: 1,
          scopes: ['read:district:1']
        }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      const guard = enforceDistrictScope();
      guard(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('should block district operator from reading another district with 403 Forbidden', () => {
      const req = {
        params: { id: '4' }, // Kandy
        user: {
          jurisdiction_level: 'district',
          jurisdiction_id: 1, // Colombo operator
          scopes: ['read:district:1']
        }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      const guard = enforceDistrictScope();
      guard(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CROSS_JURISDICTION_FORBIDDEN'
        })
      );
    });

    test('applyJurisdictionFilter should automatically inject scope constraints into queries', () => {
      const nationalUser = { jurisdiction_level: 'national', scopes: ['read:national'] };
      expect(applyJurisdictionFilter(nationalUser, {})).toEqual({});

      const provinceUser = { jurisdiction_level: 'province', jurisdiction_id: 1 };
      expect(applyJurisdictionFilter(provinceUser, { active: true })).toEqual({ active: true, province_id: 1 });

      const districtUser = { jurisdiction_level: 'district', jurisdiction_id: 1 };
      expect(applyJurisdictionFilter(districtUser, { active: true })).toEqual({ active: true, district_id: 1 });
    });
  });

  describe('6. WSO2 Content Negotiation & Media Type Enforcement (TASK-020A & TASK-020B)', () => {
    test('should return 406 Not Acceptable when client requests unsupported media type (Accept: application/xml)', async () => {
      const res = await request(app)
        .get('/api/v1')
        .set('Accept', 'application/xml');

      expect(res.status).toBe(406);
      expect(res.body.code).toBe('NOT_ACCEPTABLE');
      expect(res.body).toHaveProperty('timestamp');
    });

    test('should accept application/json or wildcard */*', async () => {
      const resJson = await request(app)
        .get('/api/v1')
        .set('Accept', 'application/json');
      expect(resJson.status).toBe(200);

      const resWildcard = await request(app)
        .get('/api/v1')
        .set('Accept', '*/*');
      expect(resWildcard.status).toBe(200);
    });

    test('should return 415 Unsupported Media Type when POST carries non-JSON payload', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'text/plain')
        .send('username=admin&password=Password@123');

      expect(res.status).toBe(415);
      expect(res.body.code).toBe('UNSUPPORTED_MEDIA_TYPE');
      expect(res.body).toHaveProperty('timestamp');
    });
  });
});
