// components/ForMap/MapInteractionHandler.jsx
import React, { useCallback, useEffect } from 'react';
import { useMapEvents, useMap } from 'react-leaflet'; // useMap теперь используется здесь
import * as L from 'leaflet';

import PolygonAndMarkerLayer from './PolygonAndMarkerLayer';
import PolygonAnalysisLayer from './PolygonAnalysisLayer';

export default function MapInteractionHandler({
  // mapInstance, // <-- УДАЛЕНО: Получаем map через useMap()
  polygons,
  selectedPolygon,
  onSelectAnalysisForPolygon,
  activeAnalysisType,
  analysisDateRange,
  onLoadingChange,
  onError,
  calculateArea,
  formatArea,
  setZoom
}) {
  const map = useMap(); // <-- ПОЛУЧАЕМ ЭКЗЕМПЛЯР КАРТЫ ЗДЕСЬ

  const flyToMarker = useCallback((latlng, newZoom = 15) => {
    if (map) { // Используем map из useMap()
      map.flyTo(latlng, newZoom, {
        duration: 1.5,
      });
    }
  }, [map]); // Зависимость от map

  useMapEvents({
    zoomend: (e) => {
      if (setZoom) {
        setZoom(e.target.getZoom());
      }
    },
  });

  console.log('MapInteractionHandler render: polygons prop:', polygons);
  console.log('MapInteractionHandler render: map from useMap():', map); // Лог для проверки map

  return (
    <>
      <PolygonAndMarkerLayer
        polygons={polygons}
        calculateArea={calculateArea}
        formatArea={formatArea}
        selectedPolygon={selectedPolygon}
        flyToMarker={flyToMarker}
        onSelectAnalysisForPolygon={onSelectAnalysisForPolygon}
      />
      {/* Рендерим PolygonAnalysisLayer здесь, передавая ему map */}
      {selectedPolygon && activeAnalysisType && map && ( // Добавляем проверку map
        <PolygonAnalysisLayer
          map={map} // <-- ПЕРЕДАЕМ ЭКЗЕМПЛЯР КАРТЫ, ПОЛУЧЕННЫЙ ЧЕРЕЗ useMap()
          selectedPolygonData={polygons.find(p => p.id === selectedPolygon)}
          activeAnalysisType={activeAnalysisType}
          analysisDateRange={analysisDateRange}
          onLoadingChange={onLoadingChange}
          onError={onError}
        />
      )}
    </>
  );
}
