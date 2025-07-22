// components/ForMap/LayerSelectionBlock.jsx
import React, { useRef, useEffect, useState } from 'react';

// Опции для выбора базовой карты
const baseMapOptions = [
  { value: 'openstreetmap', label: 'Стандартный (OpenStreetMap)' },
  { value: 'sentinel', label: 'Натуральный цвет (Sentinel-Hub)' },
  { value: 'esri_imagery', label: 'Спутник (ESRI World Imagery)' },
  { value: 'none', label: 'Выкл. базовый слой' },
];

// Опции для выбора аналитического слоя
const analysisOptions = [
  { value: 'none', label: 'Выкл. аналитический слой' },
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
  appearance: 'none', // Скрывает стандартную стрелку выпадающего списка
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  backgroundSize: '14px',
  zIndex: 1000
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
  setBlockHeight, // Пропс для передачи высоты родительскому компоненту
}) {
  const blockRef = useRef(null);
  // Состояние для управления видимостью содержимого блока (развернут/свернут)
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (blockRef.current && setBlockHeight) {
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          if (entry.target === blockRef.current) {
            setBlockHeight(entry.contentRect.height);
          }
        }
      });

      resizeObserver.observe(blockRef.current);
      // Устанавливаем начальную высоту
      setBlockHeight(blockRef.current.offsetHeight);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [selectedPolygonData, activeBaseMapType, activeAnalysisType, setBlockHeight, isExpanded]);

  // Стили для кнопки сворачивания/разворачивания
  const toggleButtonStyle = {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#f0f0f0',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '5px',
    borderRadius: '5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.3s ease',
    zIndex: 1001,
  };

  // Основные стили блока
  const blockStyle = {
    position: 'absolute',
    bottom: '40px',
    left: '10px',
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    color: '#f0f0f0',
    padding: isExpanded ? '10px' : '10px',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    zIndex: 999,
    minWidth: isExpanded ? '220px' : '50px',
    maxWidth: isExpanded ? '280px' : '50px',
    width: isExpanded ? 'auto' : '50px',
    height: isExpanded ? 'auto' : '50px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    fontFamily: 'Inter, sans-serif',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'all 0.3s ease',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer', // Делаем весь блок кликабельным при свернутом состоянии
  };

  // Функция для получения метки выбранного аналитического слоя
  // Эта функция не используется для отображения в самом select, но может быть полезна для отладки
  const getSelectedAnalysisLabel = () => {
    const selectedOption = analysisOptions.find(opt => opt.value === activeAnalysisType);
    return selectedOption ? selectedOption.label : 'Выкл. аналитический слой';
  };

  // Добавляем console.log для отладки activeAnalysisType
  console.log('LayerSelectionBlock: activeAnalysisType is', activeAnalysisType);


  return (
    <div ref={blockRef} style={blockStyle} onClick={() => !isExpanded && setIsExpanded(true)}>
      {isExpanded && (
        <>
          {/* Кнопка сворачивания/разворачивания */}
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }} // Останавливаем распространение события, чтобы предотвратить клик по родительскому div
            style={toggleButtonStyle}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Свернуть выбор слоев' : 'Развернуть выбор слоев'}
          >
            {/* SVG для стрелки вверх (свернуть) */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          </button>

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
          </div>
        </>
      )}
      {!isExpanded && (
        <span style={{ fontSize: '12px', color: '#f0f0f0', userSelect: 'none' }}>
            Анализ
        </span>
      )}
    </div>
  );
}
