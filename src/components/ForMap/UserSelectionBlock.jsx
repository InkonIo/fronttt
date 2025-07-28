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
  backgroundSize: '14px',
  // Адаптивные стили для мобильных устройств
  '@media (max-width: 600px)': {
    fontSize: '11px',
    padding: '4px 6px',
    backgroundPosition: 'right 5px center',
    backgroundSize: '10px',
  },
};

// Общие стили для заголовков секций
const sectionTitleStyles = {
  margin: '0',
  fontSize: '13px',
  color: '#4CAF50',
  // Адаптивные стили для мобильных устройств
  '@media (max-width: 600px)': {
    fontSize: '12px',
  },
};

// Общие стили для абзацев описания
const descriptionParagraphStyles = {
  margin: '0 0 8px',
  fontSize: '10px',
  lineHeight: '1.4',
  // Адаптивные стили для мобильных устройств
  '@media (max-width: 600px)': {
    fontSize: '9px',
    margin: '0 0 5px',
  },
};

export default function UserSelectionBlock({
  userRole,
  allUsers,
  selectedUserForAdminView,
  handleUserSelectForAdminView,
  onUpdateUserRole, // Функция для обновления роли пользователя
  layerSelectionBlockHeight, // НОВАЯ ПРОПСА: высота LayerSelectionBlock
}) {
  const blockRef = useRef(null);
  const [newRoleForSelectedUser, setNewRoleForSelectedUser] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (selectedUserForAdminView) {
      setNewRoleForSelectedUser(selectedUserForAdminView.role);
    } else {
      setNewRoleForSelectedUser('');
    }
  }, [selectedUserForAdminView]);

  useEffect(() => {
    if (blockRef.current) {
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
  }, [isExpanded]);

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
    fontSize: '16px', // Уменьшил размер шрифта для иконки
    cursor: 'pointer',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    // Адаптивные стили для мобильных устройств
    '@media (max-width: 600px)': {
      fontSize: '14px',
    },
  };

  // Основные стили блока
  const blockStyle = {
    position: 'absolute',
    // Позиционируем над LayerSelectionBlock + 10px отступа
    bottom: `calc(${layerSelectionBlockHeight}px + 65px)`, // 35px от LayerSelectionBlock + 10px отступ
    left: '10px', // Выравниваем по левому краю LayerSelectionBlock
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    color: '#f0f0f0',
    padding: '8px 12px', // Уменьшено с 10px
    borderRadius: '10px', // Уменьшено с 10px
    boxShadow: '0 3px 6px rgba(0, 0, 0, 0.3)', // Уменьшено
    zIndex: 999,
    minWidth: isExpanded ? '220px' : '50px',
    maxWidth: isExpanded ? '280px' : '50px',
    height: isExpanded ? 'auto' : '50px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Inter, sans-serif',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'all 0.3s ease',
    alignItems: 'center', // Центрирование в свернутом состоянии
    justifyContent: 'center', // Центрирование в свернутом состоянии
    cursor: isExpanded ? 'default' : 'pointer',
    // Адаптивные стили для мобильных устройств
    '@media (max-width: 600px)': {
      left: '5px',
      bottom: `calc(${layerSelectionBlockHeight}px + 10px + 10px)`, // Адаптивное позиционирование
      padding: '6px 10px',
      borderRadius: '5px',
      minWidth: isExpanded ? '180px' : '45px',
      maxWidth: isExpanded ? '90%' : '45px', // Максимальная ширина 90% для мобильных
      height: isExpanded ? 'auto' : '45px',
    },
  };

  const titleRowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: isExpanded ? 'space-between' : 'center', // Centered when collapsed
    width: '100%',
    gap: '4px',
    marginBottom: isExpanded ? '4px' : '0', // Уменьшено с 8px
  };

  return (
    <div ref={blockRef} style={blockStyle} onClick={() => !isExpanded && setIsExpanded(true)}>
      <div style={titleRowStyle}>
        {isExpanded ? (
          <>
            <h4 style={sectionTitleStyles}>Панель Администратора</h4>
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
              style={collapseButtonStyle}
              aria-expanded="true"
              aria-label={'Свернуть панель администратора'}
            >
              {/* SVG для стрелки вверх (свернуть) */}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: '12px', color: '#f0f0f0', userSelect: 'none' }}>
                Админ
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
              style={collapseButtonStyle}
              aria-expanded="false"
              aria-label={'Развернуть панель администратора'}
            >
              {/* Нет стрелки вниз в свернутом состоянии */}
            </button>
          </>
        )}
      </div>

      {isExpanded && (
        <>
          <p style={descriptionParagraphStyles}>
            Выберите пользователя для просмотра его полигонов.
          </p>
          <select
            id="adminUserSelect"
            onChange={handleUserSelectForAdminView}
            value={selectedUserForAdminView ? selectedUserForAdminView.id : ''}
            style={{
              ...commonSelectStyles,
              fontSize: '12px', // Уменьшено с 13px
              padding: '5px 8px', // Уменьшено
              backgroundPosition: 'right 6px center', // Уменьшено
              backgroundSize: '12px', // Уменьшено
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
            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}> {/* Уменьшены отступы */}
              <h5 style={{ ...sectionTitleStyles, fontSize: '12px', marginBottom: '4px' }}> {/* Уменьшены размеры */}
                Изменить роль для: {selectedUserForAdminView.email}
              </h5>
              <select
                value={newRoleForSelectedUser}
                onChange={handleRoleChange}
                style={{
                  ...commonSelectStyles,
                  fontSize: '12px', // Уменьшено с 13px
                  padding: '5px 8px', // Уменьшено
                  backgroundPosition: 'right 6px center', // Уменьшено
                  backgroundSize: '12px', // Уменьшено
                }}
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
                  marginTop: '8px', // Уменьшено с 10px
                  width: '100%',
                  padding: '6px', // Уменьшено с 8px
                  borderRadius: '4px', // Уменьшено с 6px
                  border: 'none',
                  backgroundColor: '#3498db',
                  color: 'white',
                  fontSize: '11px', // Уменьшено с 13px
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
              >
                Сохранить роль
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
