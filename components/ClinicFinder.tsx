'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Search, Navigation, Star, Clock, Phone, Globe, Loader2, X, Heart, ChevronDown, ChevronUp, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { ClinicLocation, VetHistory } from '@/lib/services';
import { cn } from '@/lib/utils';

interface ClinicFinderProps {
  onSelectClinic: (clinic: { name: string; address: string; veterinarian?: string }) => void;
  petId?: string;
  className?: string;
}

export default function ClinicFinder({ onSelectClinic, petId, className }: ClinicFinderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clinics, setClinics] = useState<ClinicLocation[]>([]);
  const [suggestedVets, setSuggestedVets] = useState<VetHistory[]>([]);
  const [savedClinics, setSavedClinics] = useState<ClinicLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'nearby' | 'search' | 'recent' | 'saved'>('recent');

  const loadSuggestedVets = useCallback(async () => {
    try {
      const url = petId
        ? `/api/clinics/history?suggested=true&petId=${petId}`
        : '/api/clinics/history?suggested=true';
      const response = await fetch(url);
      const data = await response.json();
      setSuggestedVets(data.vets || []);
    } catch (error) {
      console.error('Error loading suggested vets:', error);
    }
  }, [petId]);

  const loadSavedClinics = useCallback(async () => {
    try {
      const response = await fetch('/api/clinics/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saved' }),
      });
      const data = await response.json();
      setSavedClinics(data.clinics || []);
    } catch (error) {
      console.error('Error loading saved clinics:', error);
    }
  }, []);

  // Load suggested vets and saved clinics on mount/open
  useEffect(() => {
    if (isOpen) {
      loadSuggestedVets();
      loadSavedClinics();
    }
  }, [isOpen, loadSuggestedVets, loadSavedClinics]);

  const getUserLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        });
      });

      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      setActiveTab('nearby');
      searchNearby(position.coords.latitude, position.coords.longitude);
    } catch (error: any) {
      if (error.code === 1) {
        toast.error('Location access denied. Please enable location services.');
      } else if (error.code === 2) {
        toast.error('Unable to determine your location.');
      } else {
        toast.error('Location request timed out.');
      }
    } finally {
      setGettingLocation(false);
    }
  }, []);

  const searchNearby = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/clinics/search?lat=${lat}&lng=${lng}&radius=15`);
      const data = await response.json();
      setClinics(data.clinics || []);
      if (data.clinics?.length === 0) {
        toast.info('No veterinary clinics found nearby. Try expanding your search.');
      }
    } catch (error) {
      console.error('Error searching nearby clinics:', error);
      toast.error('Failed to search for nearby clinics');
    } finally {
      setLoading(false);
    }
  };

  const searchByQuery = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setActiveTab('search');
    try {
      const response = await fetch(`/api/clinics/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setClinics(data.clinics || []);
      if (data.clinics?.length === 0) {
        toast.info('No results found. Try a different search term.');
      }
    } catch (error) {
      console.error('Error searching clinics:', error);
      toast.error('Failed to search for clinics');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClinic = (clinic: ClinicLocation) => {
    onSelectClinic({
      name: clinic.name,
      address: clinic.address,
    });
    setIsOpen(false);
    toast.success(`Selected: ${clinic.name}`);
  };

  const handleSelectVet = (vet: VetHistory) => {
    onSelectClinic({
      name: vet.clinicName || 'Veterinary Clinic',
      address: vet.clinicAddress || '',
      veterinarian: vet.veterinarianName,
    });
    setIsOpen(false);
    toast.success(`Selected: ${vet.veterinarianName}`);
  };

  const saveClinic = async (clinic: ClinicLocation, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch('/api/clinics/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', clinic }),
      });
      const data = await response.json();
      if (data.clinic) {
        setSavedClinics(prev => [...prev, data.clinic]);
        toast.success('Clinic saved!');
      }
    } catch (error) {
      toast.error('Failed to save clinic');
    }
  };

  return (
    <div className={cn('relative', className)}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between text-left font-normal"
      >
        <span className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-blue-500" />
          Find a Clinic or Veterinarian
        </span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full min-w-[400px] max-w-[500px] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchByQuery()}
                  placeholder="Search clinics by name or address..."
                  className="pl-9"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={getUserLocation}
                disabled={gettingLocation}
                title="Use my location"
              >
                {gettingLocation ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              {[
                { id: 'recent', label: 'Recent', icon: User },
                { id: 'nearby', label: 'Nearby', icon: Navigation },
                { id: 'saved', label: 'Saved', icon: Heart },
                { id: 'search', label: 'Search', icon: Search },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id as any)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    activeTab === id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="max-h-[350px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <span className="ml-2 text-slate-500">Searching...</span>
              </div>
            ) : activeTab === 'recent' ? (
              suggestedVets.length > 0 ? (
                <div className="p-2">
                  <p className="px-2 py-1 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Recently Visited
                  </p>
                  {suggestedVets.map((vet) => (
                    <button
                      key={vet.id}
                      type="button"
                      onClick={() => handleSelectVet(vet)}
                      className="w-full p-3 text-left hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <User className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">
                            {vet.veterinarianName}
                          </p>
                          {vet.clinicName && (
                            <p className="text-sm text-slate-600 truncate">{vet.clinicName}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            {vet.visitDate && (
                              <span className="text-xs text-slate-400">
                                Last visit: {new Date(vet.visitDate).toLocaleDateString()}
                              </span>
                            )}
                            {vet.rating && (
                              <span className="flex items-center gap-1 text-xs text-amber-500">
                                <Star className="h-3 w-3 fill-current" />
                                {vet.rating}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <User className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No recent veterinarians</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Your visit history will appear here
                  </p>
                </div>
              )
            ) : activeTab === 'saved' ? (
              savedClinics.length > 0 ? (
                <div className="p-2">
                  <p className="px-2 py-1 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Saved Clinics
                  </p>
                  {savedClinics.map((clinic) => (
                    <ClinicCard
                      key={clinic.id}
                      clinic={clinic}
                      onSelect={handleSelectClinic}
                      saved
                    />
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Heart className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No saved clinics</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Save clinics from search results
                  </p>
                </div>
              )
            ) : clinics.length > 0 ? (
              <div className="p-2">
                <p className="px-2 py-1 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {activeTab === 'nearby' ? 'Nearby Clinics' : 'Search Results'}
                </p>
                {clinics.map((clinic, index) => (
                  <ClinicCard
                    key={clinic.placeId || index}
                    clinic={clinic}
                    onSelect={handleSelectClinic}
                    onSave={saveClinic}
                    isSaved={savedClinics.some(s => s.placeId === clinic.placeId)}
                  />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <MapPin className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">
                  {activeTab === 'nearby'
                    ? 'Click the location button to find nearby clinics'
                    : 'Search for veterinary clinics'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ClinicCard({
  clinic,
  onSelect,
  onSave,
  saved,
  isSaved,
}: {
  clinic: ClinicLocation;
  onSelect: (clinic: ClinicLocation) => void;
  onSave?: (clinic: ClinicLocation, e: React.MouseEvent) => void;
  saved?: boolean;
  isSaved?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(clinic)}
      className="w-full p-3 text-left hover:bg-slate-50 rounded-lg transition-colors group"
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-lg',
          clinic.isEmergency ? 'bg-red-100' : 'bg-blue-100'
        )}>
          <MapPin className={cn(
            'h-4 w-4',
            clinic.isEmergency ? 'text-red-600' : 'text-blue-600'
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-slate-900 truncate">
              {clinic.name}
            </p>
            {clinic.distance !== undefined && (
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {clinic.distance.toFixed(1)} km
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 line-clamp-2">{clinic.address}</p>
          <div className="flex items-center gap-3 mt-1.5">
            {clinic.isEmergency && (
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">
                Emergency
              </span>
            )}
            {clinic.is24Hours && (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <Clock className="h-3 w-3" />
                24h
              </span>
            )}
            {clinic.phone && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Phone className="h-3 w-3" />
              </span>
            )}
            {clinic.website && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Globe className="h-3 w-3" />
              </span>
            )}
          </div>
        </div>
        {onSave && !saved && !isSaved && (
          <button
            type="button"
            onClick={(e) => onSave(clinic, e)}
            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-slate-100 rounded transition-all"
            title="Save clinic"
          >
            <Heart className="h-4 w-4 text-slate-400 hover:text-red-500" />
          </button>
        )}
        {(saved || isSaved) && (
          <Heart className="h-4 w-4 text-red-500 fill-current" />
        )}
      </div>
    </button>
  );
}
