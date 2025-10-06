"use client";

import { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { MapPin } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.5rem',
};

interface ArenaMapProps {
  address: string;
}

const ArenaMap = ({ address }: ArenaMapProps) => {
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
  });

  useEffect(() => {
    if (!isLoaded) {
      setLoading(true);
      return;
    }

    if (!address || address.trim() === '') {
      setError("Nenhum endereço foi fornecido para esta arena.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Adicionando um timeout para evitar que a requisição fique travada indefinidamente
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos de timeout

    fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`, {
      signal: controller.signal
    })
      .then(response => {
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error(`Erro de rede: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.status === 'OK' && data.results && data.results.length > 0 && data.results[0].geometry) {
          setCoordinates(data.results[0].geometry.location);
        } else {
          // Mensagens de erro mais específicas da API do Google
          let errorMessage = 'Não foi possível encontrar as coordenadas para este endereço.';
          if (data.error_message) {
            errorMessage = `Erro da API do Google: ${data.error_message}`;
          } else if (data.status === 'ZERO_RESULTS') {
            errorMessage = 'O endereço não foi encontrado. Verifique se está correto.';
          } else if (data.status === 'REQUEST_DENIED') {
            errorMessage = 'A requisição à API do Google Maps foi negada. Verifique sua chave de API.';
          }
          setError(errorMessage);
        }
      })
      .catch(err => {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          setError("A requisição demorou muito. Tente novamente.");
        } else {
          console.error("Geocoding error:", err);
          setError("Não foi possível se conectar ao serviço de mapas. Verifique sua conexão com a internet.");
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isLoaded, address, apiKey]);

  if (loading || !isLoaded) {
    return (
      <div style={containerStyle} className="flex items-center justify-center bg-muted">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Carregando mapa...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle} className="flex flex-col items-center justify-center bg-destructive/10 text-destructive p-4">
        <MapPin className="h-12 w-12 mb-2" />
        <p className="text-center font-medium">{error}</p>
        <p className="text-center text-sm mt-2">Tente verificar o endereço ou usar o Google Maps diretamente.</p>
      </div>
    );
  }

  if (!coordinates) {
    return (
      <div style={containerStyle} className="flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">Aguardando endereço válido...</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={coordinates}
      zoom={16}
      options={{
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      }}
    >
      <MarkerF position={coordinates} title={address} />
    </GoogleMap>
  );
};

export default ArenaMap;