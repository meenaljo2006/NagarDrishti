/**
 * Convert UTC time to IST (Indian Standard Time)
 * IST = UTC + 5:30
 */

// Format date to IST string
exports.formatToIST = (date) => {
  if (!date) return 'N/A';
  
  const d = new Date(date);
  const options = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  
  return d.toLocaleString('en-IN', options);
};

// Get current IST time
exports.getCurrentIST = () => {
  const now = new Date();
  const options = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  
  return now.toLocaleString('en-IN', options);
};

// Convert UTC to IST Date object
exports.utcToIST = (utcDate) => {
  const date = new Date(utcDate);
  // Add 5 hours 30 minutes
  date.setHours(date.getHours() + 5);
  date.setMinutes(date.getMinutes() + 30);
  return date;
};

// Get today's date in IST (for analytics)
exports.getTodayIST = () => {
  const now = new Date();
  // Convert to IST and set to start of day
  const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  istDate.setHours(0, 0, 0, 0);
  return istDate;
};