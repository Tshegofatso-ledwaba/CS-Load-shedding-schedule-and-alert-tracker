const assert = require('assert');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.JWT_SECRET = 'registration-test-secret';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = 'registration-test-password';
process.env.ADMIN_REGISTRATION_KEY = 'registration-test-key';

const database = require('../src/db');
let databaseIsEnabled = false;
database.databaseEnabled = () => databaseIsEnabled;

const auth = require('../src/auth');
const registeredEmails = new Set();
auth.createAdministrator = async (email) => {
  if (registeredEmails.has(email)) return null;
  registeredEmails.add(email);
  return { email, role: 'ADMIN' };
};

const app = require('../src/index');

(async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const endpoint = `http://127.0.0.1:${port}/api/auth/register`;
  const validBody = { email: 'new-admin@example.com', password: 'long-registration-password', registrationKey: process.env.ADMIN_REGISTRATION_KEY };

  try {
    const databaseRequired = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    assert.strictEqual(databaseRequired.status, 503);
    assert.match((await databaseRequired.json()).error, /DATABASE_URL/);

    databaseIsEnabled = true;
    const missingKey = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, registrationKey: '' }),
    });
    assert.strictEqual(missingKey.status, 403);
    assert.match((await missingKey.json()).error, /missing or invalid/);

    const invalidKey = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, registrationKey: 'incorrect-key' }),
    });
    assert.strictEqual(invalidKey.status, 403);
    assert.match((await invalidKey.json()).error, /missing or invalid/);

    const created = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    assert.strictEqual(created.status, 201);
    assert.deepStrictEqual((await created.json()).administrator, { email: 'new-admin@example.com', role: 'ADMIN' });

    const duplicate = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    assert.strictEqual(duplicate.status, 409);
    assert.match((await duplicate.json()).error, /already exists/);

    console.log('Admin registration tests passed.');
  } finally {
    server.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});