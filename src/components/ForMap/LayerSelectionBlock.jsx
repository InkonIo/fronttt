// components/ForMap/LayerSelectionBlock.jsx
import React, { useRef, useEffect, useState } from 'react';

// Опции для выбора базовой карты
const baseMapOptions = [
  { value: 'openstreetmap', label: 'Стандартный (OpenStreetMap)' },
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
  appearance: 'none',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  backgroundSize: '14px',
  zIndex: 1000
};

// Общие стили для заголовков секций
const sectionTitleStyles = {
  margin: '0',
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
  setBlockHeight,
  setBlockWidth,
  onExpandChange, // НОВАЯ ПРОПСА: функция для уведомления родителя об изменении состояния развернутости
}) {
  const blockRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // useEffect для уведомления родителя об изменении состояния isExpanded
  useEffect(() => {
    if (onExpandChange) {
      onExpandChange(isExpanded);
    }
  }, [isExpanded, onExpandChange]);

  useEffect(() => {
    if (blockRef.current) {
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          if (entry.target === blockRef.current) {
            if (setBlockHeight) {
              setBlockHeight(entry.contentRect.height);
            }
            if (setBlockWidth) {
              setBlockWidth(entry.contentRect.width);
            }
          }
        }
      });

      resizeObserver.observe(blockRef.current);

      if (setBlockHeight) {
        setBlockHeight(blockRef.current.offsetHeight);
      }
      if (setBlockWidth) {
        setBlockWidth(blockRef.current.offsetWidth);
      }

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [selectedPolygonData, activeBaseMapType, activeAnalysisType, setBlockHeight, setBlockWidth, isExpanded]);

  // Стили для кнопки сворачивания/разворачивания
  const collapseButtonStyle = {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#f0f0f0',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '0',
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  // Основные стили блока
  const blockStyle = {
    position: 'absolute',
    bottom: '40px',
    left: '10px',
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    color: '#f0f0f0',
    padding: '10px',
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
    cursor: 'pointer',
  };

  return (
    <div
      ref={blockRef}
      style={blockStyle}
      onClick={() => !isExpanded && setIsExpanded(true)}
    >
      {isExpanded ? (
        <>
          {/* Заголовок с кнопкой сворачивания рядом */}
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '8px' }}>
            <h4 style={sectionTitleStyles}>Выбор Слоев</h4>
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
              style={collapseButtonStyle}
              aria-expanded={isExpanded}
              aria-label={'Свернуть панель выбора слоев'}
            >
              {/* SVG для стрелки вверх (свернуть) */}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            </button>
          </div>

          {/* Секция выбора базовой карты */}
          <div>
            <h4 style={{ ...sectionTitleStyles, fontSize: '14px' }}>Базовая Карта</h4>
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

          <hr style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }} />

          {/* Секция выбора аналитического слоя */}
          <div>
            <h4 style={{ ...sectionTitleStyles, fontSize: '14px' }}>Анализ Полигона</h4>
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
        </>
      ) : (
        // Содержимое, когда блок свернут
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '12px', color: '#f0f0f0', userSelect: 'none' }}>
              Слои
          </span>
        </div>
      )}
    </div>
  );
}
