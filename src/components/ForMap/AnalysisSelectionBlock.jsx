// components/ForMap/AnalysisSelectionBlock.jsx
import React, { useState } from 'react';

// Список доступных базовых слоев для выбора
const baseMapOptions = [
  { value: 'openstreetmap', label: 'Стандартный (OpenStreetMap)' }, // Опция для OpenStreetMap
  { value: 'sentinel', label: 'Натуральный цвет (Sentinel-Hub)' }, // Опция для Sentinel-Hub
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
    zIndex: 1001, // Убедимся, что кнопка поверх всего
  };

  // Основные стили блока
  const blockStyle = {
    position: 'absolute',
    bottom: '35px',
    left: '10px',
    backgroundColor: 'rgba(26, 26, 26, 0.9)', // Темный полупрозрачный фон
    color: '#f0f0f0',
    padding: isExpanded ? '15px' : '10px', // Меньший отступ при свернутом состоянии
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    zIndex: 999, // Убедимся, что блок поверх карты
    minWidth: isExpanded ? '200px' : '50px', // Минимальная ширина при свернутом состоянии
    maxWidth: isExpanded ? '240px' : '50px', // Максимальная ширина при свернутом состоянии
    width: isExpanded ? 'auto' : '50px', // Ширина при свернутом состоянии
    height: isExpanded ? 'auto' : '50px', // Высота при свернутом состоянии
    overflow: 'hidden', // Скрываем содержимое, когда свернуто
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    fontFamily: 'Inter, sans-serif',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'all 0.3s ease', // Анимация для плавного изменения размеров
    alignItems: isExpanded ? 'flex-start' : 'center', // Выравнивание при свернутом состоянии
    justifyContent: isExpanded ? 'flex-start' : 'center', // Выравнивание при свернутом состоянии
  };

  return (
    <div style={blockStyle}>
      {/* Кнопка сворачивания/разворачивания */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={toggleButtonStyle}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Свернуть выбор базовой карты' : 'Развернуть выбор базовой карты'}
      >
        {isExpanded ? (
          // SVG для стрелки вверх (свернуть)
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        ) : (
          // SVG для стрелки вниз (развернуть)
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        )}
      </button>

      {isExpanded && (
        <>
          <h4 style={{ margin: '0', fontSize: '18px', color: '#4CAF50' }}>Выбор Базовой Карты</h4>

          <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.4' }}>
            Выберите базовый слой для отображения.
          </p>

          <select
            onChange={(e) => {
              const selectedType = e.target.value;
              onSelectBaseMap(selectedType); // Передаем только выбранный тип
            }}
            value={activeBaseMapType || 'openstreetmap'} // Устанавливаем текущий активный тип или OpenStreetMap по умолчанию
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #555',
              backgroundColor: '#333',
              color: '#f0f0f0',
              fontSize: '14px',
              cursor: 'pointer',
              appearance: 'none', // Убираем стандартные стрелки
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f0f0f0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
              backgroundSize: '16px'
            }}
          >
            {baseMapOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Отображаем активный слой */}
          {activeBaseMapType && (
            <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#bbb' }}>
              Активный слой: {baseMapOptions.find(opt => opt.value === activeBaseMapType)?.label}
            </p>
          )}
        </>
      )}
      {!isExpanded && (
        <span style={{ fontSize: '12px', color: '#f0f0f0' }}>Карта</span>
      )}
    </div>
  );
}
