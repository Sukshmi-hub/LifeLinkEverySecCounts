// src/hooks/use-geolocation.js
// Hook to get user's geolocation and reverse-geocode to an address (OpenStreetMap Nominatim)
// Returns: { state, error, getLocation }
import { useState } from 'react';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2';

export default function useGeolocation() {
  const [state, setState] = useState({
    loading: false,
    error: null,
    coords: null,
    address: null,
  });

  const reverseGeocode = async (lat, lon) => {
    try {
      const url = `${NOMINATIM_URL}&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'LifeLinkApp/1.0' } });
      if (!res.ok) throw new Error('Reverse geocoding failed');
      const data = await res.json();
      // data.address may contain city, state, country, postcode
      const addr = data.address || {};
      return {
        display_name: data.display_name || '',
        city: addr.city || addr.town || addr.village || addr.county || '',
        state: addr.state || '',
        country: addr.country || '',
        postcode: addr.postcode || '',
      };
    } catch (err) {
      throw err;
    }
  };

  const getLocation = async (options = { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }) => {
    if (!('geolocation' in navigator)) {
      setState({ loading: false, error: new Error('Geolocation not supported'), coords: null, address: null });
      throw new Error('Geolocation not supported');
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            const address = await reverseGeocode(lat, lon);
            const result = { coords: { latitude: lat, longitude: lon }, address };
            setState({ loading: false, error: null, coords: result.coords, address: result.address });
            resolve(result);
          } catch (err) {
            setState({ loading: false, error: err, coords: null, address: null });
            reject(err);
          }
        },
        (err) => {
          setState({ loading: false, error: err, coords: null, address: null });
          reject(err);
        },
        options
      );
    });
  };

  return { state, getLocation };
}
