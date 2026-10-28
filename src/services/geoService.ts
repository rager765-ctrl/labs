import type { GeofenceConfig } from '../types';

/**
 * Common University Campus Facility Coordinates
 */
export const CAMPUS_FACILITIES: Record<string, { name: string; lat: number; lng: number; defaultRadius: number }> = {
  'turing-304b': {
    name: 'Turing Hall — Room 304B (Databases & Systems Lab)',
    lat: 37.774929,
    lng: -122.419416,
    defaultRadius: 50,
  },
  'lovelace-201a': {
    name: 'Ada Lovelace Building — Computing Wing 201A',
    lat: 37.775312,
    lng: -122.418915,
    defaultRadius: 60,
  },
  'faraday-105': {
    name: 'Faraday Engineering Complex — Hardware Lab 105',
    lat: 37.774521,
    lng: -122.420102,
    defaultRadius: 75,
  },
  'shannon-hub': {
    name: 'Claude Shannon Data Science Hub — Lab B',
    lat: 37.776015,
    lng: -122.417852,
    defaultRadius: 80,
  },
};

/**
 * Calculates the great-circle distance between two GPS points using the Haversine formula.
 * @returns Distance in meters.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's mean radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Formats distance into clean readable units (meters or kilometers)
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export interface DevicePositionResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

/**
 * Requests the current device GPS position from the browser/hardware.
 */
export async function getDeviceCurrentPosition(
  options: PositionOptions = { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
): Promise<DevicePositionResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser or hardware device.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 10),
          timestamp: pos.timestamp,
        });
      },
      (err) => {
        let msg = 'Unable to determine device location.';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg = 'Location permission was denied. Please allow location access in your browser settings.';
            break;
          case err.POSITION_UNAVAILABLE:
            msg = 'Device location is currently unavailable. Ensure GPS is enabled.';
            break;
          case err.TIMEOUT:
            msg = 'Location request timed out. Please try again.';
            break;
        }
        reject(new Error(msg));
      },
      options
    );
  });
}

/**
 * Verifies if user coordinates fall inside the session's configured geofence radius.
 */
export function evaluateGeofenceProximity(
  userLat: number,
  userLng: number,
  userAccuracy: number,
  geofence: GeofenceConfig
): {
  isWithin: boolean;
  distanceMeters: number;
  effectiveThreshold: number;
  statusText: string;
} {
  const distance = calculateHaversineDistanceMeters(
    userLat,
    userLng,
    geofence.latitude,
    geofence.longitude
  );

  // Buffer: allow GPS accuracy tolerance up to 25 meters to account for indoor reception
  const accuracyBuffer = Math.min(Math.max(userAccuracy - 10, 0), 25);
  const effectiveThreshold = geofence.radiusMeters + accuracyBuffer;
  const isWithin = distance <= effectiveThreshold;

  let statusText = '';
  if (isWithin) {
    statusText = `Within range (${formatDistance(distance)} from venue)`;
  } else {
    const excess = distance - geofence.radiusMeters;
    statusText = `${formatDistance(excess)} outside laboratory geofence`;
  }

  return {
    isWithin,
    distanceMeters: distance,
    effectiveThreshold,
    statusText,
  };
}
