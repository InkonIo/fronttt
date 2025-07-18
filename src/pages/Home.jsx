import React from 'react';
import Map from '../components/ForMap/MapComponent'; // Убедитесь, что путь правильный
import { useNavigate } from 'react-router-dom'; // Импортируем useNavigate

export default function Home() {
  const navigate = useNavigate(); // Инициализируем хук навигации

  const handleDemoLoginClick = () => {
    navigate('/demo-login'); // Перенаправляем на путь /demo-login
  };

  return (
    <div>
      <h1 className="modern-title">Добро пожаловать в AgroFarm 🌾</h1>
      <Map /> {/* Теперь React будет знать, что это ваш компонент Map */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
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
