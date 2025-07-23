// components/ForMap/MapComponent.jsx
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup, WMSTileLayer, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import * as L from 'leaflet';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import DrawingHandler from './DrawingHandler';
import PolygonAndMarkerLayer from './PolygonAndMarkerLayer';
import PolygonAnalysisLayer from './PolygonAnalysisLayer';
import WeatherDisplay from './WeatherDisplay'; 

// Исправляем иконки по умолчанию для Leaflet Draw
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Компонент, который получает экземпляр карты и передает его обратно через пропс
function MapEventsHandler({ onMapReady }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      onMapReady(map);
    }
  }, [map, onMapReady]);
  return null;
}

export default function MapComponent({
  polygons,
  onPolygonComplete,
  onPolygonEdited,
  setIsDrawing,
  isDrawing,
  editableFGRef,
  selectedPolygon, // Объект выбранного полигона (предполагается GeoJSON-подобный объект с 'coordinates')
  setSelectedPolygon,
  isEditingMode,
  editingMapPolygon,
  onLoadingChange,
  onError,
  onPointAdded,
  analysisDateRange, // Массив из двух объектов Date: [startDate, endDate]
  activeBaseMapType,
  activeAnalysisType, // Текущий выбранный тип анализа (например, 'NDVI')
  onMapReady // Пропс для получения экземпляра карты
}) {
  const mapRef = useRef();
  const [mapInstance, setMapInstance] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(13);

  // Функция для центрирования карты на определенной точке
  const flyToMarker = useCallback((center, zoom) => {
    if (mapRef.current) {
      mapRef.current.flyTo(center, zoom);
    }
  }, []);

  // Функция для расчета площади полигона
  const calculateArea = useCallback((coordinates) => {
    // Убедитесь, что coordinates в формате [lat, lng]
    const outerRing = Array.isArray(coordinates[0][0]) ? coordinates[0] : coordinates;
    if (outerRing.length < 3) return 0;
    const toRadians = (deg) => (deg * Math.PI) / 180;
    const R = 6371000; // Радиус Земли в метрах
    let area = 0;
    const n = outerRing.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const lat1 = toRadians(outerRing[i][0]);
      const lat2 = toRadians(outerRing[j][0]);
      const deltaLon = toRadians(outerRing[j][1] - outerRing[i][1]);
      const E =
        2 *
        Math.asin(
          Math.sqrt(
            Math.pow(Math.sin((lat2 - lat1) / 2), 2) +
            Math.cos(lat1) *
            Math.cos(lat2) *
            Math.pow(Math.sin(deltaLon / 2), 2)
          )
        );
      area += E * R * R;
    }
    return Math.abs(area) / 2;
  }, []);

  // Функция для форматирования площади
  const formatArea = useCallback((area) => {
    if (area < 10000) return `${area.toFixed(1)} м²`;
    if (area < 1000000) return `${(area / 10000).toFixed(1)} га`;
    return `${(area / 1000000).toFixed(1)} км²`;
  }, []);

  // Эффект для активации режима редактирования полигона
  useEffect(() => {
    if (isEditingMode && editingMapPolygon && editableFGRef && editableFGRef.current) {
      editableFGRef.current.clearLayers(); // Очищаем предыдущие слои

      // Создаем Leaflet Polygon из координат
      const leafletPolygon = L.polygon(editingMapPolygon.coordinates, {
        color: editingMapPolygon.color,
        fillOpacity: 0.2, // Сделать его немного прозрачным, чтобы видеть подложку
        weight: 4,
        dashArray: '5, 10', // Пунктирная линия
        lineCap: 'round',
        lineJoin: 'round'
      });
      
      // Добавляем полигон в FeatureGroup для редактирования
      leafletPolygon.addTo(editableFGRef.current);

      // Активация редактирования для этого конкретного слоя
      if (leafletPolygon.editing) {
        leafletPolygon.editing.enable();
        if (leafletPolygon.editing._editHandlers && leafletPolygon.editing._editHandlers.length > 0) {
            console.log("MapComponent: Обнаружены вершины редактирования.");
        } else {
            console.warn("MapComponent: Вершины редактирования не обнаружены после включения.");
        }
      } else {
        console.error("MapComponent ERROR: leafletPolygon.editing недоступен. Проверьте загрузку Leaflet.Editable.");
        console.log("leafletPolygon объект:", leafletPolygon);
      }
    } else if (!isEditingMode && editableFGRef && editableFGRef.current) {
      // Когда выходим из режима редактирования, очищаем группу
      editableFGRef.current.clearLayers();
    }
  }, [isEditingMode, editingMapPolygon, editableFGRef]);

  // Вспомогательная функция для получения имени WMS-слоя для анализа
  const getAnalysisWMSLayerName = useCallback((analysisType) => {
    // Это сопоставление должно соответствовать 'value' в analysisOptions в LayerSelectionBlock.jsx
    switch (analysisType) {
      case 'NDVI': return 'NDVI';
      case 'FALSE_COLOR': return 'FALSE_COLOR';
      case 'FALSE_COLOR_URBAN': return 'FALSE_COLOR_URBAN';
      case 'MOISTURE_INDEX': return 'MOISTURE_INDEX';
      case 'NDSI': return 'NDSI';
      case 'NDWI': return 'NDWI';
      case 'SWIR': return 'SWIR';
      case 'SCENE_CLASSIFICATION': return 'SCL'; // Часто 'SCL' для Scene Classification
      case 'HIGHLIGHT_OPTIMIZED_NATURAL_COLOR': return 'NATURAL_COLOR'; // Уточните это имя по документации Sentinel-Hub
      default: return null; // Нет выбранного аналитического слоя
    }
  }, []);

  const analysisLayerName = getAnalysisWMSLayerName(activeAnalysisType);

  // === Отладочные сообщения для условий рендеринга аналитического слоя ===
  useEffect(() => {
    console.log("--- MapComponent Analysis Layer Debug ---");
    console.log("activeAnalysisType:", activeAnalysisType);
    console.log("selectedPolygon:", selectedPolygon ? "Set" : "Not Set");
    console.log("analysisLayerName:", analysisLayerName);
    console.log("analysisDateRange:", analysisDateRange);
    if (analysisDateRange && analysisDateRange.length === 2) {
      console.log("analysisDateRange[0]:", analysisDateRange[0] instanceof Date ? analysisDateRange[0].toISOString().split('T')[0] : 'Not a Date object');
      console.log("analysisDateRange[1]:", analysisDateRange[1] instanceof Date ? analysisDateRange[1].toISOString().split('T')[0] : 'Not a Date object');
    }
    if (selectedPolygon) {
        // Проверяем, является ли selectedPolygon объектом Leaflet с методом getBounds()
        if (selectedPolygon.getBounds && typeof selectedPolygon.getBounds === 'function') {
            console.log("selectedPolygon bounds (Leaflet obj):", selectedPolygon.getBounds());
        } else if (selectedPolygon.coordinates) { // Если это просто объект с координатами
            console.log("selectedPolygon has coordinates. Will attempt to derive bounds.");
            // Пример: console.log("selectedPolygon coordinates (first 2):", selectedPolygon.coordinates[0][0], selectedPolygon.coordinates[0][1]);
        } else {
            console.log("selectedPolygon is not a Leaflet object with getBounds() and does not have a 'coordinates' property. Check its structure.");
        }
    }
    console.log("-----------------------------------------");
  }, [activeAnalysisType, selectedPolygon, analysisLayerName, analysisDateRange]);

  // Функция для получения BBOX из объекта selectedPolygon
  const getPolygonBounds = useCallback(() => {
    if (!selectedPolygon) {
      console.warn("getPolygonBounds: selectedPolygon is null or undefined.");
      return undefined;
    }

    // Если selectedPolygon уже является Leaflet объектом с методом getBounds()
    if (selectedPolygon.getBounds && typeof selectedPolygon.getBounds === 'function') {
      return selectedPolygon.getBounds();
    }

    let flatCoordinates = [];

    // --- NEW: Handle direct 'coordinates' array ---
    if (selectedPolygon.coordinates && Array.isArray(selectedPolygon.coordinates) && selectedPolygon.coordinates.length > 0) {
        // Assume it's an array of [lat, lng] pairs directly
        flatCoordinates = selectedPolygon.coordinates;
    } 
    // --- Existing: Handle GeoJSON 'geometry.coordinates' ---
    else if (selectedPolygon.geometry && selectedPolygon.geometry.coordinates && Array.isArray(selectedPolygon.geometry.coordinates) && selectedPolygon.geometry.coordinates.length > 0) {
      // Check depth for GeoJSON Polygon format: [[[lng, lat], ...]]
      if (Array.isArray(selectedPolygon.geometry.coordinates[0]) && Array.isArray(selectedPolygon.geometry.coordinates[0][0])) {
        // GeoJSON Polygon, coordinates are [lng, lat], convert to [lat, lng]
        flatCoordinates = selectedPolygon.geometry.coordinates[0].map(ring => 
          ring.map(coord => [coord[1], coord[0]]) // Swap [lng, lat] to [lat, lng]
        ).flat();
      } else if (Array.isArray(selectedPolygon.geometry.coordinates[0]) && typeof selectedPolygon.geometry.coordinates[0][0] === 'number') {
        // Simple array of [lat, lng] pairs
        flatCoordinates = selectedPolygon.geometry.coordinates;
      } else {
        console.warn("getPolygonBounds: Unexpected coordinates structure in selectedPolygon.geometry.coordinates.", selectedPolygon.geometry.coordinates);
        return undefined;
      }
    }
    
    // Filter out invalid coordinates and convert to L.LatLng objects
    const latLngs = flatCoordinates.filter(coord => 
      Array.isArray(coord) && coord.length === 2 && typeof coord[0] === 'number' && typeof coord[1] === 'number'
    ).map(coord => L.latLng(coord[0], coord[1]));
    
    // Create L.LatLngBounds from the array of L.LatLng
    if (latLngs.length > 0) {
      return L.latLngBounds(latLngs);
    } else {
      console.warn("getPolygonBounds: No valid LatLngs derived from coordinates.");
    }
    
    console.warn("getPolygonBounds: Could not derive bounds from selectedPolygon. Check its structure.", selectedPolygon);
    return undefined;
  }, [selectedPolygon]);

  const analyticalLayerBounds = getPolygonBounds();


  return (
    <MapContainer
      center={[43.2567, 76.9286]} // Центр по умолчанию (например, Алматы)
      zoom={13}
      style={{ height: '100%', flex: 1 }}
      ref={mapRef}
      zoomControl={false} // Отключаем стандартный зум-контрол Leaflet
      whenCreated={(mapInstance) => {
        if (mapInstance) {
          mapRef.current = mapInstance;
          setMapInstance(mapInstance);
          setCurrentZoom(mapInstance.getZoom());
          onMapReady(mapInstance); // Вызываем коллбэк, когда карта готова
        }
      }}
    >
      <MapEventsHandler onMapReady={onMapReady} />

      {/* Условное отображение базового слоя OpenStreetMap */}
      {activeBaseMapType === 'openstreetmap' && (
        <>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            zIndex={1} // Базовый слой
          />
          {/* Слой границ и названий для OpenStreetMap */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            zIndex={2} // Поверх OpenStreetMap, но под аналитикой
          />
        </>
      )}

      {/* Условное отображение базового слоя Sentinel */}
      {activeBaseMapType === 'sentinel' && (
        <>
          <WMSTileLayer
            url="https://services.sentinel-hub.com/ogc/wms/9ba3e333-8865-48a3-b2d5-538187414a82"
            layers="2_TONEMAPPED_NATURAL_COLOR" // Слой натурального цвета Sentinel
            format="image/png"
            transparent={true}
            version="1.3.0"
            zIndex={100} // Базовый слой Sentinel
          />
          {/* Слой границ и названий для Sentinel */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            zIndex={101} // Поверх Sentinel, но под аналитикой
          />
        </>
      )}

      {/* Условное отображение высококачественного спутникового слоя ESRI World Imagery */}
      {activeBaseMapType === 'esri_imagery' && (
        <>
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
            zIndex={1} // Базовый слой
          />
          {/* НОВЫЙ СЛОЙ: Добавляем слой границ и названий поверх ESRI World Imagery */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            zIndex={2} // Поверх ESRI World Imagery, но под аналитикой
          />
        </>
      )}

      {/* Условное отображение аналитического WMS-слоя теперь находится внутри MapComponent */}
      {activeAnalysisType && activeAnalysisType !== 'none' && selectedPolygon && analysisLayerName && analyticalLayerBounds && analysisDateRange && analysisDateRange.length === 2 && (
        <PolygonAnalysisLayer
      selectedPolygonData={selectedPolygon}
      activeAnalysisType={activeAnalysisType}
      analysisDateRange={analysisDateRange}
      onLoadingChange={onLoadingChange}
      onError={onError}
    />
      )}

      <PolygonAndMarkerLayer
        polygons={polygons}
        selectedPolygon={selectedPolygon}
        setSelectedPolygon={setSelectedPolygon}
        analysisDateRange={analysisDateRange}
        onLoadingChange={onLoadingChange}
        onError={onError}
        calculateArea={calculateArea}
        formatArea={formatArea}
        flyToMarker={flyToMarker}
        map={mapInstance}
      />

      <DrawingHandler
        onPolygonComplete={onPolygonComplete}
        onStopAndSave={window.getCurrentPath}
        isDrawing={isDrawing}
        setIsDrawing={setIsDrawing}
        onPointAdded={() => { /* Placeholder for future use */ }}
      />

      {/* Режим редактирования полигона */}
      {isEditingMode && (
        <FeatureGroup ref={editableFGRef} zIndex={500}>
          <EditControl
            position="topright"
            onEdited={onPolygonEdited}
            draw={{
              polygon: false, rectangle: false, polyline: false,
              circle: false, marker: false, circlemarker: false,
            }}
            edit={{
              featureGroup: editableFGRef.current,
              remove: false,
            }}
          />
        </FeatureGroup>
      )}

      {/* Добавляем компонент WeatherDisplay */}
      <WeatherDisplay
        mapCenter={mapInstance ? mapInstance.getCenter() : [43.2567, 76.9286]} // Передаем текущий центр карты
        zoom={mapInstance ? mapInstance.getZoom() : 13} // Передаем текущий зум карты
        selectedPolygonBounds={analyticalLayerBounds} // Передаем границы выбранного полигона
        activeAnalysisType={activeAnalysisType} // Передаем активный тип анализа
      />
    </MapContainer>
  );
}