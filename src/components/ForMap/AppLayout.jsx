// components/ForMap/AppLayout.jsx
import React from 'react';
import './AppLayout.css'; // Будет обновлен, чтобы быть минимальным

// AppLayout теперь просто оборачивает дочерние элементы
// и не управляет навигацией или кнопкой выхода напрямую
export default function AppLayout({ children }) {
  return (
    <div className="app-layout-container">
      <div className="app-layout-content">
        {children} {/* Здесь будет отображаться PolygonDrawMap */}
      </div>
    </div>
  );
}
