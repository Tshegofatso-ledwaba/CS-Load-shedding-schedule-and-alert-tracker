const TIME_ZONE = 'Africa/Johannesburg';

function localParts(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) + Number(parts.second) / 60 };
}

function scheduleTimestamp(item, time) {
  return new Date(`${item.date}T${time}:00+02:00`);
}

function calculateStatus(zoneBlockId, allSchedules, now = new Date()) {
  const zoneSchedules = allSchedules.filter((item) => item.zoneBlockId === zoneBlockId);
  const current = localParts(now);
  if (zoneSchedules.length === 0) {
    return {
      status: 'NO_SCHEDULE',
      label: 'No outage schedule available',
      stage: null,
      source: null,
      activeOutage: null,
      nextOutage: null,
      countdownTarget: null,
      timezone: TIME_ZONE,
      localDate: current.date,
      lastUpdated: now.toISOString(),
    };
  }

  const active = zoneSchedules.find((item) => {
    const start = scheduleTimestamp(item, item.startTime);
    const end = scheduleTimestamp(item, item.endTime);
    return now >= start && now < end;
  });
  const upcoming = zoneSchedules
    .filter((item) => scheduleTimestamp(item, item.startTime) > now)
    .sort((a, b) => scheduleTimestamp(a, a.startTime) - scheduleTimestamp(b, b.startTime))[0] || null;
  const target = active ? scheduleTimestamp(active, active.endTime) : upcoming ? scheduleTimestamp(upcoming, upcoming.startTime) : null;

  const nextStatus = active ? 'OUTAGE_ACTIVE' : upcoming ? 'UPCOMING_OUTAGE' : 'POWER_AVAILABLE';

  return {
    status: nextStatus,
    label: active ? 'Outage Active' : upcoming ? 'Upcoming outage' : 'Power Available',
    stage: active?.stage || upcoming?.stage || null,
    source: active?.source || upcoming?.source || null,
    activeOutage: active,
    nextOutage: upcoming,
    countdownTarget: target?.toISOString() || null,
    timezone: TIME_ZONE,
    localDate: current.date,
    lastUpdated: now.toISOString(),
  };
}

module.exports = { calculateStatus, scheduleTimestamp, TIME_ZONE };