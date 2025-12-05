/**
 * CLINIC LOCATION SERVICE
 *
 * Provides location-based services for finding veterinary clinics using
 * OpenStreetMap's Nominatim API (free, no API key required).
 */

import { getSupabaseBrowserClient, getSupabaseServiceRoleClient } from '@/lib/supabase/client';

export interface ClinicLocation {
  id?: string;
  placeId: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  distance?: number; // in kilometers
  isEmergency?: boolean;
  is24Hours?: boolean;
  rating?: number;
  isSaved?: boolean;
}

export interface VetHistory {
  id: string;
  veterinarianName: string;
  clinicName?: string;
  clinicAddress?: string;
  latitude?: number;
  longitude?: number;
  visitDate: string;
  visitType?: string;
  rating?: number;
  petId?: string;
  petName?: string;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
}

// OpenStreetMap Nominatim API response type
interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: {
    amenity?: string;
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  extratags?: {
    phone?: string;
    website?: string;
    opening_hours?: string;
    healthcare?: string;
  };
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function requireClient(strict = true) {
  const supabase =
    typeof window === 'undefined'
      ? getSupabaseServiceRoleClient()
      : getSupabaseBrowserClient();

  if (!supabase && strict) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
}

async function requireUserId() {
  const supabase = requireClient();
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('User not authenticated');
  }
  return data.user.id;
}

export class ClinicLocationService {
  /**
   * Search for veterinary clinics near a location using OpenStreetMap Nominatim
   */
  static async searchNearbyClinics(
    location: UserLocation,
    radiusKm: number = 10,
    limit: number = 20
  ): Promise<ClinicLocation[]> {
    try {
      // Calculate bounding box for search
      const latDelta = radiusKm / 111; // ~111km per degree latitude
      const lonDelta = radiusKm / (111 * Math.cos(location.latitude * Math.PI / 180));

      const bbox = [
        location.longitude - lonDelta,
        location.latitude - latDelta,
        location.longitude + lonDelta,
        location.latitude + latDelta,
      ].join(',');

      // Search for veterinary clinics using Nominatim
      const searchTerms = ['veterinary', 'animal hospital', 'pet clinic', 'vet clinic'];
      const allResults: ClinicLocation[] = [];

      for (const term of searchTerms) {
        const url = `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(term)}&` +
          `viewbox=${bbox}&` +
          `bounded=1&` +
          `format=json&` +
          `addressdetails=1&` +
          `extratags=1&` +
          `limit=${Math.ceil(limit / searchTerms.length)}`;

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'PetHealthApp/1.0',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) continue;

        const data: NominatimResult[] = await response.json();

        for (const result of data) {
          const lat = parseFloat(result.lat);
          const lon = parseFloat(result.lon);
          const distance = calculateDistance(location.latitude, location.longitude, lat, lon);

          // Skip if outside radius
          if (distance > radiusKm) continue;

          // Check if this place is already in results (by coordinates)
          const exists = allResults.some(
            r => Math.abs(r.latitude - lat) < 0.0001 && Math.abs(r.longitude - lon) < 0.0001
          );
          if (exists) continue;

          const clinic: ClinicLocation = {
            placeId: result.place_id.toString(),
            name: result.name || result.address?.amenity || 'Veterinary Clinic',
            address: result.display_name,
            city: result.address?.city || result.address?.town || result.address?.village,
            state: result.address?.state,
            postalCode: result.address?.postcode,
            country: result.address?.country,
            latitude: lat,
            longitude: lon,
            phone: result.extratags?.phone,
            website: result.extratags?.website,
            distance,
            is24Hours: result.extratags?.opening_hours?.toLowerCase().includes('24'),
            isEmergency: result.name?.toLowerCase().includes('emergency') ||
                        result.extratags?.healthcare === 'emergency',
          };

          allResults.push(clinic);
        }

        // Rate limiting - Nominatim requires 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1100));
      }

      // Sort by distance and return
      return allResults
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
        .slice(0, limit);

    } catch (error) {
      console.error('Error searching for clinics:', error);
      return [];
    }
  }

  /**
   * Search for clinics by address/name
   */
  static async searchClinicsByQuery(query: string): Promise<ClinicLocation[]> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query + ' veterinary')}&` +
        `format=json&` +
        `addressdetails=1&` +
        `extratags=1&` +
        `limit=10`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PetHealthApp/1.0',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) return [];

      const data: NominatimResult[] = await response.json();

      return data.map(result => ({
        placeId: result.place_id.toString(),
        name: result.name || result.address?.amenity || 'Veterinary Clinic',
        address: result.display_name,
        city: result.address?.city || result.address?.town || result.address?.village,
        state: result.address?.state,
        postalCode: result.address?.postcode,
        country: result.address?.country,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        phone: result.extratags?.phone,
        website: result.extratags?.website,
      }));

    } catch (error) {
      console.error('Error searching clinics by query:', error);
      return [];
    }
  }

  /**
   * Get user's saved/favorite clinics
   */
  static async getSavedClinics(): Promise<ClinicLocation[]> {
    const supabase = requireClient(false);
    if (!supabase) return [];

    try {
      const userId = await requireUserId();

      const { data, error } = await supabase
        .from('veterinary_clinics')
        .select('*')
        .eq('user_id', userId)
        .order('is_favorite', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        placeId: row.place_id || row.id,
        name: row.name,
        address: [row.address, row.city, row.state, row.postal_code].filter(Boolean).join(', '),
        city: row.city,
        state: row.state,
        postalCode: row.postal_code,
        country: row.country,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        phone: row.phone,
        website: row.website,
        isEmergency: row.is_emergency,
        is24Hours: row.is_24_hours,
        rating: row.rating ? parseFloat(row.rating) : undefined,
        isSaved: true,
      }));

    } catch (error) {
      console.error('Error fetching saved clinics:', error);
      return [];
    }
  }

  /**
   * Save a clinic to user's list
   */
  static async saveClinic(clinic: ClinicLocation): Promise<ClinicLocation | null> {
    const supabase = requireClient();
    if (!supabase) return null;

    try {
      const userId = await requireUserId();

      const { data, error } = await supabase
        .from('veterinary_clinics')
        .insert({
          user_id: userId,
          name: clinic.name,
          address: clinic.address,
          city: clinic.city,
          state: clinic.state,
          postal_code: clinic.postalCode,
          country: clinic.country,
          latitude: clinic.latitude,
          longitude: clinic.longitude,
          phone: clinic.phone,
          website: clinic.website,
          place_id: clinic.placeId,
          is_emergency: clinic.isEmergency,
          is_24_hours: clinic.is24Hours,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        ...clinic,
        id: data.id,
        isSaved: true,
      };

    } catch (error) {
      console.error('Error saving clinic:', error);
      return null;
    }
  }

  /**
   * Remove a saved clinic
   */
  static async removeClinic(clinicId: string): Promise<boolean> {
    const supabase = requireClient();
    if (!supabase) return false;

    try {
      const userId = await requireUserId();

      const { error } = await supabase
        .from('veterinary_clinics')
        .delete()
        .eq('id', clinicId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;

    } catch (error) {
      console.error('Error removing clinic:', error);
      return false;
    }
  }

  /**
   * Toggle clinic as favorite
   */
  static async toggleFavorite(clinicId: string): Promise<boolean> {
    const supabase = requireClient();
    if (!supabase) return false;

    try {
      const userId = await requireUserId();

      // Get current favorite status
      const { data: current } = await supabase
        .from('veterinary_clinics')
        .select('is_favorite')
        .eq('id', clinicId)
        .eq('user_id', userId)
        .single();

      if (!current) return false;

      const { error } = await supabase
        .from('veterinary_clinics')
        .update({ is_favorite: !current.is_favorite })
        .eq('id', clinicId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;

    } catch (error) {
      console.error('Error toggling favorite:', error);
      return false;
    }
  }

  /**
   * Get veterinarian visit history
   */
  static async getVetHistory(petId?: string, limit: number = 10): Promise<VetHistory[]> {
    const supabase = requireClient(false);
    if (!supabase) return [];

    try {
      const userId = await requireUserId();

      let query = supabase
        .from('user_veterinarian_history')
        .select(`
          *,
          pets:pet_id (name)
        `)
        .eq('user_id', userId)
        .order('visit_date', { ascending: false })
        .limit(limit);

      if (petId) {
        query = query.eq('pet_id', petId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        veterinarianName: row.veterinarian_name,
        clinicName: row.clinic_name,
        clinicAddress: row.clinic_address,
        latitude: row.latitude ? parseFloat(row.latitude) : undefined,
        longitude: row.longitude ? parseFloat(row.longitude) : undefined,
        visitDate: row.visit_date,
        visitType: row.visit_type,
        rating: row.rating,
        petId: row.pet_id,
        petName: row.pets?.name,
      }));

    } catch (error) {
      console.error('Error fetching vet history:', error);
      return [];
    }
  }

  /**
   * Get suggested veterinarians (most recent and frequently visited)
   */
  static async getSuggestedVets(petId?: string): Promise<VetHistory[]> {
    const supabase = requireClient(false);
    if (!supabase) return [];

    try {
      const userId = await requireUserId();

      // Get distinct vets ordered by most recent visit
      const { data, error } = await supabase
        .rpc('get_suggested_vets', {
          p_user_id: userId,
          p_pet_id: petId || null,
          p_limit: 5
        });

      if (error) {
        // Fallback to simple query if RPC doesn't exist
        return this.getVetHistory(petId, 5);
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        veterinarianName: row.veterinarian_name,
        clinicName: row.clinic_name,
        clinicAddress: row.clinic_address,
        latitude: row.latitude ? parseFloat(row.latitude) : undefined,
        longitude: row.longitude ? parseFloat(row.longitude) : undefined,
        visitDate: row.last_visit_date,
        visitType: row.visit_type,
        rating: row.avg_rating,
        petId: row.pet_id,
      }));

    } catch (error) {
      console.error('Error fetching suggested vets:', error);
      return this.getVetHistory(petId, 5);
    }
  }

  /**
   * Record a vet visit
   */
  static async recordVetVisit(data: {
    petId?: string;
    veterinarianName: string;
    clinicName?: string;
    clinicAddress?: string;
    latitude?: number;
    longitude?: number;
    clinicId?: string;
    appointmentId?: string;
    visitDate: string;
    visitType?: string;
    notes?: string;
    rating?: number;
    wouldRecommend?: boolean;
  }): Promise<VetHistory | null> {
    const supabase = requireClient();
    if (!supabase) return null;

    try {
      const userId = await requireUserId();

      const { data: result, error } = await supabase
        .from('user_veterinarian_history')
        .insert({
          user_id: userId,
          pet_id: data.petId,
          veterinarian_name: data.veterinarianName,
          clinic_name: data.clinicName,
          clinic_address: data.clinicAddress,
          latitude: data.latitude,
          longitude: data.longitude,
          clinic_id: data.clinicId,
          appointment_id: data.appointmentId,
          visit_date: data.visitDate,
          visit_type: data.visitType,
          notes: data.notes,
          rating: data.rating,
          would_recommend: data.wouldRecommend,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: result.id,
        veterinarianName: result.veterinarian_name,
        clinicName: result.clinic_name,
        clinicAddress: result.clinic_address,
        latitude: result.latitude ? parseFloat(result.latitude) : undefined,
        longitude: result.longitude ? parseFloat(result.longitude) : undefined,
        visitDate: result.visit_date,
        visitType: result.visit_type,
        rating: result.rating,
        petId: result.pet_id,
      };

    } catch (error) {
      console.error('Error recording vet visit:', error);
      return null;
    }
  }

  /**
   * Geocode an address to get coordinates
   */
  static async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(address)}&` +
        `format=json&` +
        `limit=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PetHealthApp/1.0',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) return null;

      const data: NominatimResult[] = await response.json();

      if (data.length === 0) return null;

      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };

    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to get address
   */
  static async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?` +
        `lat=${latitude}&lon=${longitude}&` +
        `format=json`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PetHealthApp/1.0',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.display_name || null;

    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }
}
