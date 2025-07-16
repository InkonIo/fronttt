// components/ForMap/UserSelectionBlock.jsx
import React, { useState, useEffect } from 'react';

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
  margin: '0 0 8px',
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
  onUpdateUserRole // ✨ НОВЫЙ ПРОПС: функция для обновления роли пользователя
}) {
  // Состояние для новой роли выбранного пользователя
  const [newRoleForSelectedUser, setNewRoleForSelectedUser] = useState('');

  // Обновляем newRoleForSelectedUser при изменении selectedUserForAdminView
  useEffect(() => {
    if (selectedUserForAdminView) {
      setNewRoleForSelectedUser(selectedUserForAdminView.role);
    } else {
      setNewRoleForSelectedUser('');
    }
  }, [selectedUserForAdminView]);

  // Этот блок будет отображаться только для пользователей с ролью 'ADMIN' ИЛИ 'SUPER_ADMIN'
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    return null; // Не рендерим блок, если пользователь не админ и не супер-админ
  }

  const handleRoleChange = (e) => {
    setNewRoleForSelectedUser(e.target.value);
  };

  const handleSaveRoleClick = () => {
    if (selectedUserForAdminView && newRoleForSelectedUser) {
      // Проверяем, что SUPER_ADMIN не пытается изменить свою собственную роль через этот блок
      // (хотя бэкенд тоже должен это обрабатывать)
      if (userRole === 'SUPER_ADMIN' && selectedUserForAdminView.id === null) { // Если выбран "Все пользователи" и это сам супер-админ
          // Можно добавить toast или просто проигнорировать
          console.warn("SUPER_ADMIN cannot change their own role via this block.");
          return;
      }
      onUpdateUserRole(selectedUserForAdminView.id, newRoleForSelectedUser);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: calculatedBottom, // Используем динамически вычисленное значение bottom
      left: '10px', // Выравниваем по левому краю
      backgroundColor: 'rgba(26, 26, 26, 0.9)',
      color: '#f0f0f0',
      padding: '10px',
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      zIndex: 999, // Убедимся, что он поверх других элементов, но не выше выпадающих списков
      minWidth: '220px',
      maxWidth: '280px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      fontFamily: 'Inter, sans-serif',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <h4 style={sectionTitleStyles}>Панель Администратора</h4>
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

      {/* ✨ НОВЫЙ БЛОК: Изменение роли для SUPER_ADMIN */}
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
            {/* SUPER_ADMIN не может сам себе назначить роль SUPER_ADMIN через этот UI */}
            {/* Если выбранный пользователь не SUPER_ADMIN, можно предложить и SUPER_ADMIN, но это должно быть ограничено бэкендом */}
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
    </div>
  );
}
