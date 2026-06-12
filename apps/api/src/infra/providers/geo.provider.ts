import { Injectable } from '@nestjs/common';

export abstract class GeoProvider {
  /** Road distance in km between two points (dev impl: haversine × 1.3 detour factor). */
  abstract distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): Promise<number>;
}

/**
 * Haversine fallback for development.
 * REQUIRES-EXTERNAL: production should use Google Maps / Mapbox routing
 * behind this same interface (GEO_PROVIDER env).
 */
@Injectable()
export class HaversineGeoProvider extends GeoProvider {
  async distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): Promise<number> {
    const R = 6371;
    const dLat = ((bLat - aLat) * Math.PI) / 180;
    const dLng = ((bLng - aLng) * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    const straight = 2 * R * Math.asin(Math.sqrt(h));
    return Math.round(straight * 1.3 * 100) / 100;
  }
}
