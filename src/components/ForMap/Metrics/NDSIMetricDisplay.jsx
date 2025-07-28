// components/ForMap/Metrics/NDSIMetricDisplay.jsx
import React, { useState } from 'react';

const NDSIMetricDisplay = ({ activeAnalysisType, layerSelectionBlockWidth, isLayerSelectionBlockExpanded }) => {
  const [isMetricExpanded, setIsMetricExpanded] = useState(true);

  // Метрика отображается только если activeAnalysisType соответствует
  // И LayerSelectionBlock НЕ развернут
  if (activeAnalysisType !== 'NDSI' || isLayerSelectionBlockExpanded) {
    return null;
  }

  // Цвета и диапазоны значений для NDSI, как в SentinelHubService.java
  const metricItems = [
    { color: '#E61A1A', range: '0.0' }, // Не-снег
    { color: '#E6801A', range: '0.1' }, // Очень мало
    { color: '#E6E61A', range: '0.3' }, // Умеренно
    { color: '#80B3E6', range: '0.5' }, // Значительно
    { color: '#3366CC', range: '0.7' }, // Чистый
    { color: '#000099', range: '1.0' }, // Плотный
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
    minWidth: isMetricExpanded ? '144px' : '50px',
    maxWidth: isMetricExpanded ? '244px' : '50px', // Adjusted maxWidth for expanded state
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
      minWidth: isMetricExpanded ? '120px' : '40px',
      maxWidth: isMetricExpanded ? '150px' : '40px',
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

  const colorScaleContainerStyle = {
    display: 'flex',
    width: '100%',
    height: '16px',
    borderRadius: '4px',
    overflow: 'hidden',
    // Адаптивные стили для мобильных устройств
    '@media (max-width: 600px)': {
      height: '12px',
    },
  };

  const colorSegmentStyle = (color) => ({
    flexGrow: 1,
    backgroundColor: color,
    height: '100%',
  });

  const labelsContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    fontSize: '8px',
    color: '#f0f0f0',
    marginTop: '2px',
    // Адаптивные стили для мобильных устройств
    '@media (max-width: 600px)': {
      fontSize: '7px',
    },
  };

  return (
    <div style={containerStyle} onClick={() => !isMetricExpanded && setIsMetricExpanded(true)}>
      <div style={titleRowStyle}>
        {isMetricExpanded ? (
          <>
            <h4 style={titleStyle}>Метрика NDSI</h4>
            <button
              onClick={(e) => { e.stopPropagation(); setIsMetricExpanded(false); }}
              style={collapseButtonStyle}
              aria-expanded="true"
              aria-label="Свернуть метрику NDSI"
            >
              {/* Стрелка вверх */}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: '12px', color: '#f0f0f0', userSelect: 'none' }}>NDSI</span>
            <button
              onClick={(e) => { e.stopPropagation(); setIsMetricExpanded(true); }}
              style={collapseButtonStyle}
              aria-expanded="false"
              aria-label="Развернуть метрику NDSI"
            >
              {/* Нет стрелки вниз в свернутом состоянии */}
            </button>
          </>
        )}
      </div>

      {isMetricExpanded && (
        <>
          <p style={{ margin: '0 0 8px 0', fontSize: '10px', color: '#bbb', textAlign: 'center' }}>
            Используется для идентификации снежного и ледового покрова.
          </p>
          <div style={colorScaleContainerStyle}>
            {metricItems.map((item, index) => (
              <div key={index} style={colorSegmentStyle(item.color)} title={`Значение: ${item.range}`}></div>
            ))}
          </div>
          <div style={labelsContainerStyle}>
            {metricItems.map((item, index) => (
              <span key={index}>{item.range}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default NDSIMetricDisplay;
