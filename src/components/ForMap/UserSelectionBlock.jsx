// components/ForMap/UserSelectionBlock.jsx
import React, { useState, useEffect, useRef } from 'react';

// Общие стили для элементов <select>, скопированные из LayerSelectionBlock.jsx
const commonSelectStyles = {
  width: '100%',
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid #555',
  backgroundColor: '#333',
  color: '#f0f0f0',
  fontSize: '13px',
  cursor: 'pointer',
  appearance: 'none',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  backgroundSize: '14px'
};

// Общие стили для заголовков секций
const sectionTitleStyles = {
  margin: '0', // Изменяем, чтобы разместить рядом кнопку
  fontSize: '16px',
  color: '#4CAF50'
};

// Общие стили для абзацев описания
const descriptionParagraphStyles = {
  margin: '0 0 8px',
  fontSize: '13px',
  lineHeight: '1.4'
};

export default function UserSelectionBlock({
  userRole,
  allUsers,
  selectedUserForAdminView,
  handleUserSelectForAdminView,
  calculatedBottom, // Новая пропса для динамической позиции bottom
  onUpdateUserRole // Функция для обновления роли пользователя
}) {
  const blockRef = useRef(null);
  // Состояние для новой роли выбранного пользователя
  const [newRoleForSelectedUser, setNewRoleForSelectedUser] = useState('');
  // Состояние для управления видимостью содержимого блока (развернут/свернут)
  const [isExpanded, setIsExpanded] = useState(false);

  // Обновляем newRoleForSelectedUser при изменении selectedUserForAdminView
  useEffect(() => {
    if (selectedUserForAdminView) {
      setNewRoleForSelectedUser(selectedUserForAdminView.role);
    } else {
      setNewRoleForSelectedUser('');
    }
  }, [selectedUserForAdminView]);

  // Эффект для передачи высоты блока родительскому компоненту
  useEffect(() => {
    if (blockRef.current && calculatedBottom) {
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          if (entry.target === blockRef.current) {
            // No direct action here, assuming parent will handle position based on its own state
          }
        }
      });

      resizeObserver.observe(blockRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [calculatedBottom, isExpanded]);

  // Этот блок будет отображаться только для пользователей с ролью 'ADMIN' ИЛИ 'SUPER_ADMIN'
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    return null;
  }

  const handleRoleChange = (e) => {
    setNewRoleForSelectedUser(e.target.value);
  };

  const handleSaveRoleClick = () => {
    if (selectedUserForAdminView && newRoleForSelectedUser) {
      if (userRole === 'SUPER_ADMIN' && selectedUserForAdminView.id === null) {
          console.warn("SUPER_ADMIN cannot change their own role via this block.");
          return;
      }
      onUpdateUserRole(selectedUserForAdminView.id, newRoleForSelectedUser);
    }
  };

  // Стили для кнопки сворачивания/разворачивания, которая теперь внутри блока
  const collapseButtonStyle = {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#f0f0f0',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '0', // Убираем паддинг, чтобы кнопка была компактнее
    marginLeft: 'auto', // Отталкиваем кнопку вправо от заголовка
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  // Основные стили блока
  const blockStyle = {
    position: 'absolute',
    bottom: calculatedBottom,
    left: '10px',
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    color: '#f0f0f0',
    padding: '10px', // Единый паддинг для обоих состояний
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    zIndex: 999,
    minWidth: isExpanded ? '220px' : '50px',
    maxWidth: isExpanded ? '280px' : '50px',
    width: isExpanded ? 'auto' : '50px',
    height: isExpanded ? 'auto' : '50px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    fontFamily: 'Inter, sans-serif',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'all 0.3s ease',
    alignItems: 'center', // Всегда центрируем содержимое
    justifyContent: 'center', // Всегда центрируем содержимое
    cursor: 'pointer', // Весь блок кликабелен в свернутом состоянии
  };

  return (
    <div ref={blockRef} style={blockStyle} onClick={() => !isExpanded && setIsExpanded(true)}>
      {isExpanded ? (
        <>
          {/* Заголовок с кнопкой сворачивания рядом */}
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '8px' }}>
            <h4 style={sectionTitleStyles}>Панель Администратора</h4>
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
              style={collapseButtonStyle}
              aria-expanded={isExpanded}
              aria-label={'Свернуть панель администратора'}
            >
              {/* SVG для стрелки вверх (свернуть) */}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            </button>
          </div>

          <p style={descriptionParagraphStyles}>
            Выберите пользователя для просмотра его полигонов.
          </p>
          <select
            id="adminUserSelect"
            onChange={handleUserSelectForAdminView}
            value={selectedUserForAdminView ? selectedUserForAdminView.id : ''}
            style={{
              ...commonSelectStyles,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f0f0f0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            }}
          >
            <option value="">Все пользователи</option>
            {allUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.email} (ID: {user.id})
              </option>
            ))}
          </select>

          {/* БЛОК: Изменение роли для SUPER_ADMIN */}
          {userRole === 'SUPER_ADMIN' && selectedUserForAdminView && (
            <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <h5 style={{ ...sectionTitleStyles, fontSize: '14px', marginBottom: '5px' }}>
                Изменить роль для: {selectedUserForAdminView.email}
              </h5>
              <select
                value={newRoleForSelectedUser}
                onChange={handleRoleChange}
                style={commonSelectStyles}
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
                {selectedUserForAdminView.role !== 'SUPER_ADMIN' && (
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                )}
              </select>
              <button
                onClick={handleSaveRoleClick}
                style={{
                  marginTop: '10px',
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#3498db',
                  color: 'white',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
              >
                Сохранить роль
              </button>
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '12px', color: '#f0f0f0', userSelect: 'none' }}>
              Админ
          </span>
        </div>
      )}
    </div>
  );
}