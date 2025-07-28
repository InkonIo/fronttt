// components/ForMap/PolygonAndMarkerLayer.jsx
import React from 'react';
import { Polygon, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

export default function PolygonAndMarkerLayer({ 
  polygons = [], 
  calculateArea, 
  formatArea, 
  selectedPolygon, // Теперь это объект полигона или null
  flyToMarker, // Prop to fly to a specific marker/location
  setSelectedPolygon, // Функция для установки выбранного полигона
  // onSelectAnalysisForPolygon больше не нужен здесь, так как кнопки перенесены
}) {
  // Иконка маркера для центра полигонов
  const polygonCenterIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png', // Маркер по умолчанию
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    shadowSize: [41, 41]
  });

  return (
    <>
      {polygons.map((polygon) => {
        // Проверяем, является ли текущий полигон выбранным.
        const isSelected = selectedPolygon && selectedPolygon.id === polygon.id;
        
        // Опции полигона Leaflet
        const polygonOptions = {
          color: isSelected ? '#ff0000' : polygon.color, // Красный, если выделен
          fillOpacity: 0, // Установлено 0 для прозрачной заливки
          weight: isSelected ? 6 : 4, // Толще граница: 6 для выделенного, 4 для остальных
          opacity: 1,
          lineJoin: 'round',
        };

        // Вычисляем центроид для маркера (простое среднее для простоты)
        let center = [0, 0];
        if (polygon.coordinates && polygon.coordinates.length > 0) {
          const outerRing = Array.isArray(polygon.coordinates[0][0]) 
                              ? polygon.coordinates[0] 
                              : polygon.coordinates; 
          
          const validCoords = outerRing.filter(coord => {
            if (!Array.isArray(coord) || coord.length !== 2) {
              return false;
            }
            const lat = parseFloat(coord[0]);
            const lng = parseFloat(coord[1]);
            return !isNaN(lat) && !isNaN(lng);
          }).map(coord => [parseFloat(coord[0]), parseFloat(coord[1])]);

          if (validCoords.length > 0) {
            const latSum = validCoords.reduce((sum, coord) => sum + coord[0], 0);
            const lngSum = validCoords.reduce((sum, coord) => sum + coord[1], 0);
            center = [latSum / validCoords.length, lngSum / validCoords.length];
          } else {
            console.warn(`Полигон с ID ${polygon.id} имеет координаты, но ни одна из них не является действительной для расчета центра. Координаты:`, polygon.coordinates);
          }
        } else {
          console.warn(`Полигон с ID ${polygon.id} имеет пустые или некорректные данные координат. Маркер не будет отображен. Координаты:`, polygon.coordinates);
        }

        // Логирование для отладки:
        console.log(`PolygonAndMarkerLayer: Обработка полигона ID: ${polygon.id}`);
        console.log(`PolygonAndMarkerLayer: Полный объект полигона:`, polygon);
        console.log(`PolygonAndMarkerLayer: Координаты, используемые для расчета площади:`, polygon.coordinates);
        const calculatedAreaForMarker = calculateArea(polygon.coordinates);
        console.log(`PolygonAndMarkerLayer: Рассчитанная площадь для полигона ID: ${polygon.id} (м²):`, calculatedAreaForMarker);
        console.log(`PolygonAndMarkerLayer: Отформатированная площадь для полигона ID: ${polygon.id}:`, formatArea(calculatedAreaForMarker));


        return (
          <Polygon
            key={polygon.id}
            positions={polygon.coordinates}
            pathOptions={polygonOptions}
            eventHandlers={{
                click: () => {
                  console.log(`Клик по полигону/маркеру с ID: ${polygon.id}. Объект полигона для setSelectedPolygon:`, polygon);
                  if (!isSelected) {
                    setSelectedPolygon(polygon);
                  }
                  // Optionally fly to polygon on click
                  if (flyToMarker && center[0] !== 0 || center[1] !== 0) {
                    flyToMarker(center, 15);
                  }
                },
            }}
          >
            {/* Опциональный маркер в центре полигона */}
            {center[0] !== 0 || center[1] !== 0 ? (
              <Marker 
                position={center} 
                icon={polygonCenterIcon}
                eventHandlers={{
                  click: () => {
                    console.log(`Маркер полигона с ID: ${polygon.id} был кликнут.`);
                    if (flyToMarker) {
                      flyToMarker(center, 15);
                    }
                    // Не сбрасываем, если уже выбран
                    if (!isSelected) {
                        setSelectedPolygon(polygon); 
                    }
                  },
                }}
              >
                <Popup>
                  <div>
                    <strong>Название:</strong> {polygon.name || 'Без названия'} <br/>
                    <strong>Культура:</strong> {polygon.crop || 'Не указана'} <br/>
                    {/* Теперь отображаем только отформатированную площадь */}
                    <strong>Площадь:</strong> {formatArea(calculatedAreaForMarker)}
                    {/* <--- ВАЖНО: Кнопки выбора анализа УДАЛЕНЫ отсюда */}
                  </div>
                </Popup>
              </Marker>
            ) : null}
          </Polygon>
        );
      })}
    </>
  );
}
