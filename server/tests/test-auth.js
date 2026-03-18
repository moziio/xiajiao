const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { ROLES, ownerSessions, getRole, hasRole, guardRole, checkOrigin } = require('../middleware/auth');

describe('Auth — ROLES', () => {
  it('owner > admin > member > guest', () => {
    assert.ok(ROLES.owner > ROLES.admin);
    assert.ok(ROLES.admin > ROLES.member);
    assert.ok(ROLES.member > ROLES.guest);
  });
});

describe('Auth — getRole & hasRole', () => {
  const token = 'test-token-' + Date.now();

  it('returns guest for no Authorization header', () => {
    const req = { headers: {} };
    assert.equal(getRole(req), 'guest');
  });

  it('returns guest for invalid token', () => {
    const req = { headers: { authorization: 'Bearer bad-token' } };
    assert.equal(getRole(req), 'guest');
  });

  it('returns owner for valid session', () => {
    ownerSessions.set(token, { ts: Date.now(), role: 'owner' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    assert.equal(getRole(req), 'owner');
    ownerSessions.delete(token);
  });

  it('returns admin for admin-role session', () => {
    ownerSessions.set(token, { ts: Date.now(), role: 'admin' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    assert.equal(getRole(req), 'admin');
    ownerSessions.delete(token);
  });

  it('hasRole: owner has admin role', () => {
    ownerSessions.set(token, { ts: Date.now(), role: 'owner' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    assert.ok(hasRole(req, 'admin'));
    assert.ok(hasRole(req, 'member'));
    assert.ok(hasRole(req, 'guest'));
    ownerSessions.delete(token);
  });

  it('hasRole: guest does not have member role', () => {
    const req = { headers: {} };
    assert.ok(!hasRole(req, 'member'));
    assert.ok(!hasRole(req, 'admin'));
    assert.ok(!hasRole(req, 'owner'));
  });

  it('expired session returns guest', () => {
    ownerSessions.set(token, { ts: Date.now() - 8 * 24 * 60 * 60 * 1000, role: 'owner' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    assert.equal(getRole(req), 'guest');
    ownerSessions.delete(token);
  });
});

describe('Auth — guardRole', () => {
  const token = 'guard-test-' + Date.now();

  it('returns true for sufficient role', () => {
    ownerSessions.set(token, { ts: Date.now(), role: 'owner' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const guard = guardRole('admin');
    let statusCode = null;
    const res = {
      writeHead(code) { statusCode = code; },
      end() {},
      destroyed: false, writableEnded: false, req,
    };
    assert.ok(guard(req, res));
    assert.equal(statusCode, null);
    ownerSessions.delete(token);
  });

  it('returns false and sends 403 for insufficient role', () => {
    const req = { headers: {} };
    const guard = guardRole('owner');
    let statusCode = null;
    let body = '';
    const res = {
      writeHead(code) { statusCode = code; },
      end(data) { body = data; },
      destroyed: false, writableEnded: false, req,
    };
    assert.ok(!guard(req, res));
    assert.equal(statusCode, 403);
  });
});

describe('Auth — checkOrigin', () => {
  it('allows GET requests without origin', () => {
    assert.ok(checkOrigin({ method: 'GET', headers: {} }));
  });

  it('allows POST without origin or referer', () => {
    assert.ok(checkOrigin({ method: 'POST', headers: {} }));
  });

  it('allows POST with matching origin', () => {
    assert.ok(checkOrigin({
      method: 'POST',
      headers: { origin: 'http://localhost:3000', host: 'localhost:3000' },
    }));
  });

  it('rejects POST with mismatched origin', () => {
    assert.ok(!checkOrigin({
      method: 'POST',
      headers: { origin: 'http://evil.com', host: 'localhost:3000' },
    }));
  });
});
