// components/ForMap/Metrics/FalseColorUrbanDisplay.jsx
import React, { useState } from 'react';

const FalseColorUrbanDisplay = ({ activeAnalysisType, layerSelectionBlockWidth, isLayerSelectionBlockExpanded }) => {
  const [isMetricExpanded, setIsMetricExpanded] = useState(true);

  // Метрика отображается только если activeAnalysisType соответствует
  // И LayerSelectionBlock НЕ развернут
  if (activeAnalysisType !== 'FALSE_COLOR_URBAN' || isLayerSelectionBlockExpanded) {
    return null;
  }

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
    minWidth: isMetricExpanded ? '200px' : '50px',
    maxWidth: isMetricExpanded ? '250px' : '50px', // Adjusted maxWidth for expanded state
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

  const descriptionStyle = {
    margin: '0 0 8px 0',
    fontSize: '10px',
    color: '#bbb',
    textAlign: 'left',
    lineHeight: '1.4',
    // Адаптивные стили для мобильных устройств
    '@media (max-width: 600px)': {
      fontSize: '9px',
    },
  };

  return (
    <div style={containerStyle} onClick={() => !isMetricExpanded && setIsMetricExpanded(true)}>
      <div style={titleRowStyle}>
        {isMetricExpanded ? (
          <>
            <h4 style={titleStyle}>Ложный цвет (Городской)</h4>
            <button
              onClick={(e) => { e.stopPropagation(); setIsMetricExpanded(false); }}
              style={collapseButtonStyle}
              aria-expanded="true"
              aria-label="Свернуть описание Ложного цвета (Городской)"
            >
              {/* Стрелка вверх */}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: '12px', color: '#f0f0f0', userSelect: 'none' }}>FC Urban</span>
            <button
              onClick={(e) => { e.stopPropagation(); setIsMetricExpanded(true); }}
              style={collapseButtonStyle}
              aria-expanded="false"
              aria-label="Развернуть описание Ложного цвета (Городской)"
            >
              {/* Нет стрелки вниз в свернутом состоянии */}
            </button>
          </>
        )}
      </div>

      {isMetricExpanded && (
        <p style={descriptionStyle}>
          Эта композиция использует коротковолновый инфракрасный (SWIR2), ближний инфракрасный (NIR) и красный каналы (SWIR2, NIR, Red).
          <br/><br/>
          🏢 <span style={{ color: '#B0C4DE', fontWeight: 'bold' }}>Городские районы, здания и асфальт</span> часто выглядят сероватыми, фиолетовыми или белыми/серебристыми.
          <br/>
          🌿 <span style={{ color: '#90EE90', fontWeight: 'bold' }}>Растительность</span> может быть зеленой, но не такой яркой, как в композиции "Ложный цвет (Растительность)".
          <br/>
          💧 <span style={{ color: '#ADD8E6', fontWeight: 'bold' }}>Вода</span> обычно выглядит темной.
        </p>
      )}
    </div>
  );
};

export default FalseColorUrbanDisplay;
