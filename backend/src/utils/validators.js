exports.validatePhoneNumber = (phone) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

exports.validateLocation = (location) => {
  if (!location || !location.coordinates) return false;
  const [lng, lat] = location.coordinates;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

exports.validateImageUrl = (url) => {
  const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
  return urlRegex.test(url);
};