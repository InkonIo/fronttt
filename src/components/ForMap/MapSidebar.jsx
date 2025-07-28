// components/ForMap/MapSidebar.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './MapSidebar.css'; // Этот CSS-файл уже используется для стилизации компонента

console.log("MapSidebar.jsx загружен и запущен!");

export default function MapSidebar({
  polygons,
  selectedPolygon,
  setSelectedPolygon,
  deletePolygon,
  handleEditPolygon,
  clearAllCrops,
  updatePolygonCrop,
  calculateArea,
  formatArea,
  startDrawing,
  stopDrawing,
  handleStopAndSaveEdit,
  isDrawing,
  isEditingMode,
  clearAll,
  handleLogout,
  showMyPolygons,
  updatePolygonName,
  updatePolygonComment,
  updatePolygonColor,
  isSavingPolygon,
  isFetchingPolygons,
  showCropsSection,
  savePolygonToDatabase,
  BASE_API_URL,
  userRole, // Текущая роль пользователя
  allUsers, // Список всех пользователей (для админ-панели)
  selectedUserForAdminView, // Выбранный пользователь для просмотра админом
  handleUserSelectForAdminView, // Функция выбора пользователя
  onUpdateSelectedUserEmail, // Функция для обновления email пользователя
  showToast, // showToast добавлено
  isAnalysisLoading, // Убедитесь, что этот проп передан, если используется
  currentAuthenticatedUser, // Данные текущего аутентифицированного пользователя
  flyToPolygon // НОВОЕ: Проп для перелета к полигону
}) {
  const [activeSection, setActiveSection] = useState('map');
  const [showPolygonsList, setShowPolygonsList] = useState(true);

  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState('');
  const [cropsByChapter, setCropsByChapter] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [varietiesByCrop, setVarietiesByCrop] = useState([]);
  const [selectedVariety, setSelectedVariety] = useState('');
  const [loadingCropData, setLoadingCropData] = useState(false);
  const [cropDataError, setCropDataError] = useState(null);

  // ✨ НОВОЕ СОСТОЯНИЕ: для нового ввода email
  const [newEmailForUser, setNewEmailForUser] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  // Состояние для ширины боковой панели
  const [sidebarWidth, setSidebarWidth] = useState(280); // Начальная ширина
  const sidebarRef = useRef(null);
  const isResizing = useRef(false);

  // ✨ НОВОЕ СОСТОЯНИЕ: для мобильного режима
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Состояние для открытия/закрытия сайдбара на мобилке

  // Эффект для определения мобильного режима
  useEffect(() => {
    const checkMobile = () => {
      // Используем 768px как в CSS медиа-запросе
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile(); // Проверяем при монтировании
    window.addEventListener('resize', checkMobile); // Добавляем слушатель на изменение размера окна

    return () => window.removeEventListener('resize', checkMobile); // Очистка
  }, []);

  // Эффект для закрытия сайдбара при изменении пути на мобилке
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);


  useEffect(() => {
    if (location.pathname === '/') setActiveSection('home');
    else if (location.pathname === '/dashboard') setActiveSection('map');
    else if (location.pathname === '/chat') setActiveSection('ai-chat');
    else if (location.pathname === '/earthdata') setActiveSection('soil-data');
    else setActiveSection('');
  }, [location.pathname]);

  const fetchApiData = useCallback(async (url, setter, errorMessage) => {
    setLoadingCropData(true);
    setCropDataError(null);
    const token = localStorage.getItem('token');
    if (!token) {
      setCropDataError('Ошибка: Отсутствует токен аутентификации. Пожалуйста, войдите.');
      setLoadingCropData(false);
      return;
    }
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка загрузки: ${response.status} - ${errorText}`);
      }
      const data = await response.json();

      if (Array.isArray(data)) {
        if (url.includes('/chapters')) {
          setter(data.filter(item => typeof item === 'string'));
        } else if (url.includes('/by-chapter')) {
          setter(data.filter(item => item && typeof item.name === 'string'));
        } else if (url.includes('/by-crop')) {
          setter(data.filter(item => item && typeof item.name === 'string').map(variety => variety.name));
        } else {
          setter(data);
        }
      } else {
        setCropDataError(`Неверный формат данных от сервера для ${url}.`);
        setter([]);
      }
    } catch (error) {
      console.error(errorMessage, error);
      setCropDataError(errorMessage + `: ${error.message}`);
      setter([]);
    } finally {
      setLoadingCropData(false);
    }
  }, []);

  useEffect(() => {
    fetchApiData(`${BASE_API_URL}/api/v1/crops/chapters`, setChapters, 'Не удалось загрузить главы культур');
  }, [fetchApiData, BASE_API_URL]);

  useEffect(() => {
    if (selectedChapter) {
      fetchApiData(`${BASE_API_URL}/api/v1/crops/by-chapter?chapter=${encodeURIComponent(selectedChapter)}`, setCropsByChapter, 'Не удалось загрузить культуры для выбранной главы');
      setSelectedCrop('');
      setVarietiesByCrop([]);
      setSelectedVariety('');
    } else {
      setCropsByChapter([]);
      setSelectedCrop('');
      setVarietiesByCrop([]);
      setSelectedVariety('');
    }
  }, [selectedChapter, fetchApiData, BASE_API_URL]);

  useEffect(() => {
    if (selectedCrop) {
      fetchApiData(`${BASE_API_URL}/api/v1/crops/by-crop?crop=${encodeURIComponent(selectedCrop)}`, setVarietiesByCrop, 'Не удалось загрузить сорта для выбранной культуры');
      setSelectedVariety('');
    } else {
      setVarietiesByCrop([]);
      setSelectedVariety('');
    }
  }, [selectedCrop, fetchApiData, BASE_API_URL]);

  const handleUpdatePolygonCrop = useCallback((polygonId, chapter, crop, variety) => {
    const parts = [];
    if (chapter) {
        parts.push(chapter);
    }
    if (crop) {
        parts.push(crop);
    }
    if (variety) {
        parts.push(variety);
    }
    const fullCropName = parts.join(',');
    const currentPolygonInProps = polygons.find(p => p.id === polygonId);

    if (currentPolygonInProps && currentPolygonInProps.crop !== fullCropName) {
        updatePolygonCrop(polygonId, fullCropName);
    }
}, [polygons, updatePolygonCrop]);

  useEffect(() => {
    if (selectedPolygon && selectedPolygon.id && !loadingCropData && chapters.length > 0) {
      const polygon = polygons.find(p => p.id === selectedPolygon.id);
      if (polygon && polygon.crop) {
        const parts = polygon.crop.split(',');
        const chapterFromPolygon = parts[0] || '';
        const cropFromPolygon = parts[1] || '';
        const varietyFromPolygon = parts[2] || '';

        if (chapters.includes(chapterFromPolygon)) {
            setSelectedChapter(chapterFromPolygon);
        } else {
            setSelectedChapter('');
        }

        if (cropFromPolygon && cropsByChapter.some(c => c.name === cropFromPolygon)) {
            setSelectedCrop(cropFromPolygon);
        } else {
            setSelectedCrop('');
        }

        if (varietyFromPolygon && varietiesByCrop.includes(varietyFromPolygon)) {
            setSelectedVariety(varietyFromPolygon);
        } else {
            setSelectedVariety('');
        }

      } else {
        setSelectedChapter('');
        setSelectedCrop('');
        setSelectedVariety('');
      }
    } else if (!selectedPolygon) {
      setSelectedChapter('');
      setSelectedCrop('');
      setSelectedVariety('');
    }
  }, [selectedPolygon, polygons, chapters, cropsByChapter, varietiesByCrop, loadingCropData]);

  // Функции изменения размера
  const handleMouseMove = useCallback((e) => {
    if (!isResizing.current || !sidebarRef.current) return;

    const newWidth = document.documentElement.clientWidth - e.clientX;
    const minWidth = 200;
    const maxWidth = 600;

    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

    requestAnimationFrame(() => {
        if (sidebarRef.current) {
            sidebarRef.current.style.width = `${clampedWidth}px`;
        }
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isResizing.current && sidebarRef.current) {
      const finalWidth = parseInt(sidebarRef.current.style.width, 10);
      setSidebarWidth(finalWidth);
    }

    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.classList.remove('no-select');
    document.body.style.cursor = '';
  }, [handleMouseMove, setSidebarWidth]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isResizing.current = true;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    document.body.classList.add('no-select');
    document.body.style.cursor = 'ew-resize';
  }, [handleMouseMove, handleMouseUp]);

  const onSelectAnalysisForPolygon = useCallback((polygon, analysisType) => {
    console.log(`Запрос анализа ${analysisType} для полигона с ID: ${polygon.id}`);
    if (selectedPolygon && selectedPolygon.id === polygon.id) {
      // Логика для запуска анализа на основе выбранного полигона и типа
      // Это обычно обрабатывается родительским компонентом, который управляет MapComponent
    } else {
      setSelectedPolygon(polygon); // Сначала выберите полигон
      // Затем запустите анализ
    }
    showToast(`Загрузка анализа ${analysisType}...`, 'info');
  }, [selectedPolygon, showToast, setSelectedPolygon]); // Добавлено setSelectedPolygon в зависимости

  // Мок-данные для культур, если не предоставлены
  const cropsOptions = [
    { value: 'Cereals', label: 'Зерновые' },
    { value: 'Corn', label: 'Кукуруза' },
    { value: 'Sunflower', label: 'Подсолнечник' },
    { value: 'Potatoes', label: 'Картофель' },
    { value: 'Vegetables', label: 'Овощи' },
    { value: 'Garden crops', label: 'Садовые культуры' },
    { value: 'Other', label: 'Прочее' },
  ];

  const handleClearSelectedPolygon = useCallback(() => {
    setSelectedPolygon(null);
    if (isEditingMode) {
      handleStopAndSaveEdit();
    }
  }, [setSelectedPolygon, isEditingMode, handleStopAndSaveEdit]);

  // Добавляем запасной вариант для onUpdateSelectedUserEmail, если функция не предоставлена
  const actualOnUpdateSelectedUserEmail = onUpdateSelectedUserEmail || (() => console.log('onUpdateSelectedUserEmail не предоставлена'));

  // Вспомогательная функция для определения, можно ли редактировать полигон
  const canEditPolygon = useCallback((polygon) => {
    console.log(`Проверка canEditPolygon для полигона с ID: ${polygon?.id || 'N/A'}`);
    console.log("  ID владельца полигона:", polygon?.ownerId);
    console.log("  Текущая роль пользователя:", userRole);
    console.log("  Выбранный пользователь для просмотра админом:", selectedUserForAdminView);
    console.log("  ID текущего аутентифицированного пользователя:", currentAuthenticatedUser?.id); // Лог для отладки

    if (!polygon) {
      console.log("  Результат: false (полигон не передан в canEditPolygon)");
      return false;
    }
    if (!userRole) {
      console.log("  Результат: false (нет userRole)");
      return false;
    }

    // ✨ НОВОЕ: Пользователь DEMO может редактировать свои "собственные" (локальные) полигоны
    if (userRole === 'DEMO') {
      console.log("  Результат: true (пользователь DEMO может редактировать свои локальные полигоны)");
      return true;
    }

    if (userRole === 'SUPER_ADMIN') {
      console.log("  Результат: true (SUPER_ADMIN может редактировать все)");
      return true;
    }
    if (userRole === 'ADMIN') {
      // Если ADMIN выбрал конкретного пользователя (USER), и полигон принадлежит этому USER
      if (selectedUserForAdminView && selectedUserForAdminView.role === 'USER') {
        const isSelectedUserOwner = (polygon.ownerId === selectedUserForAdminView.id);
        console.log(`  ADMIN с выбранным USER. Является ли выбранный USER владельцем? ${isSelectedUserOwner}`);
        if (isSelectedUserOwner) {
          return true;
        } else {
          console.log("  ADMIN с выбранным USER, но полигон не принадлежит выбранному USER.");
          return false;
        }
      }
      // Если ADMIN не выбрал пользователя (просматривает свои собственные полигоны)
      // и полигон принадлежит текущему ADMIN
      else if (!selectedUserForAdminView && polygon.ownerId === currentAuthenticatedUser?.id) {
        console.log("  ADMIN просматривает свои собственные полигоны. Результат: true (разрешено редактирование)");
        return true;
      }
      else {
        console.log("  ADMIN: Невозможно редактировать. Либо пользователь не выбран, и полигон не принадлежит ADMIN, либо выбранный пользователь не является USER.");
        return false;
      }
    }
    // Обычный USER может редактировать только свои собственные полигоны
    if (userRole === 'USER' && polygon.ownerId === currentAuthenticatedUser?.id) {
      console.log("  Результат: true (USER редактирует свой собственный полигон)");
      return true;
    }
    console.log("  Результат: false (случай по умолчанию или недостаточные разрешения)");
    return false; // По умолчанию, если роль не совпадает или недостаточно разрешений
  }, [userRole, selectedUserForAdminView, currentAuthenticatedUser]); // Добавлено currentAuthenticatedUser в зависимости


  return (
    <>
      {/* ✨ НОВОЕ: Кнопка переключения для мобильных устройств */}
      {isMobile && (
        <button
          className={`sidebar-toggle-button ${isSidebarOpen ? 'is-open' : ''}`}
          onClick={() => setIsSidebarOpen(prev => !prev)}
          aria-label={isSidebarOpen ? 'Закрыть боковую панель' : 'Открыть боковую панель'}
        >
          {isSidebarOpen ? '✕' : '☰'} {/* Крестик для закрытия, три полоски для открытия */}
        </button>
      )}

      <div className={`map-sidebar-container ${isMobile && isSidebarOpen ? 'is-open' : ''}`} ref={sidebarRef} style={{ width: isMobile ? '280px' : `${sidebarWidth}px` }}>
        <div className="map-sidebar-content-wrapper">
          <h2 className="map-sidebar-section-title"style={{ marginTop: '-5px' }} data-text="Map Management">Управление картой</h2>
          <hr className="map-sidebar-hr" />

          {/* ✨ ИЗМЕНЕНО: Секция администрирования пользователей */}
          {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && allUsers.length > 0 && (
            <div className="map-sidebar-admin-section">
              <h3 className="map-sidebar-section-title" data-text="Users">Пользователи</h3>
              <select
                className="map-sidebar-dropdown-select"
                onChange={(e) => {
                  const userId = e.target.value;
                  const user = allUsers.find(u => u.id === Number(userId)); // Преобразуем userId в число
                  handleUserSelectForAdminView(user || null);
                  if (user) {
                    showToast(`Выбран пользователь: ${user.email}`, 'info');
                    setNewEmailForUser(user.email); // Устанавливаем текущий email выбранного пользователя
                  } else {
                    showToast('Просмотр своих полигонов или всех', 'info');
                    setNewEmailForUser(''); // Очищаем поле ввода
                  }
                }}
                value={selectedUserForAdminView ? selectedUserForAdminView.id : ''}
                disabled={isFetchingPolygons}
              >
                <option value="">{userRole === 'SUPER_ADMIN' ? 'Все пользователи' : 'Мои полигоны'}</option>
                {allUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.email} (ID: {user.id})
                  </option>
                ))}
              </select>

              {selectedUserForAdminView && ( // Показываем поля редактирования только если пользователь выбран
                <div className="admin-user-edit-block">
                  <input
                    type="email"
                    className="map-sidebar-input" // Используем новый класс для стилизации
                    placeholder="Новый email пользователя"
                    value={newEmailForUser}
                    onChange={(e) => setNewEmailForUser(e.target.value)}
                    disabled={isSavingPolygon || isFetchingPolygons}
                  />
                  <button
                    onClick={() => {
                      if (selectedUserForAdminView && newEmailForUser.trim() !== '') {
                        actualOnUpdateSelectedUserEmail(selectedUserForAdminView.id, newEmailForUser.trim());
                      } else {
                        showToast('Выберите пользователя и введите новый email.', 'warning');
                      }
                    }}
                    disabled={isSavingPolygon || isFetchingPolygons || !selectedUserForAdminView || newEmailForUser.trim() === ''}
                    className="map-sidebar-button admin-action-button" // Используем новый класс для стилизации
                  >
                    Изменить Email
                  </button>
                </div>
              )}
              <hr className="map-sidebar-hr" />
            </div>
          )}

          <div className="map-sidebar-controls">
            <button
              onClick={startDrawing}
              disabled={isDrawing || isEditingMode || isSavingPolygon || isFetchingPolygons || (userRole === 'DEMO' && polygons.length >= 30)}
              className="map-sidebar-button draw-button"
              aria-label={isDrawing ? 'Рисование активно' : 'Начать рисование полигона'}
            >
              {isDrawing ? '✏️ Рисование' : '✏️ Нарисовать'}
            </button>

            <button
              onClick={clearAll}
              disabled={isSavingPolygon || isFetchingPolygons || polygons.length === 0}
              className="map-sidebar-button clear-button"
              aria-label="Очистить все полигоны"
            >
              🗑️ Очистить
            </button>

            <button
              onClick={() => {
                if (!showPolygonsList) {
                  showMyPolygons(selectedUserForAdminView ? selectedUserForAdminView.id : null);
                }
                setShowPolygonsList(prev => !prev);
              }}
              disabled={isSavingPolygon || isFetchingPolygons || isDrawing || isEditingMode}
              className="map-sidebar-button toggle-list-button"
              aria-label={isFetchingPolygons ? 'Загрузка списка' : (showPolygonsList ? 'Скрыть список полигонов' : 'Показать список полигонов')}
            >
              {isFetchingPolygons ? '📂 Загрузка...' : '👀 Список'}
            </button>
          </div>

          <hr className="map-sidebar-hr" />

          {showPolygonsList && polygons.length > 0 ? (
            <div className="polygon-list-section">
              <h3 className="polygon-list-header" data-text={`Polygons (${polygons.length})`}>
                📐 Полигоны ({polygons.length})
              </h3>
              <div className="polygon-list-container">
                {polygons.map((polygon) => { // Убрал idx, так как он не используется для ключа
                  const canModifyThisPolygon = canEditPolygon(polygon); // Используем общую функцию

                  return (
                    <div
                      key={polygon.id} // Используем polygon.id напрямую как ключ
                      className={`polygon-item ${selectedPolygon && selectedPolygon.id === polygon.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedPolygon(polygon);
                        flyToPolygon(polygon); // НОВОЕ: Перелетаем к выбранному полигону
                        if (canModifyThisPolygon) { // Только если есть права, начинаем редактирование
                          handleEditPolygon(polygon.id);
                        } else {
                          showToast("У вас нет разрешения на редактирование этого полигона.", "warning");
                        }
                      }}
                    >
                      <div className="polygon-item-header">
                        {selectedPolygon && selectedPolygon.id === polygon.id ? (
                          <input
                            type="text"
                            value={polygon.name || ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              updatePolygonName(polygon.id, e.target.value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === 'Return') {
                                e.stopPropagation();
                                const updatedPoly = polygons.find(p => p.id === polygon.id);
                                if (updatedPoly && updatedPoly.name !== (e.target.value || '').trim()) {
                                   const polyToSave = { ...updatedPoly, name: (e.target.value || '').trim() };
                                   savePolygonToDatabase(polyToSave, true);
                                }
                                e.target.blur();
                              }
                            }}
                            onBlur={(e) => {
                              e.stopPropagation();
                              const updatedPoly = polygons.find(p => p.id === polygon.id);
                              if (updatedPoly && updatedPoly.name !== (e.target.value || '').trim()) {
                                 const polyToSave = { ...updatedPoly, name: (e.target.value || '').trim() };
                                 savePolygonToDatabase(polyToSave, true);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="polygon-name-input"
                            disabled={isSavingPolygon || isFetchingPolygons || !canModifyThisPolygon} // Отключить, если нет прав
                          />
                        ) : (
                          <strong className="polygon-name-display">
                            {polygon.name || `Полигон №${polygons.indexOf(polygon) + 1}`} {/* Используем индекс для отображения, если нет имени */}
                          </strong>
                        )}

                        <div className="polygon-actions">
                          <button
                            onClick={(e) => { e.stopPropagation(); deletePolygon(polygon.id); }}
                            className="polygon-action-button delete"
                            disabled={isSavingPolygon || isFetchingPolygons || !canModifyThisPolygon} // Отключить, если нет прав
                          >
                            Удалить
                          </button>
                          {(selectedPolygon && selectedPolygon.id === polygon.id && (isEditingMode || isDrawing)) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStopAndSaveEdit(polygon.id); }}
                              disabled={(!isEditingMode && !isDrawing) || isSavingPolygon || isFetchingPolygons || !canModifyThisPolygon} // Отключить, если нет прав
                              className="polygon-action-button save-polygon"
                            >
                              {isSavingPolygon ? '💾 Сохранение...' : '💾 Сохранить'}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="polygon-details-info">
                        <span>Точек: {polygon.coordinates.length}</span><dt></dt>
                        <span>Площадь: {formatArea(calculateArea(polygon.coordinates))}</span>
                        <div style={{ backgroundColor: polygon.color }} className="polygon-color-box"></div>
                      </div>
                      {selectedPolygon && selectedPolygon.id === polygon.id && (
                        <div className="polygon-meta-edit">
                          <div className="polygon-meta-group">
                            <label htmlFor={`color-picker-${polygon.id}`} className="polygon-detail-label">
                              Цвет полигона:
                            </label>
                            <input
                              id={`color-picker-${polygon.id}`}
                              type="color"
                              value={polygon.color || '#000000'}
                              onChange={(e) => {
                                e.stopPropagation();
                                updatePolygonColor(polygon.id, e.target.value);
                              }}
                              onBlur={(e) => {
                                  e.stopPropagation();
                                  const originalPoly = polygons.find(p => p.id === polygon.id);
                                  if (originalPoly && originalPoly.color !== e.target.value) {
                                      const polyToSave = { ...originalPoly, color: e.target.value };
                                      savePolygonToDatabase(polyToSave, true);
                                  }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="polygon-color-input"
                              disabled={isSavingPolygon || isFetchingPolygons || !canModifyThisPolygon} // Отключить, если нет прав
                            />
                          </div>

                          <div className="polygon-meta-group">
                            <label htmlFor={`chapter-select-${polygon.id}`} className="polygon-detail-label">
                              Глава культуры:
                            </label>
                            <select
                              id={`chapter-select-${polygon.id}`}
                              value={selectedChapter}
                              onChange={(e) => {
                                e.stopPropagation();
                                setSelectedChapter(e.target.value);
                                setSelectedCrop('');
                                setSelectedVariety('');
                                handleUpdatePolygonCrop(polygon.id, e.target.value, '', '');
                              }}
                              onBlur={(e) => {
                                  e.stopPropagation();
                              }}
                              disabled={isSavingPolygon || isFetchingPolygons || loadingCropData || !canModifyThisPolygon} // Отключить, если нет прав
                              className="polygon-crop-select"
                            >
                              <option value="">Выбрать главу</option>
                              {chapters.map((chapter) => (
                                <option key={chapter} value={chapter}>
                                  {chapter}
                                </option>
                              ))}
                            </select>
                          </div>

                          {selectedChapter && (
                            <div className="polygon-meta-group">
                              <label htmlFor={`crop-select-${polygon.id}`} className="polygon-detail-label">
                                Культура:
                              </label>
                              <select
                                id={`crop-select-${polygon.id}`}
                                value={selectedCrop}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  console.log('MapSidebar: Выбран сорт:', e.target.value);
                                  setSelectedCrop(e.target.value);
                                  setSelectedVariety('');
                                  handleUpdatePolygonCrop(polygon.id, selectedChapter, e.target.value, '');
                                }}
                                onBlur={(e) => {
                                    e.stopPropagation();
                                }}
                                disabled={isSavingPolygon || isFetchingPolygons || loadingCropData || !selectedChapter || !canModifyThisPolygon} // Отключить, если нет прав
                                className="polygon-crop-select"
                              >
                                <option value="">Выбрать культуру</option>
                                {cropsByChapter.map((crop) => (
                                  <option key={crop.name || ''} value={crop.name || ''}>
                                    {crop.name || 'Неизвестная культура'}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {selectedCrop && (
                            <div className="polygon-meta-group">
                              <label htmlFor={`variety-select-${polygon.id}`} className="polygon-detail-label">
                                Сорт:
                              </label>
                              <select
                                id={`variety-select-${polygon.id}`}
                                value={selectedVariety}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  console.log('MapSidebar: Выбран сорт:', e.target.value);
                                  setSelectedVariety(e.target.value);
                                  handleUpdatePolygonCrop(polygon.id, selectedChapter, selectedCrop, e.target.value);
                                }}
                                onBlur={(e) => {
                                    e.stopPropagation();
                                }}
                                disabled={isSavingPolygon || isFetchingPolygons || loadingCropData || !selectedCrop || !canModifyThisPolygon} // Отключить, если нет прав
                                className="polygon-crop-select"
                              >
                                <option value="">Выбрать сорт</option>
                                {varietiesByCrop.map((variety) => (
                                  <option key={variety} value={variety}>
                                    {variety}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {cropDataError && (
                            <div className="crops-error-message">
                              ⚠️ {cropDataError}
                            </div>
                          )}

                          <div className="polygon-meta-group">
                            <label htmlFor={`comment-input-${polygon.id}`} className="polygon-detail-label">
                              Комментарий:
                            </label>
                            <input
                              id={`comment-input-${polygon.id}`}
                              type="text"
                              placeholder="Добавить комментарий..."
                              value={polygon.comment || ''}
                              onChange={(e) => {
                                e.stopPropagation();
                                updatePolygonComment(polygon.id, e.target.value);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Return') {
                                  e.stopPropagation();
                                  const updatedPoly = polygons.find(p => p.id === polygon.id);
                                  if (updatedPoly && updatedPoly.comment !== (e.target.value || '').trim()) {
                                     const polyToSave = { ...updatedPoly, comment: (e.target.value || '').trim() };
                                     savePolygonToDatabase(polyToSave, true);
                                  }
                                  e.target.blur();
                                }
                              }}
                              onBlur={(e) => {
                                e.stopPropagation();
                                const originalPoly = polygons.find(p => p.id === polygon.id);
                                if (originalPoly && originalPoly.comment !== (e.target.value || '').trim()) {
                                  const polyToSave = { ...originalPoly, comment: (e.target.value || '').trim() };
                                  savePolygonToDatabase(polyToSave, true);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="polygon-comment-input"
                              disabled={isSavingPolygon || isFetchingPolygons || !canModifyThisPolygon} // Отключить, если нет прав
                            />
                          </div>
                        </div>
                      )}
                      {selectedPolygon && selectedPolygon.id !== polygon.id && (
                        <div className="polygon-summary-display">
                          {polygon.crop && `🌾 ${polygon.crop}`}
                          {polygon.crop && polygon.comment && ' | '}
                          {polygon.comment && `💬 ${polygon.comment}`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            showPolygonsList && !isFetchingPolygons && (
              <div className="polygon-list-section">
                <h3 className="polygon-list-header">
                  📐 Полигоны (0)
                </h3>
                <p className="no-polygons-message">Полигоны не найдены.</p>
              </div>
            )
          )}
        </div>

        {showCropsSection && (
          <div className="crops-summary-section">
            <div className="crops-summary-header">
              <h4 className="crops-summary-title">
                🌾 Сводка по культурам
              </h4>
              <div className="crops-summary-actions">
                <button
                  onClick={() => fetchApiData(`${BASE_API_URL}/api/v1/crops/chapters`, setChapters, 'Не удалось обновить главы культур')}
                  disabled={loadingCropData || isSavingPolygon || isFetchingPolygons}
                  className="crops-summary-button"
                  aria-label="Обновить данные о культурах"
                >
                  {loadingCropData ? 'Загрузка...' : ''}
                </button>
                <button
                  onClick={clearAllCrops}
                  disabled={isSavingPolygon || isFetchingPolygons}
                  className="crops-summary-button clear-crops"
                  aria-label="Очистить все культуры"
                >
                  🗑️
                </button>
              </div>
            </div>

            {cropDataError && (
              <div className="crops-error-message">
                ⚠️ {cropDataError}
              </div>
            )}

            <div className="crops-summary-content">
              <div className="crops-summary-details">
                <div><strong>Сводка:</strong></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                  <div>Полигонов: {polygons.length}</div>
                  <div>С культурами: {polygons.filter((p) => p.crop).length}</div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    Общая площадь:{' '}
                      {formatArea(polygons.reduce((total, p) => total + calculateArea(p.coordinates), 0))}
                  </div>
                </div>
                {polygons.some((p) => p.crop) && (
                  <div className="crops-by-type">
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>По культурам:</div>
                    <div className="crops-by-type-list">
                      {Object.entries(
                        polygons.filter((p) => p.crop).reduce((acc, p) => {
                          const area = calculateArea(p.coordinates);
                          const fullCrop = p.crop;
                          if (fullCrop) {
                              acc[fullCrop] = (acc[fullCrop] || 0) + area;
                          }
                          return acc;
                        }, {})
                      ).map(([fullCrop, area]) => (
                        <div key={fullCrop} className="crop-tag">
                          {fullCrop}: {formatArea(area)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Ручка изменения размера (скрыта на мобильных устройствах через CSS) */}
        <div className="resizer" onMouseDown={handleMouseDown}></div>
      </div>
    </>
  );
}
