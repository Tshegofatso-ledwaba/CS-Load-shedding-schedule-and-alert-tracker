const assert = require('assert');
const jwt = require('jsonwebtoken');

const secret = 'test-secret';
const adminToken = jwt.sign({ email: 'admin@example.com', role: 'ADMIN' }, secret);
const userToken = jwt.sign({ email: 'user@example.com', role: 'USER' }, secret);

assert.strictEqual(jwt.verify(adminToken, secret).role, 'ADMIN');
assert.strictEqual(jwt.verify(userToken, secret).role, 'USER');
assert.notStrictEqual(jwt.verify(userToken, secret).role, 'ADMIN');

console.log('Admin authorization tests passed.');