const assert = require('assert');
const { calculateStatus } = require('../src/status');

const schedules = [
  { id: 'evening', zoneBlockId: 'zone-2', stage: 4, date: '2026-09-21', startTime: '18:00', endTime: '20:30', source: 'PREDICTED' },
  { id: 'next-day', zoneBlockId: 'zone-2', stage: 3, date: '2026-09-22', startTime: '06:00', endTime: '08:30', source: 'ADMIN' },
];

function at(time) {
  return new Date(`2026-09-21T${time}:00+02:00`);
}

const beforeOutage = calculateStatus('zone-2', schedules, at('17:30'));
assert.strictEqual(beforeOutage.status, 'UPCOMING_OUTAGE');
assert.strictEqual(beforeOutage.stage, 4);
assert.strictEqual(beforeOutage.source, 'PREDICTED');
assert.strictEqual(beforeOutage.nextOutage.id, 'evening');
assert.strictEqual(beforeOutage.countdownTarget, '2026-09-21T16:00:00.000Z');

const activeOutage = calculateStatus('zone-2', schedules, at('19:15'));
assert.strictEqual(activeOutage.status, 'OUTAGE_ACTIVE');
assert.strictEqual(activeOutage.activeOutage.id, 'evening');
assert.strictEqual(activeOutage.countdownTarget, '2026-09-21T18:30:00.000Z');

const atEnd = calculateStatus('zone-2', schedules, at('20:30'));
assert.strictEqual(atEnd.status, 'UPCOMING_OUTAGE');
assert.strictEqual(atEnd.nextOutage.id, 'next-day');

const nextDay = calculateStatus('zone-2', schedules, new Date('2026-09-22T05:59:59+02:00'));
assert.strictEqual(nextDay.status, 'UPCOMING_OUTAGE');
assert.strictEqual(nextDay.nextOutage.id, 'next-day');

const noEvents = calculateStatus('zone-2', schedules, new Date('2026-09-23T12:00:00+02:00'));
assert.strictEqual(noEvents.status, 'POWER_AVAILABLE');
assert.strictEqual(noEvents.nextOutage, null);
assert.strictEqual(noEvents.countdownTarget, null);

const noSchedule = calculateStatus('missing-zone', [], new Date('2026-09-23T12:00:00+02:00'));
assert.strictEqual(noSchedule.status, 'NO_SCHEDULE');
assert.strictEqual(noSchedule.label, 'No outage schedule available');
assert.strictEqual(noSchedule.nextOutage, null);
assert.strictEqual(noSchedule.countdownTarget, null);

console.log('Status boundary tests passed.');