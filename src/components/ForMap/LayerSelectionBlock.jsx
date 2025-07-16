// components/ForMap/LayerSelectionBlock.jsx
import React, { useRef, useEffect } from 'react';

// Опции для выбора базовой карты
const baseMapOptions = [
  { value: 'openstreetmap', label: 'Стандартный (OpenStreetMap)' },
  { value: 'sentinel', label: 'Натуральный цвет (Sentinel-Hub)' },
  { value: 'none', label: 'Выкл. базовый слой' }, // Добавляем опцию для отключения базовой карты
];

// Опции для выбора аналитического слоя
const analysisOptions = [
  { value: 'none', label: 'Выкл. аналитический слой' }, // Опция для выключения аналитического слоя
  { value: 'NDVI', label: 'NDVI (Индекс растительности)' },
  { value: 'FALSE_COLOR', label: 'Ложный цвет (Растительность)' },
  { value: 'FALSE_COLOR_URBAN', label: 'Ложный цвет (Городской)' },
  { value: 'MOISTURE_INDEX', label: 'Индекс влажности' },
  { value: 'NDSI', label: 'Индекс снега' },
  { value: 'NDWI', label: 'Индекс воды' },
  { value: 'SWIR', label: 'SWIR (Коротковолновый ИК)' },
  { value: 'SCENE_CLASSIFICATION', label: 'Карта классификации сцен' },
  { value: 'HIGHLIGHT_OPTIMIZED_NATURAL_COLOR', label: 'Оптимизированный натуральный цвет' },
];

// Общие стили для элементов <select>
const commonSelectStyles = {
  width: '100%',
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid #555',
  backgroundColor: '#333',
  color: '#f0f0f0',
  fontSize: '13px',
  cursor: 'pointer',
  appearance: 'none',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  backgroundSize: '14px',
  // Увеличенный z-index для выпадающих списков, чтобы они не перекрывались
  zIndex: 1000 // Убедитесь, что это выше z-index контейнера
};

// Общие стили для заголовков секций
const sectionTitleStyles = {
  margin: '0 0 8px',
  fontSize: '16px',
  color: '#4CAF50'
};

// Общие стили для абзацев описания
const descriptionParagraphStyles = {
  margin: '0 0 8px',
  fontSize: '13px',
  lineHeight: '1.4'
};


export default function LayerSelectionBlock({
  selectedPolygonData,
  activeBaseMapType,
  onSelectBaseMap,
  activeAnalysisType,
  onSelectAnalysisForPolygon,
  setBlockHeight, // Новая пропса для передачи высоты родительскому компоненту
}) {
  const blockRef = useRef(null);

  useEffect(() => {
    if (blockRef.current && setBlockHeight) {
      // Используем ResizeObserver для более надежного отслеживания высоты,
      // особенно если содержимое динамически изменяется (например, раскрывающиеся списки).
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          if (entry.target === blockRef.current) {
            setBlockHeight(entry.contentRect.height);
          }
        }
      });

      resizeObserver.observe(blockRef.current);

      // Начальное измерение
      setBlockHeight(blockRef.current.offsetHeight);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [selectedPolygonData, activeBaseMapType, activeAnalysisType, setBlockHeight]); // Переизмеряем, если эти пропсы меняются, влияя на содержимое

  return (
    <div
      ref={blockRef} // Прикрепляем ref к основному div
      style={{
      position: 'absolute', // Оставляем 'absolute' для позиционирования блока на карте
      bottom: '35px',
      left: '10px',
      backgroundColor: 'rgba(26, 26, 26, 0.9)',
      color: '#f0f0f0',
      padding: '10px',
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      zIndex: 999, // Z-index для самого блока
      minWidth: '220px',
      maxWidth: '280px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      fontFamily: 'Inter, sans-serif',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      // Добавлено для корректного отображения выпадающих списков
      overflow: 'visible', // Позволяет содержимому выходить за границы (для выпадающих списков)
    }}>
      {/* Секция выбора базовой карты */}
      <div>
        <h4 style={sectionTitleStyles}>Выбор Базовой Карты</h4>
        <p style={descriptionParagraphStyles}>
          Выберите базовый слой для отображения.
        </p>
        <select
          onChange={(e) => onSelectBaseMap(e.target.value)}
          value={activeBaseMapType || 'openstreetmap'}
          style={{
            ...commonSelectStyles,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f0f0f0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          }}
        >
          {baseMapOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {activeBaseMapType && (activeBaseMapType !== 'none') && (
          <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#bbb' }}>
            Активный базовый слой: {baseMapOptions.find(opt => opt.value === activeBaseMapType)?.label}
          </p>
        )}
      </div>

      {/* Горизонтальная линия для разделения секций */}
      <hr style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }} />

      {/* Секция выбора аналитического слоя */}
      <div>
        <h4 style={sectionTitleStyles}>Анализ Полигона</h4>
        {selectedPolygonData ? (
          <p style={{ ...descriptionParagraphStyles, fontWeight: 'bold' }}>
            Выбран полигон: {selectedPolygonData.name || 'Без названия'}
          </p>
        ) : (
          <p style={descriptionParagraphStyles}>
            Выберите метку с полигоном на карте, чтобы начать анализ.
          </p>
        )}
        <select
          onChange={(e) => {
            const selectedType = e.target.value;
            onSelectAnalysisForPolygon(selectedPolygonData, selectedType);
          }}
          value={activeAnalysisType || 'none'}
          disabled={!selectedPolygonData}
          style={{
            ...commonSelectStyles,
            backgroundColor: selectedPolygonData ? '#333' : '#222',
            color: selectedPolygonData ? '#f0f0f0' : '#888',
            cursor: selectedPolygonData ? 'pointer' : 'not-allowed',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${selectedPolygonData ? '%23f0f0f0' : '%23888'}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          }}
        >
          {analysisOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {selectedPolygonData && activeAnalysisType && activeAnalysisType !== 'none' && (
          <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#bbb' }}>
            Активный аналитический слой: {analysisOptions.find(opt => opt.value === activeAnalysisType)?.label}
          </p>
        )}
      </div>
    </div>
  );
}
