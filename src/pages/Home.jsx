import React from 'react';
import Map from '../components/ForMap/MapComponent'; // <<< РАСКОММЕНТИРОВАНО ИЛИ ДОБАВЛЕНО: Убедитесь, что путь правильный

export default function Home() {
  return (
    <div>
      <h1 className="modern-title">Добро пожаловать в AgroFarm 🌾</h1>
      <Map /> {/* Теперь React будет знать, что это ваш компонент Map */}
    </div>
  );
}
