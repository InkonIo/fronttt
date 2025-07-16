// components/ForMap/AnalysisSelectionBlock.jsx
import React from 'react';

// Список доступных базовых слоев для выбора
const baseMapOptions = [
  { value: 'openstreetmap', label: 'Стандартный (OpenStreetMap)' }, // Опция для OpenStreetMap
  { value: 'sentinel', label: 'Натуральный цвет (Sentinel-Hub)' }, // Опция для Sentinel-Hub
];

// Переименовываем пропсы для соответствия выбору базовой карты
export default function AnalysisSelectionBlock({
  activeBaseMapType,  // Текущий активный тип базовой карты
  onSelectBaseMap // Функция для выбора базовой карты
}) {
  return (
    <div style={{
      position: 'absolute',
      bottom: '35px',
      left: '10px',
      backgroundColor: 'rgba(26, 26, 26, 0.9)', // Темный полупрозрачный фон
      color: '#f0f0f0',
      padding: '15px',
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      zIndex: 999, // Убедимся, что блок поверх карты
      minWidth: '200px',
      maxWidth: '240px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      fontFamily: 'Inter, sans-serif',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <h4 style={{ margin: '0', fontSize: '18px', color: '#4CAF50' }}>Выбор Базовой Карты</h4>
      
      {/* Удаляем текст сообщения о выбранном полигоне, так как это теперь для выбора карты */}
      <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.4' }}>
        Выберите базовый слой для отображения.
      </p>

      {/* Выпадающий список теперь всегда виден и активен */}
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
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='https://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f0f0f0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
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
    </div>
  );
}