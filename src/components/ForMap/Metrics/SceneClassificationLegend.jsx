// components/ForMap/Metrics/SceneClassificationLegend.jsx
import React, { useState } from 'react';

const SceneClassificationLegend = ({ activeAnalysisType, layerSelectionBlockWidth, isLayerSelectionBlockExpanded }) => {
  const [isMetricExpanded, setIsMetricExpanded] = useState(true);

  // Метрика отображается только если activeAnalysisType соответствует
  // И LayerSelectionBlock НЕ развернут
  if (activeAnalysisType !== 'SCENE_CLASSIFICATION' || isLayerSelectionBlockExpanded) {
    return null;
  }

  // Определения классов SCL и их цвета, как в SentinelHubService.java
  const legendItems = [
    { color: '#A6A6A6', label: 'Насыщенный/Дефектный (SCL 1)' },
    { color: '#CCCCCC', label: 'Тёмная тень (SCL 2)' },
    { color: '#E6E6E6', label: 'Тень от облаков (SCL 3)' },
    { color: '#1A801A', label: 'Растительность (SCL 4)' },
    { color: '#CC9933', label: 'Без растительности (SCL 5)' },
    { color: '#1A1ACC', label: 'Вода (SCL 6)' },
    { color: '#E6E61A', label: 'Облака, низкая верояность (SCL 7)' },
    { color: '#B3B3B3', label: 'Облака, средняя верояность (SCL 8)' },
    { color: '#E6E6E6', label: 'Облака, высокая верояность (SCL 9)' },
    { color: '#E6E6E6', label: 'Перистые облака (SCL 10)' },
    { color: '#E6E6E6', label: 'Снег/Лёд (SCL 11)' },
  ];

  const containerStyle = {
    position: 'absolute',
    bottom: '40px',
    left: `calc(10px + ${layerSelectionBlockWidth}px + 25px)`,
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    color: '#f0f0f0',
    padding: '8px 12px',
    borderRadius: '10px',
    boxShadow: '0 3px 6px rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
    minWidth: isMetricExpanded ? '176px' : '50px',
    maxWidth: isMetricExpanded ? '276px' : '50px', // Adjusted maxWidth for expanded state
    height: isMetricExpanded ? 'auto' : '50px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Inter, sans-serif',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'all 0.3s ease',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: isMetricExpanded ? 'default' : 'pointer',
    // Адаптивные стили для мобильных устройств
    '@media (max-width: 600px)': {
      left: `calc(5px + 45px + 10px)`, // Позиционирование относительно свернутого LayerSelectionBlock
      bottom: '10px', // Выравнивание по низу экрана
      padding: '6px 10px',
      borderRadius: '5px',
      minWidth: isMetricExpanded ? '150px' : '40px',
      maxWidth: isMetricExpanded ? '180px' : '40px',
      height: isMetricExpanded ? 'auto' : '40px',
    },
  };

  const titleRowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: isMetricExpanded ? 'space-between' : 'center', // Centered when collapsed
    width: '100%',
    gap: '4px',
    marginBottom: isMetricExpanded ? '4px' : '0',
  };

  const titleStyle = {
    margin: '0',
    fontSize: '13px',
    color: '#4CAF50',
    textAlign: 'center',
    flexShrink: 0,
    // Адаптивные стили для мобильных устройств
    '@media (max-width: 600px)': {
      fontSize: '11px',
    },
  };

  const collapseButtonStyle = {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#f0f0f0',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    // Адаптивные стили для мобильных устройств
    '@media (max-width: 600px)': {
      fontSize: '14px',
    },
  };

  const legendItemStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '4px',
    fontSize: '10px',
    // Адаптивные стили для мобильных устройств
    '@media (max-width: 600px)': {
      fontSize: '9px',
    },
  };

  const colorBoxStyle = (color) => ({
    width: '14px',
    height: '14px',
    backgroundColor: color,
    marginRight: '6px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '2px',
    flexShrink: 0,
    // Адаптивные стили для мобильных устройств
    '@media (max-width: 600px)': {
      width: '12px',
      height: '12px',
      marginRight: '4px',
    },
  });

  return (
    <div style={containerStyle} onClick={() => !isMetricExpanded && setIsMetricExpanded(true)}>
      <div style={titleRowStyle}>
        {isMetricExpanded ? (
          <>
            <h4 style={titleStyle}>Карта классификации сцен</h4>
            <button
              onClick={(e) => { e.stopPropagation(); setIsMetricExpanded(false); }}
              style={collapseButtonStyle}
              aria-expanded="true"
              aria-label="Свернуть легенду классификации сцен"
            >
              {/* Стрелка вверх */}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: '12px', color: '#f0f0f0', userSelect: 'none' }}>SCL</span>
            <button
              onClick={(e) => { e.stopPropagation(); setIsMetricExpanded(true); }}
              style={collapseButtonStyle}
              aria-expanded="false"
              aria-label="Развернуть легенду классификации сцен"
            >
              {/* Нет стрелки вниз в свернутом состоянии */}
            </button>
          </>
        )}
      </div>

      {isMetricExpanded && (
        <>
          <p style={{ margin: '0 0 8px 0', fontSize: '10px', color: '#bbb', textAlign: 'center' }}>
            Показывает различные типы поверхности, определенные алгоритмом ESA.
          </p>
          <div>
            {legendItems.map((item, index) => (
              <div key={index} style={legendItemStyle}>
                <div style={colorBoxStyle(item.color)}></div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default SceneClassificationLegend;
