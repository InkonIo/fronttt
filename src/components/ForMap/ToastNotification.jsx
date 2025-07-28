// components/Common/ToastNotification.jsx
import React, { useEffect, useState } from 'react';

const ToastNotification = ({ message, type, visible }) => {
  // shouldRender теперь просто следует за 'visible'.
  // Анимация исчезновения будет обрабатываться CSS-переходом.
  if (!visible) return null; // Если 'visible' false, компонент не рендерится

  const getBackgroundColor = (type) => {
    switch (type) {
      case 'success':
        return '#4CAF50'; // Зеленый
      case 'error':
        return '#F44336'; // Красный
      case 'info':
        return '#2196F3'; // Синий
      case 'warning':
        return '#FFC107'; // Желтый
      default:
        return '#333';
    }
  };

  const textColor = type === 'warning' ? '#333' : 'white';

  const toastStyle = {
    position: 'fixed',
    top: '20px', // Теперь сверху, с отступом 20px
    left: '50%', // Центрируем по горизонтали
    transform: 'translateX(-50%)', // Смещаем на половину своей ширины для точного горизонтального центрирования
    backgroundColor: getBackgroundColor(type),
    color: textColor,
    padding: '18px 30px', // Увеличиваем отступы
    borderRadius: '12px', // Немного более округлые углы
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)', // Увеличиваем тень для выделения
    zIndex: 10000,
    opacity: visible ? 1 : 0, // Управляется пропом 'visible'
    transition: 'opacity 0.5s ease-out, transform 0.5s ease-out', // Плавный переход
    maxWidth: '350px', // Увеличиваем максимальную ширину
    wordWrap: 'break-word',
    textAlign: 'center',
    fontSize: '16px', // Увеличиваем размер шрифта
    fontWeight: 'bold', // Делаем текст жирнее
  };

  return (
    <div style={toastStyle}>
      {message}
    </div>
  );
};

export default ToastNotification;
