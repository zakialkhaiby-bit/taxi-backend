import { Point } from '@ridy/database';

export function calculateHaversineDistance(
  location: Point,
  pickupLocation: Point,
) {
  // Implement Haversine formula to calculate distance
  const R = 6371e3; // metres
  const φ1 = (location.lat * Math.PI) / 180; // φ in radians
  const φ2 = (pickupLocation.lat * Math.PI) / 180;
  const Δφ = ((pickupLocation.lat - location.lat) * Math.PI) / 180;
  const Δλ = ((pickupLocation.lng - location.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}
