const axios = require('axios');

async function reverseGeocode(coordinates) {
  try {
    if (!coordinates || coordinates.length !== 2) {
      return 'Location not provided';
    }

    const [lng, lat] = coordinates;

    const response = await axios.get(
      'https://nominatim.openstreetmap.org/reverse',
      {
        params: { format: 'json', lat, lon: lng, zoom: 18, addressdetails: 1 },
        headers: { 'User-Agent': 'NagarDrishti/1.0 (student-project)' },
        timeout: 5000,
      }
    );

    if (response.data && response.data.display_name) {
      const parts = response.data.display_name.split(', ');
      const shortAddress = parts.slice(0, 4).join(', ');
      console.log(`Geocoded: ${shortAddress}`);
      return shortAddress;
    }

    return 'Location not provided';
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return 'Location not provided';
  }
}

module.exports = { reverseGeocode };