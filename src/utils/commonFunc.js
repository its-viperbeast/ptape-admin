// Utility functions for formatting durations, numbers, and dates

// Formats a duration in seconds to "HH:MM:SS" or "MM:SS"
function formatDuration(seconds) {
  // Ensure a non-negative integer
  const d = Math.max(0, Math.floor(seconds));

  // Compute hours, minutes, seconds
  const h = Math.floor(d / 3600);
  const m = Math.floor((d % 3600) / 60);
  const s = d % 60;

  // Zero-pad components
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');

  // Return formatted string
  return h > 0
    ? `${String(h).padStart(2, '0')}:${mm}:${ss}`
    : `${mm}:${ss}`;
}

// Converts a number to a human-readable format with suffixes (K, M, B, T)
function convertNumberToSuffix(num) {
  if (num < 1e3) return num;  // If number is less than 1000, return as is.

  const suffixes = ["", "K", "M", "B", "T"];
  const magnitude = Math.floor(Math.log10(num) / 3);  // Find the power of 1000
  const scaledNum = num / Math.pow(1000, magnitude);  // Scale the number down

  // Return the number without decimal if it's a whole number
  const formattedNum = (scaledNum % 1 === 0) ? scaledNum.toFixed(0) : scaledNum.toFixed(1);

  return formattedNum + suffixes[magnitude];  // Append the appropriate suffix
}

// Converts a UTC date string to a human-readable "time ago" format
function timeAgo(utcDateString) {
  const now = new Date();
  const past = new Date(utcDateString); // automatically local
  const diffInSeconds = Math.floor((now - past) / 1000);

  const units = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 }
  ];

  for (const unit of units) {
    const value = Math.floor(diffInSeconds / unit.seconds);
    if (value > 0) {
      return `${value} ${unit.label}${value !== 1 ? 's' : ''} ago`;
    }
  }

  return 'Just now';
}

// Formats a datetime string to "YYYY-MM-DD HH:mm:ss"
function toUTC(datetimeStr) {
  const date = new Date(datetimeStr);

  // Get UTC components
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const mins = String(date.getUTCMinutes()).padStart(2, '0');
  const secs = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
}

// Converts a UTC date string to a local datetime string in "YYYY-MM-DDTHH:MM" format
function toLocal(utcString) {
  const date = new Date(utcString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export { formatDuration, convertNumberToSuffix, timeAgo, toUTC, toLocal };