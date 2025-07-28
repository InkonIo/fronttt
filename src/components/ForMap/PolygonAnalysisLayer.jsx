// components/ForMap/PolygonAnalysisLayer.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { ImageOverlay, useMap } from 'react-leaflet'; // Import useMap hook
import L from 'leaflet';

const BASE_API_URL = 'http://localhost:8080';

export default function PolygonAnalysisLayer({
  selectedPolygonData,
  activeAnalysisType,
  analysisDateRange,
  onLoadingChange,
  onError
}) {
  const [analysisImageUrl, setAnalysisImageUrl] = useState(null);
  const [imageBounds, setImageBounds] = useState(null);
  const map = useMap(); // Get the map instance

  const fetchAnalysisImage = useCallback(async () => {
    if (!selectedPolygonData || !activeAnalysisType || !analysisDateRange || analysisDateRange.length !== 2) {
      console.log("PolygonAnalysisLayer: Отмена запроса, отсутствуют необходимые данные:", {
        selectedPolygonData,
        activeAnalysisType,
        analysisDateRange
      });
      setAnalysisImageUrl(null);
      setImageBounds(null);
      return;
    }

    const dateFromObj = analysisDateRange[0];
    const dateToObj = analysisDateRange[1];

    if (!(dateFromObj instanceof Date) || isNaN(dateFromObj) || !(dateToObj instanceof Date) || isNaN(dateToObj)) {
      console.error("PolygonAnalysisLayer: analysisDateRange содержит некорректные объекты Date.", analysisDateRange);
      onError('Ошибка: Некорректный диапазон дат для анализа.');
      onLoadingChange(false);
      return;
    }

    onLoadingChange(true);
    setAnalysisImageUrl(null);
    setImageBounds(null);

    try {
      if (!selectedPolygonData.coordinates || !Array.isArray(selectedPolygonData.coordinates) || selectedPolygonData.coordinates.length === 0) {
        console.error('Ошибка: selectedPolygonData.coordinates отсутствует или пуст. Текущие данные:', selectedPolygonData);
        onError('Ошибка: Данные координат полигона отсутствуют.');
        onLoadingChange(false);
        return;
      }

      const outerRing = Array.isArray(selectedPolygonData.coordinates[0]) && Array.isArray(selectedPolygonData.coordinates[0][0])
        ? selectedPolygonData.coordinates[0]
        : selectedPolygonData.coordinates;

      if (outerRing.length < 3) {
        console.error('Ошибка: Полигон содержит менее 3 точек. Координаты:', outerRing);
        onError('Ошибка: Полигон содержит менее 3 точек.');
        onLoadingChange(false);
        return;
      }

      const geoJsonCoordinates = outerRing.map(coord => [coord[1], coord[0]]);
      const geoJsonPolygon = {
        type: "Polygon",
        coordinates: [geoJsonCoordinates]
      };

      const leafletPolygon = L.polygon(outerRing);
      const bounds = leafletPolygon.getBounds();
      const imageOverlayBounds = [
        [bounds.getSouth(), bounds.getWest()],
        [bounds.getNorth(), bounds.getEast()]
      ];

      // Calculate width and height dynamically based on map pixels
      // This is a simplified approach. For more accurate calculations,
      // consider the map's resolution at the given bounds.
      const southWest = map.latLngToContainerPoint(bounds.getSouthWest());
      const northEast = map.latLngToContainerPoint(bounds.getNorthEast());

      const calculatedWidth = Math.abs(northEast.x - southWest.x);
      const calculatedHeight = Math.abs(northEast.y - southWest.y);

      // Set a minimum size to avoid very small requests, and a maximum to prevent excessively large ones
      const minDimension = 256;
      const maxDimension = 1024; // You can adjust this based on performance/quality needs

      const requestWidth = Math.max(minDimension, Math.min(maxDimension, Math.round(calculatedWidth)));
      const requestHeight = Math.max(minDimension, Math.min(maxDimension, Math.round(calculatedHeight)));

      console.log(`Calculated dimensions: ${requestWidth}x${requestHeight}`);

      const requestBody = {
        polygonGeoJson: JSON.stringify(geoJsonPolygon),
        analysisType: activeAnalysisType,
        dateFrom: dateFromObj.toISOString().split('T')[0],
        dateTo: dateToObj.toISOString().split('T')[0],
        width: requestWidth, // Use dynamic width
        height: requestHeight, // Use dynamic height
      };

      const token = localStorage.getItem('token');
      if (!token) {
        onError('Ошибка: Токен аутентификации отсутствует. Пожалуйста, войдите в систему.');
        onLoadingChange(false);
        return;
      }

      console.log("PolygonAnalysisLayer: Отправка запроса на бэкенд:", requestBody);

      const response = await fetch(`${BASE_API_URL}/api/sentinel/process-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Ошибка загрузки аналитического слоя: ${response.status} - ${errorText}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.message) {
            errorMessage = `Ошибка Sentinel Hub: ${errorJson.error.message}`;
          }
        } catch (_) {
          // ignore
        }
        console.error('Ошибка ответа API:', errorMessage);
        throw new Error(errorMessage);
      }

      const imageBlob = await response.blob();
      const imageUrl = URL.createObjectURL(imageBlob);

      setAnalysisImageUrl(imageUrl);
      setImageBounds(imageOverlayBounds);
      console.log("PolygonAnalysisLayer: Изображение анализа успешно загружено.");

    } catch (error) {
      console.error('Ошибка при получении аналитического слоя:', error);
      onError(`Не удалось загрузить аналитический слой: ${error.message}`);
      setAnalysisImageUrl(null);
      setImageBounds(null);
    } finally {
      onLoadingChange(false);
    }
  }, [selectedPolygonData, activeAnalysisType, analysisDateRange, onLoadingChange, onError, map]); // Add map to dependencies

  useEffect(() => {
    fetchAnalysisImage();
    return () => {
      if (analysisImageUrl) {
        URL.revokeObjectURL(analysisImageUrl);
      }
    };
  }, [fetchAnalysisImage]);

  return (
    analysisImageUrl && imageBounds ? (
      <ImageOverlay url={analysisImageUrl} bounds={imageBounds} opacity={0.7} zIndex={9999} />
    ) : null
  );
}