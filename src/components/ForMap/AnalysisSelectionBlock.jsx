// components/ForMap/AnalysisSelectionBlock.jsx
import React, { useState } from 'react';

// Список доступных базовых слоев для выбора
const baseMapOptions = [
  { value: 'openstreetmap', label: 'Стандартный (OpenStreetMap)' }, // Опция для OpenStreetMap
  { value: 'esri_imagery', label: 'Спутник (ESRI World Imagery)' }, // Добавляем опцию для ESRI World Imagery
  { value: 'none', label: 'Выкл. базовый слой' }, // Добавляем опцию для отключения базовой карты
];

// Переименовываем пропсы для соответствия выбору базовой карты
export default function AnalysisSelectionBlock({
  activeBaseMapType, // Текущий активный тип базовой карты
  onSelectBaseMap // Функция для выбора базовой карты
}) {
  // Состояние для управления видимостью содержимого блока (развернут/свернут)
  const [isExpanded, setIsExpanded] = useState(false);

  // Стили для кнопки сворачивания/разворачивания
  const toggleButtonStyle = {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#f0f0f0',
    fontSize: '16px', // Уменьшил размер шрифта для иконки
    cursor: 'pointer',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0, // Предотвращает сжатие кнопки
  };

  // Основные стили блока
  const blockStyle = {
    position: 'absolute',
    bottom: '35px',
    left: '10px',
    backgroundColor: 'rgba(26, 26, 26, 0.9)', // Темный полупрозрачный фон
    color: '#f0f0f0',
    padding: '8px 12px', // Уменьшено с 15px/10px
    borderRadius: '6px', // Уменьшено с 10px
    boxShadow: '0 3px 6px rgba(0, 0, 0, 0.3)', // Уменьшено
    zIndex: 999,
    minWidth: isExpanded ? '200px' : '50px',
    maxWidth: isExpanded ? '240px' : '50px',
    height: isExpanded ? 'auto' : '50px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Inter, sans-serif',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'all 0.3s ease',
    alignItems: 'center', // Центрирование в свернутом состоянии
    justifyContent: 'center', // Центрирование в свернутом состоянии
    cursor: isExpanded ? 'default' : 'pointer', // Курсор для разворачивания
  };

  const titleRowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: isExpanded ? 'space-between' : 'center', // Centered when collapsed
    width: '100%',
    gap: '4px',
    marginBottom: isExpanded ? '4px' : '0', // Уменьшено с 10px
  };

  const titleStyle = {
    margin: '0',
    fontSize: '13px', // Уменьшено с 18px
    color: '#4CAF50',
    textAlign: 'center',
    flexShrink: 0,
  };

  const descriptionStyle = {
    margin: '0',
    fontSize: '10px', // Уменьшено с 14px
    lineHeight: '1.4',
    textAlign: 'center', // Центрирование текста
  };

  const selectStyle = {
    width: '100%',
    padding: '6px 10px', // Уменьшено с 8px 12px
    borderRadius: '6px',
    border: '1px solid #555',
    backgroundColor: '#333',
    color: '#f0f0f0',
    fontSize: '12px', // Уменьшено с 14px
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f0f0f0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center', // Уменьшено с 10px
    backgroundSize: '14px' // Уменьшено с 16px
  };

  return (
    <div style={blockStyle} onClick={() => !isExpanded && setIsExpanded(true)}>
      <div style={titleRowStyle}>
        {isExpanded ? (
          <>
            <h4 style={titleStyle}>Выбор Базовой Карты</h4>
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
              style={toggleButtonStyle}
              aria-expanded="true"
              aria-label="Свернуть выбор базовой карты"
            >
              {/* SVG для стрелки вверх (свернуть) */}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: '12px', color: '#f0f0f0', userSelect: 'none' }}>Карта</span>
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
              style={toggleButtonStyle}
              aria-expanded="false"
              aria-label="Развернуть выбор базовой карты"
            >
              {/* Нет стрелки вниз в свернутом состоянии */}
            </button>
          </>
        )}
      </div>

      {isExpanded && (
        <>
          <p style={descriptionStyle}>
            Выберите базовый слой для отображения.
          </p>

          <select
            onChange={(e) => {
              const selectedType = e.target.value;
              onSelectBaseMap(selectedType);
            }}
            value={activeBaseMapType || 'openstreetmap'}
            style={selectStyle}
          >
            {baseMapOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Отображаем активный слой */}
          {activeBaseMapType && (
            <p style={{ margin: '5px 0 0', fontSize: '10px', color: '#bbb', textAlign: 'center' }}>
              Активный слой: {baseMapOptions.find(opt => opt.value === activeBaseMapType)?.label}
            </p>
          )}
        </>
      )}
    </div>
  );
}
