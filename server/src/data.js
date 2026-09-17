const { randomUUID } = require('crypto');

const province = { id: 'gauteng', name: 'Gauteng' };
const city = { id: 'tshwane', name: 'City of Tshwane', provinceId: province.id };
const area = { id: 'soshanguve', name: 'Soshanguve', cityId: city.id };
const suburb = { id: 'block-f', name: 'Soshanguve Block F', areaId: area.id };
const zone = { id: 'zone-2', name: 'Zone 2', suburbId: suburb.id };

function localDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

function schedule(offsetDays, startTime, endTime, stage) {
  return {
    id: randomUUID(), zoneBlockId: zone.id, stage, date: localDate(offsetDays),
    startTime, endTime, source: 'ADMIN', updatedAt: new Date().toISOString(),
  };
}

const schedules = [
  schedule(-2, '05:00', '07:30', 3),
  schedule(-1, '18:00', '20:30', 4),
  schedule(0, '12:00', '14:30', 4),
  schedule(0, '20:00', '22:30', 3),
  schedule(1, '06:00', '08:30', 4),
  schedule(1, '16:00', '18:30', 2),
  schedule(2, '10:00', '12:30', 4),
];

module.exports = {
  locations: { provinces: [province], cities: [city], areas: [area], suburbs: [suburb], zones: [zone] },
  schedules,
};