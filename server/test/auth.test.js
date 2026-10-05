const assert = require('assert');
const jwt = require('jsonwebtoken');

const secret = 'test-secret';
const token = jwt.sign({ email: 'admin@example.com', role: 'ADMIN' }, secret, { expiresIn: '1h' });
const decoded = jwt.verify(token, secret);
assert.strictEqual(decoded.role, 'ADMIN');
assert.throws(() => jwt.verify(token, 'wrong-secret'), /invalid signature/);
assert.throws(() => jwt.verify(jwt.sign({ role: 'ADMIN' }, secret, { expiresIn: -1 }), secret), /expired/);

console.log('Authentication token tests passed.');