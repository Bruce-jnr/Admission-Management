function ordinal(day) {
  const remainder100 = day % 100;
  if (remainder100 >= 11 && remainder100 <= 13) return `${day}th`;
  if (day % 10 === 1) return `${day}st`;
  if (day % 10 === 2) return `${day}nd`;
  if (day % 10 === 3) return `${day}rd`;
  return `${day}th`;
}

function formatAdmissionDate(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = ordinal(date.getDate());
  const month = date.toLocaleString('en-GB', { month: 'long' });
  return `${day} ${month}, ${date.getFullYear()}`;
}

function formatLongDate(value, includeWeekday = false) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const formatted = `${ordinal(date.getDate())} ${date.toLocaleString('en-GB', {
    month: 'long',
  })}, ${date.getFullYear()}`;
  if (!includeWeekday) return formatted;
  return `${date.toLocaleString('en-GB', { weekday: 'long' })}, ${formatted}`;
}

module.exports = { formatAdmissionDate, formatLongDate, ordinal };
