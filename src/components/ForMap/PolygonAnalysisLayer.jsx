// components/ForMap/PolygonAnalysisLayer.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { ImageOverlay } from 'react-leaflet';
import L from 'leaflet';

// >>> ВАЖНО: УСТАНОВИТЕ ВАШ БАЗОВЫЙ URL БЭКЕНДА ЗДЕСЬ! <<<
// Он должен быть ТОЛЬКО корнем вашего домена/приложения, без '/api' или '/polygons'.
// Например: 'https://localhost:8080' для локальной разработки, или
// 'back-production-b3f2.up.railway.app' для вашего развернутого бэкенда.
const BASE_API_URL = 'https://back-production-b3f2.up.railway.app'; // Обновленный URL

export default function PolygonAnalysisLayer({
  map, // Теперь принимаем map как пропс
  selectedPolygonData, // Полные данные выбранного полигона (включая coordinates)
  activeAnalysisType,    // Например: 'NDVI', 'TRUE_COLOR'
  analysisDateRange,     // Массив из двух объектов Date: [startDate, endDate]
  onLoadingChange,       // Коллбэк для уведомления родителя о состоянии загрузки
  onError                // Коллбэк для уведомления родителя об ошибках
}) {
  const [analysisImageUrl, setAnalysisImageUrl] = useState(null);
  const [imageBounds, setImageBounds] = useState(null); // Границы для ImageOverlay

  // Функция для запроса аналитического изображения с бэкенда
  const fetchAnalysisImage = useCallback(async () => {
    // Проверяем наличие необходимых данных, включая map
    if (!selectedPolygonData || !activeAnalysisType || !analysisDateRange || analysisDateRange.length !== 2 || !map) {
      console.log("PolygonAnalysisLayer: Отмена запроса, отсутствуют необходимые данные:", { selectedPolygonData, activeAnalysisType, analysisDateRange, map });
      setAnalysisImageUrl(null);
      setImageBounds(null);
      return;
    }

    // Проверяем, что даты являются действительными объектами Date
    const dateFromObj = analysisDateRange[0];
    const dateToObj = analysisDateRange[1];

    if (!(dateFromObj instanceof Date) || isNaN(dateFromObj) || !(dateToObj instanceof Date) || isNaN(dateToObj)) {
      console.error("PolygonAnalysisLayer: analysisDateRange содержит некорректные объекты Date.", analysisDateRange);
      onError('Ошибка: Некорректный диапазон дат для анализа.');
      onLoadingChange(false);
      return;
    }

    onLoadingChange(true); // Уведомляем родителя о начале загрузки
    setAnalysisImageUrl(null); // Сбрасываем предыдущее изображение
    setImageBounds(null);

    try {
      // Убедимся, что selectedPolygonData.coordinates существует и является массивом
      if (!selectedPolygonData.coordinates || !Array.isArray(selectedPolygonData.coordinates) || selectedPolygonData.coordinates.length === 0) {
        console.error('Ошибка: selectedPolygonData.coordinates отсутствует или пуст. Текущие данные:', selectedPolygonData);
        onError('Ошибка: Данные координат полигона отсутствуют.');
        onLoadingChange(false);
        return;
      }

      // Проверяем, является ли это массивом массивов (для мультиполигонов) или просто массивом координат
      // Leaflet-Draw обычно возвращает массив [lat, lng] для простых полигонов.
      // Если это массив массивов (например, [[lat, lng], [lat, lng]]), берем первое кольцо.
      // Важно: GeoJSON использует [долгота, широта], а Leaflet обычно [широта, долгота].
      // Убедитесь, что `selectedPolygonData.coordinates` уже в формате `[lat, lng]`
      // и что `map` в `MapComponent` передает его в таком виде.
      const outerRing = Array.isArray(selectedPolygonData.coordinates[0]) && Array.isArray(selectedPolygonData.coordinates[0][0])
                                   ? selectedPolygonData.coordinates[0] // Если это [[[lat,lng],...]]
                                   : selectedPolygonData.coordinates; // Если это [[lat,lng],...]


      if (outerRing.length < 3) {
        console.error('Ошибка: Полигон содержит менее 3 точек, невозможно сформировать действительный полигон. Координаты:', outerRing);
        onError('Ошибка: Полигон содержит менее 3 точек.');
        onLoadingChange(false);
        return;
      }

      // Преобразуем координаты полигона из формата [lat, lng] в GeoJSON [lng, lat]
      // GeoJSON всегда использует [долгота, широта]
      const geoJsonCoordinates = outerRing.map(coord => [coord[1], coord[0]]);
      const geoJsonPolygon = {
        type: "Polygon",
        coordinates: [geoJsonCoordinates] // GeoJSON полигон - это массив массивов координат
      };

      // Определяем bounding box полигона для наложения ImageOverlay
      // Leaflet.js getBounds() возвращает LatLngBounds, который можно преобразовать в [southWest, northEast]
      const bounds = L.polygon(outerRing).getBounds(); // Используем outerRing для получения границ
      const imageOverlayBounds = [
        [bounds.getSouth(), bounds.getWest()],
        [bounds.getNorth(), bounds.getEast()]
      ];

      // Параметры для запроса к вашему бэкенд-эндпоинту
      const requestBody = {
        polygonGeoJson: JSON.stringify(geoJsonPolygon), // Отправляем GeoJSON как строку
        analysisType: activeAnalysisType,
        dateFrom: dateFromObj.toISOString().split('T')[0], // Форматируем Date в YYYY-MM-DD
        dateTo: dateToObj.toISOString().split('T')[0],     // Форматируем Date в YYYY-MM-DD
        width: 512, // Желаемая ширина изображения (можно сделать динамической)
        height: 512, // Желаемая высота изображения (можно сделать динамической)
      };

      // Получаем токен аутентификации пользователя из localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        onError('Ошибка: Токен аутентификации отсутствует. Пожалуйста, войдите в систему.');
        onLoadingChange(false);
        return;
      }

      console.log("PolygonAnalysisLayer: Отправка запроса на бэкенд:", requestBody);

      const response = await fetch(`${BASE_API_URL}/api/sentinel/process-image`, { // Обновленный URL
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
            if (errorJson.error && errorJson.error.message) {
                errorMessage = `Ошибка Sentinel Hub: ${errorJson.error.message}`;
            }
        } catch (e) {
            // Игнорируем ошибку парсинга JSON, используем необработанный текст
        }
        console.error('Ошибка ответа API:', errorMessage);
        throw new Error(errorMessage);
      }

      // Получаем изображение как Blob и создаем URL объекта
      const imageBlob = await response.blob();
      const imageUrl = URL.createObjectURL(imageBlob);
      
      setAnalysisImageUrl(imageUrl);
      setImageBounds(imageOverlayBounds); // Устанавливаем границы для ImageOverlay
      console.log("PolygonAnalysisLayer: Изображение анализа успешно загружено.");

    } catch (error) {
      console.error('Ошибка при получении аналитического слоя:', error);
      onError(`Не удалось загрузить аналитический слой: ${error.message}`);
      setAnalysisImageUrl(null);
      setImageBounds(null);
    } finally {
      onLoadingChange(false); // Уведомляем родителя о завершении загрузки
    }
  }, [selectedPolygonData, activeAnalysisType, analysisDateRange, map, onLoadingChange, onError]);

  // Эффект для вызова fetchAnalysisImage при изменении пропсов
  useEffect(() => {
    fetchAnalysisImage();
    // Очищаем URL объекта при размонтировании компонента
    return () => {
      if (analysisImageUrl) {
        URL.revokeObjectURL(analysisImageUrl);
      }
    };
  }, [fetchAnalysisImage]);

  // Рендерим ImageOverlay, если есть URL изображения и границы
  return (
    analysisImageUrl && imageBounds ? (
      <ImageOverlay url={analysisImageUrl} bounds={imageBounds} opacity={0.7} zIndex={9999} />
    ) : null
  );
}
