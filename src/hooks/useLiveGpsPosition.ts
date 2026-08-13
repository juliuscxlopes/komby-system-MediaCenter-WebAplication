// src/hooks/useLiveGpsPosition.ts
//
// GPS é publicado como um payload composto (LAT/LON/ALT/SPEED/HEADING/
// SATELLITES/HDOP juntos, field='GPS') -- diferente dos 9 sensores do
// motor, que são um valor solto cada. Por isso hook próprio, fora do
// useLiveSensorSeries.
import { useEffect, useState } from 'react';
import { onSensorUpdate } from '../WebSocket/Listeners/WsTelemetryListeners';
import { socketService } from '../WebSocket/WsConfig';

export interface GpsPosition {
  lat: number;
  lon: number;
  alt: number;
  speed: number;
  heading: number;
  satellites: number;
  hdop: number;
}

export function useLiveGpsPosition() {
  const [position, setPosition] = useState<GpsPosition | null>(null);

  useEffect(() => {
    socketService.connect();

    onSensorUpdate('GPS', (reading: any) => {
      const lat = Number(reading.LAT);
      const lon = Number(reading.LON);
      if (Number.isNaN(lat) || Number.isNaN(lon)) return;

      setPosition({
        lat,
        lon,
        alt: Number(reading.ALT),
        speed: Number(reading.SPEED),
        heading: Number(reading.HEADING),
        satellites: Number(reading.SATELLITES),
        hdop: Number(reading.HDOP),
      });
    });
  }, []);

  return position;
}
