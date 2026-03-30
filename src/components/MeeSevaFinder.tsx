import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { MapPin, Navigation, Star, Phone, ExternalLink, Loader2, AlertCircle, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '12px'
};

const DEFAULT_CENTER = {
  lat: 17.3850, // Hyderabad
  lng: 78.4867
};

interface Place {
  id: string;
  name: string;
  address: string;
  rating: string | number;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface MeeSevaFinderProps {
  onBack: () => void;
  userLocation: { latitude: number; longitude: number } | null;
}

export default function MeeSevaFinder({ onBack, userLocation }: MeeSevaFinderProps) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  const fetchPlaces = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/places?lat=${lat}&lng=${lng}`);
      
      if (response.status === 429) {
        throw new Error("Too many requests. Please try again later.");
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Unable to fetch MeeSeva centers. Try again later.");
      }
      
      const data = await response.json();
      setPlaces(data);
    } catch (err: any) {
      setError(err.message || "Unable to fetch MeeSeva centers. Try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const lat = userLocation?.latitude || DEFAULT_CENTER.lat;
    const lng = userLocation?.longitude || DEFAULT_CENTER.lng;
    
    setMapCenter({ lat, lng });
    fetchPlaces(lat, lng);
  }, [userLocation?.latitude, userLocation?.longitude, fetchPlaces]);

  const openInGoogleMaps = (place: Place) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${place.coordinates.lat},${place.coordinates.lng}&query_place_id=${place.id}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeft size={24} className="text-gray-600" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Find MeeSeva Center</h2>
          <p className="text-sm text-gray-500">Nearby government service centers</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Map Section */}
        <div className="relative">
          {!GOOGLE_MAPS_API_KEY ? (
            <div className="w-full h-[400px] bg-yellow-50 rounded-xl flex flex-col items-center justify-center text-yellow-700 p-4 text-center border border-yellow-200">
              <AlertCircle size={32} className="mb-2" />
              <p className="font-semibold">Google Maps API Key Missing</p>
              <p className="text-sm mt-1">Please configure VITE_GOOGLE_MAPS_API_KEY in your environment variables.</p>
            </div>
          ) : loadError ? (
            <div className="w-full h-[400px] bg-red-50 rounded-xl flex flex-col items-center justify-center text-red-500 p-4 text-center border border-red-200">
              <AlertCircle size={32} className="mb-2" />
              <p className="font-semibold">Google Maps Error</p>
              <p className="text-sm mt-1">
                Failed to load Google Maps. This is often due to an invalid API key or a missing billing account.
              </p>
              <a 
                href="https://console.cloud.google.com/projectselector/billing/enable" 
                target="_blank" 
                className="mt-3 text-xs underline font-medium flex items-center gap-1"
              >
                Check Billing Status <ExternalLink size={10} />
              </a>
            </div>
          ) : isLoaded ? (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={mapCenter}
              zoom={13}
              options={{
                disableDefaultUI: false,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false
              }}
            >
              {/* User Location Marker */}
              {userLocation && (
                <Marker 
                  position={{ lat: userLocation.latitude, lng: userLocation.longitude }}
                  icon={{
                    path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
                    scale: 7,
                    fillColor: "#4285F4",
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: "white",
                  }}
                  title="Your Location"
                />
              )}

              {/* MeeSeva Center Markers */}
              {places.map((place) => (
                <Marker
                  key={place.id}
                  position={place.coordinates}
                  onClick={() => setSelectedPlace(place)}
                  icon={{
                    url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
                  }}
                />
              ))}

              {selectedPlace && (
                <InfoWindow
                  position={selectedPlace.coordinates}
                  onCloseClick={() => setSelectedPlace(null)}
                >
                  <div className="p-2 max-w-[200px]">
                    <h3 className="font-bold text-sm text-gray-900">{selectedPlace.name}</h3>
                    <p className="text-xs text-gray-600 mt-1">{selectedPlace.address}</p>
                    <button 
                      onClick={() => openInGoogleMaps(selectedPlace)}
                      className="mt-2 text-xs text-blue-600 font-semibold flex items-center gap-1"
                    >
                      <Navigation size={12} /> Directions
                    </button>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          ) : (
            <div className="w-full h-[400px] bg-gray-100 rounded-xl flex items-center justify-center">
              <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <MapPin size={18} className="text-[#00796b]" />
              Nearby Centers ({places.length})
            </h3>
            {loading && <Loader2 className="animate-spin text-[#00796b]" size={18} />}
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && places.length === 0 && !error && (
            <div className="text-center py-12 text-gray-500">
              <p>No MeeSeva centers found within 5km.</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <AnimatePresence mode="popLayout">
              {places.map((place, index) => (
                <motion.div
                  key={place.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all group cursor-pointer"
                  onClick={() => {
                    setSelectedPlace(place);
                    setMapCenter(place.coordinates);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 group-hover:text-[#00796b] transition-colors">
                        {place.name}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{place.address}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-1 rounded-lg text-xs font-bold">
                      <Star size={12} fill="currentColor" />
                      {place.rating}
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center gap-3">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openInGoogleMaps(place);
                      }}
                      className="flex-1 bg-[#00796b] text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors"
                    >
                      <Navigation size={16} />
                      Directions
                    </button>
                    <button 
                      className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                      title="Call Center"
                    >
                      <Phone size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
