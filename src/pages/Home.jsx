// components/ForMap/Home.jsx
import React, { useCallback, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MapComponent from '../components/ForMap/MapComponent'; // Убедитесь, что путь правильный

export default function Home() {
  const navigate = useNavigate(); // Инициализируем хук навигации

  // Состояние для экземпляра карты, которое будет передано MapComponent
  const [mapInstance, setMapInstance] = useState(null); 
  // Ref для FeatureGroup в MapComponent, если он используется для рисования/редактирования
  // На публичной странице он может быть просто null, так как рисование не предполагается.
  const editableFGRef = useRef(null); 

  // Callback для получения экземпляра карты от MapComponent
  const handleMapReady = useCallback((map) => {
    setMapInstance(map);
    console.log("Карта готова в Home:", map);
  }, []);

  const handleDemoLoginClick = () => {
    navigate('/demo-login'); // Перенаправляем на путь /demo-login
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <h1 className="modern-title" style={{ textAlign: 'center', padding: '20px 0' }}>Добро пожаловать в AgroFarm 🌾</h1>
      
      {/* Контейнер для карты, чтобы она занимала доступное пространство */}
      <div style={{ flex: 1, minHeight: '500px', width: '100%' }}> 
        <MapComponent
          // Передаем onMapReady для получения экземпляра карты
          onMapReady={handleMapReady} 
          // Передаем пустые или заглушечные пропсы, которые MapComponent ожидает
          // Это необходимо, чтобы избежать ошибок "is not a function" или "cannot read properties of undefined"
          polygons={[]} // На публичной странице нет полигонов для отображения
          onPolygonComplete={() => console.log('Polygon complete (Home page)')}
          onPolygonEdited={() => console.log('Polygon edited (Home page)')}
          setIsDrawing={() => {}}
          isDrawing={false}
          editableFGRef={editableFGRef} // Передаем ref
          selectedPolygon={null}
          setSelectedPolygon={() => {}}
          isEditingMode={false}
          editingMapPolygon={null}
          onLoadingChange={() => {}}
          onError={() => {}}
          analysisDateRange={[new Date(new Date().setFullYear(new Date().getFullYear() - 1)), new Date()]} // Диапазон дат по умолчанию
          activeBaseMapType="openstreetmap" // Базовая карта по умолчанию
          activeAnalysisType="none" // Аналитика по умолчанию выключена
        />
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px', paddingBottom: '20px' }}>
        {/* Кнопка для перехода на демо-вход */}
        <button 
          onClick={handleDemoLoginClick} 
          style={{
            padding: '10px 20px',
            fontSize: '18px',
            backgroundColor: '#4CAF50', // Зеленый цвет для кнопки демо
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            transition: 'background-color 0.3s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
        >
          Войти в демо-режим
        </button>
      </div>
    </div>
  );
}
