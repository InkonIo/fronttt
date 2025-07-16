// components/ForMap/PolygonDrawMap.jsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MapComponent from './MapComponent';
import MapSidebar from './MapSidebar';
import ToastNotification from './ToastNotification';
import ConfirmDialog from './ConfirmDialog';
import PolygonAnalysisLayer from './PolygonAnalysisLayer';
import LayerSelectionBlock from './LayerSelectionBlock';
import UserSelectionBlock from './UserSelectionBlock';
import * as L from 'leaflet';
import './Map.css';
import { jwtDecode } from 'jwt-decode'; // Импортируем jwtDecode

const BASE_API_URL = 'http://localhost:8080';

async function parseResponseBody(response) {
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch (e) {
      console.error("Failed to parse JSON, falling back to text:", e);
      return await response.text();
    }
  } else {
    return await response.text();
  }
}

const ensurePolygonClosed = (coordinates) => {
  if (!coordinates || coordinates.length < 3) {
    return coordinates;
  }
  let cleanedCoordinates = [...coordinates];
  while (cleanedCoordinates.length >= 2 &&
         cleanedCoordinates[cleanedCoordinates.length - 1][0] === cleanedCoordinates[cleanedCoordinates.length - 2][0] &&
         cleanedCoordinates[cleanedCoordinates.length - 1][1] === cleanedCoordinates[cleanedCoordinates.length - 2][1]) {
    cleanedCoordinates.pop();
  }
  const firstPoint = cleanedCoordinates[0];
  const lastPoint = cleanedCoordinates[cleanedCoordinates.length - 1];
  if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
    return [...cleanedCoordinates, firstPoint];
  }
  return cleanedCoordinates;
};


export default function PolygonDrawMap({ handleLogout }) {
  const [polygons, setPolygons] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [editingMapPolygon, setEditingMapPolygon] = useState(null);
  const editableFGRef = useRef();

  const [toast, setToast] = useState({ message: '', type: '', visible: false });
  const [drawnPointsCount, setDrawnPointsCount] = useState(0);

  const [isSavingPolygon, setIsSavingPolygon] = useState(false);
  const [isFetchingPolygons, setIsFetchingPolygons] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  const [activeAnalysisType, setActiveAnalysisType] = useState('none');
  const [analysisDateRange, setAnalysisDateRange] = useState([new Date(), new Date()]);

  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

  const [activeBaseMapType, setActiveBaseMapType] = useState('openstreetmap');

  const [userRole, setUserRole] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserForAdminView, setSelectedUserForAdminView] = useState(null);
  const [currentAuthenticatedUser, setCurrentAuthenticatedUser] = useState(null); // Состояние для данных текущего аутентифицированного пользователя

  const [layerBlockHeight, setLayerBlockHeight] = useState(0);
  const layerBlockInitialBottom = 35;

  const navigate = useNavigate();

  // Состояние для хранения экземпляра карты
  const [mapInstance, setMapInstance] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, visible: true });
    const timer = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const calculateArea = useCallback((coordinates) => {
    if (coordinates.length < 3) return 0;

    const R = 6378137;
    let area = 0;

    for (let i = 0, len = coordinates.length; i < len; i++) {
      const [lat1, lon1] = coordinates[i];
      const [lat2, lon2] = coordinates[(i + 1) % len];

      const phi1 = (lat1 * Math.PI) / 180;
      const phi2 = (lat2 * Math.PI) / 180;
      const dLambda = ((lon2 - lon1) * Math.PI) / 180;

      area += dLambda * (2 + Math.sin(phi1) + Math.sin(phi2));
    }

    area = (area * R * R) / 2.0;
    return Math.abs(area);
  }, []);

  const formatArea = useCallback((area) => {
    if (area < 10000) return `${area.toFixed(1)} м²`;
    if (area < 1000000) return `${(area / 10000).toFixed(1)} га`;
    return `${(area / 1000000).toFixed(1)} км²`;
  }, []);

  // Define showMyPolygons before savePolygonToDatabase
  const showMyPolygons = useCallback(async (userIdToFetch = null) => {
    // Если userIdToFetch предоставлен и является числом, используем его
    // Иначе, если userIdToFetch null, вызываем /api/polygons/user (без ID)
    const fetchUrl = (userIdToFetch !== null && !isNaN(Number(userIdToFetch))) 
      ? `${BASE_API_URL}/api/polygons/user/${userIdToFetch}` 
      : `${BASE_API_URL}/api/polygons/user`;

    showToast(`Loading polygons${(userIdToFetch !== null && !isNaN(Number(userIdToFetch))) ? ` for user ${userIdToFetch}` : ' for current user'} from server...`, 'info');
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Error: Authentication token is missing. Please log in again.', 'error');
      console.error('Error: Authentication token is missing.');
      // Не вызываем handleLogout/navigate здесь, чтобы избежать циклов,
      // так как это уже обрабатывается в useEffect инициализации токена.
      return;
    }
    setIsFetchingPolygons(true);
    try {
        const response = await fetch(fetchUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await parseResponseBody(response);
        if (!response.ok) {
            let errorMessage = response.statusText;
            if (typeof data === 'object' && data !== null && data.message) {
              errorMessage = data.message;
            } else if (typeof data === 'string' && data.length > 0) {
              errorMessage = data;
            }
            showToast(`Error loading polygons from server: ${errorMessage}`, 'error');
            // Если 401/403, это может быть из-за истекшего токена или проблем с правами.
            // Перенаправляем на логин.
            if (response.status === 401 || response.status === 403) {
              if (handleLogout) {
                handleLogout();
              } else {
                navigate('/login');
              }
            }
            throw new Error(`Error loading polygons from server: ${response.status} - ${errorMessage}`);
        }
        if (data && Array.isArray(data)) {
          const loadedPolygons = data.map(item => {
            let coordinates = [];
            let name = item.name || `Loaded polygon ${item.id || String(Date.now())}`;
            let crop = item.crop || null;
            let comment = item.comment || null;
            let color = item.color || '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
            
            // Получаем userId напрямую из item
            const ownerId = item.userId || null; 
            // ownerRole не передается напрямую, поэтому оставим логику для определения
            const ownerRole = item.user?.role || (ownerId ? (userRole === 'ADMIN' && ownerId === currentAuthenticatedUser?.id ? 'ADMIN' : 'USER') : 'UNKNOWN'); 

            try {
              const geoJsonObj = JSON.parse(item.geoJson);
              if (geoJsonObj && geoJsonObj.type === "Polygon" && geoJsonObj.coordinates && geoJsonObj.coordinates[0]) {
                  coordinates = ensurePolygonClosed(geoJsonObj.coordinates[0].map(coord => [coord[1], coord[0]]));
              }
              else {
                  console.warn('Invalid GeoJSON Geometry structure for item (expected Polygon directly):', item);
              }
            } catch (e) {
              console.error('Failed to parse geoJson for item:', item, e);
              coordinates = [];
            }
            return {
              id: String(item.id),
              coordinates: coordinates,
              color: color,
              crop: crop,
              name: name,
              comment: comment,
              ownerRole: ownerRole, // Сохраняем роль владельца
              ownerId: ownerId // Сохраняем ID владельца
            };
          }).filter(p => p.coordinates.length >= 3);
          setPolygons(loadedPolygons);
          showToast(`Loaded ${loadedPolygons.length} polygons from server.`, 'success');
          setIsDrawing(false);
          setIsEditingMode(false);
          setEditingMapPolygon(null);
          editableFGRef.current?.clearLayers();
          // setSelectedPolygon(null); // Убрано, чтобы не сбрасывать выбранный полигон при обновлении списка

          // ✨ НОВОЕ: Обновляем currentAuthenticatedUser.id, если он еще не установлен ИЛИ если ID был email, а теперь мы получили числовой ID от бэкенда
          if (currentAuthenticatedUser && (currentAuthenticatedUser.id === null || isNaN(Number(currentAuthenticatedUser.id))) && loadedPolygons.length > 0) {
            const firstPolygonOwnerId = loadedPolygons[0].ownerId;
            if (firstPolygonOwnerId !== null && !isNaN(Number(firstPolygonOwnerId))) {
              console.log(`PolygonDrawMap: Обновляем currentAuthenticatedUser ID из первого полигона: ${firstPolygonOwnerId}`);
              setCurrentAuthenticatedUser(prev => ({ ...prev, id: Number(firstPolygonOwnerId) }));
            }
          }

        } else {
          showToast('Server returned invalid data format for polygons.', 'error');
          console.error('Server returned invalid data format:', data);
        }
    } catch (error) {
        showToast(`Failed to load my polygons from server: ${error.message}`, 'error');
        console.error('Error loading my polygons from server:', error);
    } finally {
      setIsFetchingPolygons(false);
    }
  }, [showToast, handleLogout, navigate, userRole, currentAuthenticatedUser]); // Добавлены userRole, currentAuthenticatedUser в зависимости

  // savePolygonToDatabase теперь принимает опциональный targetUserId
  const savePolygonToDatabase = useCallback(async (polygonData, isUpdate = false, targetUserId = null) => {
    const { id, name, coordinates, crop, comment, color } = polygonData;
    if (!name || name.trim() === '') {
      showToast('Ошибка сохранения: название полигона не может быть пустым.', 'error');
      console.error('Ошибка сохранения: название полигона не может быть пустым.');
      return;
    }
    // Убедитесь, что координаты в формате [lng, lat] для GeoJSON
    let geoJsonCoords = ensurePolygonClosed(coordinates).map(coord => [coord[1], coord[0]]);
    const geoJsonGeometry = {
        type: "Polygon",
        coordinates: [geoJsonCoords]
    };
    const geoJsonString = JSON.stringify(geoJsonGeometry);
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Ошибка: Токен аутентификации отсутствует. Пожалуйста, войдите в систему.', 'error');
      if (handleLogout) handleLogout();
      else navigate('/login');
      return;
    }
    setIsSavingPolygon(true);
    try {
      const method = isUpdate ? 'PUT' : 'POST';
      // Передаем targetUserId как параметр запроса для создания нового полигона
      const url = isUpdate ? `${BASE_API_URL}/api/polygons/${id}` : `${BASE_API_URL}/api/polygons/create${targetUserId ? `?targetUserId=${targetUserId}` : ''}`;
      
      // ✨ ИСПРАВЛЕНО: Преобразуем id в чистый UUID формат для отправки на бэкенд
      const polygonIdToSend = id.startsWith('temp-') ? id.substring(5) : id; // Удаляем "temp-" префикс, если он есть
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: polygonIdToSend, // Передаем очищенный id для нового полигона
          geoJson: geoJsonString,
          name: name,
          crop: crop || null,
          comment: comment || null,
          color: color || '#0000FF'
        }),
      });
      const responseBody = await parseResponseBody(response);
      if (!response.ok) {
        let errorMessage = response.statusText;
        if (typeof responseBody === 'object' && responseBody !== null && responseBody.message) {
          errorMessage = responseBody.message;
        } else if (typeof responseBody === 'string' && responseBody.length > 0) {
          errorMessage = responseBody; 
        }
        throw new Error(`Ошибка ${isUpdate ? 'обновления' : 'сохранения'} полигона на сервере: ${errorMessage}`);
      }
      
      showToast(`Полигон "${name}" успешно ${isUpdate ? 'обновлен' : 'сохранен'} на сервере!`, 'success');

      if (!isUpdate) {
        // После успешного создания, снова получаем полигоны, чтобы отразить нового владельца
        showMyPolygons(targetUserId || null); // Получаем данные в зависимости от текущего вида
      } else {
        // При обновлении, refetch также необходим, чтобы убедиться, что selectedPolygon обновлен
        showMyPolygons(selectedUserForAdminView ? selectedUserForAdminView.id : null);
        setSelectedPolygon(null); // Сброс выбранного полигона после сохранения изменений
        setIsEditingMode(false);
      }

    } catch (error) {
      showToast(`Не удалось ${isUpdate ? 'обновить' : 'сохранить'} полигон на сервере: ${error.message}`, 'error');
      console.error(`Ошибка при ${isUpdate ? 'обновлении' : 'сохранении'} полигона на сервере:`, error);
    } finally {
      setIsSavingPolygon(false);
    }
  }, [showToast, handleLogout, navigate, setSelectedPolygon, setIsEditingMode, showMyPolygons, selectedUserForAdminView]); // Добавлены selectedUserForAdminView в зависимости

  const startDrawing = () => {
    setIsDrawing(true);
    setSelectedPolygon(null);
    setIsEditingMode(false);
    setEditingMapPolygon(null);
    editableFGRef.current?.clearLayers();
    setDrawnPointsCount(0);
    showToast(
      '📍 Режим рисования активен. На карте выберите свое поле и поставьте первую точку.',
      'info'
    );
  };

  const handlePointAdded = useCallback(() => {
    setDrawnPointsCount(prevCount => {
      const newCount = prevCount + 1;
      return newCount;
    });
  }, []);
  
  // Добавьте этот хук useEffect
  useEffect(() => {
    if (currentAuthenticatedUser) {
      // Это получит полигоны либо для текущего пользователя (если selectedUserForAdminView равен null),
      // либо для выбранного пользователя, если ADMIN/SUPER_ADMIN выбрал кого-то.
      showMyPolygons(selectedUserForAdminView ? selectedUserForAdminView.id : null);
    }
  }, [currentAuthenticatedUser, showMyPolygons, selectedUserForAdminView]);

  useEffect(() => {
    if (isDrawing) {
      if (drawnPointsCount === 1) {
        showToast('Отлично! Теперь добавьте еще точки. Для создания полигона необходимо минимум 3 точки.', 'info');
      } else if (drawnPointsCount >= 3) {
        showToast('Вы нарисовали достаточно точек. Двойной клик на карте завершит рисование полигона.', 'info');
      }
    }
  }, [drawnPointsCount, isDrawing, showToast]);

  const stopDrawing = () => {
    if (window.clearCurrentPath) {
      window.clearCurrentPath();
    }
    showToast('Режим рисования остановлен.', 'info');
  };

  const onPolygonComplete = useCallback((coordinates) => {
    const closedCoordinates = ensurePolygonClosed(coordinates);
    // ✨ ИСПРАВЛЕНО: Генерируем чистый UUID на фронтенде
    const newPolygonId = crypto.randomUUID(); 
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    const newPolygon = {
      id: newPolygonId, // Используем чистый UUID
      coordinates: closedCoordinates,
      color: randomColor,
      crop: null,
      name: `Новый полигон ${new Date().toLocaleString()}`,
      comment: null
    };
    setPolygons((prev) => [...prev, newPolygon]);
    setIsDrawing(false);
    setDrawnPointsCount(0);
    setSelectedPolygon(newPolygon);
    showToast('Полигон нарисован и сохранен локально! Отправка на сервер...', 'info');
    
    // Передаем targetUserId, если ADMIN выбрал USERа для имперсонации
    let targetIdForNewPolygon = null;
    if (userRole === 'ADMIN' && selectedUserForAdminView && selectedUserForAdminView.role === 'USER') {
        targetIdForNewPolygon = selectedUserForAdminView.id;
    } else if (userRole === 'SUPER_ADMIN' && selectedUserForAdminView) {
        // SUPER_ADMIN может создавать для любого выбранного пользователя
        targetIdForNewPolygon = selectedUserForAdminView.id;
    }
    // Если конкретный пользователь не выбран (или текущий пользователь не ADMIN/SUPER_ADMIN),
    // targetIdForNewPolygon остается null, и полигон принадлежит текущему аутентифицированному пользователю.
    savePolygonToDatabase(newPolygon, false, targetIdForNewPolygon); 
  }, [savePolygonToDatabase, showToast, userRole, selectedUserForAdminView]); // Добавлены userRole, selectedUserForAdminView в зависимости

  const updatePolygonColor = useCallback((polygonId, newColor) => {
    setPolygons((prev) => {
      const updatedPolys = prev.map((p) =>
        p.id === polygonId ? { ...p, color: newColor } : p
      );
      if (selectedPolygon && selectedPolygon.id === polygonId) {
        setSelectedPolygon(updatedPolys.find(p => p.id === polygonId));
      }
      return updatedPolys;
    });
  }, [selectedPolygon]);

  const deletePolygon = useCallback(async (id) => {
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Ошибка: Токен аутентификации отсутствует. Пожалуйста, войдите в систему.', 'error');
      console.error('Ошибка: Токен аутентификации отсутствует.');
      if (handleLogout) {
        handleLogout();
      } else {
        navigate('/login');
      }
      return;
    }
    setPolygons((prev) => prev.filter((p) => p.id !== id));
    setSelectedPolygon(null);
    if (editingMapPolygon && editingMapPolygon.id === id) {
      setIsEditingMode(false);
      setEditingMapPolygon(null);
    }
    showToast('Полигон удален локально. Отправка запроса на сервер...', 'info');
    try {
      const response = await fetch(`${BASE_API_URL}/api/polygons/delete/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const responseBody = await parseResponseBody(response);
      if (!response.ok) {
        let errorMessage = response.statusText;
        if (typeof responseBody === 'object' && responseBody !== null && responseBody.message) {
          errorMessage = responseBody.message;
        } else if (typeof responseBody === 'string' && responseBody.length > 0) {
          errorMessage = responseBody;
        }
        showToast(`Ошибка удаления полигона с сервера: ${errorMessage}`, 'error');
        if (response.status === 401 || response.status === 403) {
          if (handleLogout) {
            handleLogout();
          } else {
            navigate('/login');
          }
        }
        throw new Error(`Ошибка удаления полигона с сервера: ${response.status} - ${errorMessage}`);
      }
      showToast('Полигон успешно удален с сервера!', 'success');
      // После удаления, снова получаем полигоны, чтобы убедиться, что список актуален
      showMyPolygons(selectedUserForAdminView ? selectedUserForAdminView.id : null);
    } catch (error) {
      showToast(`Не удалось удалить полигон с сервера: ${error.message}`, 'error');
      console.error('Ошибка при удалении полигона из БД:', error);
    }
  }, [editingMapPolygon, showToast, handleLogout, navigate, showMyPolygons, selectedUserForAdminView]); // Добавлены showMyPolygons, selectedUserForAdminView в зависимости

  const confirmClearAll = useCallback(() => {
    setShowClearAllConfirm(true);
  }, []);

  const cancelClearAll = useCallback(() => {
    setShowClearAllConfirm(false);
    showToast('Очистка всех полигонов отменена.', 'info');
  }, [showToast]);

  const handleClearAllConfirmed = useCallback(async () => {
    setShowClearAllConfirm(false);
    showToast('Начинаю очистку всех полигонов...', 'info');
    setPolygons([]);
    localStorage.removeItem('savedPolygons');
    setSelectedPolygon(null);
    setIsDrawing(false);
    setIsEditingMode(false);
    setEditingMapPolygon(null);
    editableFGRef.current?.clearLayers();
    showToast('Все полигоны удалены локально. Отправка запроса на сервер...', 'info');
    const token = localStorage.getItem('token'); 
    if (!token) {
      showToast('Ошибка: Токен аутентификации отсутствует. Пожалуйста, войдите в систему.', 'error');
      console.error('Ошибка: Токен аутентификации отсутствует.');
      if (handleLogout) {
        handleLogout();
      } else {
        navigate('/login');
      }
      return;
    }
    setIsSavingPolygon(true);
    try {
        const response = await fetch(`${BASE_API_URL}/api/polygons/clear-all`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const responseBody = await parseResponseBody(response);
        if (!response.ok) {
            let errorMessage = response.statusText;
            if (typeof responseBody === 'object' && responseBody !== null && responseBody.message) {
              errorMessage = responseBody.message;
            } else if (typeof responseBody === 'string' && responseBody.length > 0) {
              errorMessage = responseBody;
            }
            showToast(`Ошибка очистки всех полигонов с сервера: ${errorMessage}`, 'error');
            if (response.status === 401 || response.status === 403) {
              if (handleLogout) {
                handleLogout();
              } else {
                navigate('/login');
              }
            }
            throw new Error(`Ошибка очистки всех полигонов с сервера: ${response.status} - ${errorMessage}`);
        }
        showToast('Все полигоны успешно удалены с сервера!', 'success');
        // После очистки, снова получаем полигоны, чтобы убедиться, что список актуален
        showMyPolygons(selectedUserForAdminView ? selectedUserForAdminView.id : null);
    } catch (error) {
        showToast(`Не удалось очистить все полигоны с сервера: ${error.message}`, 'error');
        console.error('Ошибка при очистке всех полигонов из БД:', error);
    } finally {
      setIsSavingPolygon(false);
    }
  }, [showToast, handleLogout, navigate, showMyPolygons, selectedUserForAdminView]); // Добавлены showMyPolygons, selectedUserForAdminView в зависимости

  const clearAll = useCallback(() => {
    if (polygons.length === 0) {
      showToast('На карте нет полигонов для удаления.', 'info');
      return;
    }
    confirmClearAll();
  }, [polygons.length, confirmClearAll, showToast]);

  const clearAllCrops = useCallback(() => {
    setPolygons((prev) => prev.map((p) => ({ ...p, crop: null, comment: null, color: '#0000FF' })));
    if (selectedPolygon) {
      setSelectedPolygon(prev => ({ ...prev, crop: null, comment: null, color: '#0000FF' }));
    }
    showToast('Все культуры, комментарии и цвета полигонов сброшены. Синхронизируйте с сервером вручную, если необходимо.', 'info');
  }, [showToast, selectedPolygon]);

  const updatePolygonCrop = useCallback((polygonId, newCrop) => {
    setPolygons((prev) => {
      const updatedPolys = prev.map((p) => (p.id === polygonId ? { ...p, crop: newCrop } : p));
      if (selectedPolygon && selectedPolygon.id === polygonId) {
        setSelectedPolygon(updatedPolys.find(p => p.id === polygonId));
      }
      return updatedPolys;
    });
  }, [selectedPolygon]);

  const updatePolygonName = useCallback((polygonId, newName) => {
    setPolygons((prev) => {
      const updatedPolys = prev.map((p) =>
        p.id === polygonId ? { ...p, name: newName } : p
      );
      if (selectedPolygon && selectedPolygon.id === polygonId) {
        setSelectedPolygon(updatedPolys.find(p => p.id === polygonId));
      }
      return updatedPolys;
    });
  }, [selectedPolygon]);

  const updatePolygonComment = useCallback((polygonId, newComment) => {
    setPolygons((prev) => {
      const updatedPolys = prev.map((p) =>
        p.id === polygonId ? { ...p, comment: newComment } : p
      );
      if (selectedPolygon && selectedPolygon.id === polygonId) {
        setSelectedPolygon(updatedPolys.find(p => p.id === polygonId));
      }
      return updatedPolys;
    });
  }, [selectedPolygon]);

  const onSelectAnalysisForPolygon = useCallback((polygonData, analysisType) => {
    if (selectedPolygon && selectedPolygon.id === polygonData.id && activeAnalysisType === analysisType) {
      setActiveAnalysisType('none'); // Выключаем слой, если он уже активен для того же полигона
      showToast(`Слой "${analysisType}" для полигона выключен.`, 'info');
    } else {
      setSelectedPolygon(polygonData); // Устанавливаем выбранный полигон
      setActiveAnalysisType(analysisType); // Устанавливаем тип анализа

      // Устанавливаем диапазон дат как объекты Date
      const today = new Date();
      const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, today.getDate());
      setAnalysisDateRange([twoMonthsAgo, today]); // Передаем объекты Date
      showToast(`Загрузка слоя "${analysisType}" для полигона...`, 'info');
    }
  }, [selectedPolygon, activeAnalysisType, showToast]);

  const handleAnalysisLoadingChange = useCallback((isLoading) => {
    setIsAnalysisLoading(isLoading);
  }, []);

  const handleAnalysisError = useCallback((errorMessage) => {
    showToast(errorMessage, 'error');
    setActiveAnalysisType('none');
  }, [showToast]);


  const handleEditPolygon = useCallback((polygonId) => {
    setIsSavingPolygon(false);
    setIsFetchingPolygons(false);
    if (isDrawing) {
      setIsDrawing(false);
      if (window.clearCurrentPath) window.clearCurrentPath();
    }
    const polygonToEdit = polygons.find((p) => p.id === polygonId);
    if (!polygonToEdit) {
      console.error('Polygon for editing not found in state.');
      showToast('Полигон для редактирования не найден.', 'error');
      return;
    }
    setIsEditingMode(true);
    setEditingMapPolygon(polygonToEdit);
    setSelectedPolygon(polygonToEdit);
    showToast(
      `📍 Режим редактирования активен. Перемещайте вершины полигона, чтобы изменить его форму. Нажмите "Остановить и сохранить" в боковой панели, чтобы применить изменения.`,
      'info'
    );
  }, [polygons, isDrawing, showToast]);

  const handleStopAndSaveEdit = useCallback(() => { 
    if (isDrawing) { 
      if (window.clearCurrentPath) window.clearCurrentPath(); 
      stopDrawing(); 
      showToast('Рисование остановлено.', 'info'); 
    } 
    else if (isEditingMode) { 
      let updatedCoordinates = null;
      let leafletLayerToDisableEditing = null;

      if (editableFGRef.current) {
          editableFGRef.current.eachLayer(layer => {
              if (layer instanceof L.Polygon) {
                  updatedCoordinates = layer.toGeoJSON().geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
                  leafletLayerToDisableEditing = layer;
              }
          });
      }
      if (!updatedCoordinates || updatedCoordinates.length === 0) {
          console.log("handleStopAndSaveEdit: Не удалось получить обновленные координаты из Leaflet слоя. Использую editingMapPolygon.coordinates.");
          updatedCoordinates = editingMapPolygon ? editingMapPolygon.coordinates : null;
      }

      if (!updatedCoordinates || updatedCoordinates.length === 0) {
          console.error("handleStopAndSaveEdit: Критическая ошибка: Не удалось получить обновленные координаты для сохранения.");
          showToast('Ошибка: Не удалось получить координаты полигона для сохранения.', 'error');
          return;
      }

      const currentPolygonInState = polygons.find(p => p.id === editingMapPolygon?.id);
      
      if (currentPolygonInState) { 
          const updatedPoly = { 
              ...currentPolygonInState, 
              coordinates: updatedCoordinates, 
          }; 
          
          setPolygons(prev => prev.map(p => p.id === updatedPoly.id ? updatedPoly : p)); 
          if (selectedPolygon && selectedPolygon.id === updatedPoly.id) { 
            setSelectedPolygon(updatedPoly); 
          } 
          
          if (leafletLayerToDisableEditing && leafletLayerToDisableEditing.editing && leafletLayerToDisableEditing.editing.enabled()) {
              leafletLayerToDisableEditing.editing.disable();
              console.log('handleStopAndSaveEdit: Редактирование Leaflet слоя отключено.');
          }

          showToast('Форма полигона обновлена и сохранена локально! Отправка на сервер...', 'info'); 
          savePolygonToDatabase(updatedPoly, true); 
      } else {
          console.error("handleStopAndSaveEdit: Полигон для обновления не найден в состоянии polygons.");
          showToast('Ошибка: Редактируемый полигон не найден.', 'error');
      }
      
      console.log('handleStopAndSaveEdit: Принудительный сброс состояния режима редактирования.'); 
      setIsEditingMode(false); 
      setEditingMapPolygon(null); 
      editableFGRef.current?.clearLayers();
      showToast('Редактирование завершено и сохранено.', 'success'); 
    } else { 
      showToast('Нет активных режимов для сохранения.', 'info'); 
    } 
  }, [isDrawing, stopDrawing, isEditingMode, editingMapPolygon, polygons, savePolygonToDatabase, showToast, selectedPolygon]);

  const onPolygonEdited = useCallback(async (e) => {
    console.log("onPolygonEdited: Событие редактирования полигона на карте.");
    let editedLayers = e.layers;
    editedLayers.eachLayer((layer) => {
        if (layer instanceof L.Polygon) {
            const newCoordinates = layer.toGeoJSON().geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
            console.log("onPolygonEdited: Новые координаты после редактирования:", newCoordinates);

            setPolygons(prevPolygons => {
                return prevPolygons.map(p => {
                    if (editingMapPolygon && p.id === editingMapPolygon.id) {
                        return { ...p, coordinates: newCoordinates };
                    }
                    return p;
                });
            });
            setEditingMapPolygon(prev => prev ? { ...prev, coordinates: newCoordinates } : null);
        }
    });
    showToast('Форма полигона изменена. Нажмите "Сохранить" для сохранения изменений.', 'info');
  }, [editingMapPolygon, setPolygons, setEditingMapPolygon, showToast]);

  const fetchAllUsers = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn("Токен отсутствует, не могу загрузить всех пользователей.");
      return;
    }
    try {
      const response = await fetch(`${BASE_API_URL}/api/v1/admin/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.status === 403) {
        console.warn("Доступ запрещен для загрузки всех пользователей. Возможно, вы не админ.");
        setAllUsers([]);
        return;
      }
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка при получении списка пользователей: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      
      // Логика фильтрации пользователей для ADMIN
      if (userRole === 'ADMIN') {
        const filteredUsers = data.filter(user => user.role === 'USER');
        setAllUsers(filteredUsers);
      } else { // Для SUPER_ADMIN и других ролей (хотя другие не должны сюда попадать)
        setAllUsers(data);
      }
    } catch (error) {
      console.error("Ошибка при загрузке всех пользователей:", error);
      setAllUsers([]);
    }
  }, [BASE_API_URL, userRole]); // Добавлен userRole в зависимости

  const handleUpdateSelectedUserEmail = useCallback(async (userId, newEmail) => {
    showToast(`Attempting to update user ${userId} email to ${newEmail}...`, 'info');
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Error: Authentication token is missing. Please log in again.', 'error');
      if (handleLogout) handleLogout();
      else navigate('/login');
      return;
    }
    try {
      const response = await fetch(`${BASE_API_URL}/api/v1/admin/users/${userId}/email`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        // Отправляем newEmail как простую строку без JSON.stringify
        body: newEmail, 
      });

      const responseBody = await parseResponseBody(response);
      if (!response.ok) {
        let errorMessage = response.statusText;
        if (typeof responseBody === 'object' && responseBody !== null && responseBody.message) {
          errorMessage = responseBody.message;
        } else if (typeof responseBody === 'string' && responseBody.length > 0) {
          errorMessage = responseBody;
        }
        throw new Error(`Error updating email: ${response.status} - ${errorMessage}`);
      }
      showToast(`User ${userId} email successfully updated to ${newEmail}!`, 'success');
      // Обновляем email в selectedUserForAdminView и состоянии allUsers
      setAllUsers(prevUsers => prevUsers.map(user => 
        user.id === userId ? { ...user, email: newEmail } : user
      ));
      if (selectedUserForAdminView && selectedUserForAdminView.id === userId) {
        setSelectedUserForAdminView(prev => ({ ...prev, email: newEmail }));
      }

    } catch (error) {
      showToast(`Failed to update user email: ${error.message}`, 'error');
      console.error('Error updating user email:', error);
    }
  }, [showToast, handleLogout, navigate, selectedUserForAdminView]);


  // useEffect для инициализации роли пользователя и данных
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
        // Если токена нет, сразу перенаправляем на логин
        if (handleLogout) {
            handleLogout();
        } else {
            navigate('/login');
        }
        return;
    }

    try {
        const decodedToken = jwtDecode(token);
        console.log("Decoded Token:", decodedToken); // Логирование декодированного токена
        const roles = decodedToken.roles || []; 
        
        // ✨ ИСПРАВЛЕНО: Устанавливаем ID пользователя непосредственно из токена
        // Пытаемся получить числовой ID.
        let userIdFromToken = null;
        // Проверяем decodedToken.id и decodedToken.userId на наличие и числовое значение
        if (decodedToken.id !== undefined && decodedToken.id !== null && !isNaN(Number(decodedToken.id))) {
            userIdFromToken = Number(decodedToken.id);
        } else if (decodedToken.userId !== undefined && decodedToken.userId !== null && !isNaN(Number(decodedToken.userId))) {
            userIdFromToken = Number(decodedToken.userId);
        } else {
            // Если числового ID нет, это указывает на проблему с JWT или бэкендом.
            // В этом случае, мы не можем использовать email для API, который ожидает число.
            // Устанавливаем ID в null, чтобы showMyPolygons вызывал /api/polygons/user (без ID в URL)
            console.warn("JWT does not contain a numerical 'id' or 'userId' claim. Cannot use 'sub' (email) as numerical ID for API requests. Setting currentAuthenticatedUser.id to null.");
            showToast('Warning: User ID is not numerical. Polygon loading/editing might be limited.', 'warning');
        }

        setCurrentAuthenticatedUser({ id: userIdFromToken, email: decodedToken.sub, role: roles[0] }); 

        // Устанавливаем роль пользователя ОДИН РАЗ
        if (roles.includes('ROLE_SUPER_ADMIN')) {
            setUserRole('SUPER_ADMIN');
        } else if (roles.includes('ROLE_ADMIN')) {
            setUserRole('ADMIN');
        } else {
            setUserRole('USER');
        }
        // Загружаем всех пользователей только если ADMIN или SUPER_ADMIN
        if (roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN')) {
          fetchAllUsers();
        }
    } catch (error) {
        console.error("Error decoding token or determining role:", error);
        setUserRole('GUEST');
        showToast('Error determining user role. Please log in again.', 'error');
        if (handleLogout) {
            handleLogout();
        } else {
            navigate('/login');
        }
    }
  }, [handleLogout, navigate, showToast, fetchAllUsers]); // Зависимости: стабильные функции и пропсы, которые не меняются при каждом рендере


  // useEffect для загрузки полигонов, зависит от userRole, currentAuthenticatedUser, selectedUserForAdminView
  useEffect(() => {
    // Этот эффект должен запускаться только после того, как userRole и currentAuthenticatedUser будут установлены
    // (currentAuthenticatedUser.id может быть null для USER, если ID не в токене)
    if (!userRole || !currentAuthenticatedUser) {
        console.log("PolygonDrawMap: Отложенная загрузка полигонов: userRole или currentAuthenticatedUser еще не установлены.");
        return;
    }

    let loadedFromLocalStorage = false;
    try {
      const storedPolygons = localStorage.getItem('savedPolygons');
      if (storedPolygons !== null && storedPolygons !== '[]') {
        const parsedPolygons = JSON.parse(storedPolygons);
        if (Array.isArray(parsedPolygons) && parsedPolygons.every(p => p && p.coordinates && Array.isArray(p.coordinates) && p.coordinates.length >= 3 && 'comment' in p && 'color' in p)) {
          const closedPolygons = parsedPolygons.map(p => ({
            ...p,
            coordinates: ensurePolygonClosed(p.coordinates)
          }));
          setPolygons(closedPolygons);
          showToast('Polygons loaded from local storage.', 'success');
          loadedFromLocalStorage = true;
        } else {
          console.warn('Invalid polygons data format in localStorage. Clearing and attempting to load from server.', parsedPolygons);
          localStorage.removeItem('savedPolygons');
        }
      }
    } catch (error) {
      console.error("Critical error parsing polygons from localStorage. Clearing and attempting to load from server:", error);
      showToast('Critical error loading polygons from local storage, attempting to load from server.', 'error');
      localStorage.removeItem('savedPolygons');
    }

    // Загружаем полигоны только если userRole и currentAuthenticatedUser уже установлены
    if (!loadedFromLocalStorage) {
      if (userRole === 'USER') { 
        // Для USER всегда вызываем API без ID в URL. Бэкенд определит пользователя по токену.
        showMyPolygons(null); 
      } else if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
        // Для ADMIN/SUPER_ADMIN: если выбран пользователь, используем его ID; иначе - свой.
        // Убедимся, что ID числовой, если он есть.
        const idToFetch = selectedUserForAdminView 
          ? Number(selectedUserForAdminView.id) 
          : (currentAuthenticatedUser.id !== null && !isNaN(Number(currentAuthenticatedUser.id)) ? Number(currentAuthenticatedUser.id) : null);
        showMyPolygons(idToFetch);
      }
    }
  }, [userRole, currentAuthenticatedUser, selectedUserForAdminView, showMyPolygons, showToast]); // Зависимости для загрузки полигонов


  // useEffect для обновления currentAuthenticatedUser.id из allUsers
  // Этот useEffect теперь будет работать только для ADMIN/SUPER_ADMIN,
  // так как для USER ID уже должен быть установлен из токена.
  useEffect(() => {
    if (currentAuthenticatedUser && currentAuthenticatedUser.email && allUsers.length > 0) {
      // Ищем ID текущего пользователя в списке всех пользователей
      const foundUser = allUsers.find(user => user.email === currentAuthenticatedUser.email);
      // Обновляем ID, только если он изменился и найденный ID является числом
      if (foundUser && foundUser.id !== currentAuthenticatedUser.id && !isNaN(Number(foundUser.id))) {
        console.log(`PolygonDrawMap: Обновляем currentAuthenticatedUser ID с: ${currentAuthenticatedUser.id} на: ${Number(foundUser.id)}`);
        setCurrentAuthenticatedUser(prev => ({ ...prev, id: Number(foundUser.id) }));
      }
    }
  }, [allUsers, currentAuthenticatedUser]); // Зависим от allUsers и объекта currentAuthenticatedUser


  // useEffect: Обновление selectedPolygon, когда обновляется список polygons
  useEffect(() => {
    // Если есть выбранный полигон и список полигонов был обновлен
    if (selectedPolygon && polygons.length > 0) {
      // Ищем обновленную версию выбранного полигона в новом списке
      const updatedSelected = polygons.find(p => p.id === selectedPolygon.id);

      // Если нашли обновленный полигон и его ownerId отличается (или другие критичные поля)
      // или если ownerId был null и теперь не null
      if (updatedSelected && (updatedSelected.ownerId !== selectedPolygon.ownerId || selectedPolygon.ownerId === null)) {
        console.log("PolygonDrawMap: Обновляем selectedPolygon.ownerId с:", selectedPolygon.ownerId, "на:", updatedSelected.ownerId);
        setSelectedPolygon(updatedSelected);
      }
    }
  }, [polygons, selectedPolygon, setSelectedPolygon]); // Зависим от polygons и selectedPolygon

  // useEffect для логирования массива polygons после его обновления
  useEffect(() => {
    console.log("PolygonDrawMap: Состояние polygons обновлено:", polygons);
    polygons.forEach(p => {
      console.log(`  Polygon ID: ${p.id}, Owner ID: ${p.ownerId}, Owner Role: ${p.ownerRole}`);
    });
  }, [polygons]);


  const handleUserSelectForAdminView = useCallback((event) => {
    const userId = event.target.value;
    const user = allUsers.find(u => String(u.id) === userId); 
    setSelectedUserForAdminView(user || null);

    // Если пользователь выбран, загружаем его полигоны.
    // Если "Все пользователи" (value=""), загружаем полигоны текущего администратора/супер-администратора.
    if (user) {
        showToast(`Просмотр полигонов для пользователя: ${user.email}`, 'info');
        // Убедимся, что ID пользователя является числом перед передачей
        showMyPolygons(Number(user.id));
    } else {
        // Убедимся, что currentAuthenticatedUser.id доступен и является числом, прежде чем вызывать showMyPolygons
        if (currentAuthenticatedUser?.id !== null && !isNaN(Number(currentAuthenticatedUser.id))) {
            showToast('Просмотр полигонов текущего администратора.', 'info');
            showMyPolygons(Number(currentAuthenticatedUser.id));
        } else {
            console.warn("handleUserSelectForAdminView: ID текущего аутентифицированного пользователя недоступен или не числовой для загрузки полигонов администратора.");
            showToast('Ошибка: Не удалось определить ID текущего администратора для загрузки полигонов.', 'error');
        }
    }
  }, [allUsers, showMyPolygons, showToast, currentAuthenticatedUser]);


  const finalSelectedPolygonData = selectedPolygon;

  const userBlockCalculatedBottom = `${layerBlockInitialBottom + layerBlockHeight + 30}px`;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', position: 'relative' }}>
      <MapComponent
        polygons={polygons}
        onPolygonComplete={onPolygonComplete}
        onPolygonEdited={onPolygonEdited}
        isDrawing={isDrawing}
        setIsDrawing={setIsDrawing}
        editableFGRef={editableFGRef}
        selectedPolygon={selectedPolygon}
        setSelectedPolygon={setSelectedPolygon}
        isEditingMode={isEditingMode}
        editingMapPolygon={editingMapPolygon}
        analysisDateRange={analysisDateRange}
        onLoadingChange={handleAnalysisLoadingChange}
        onError={handleAnalysisError}
        onPointAdded={() => { /* Placeholder for future use */ }}
        activeBaseMapType={activeBaseMapType}
        activeAnalysisType={activeAnalysisType}
        onMapReady={setMapInstance}
      />

      <MapSidebar
        polygons={polygons}
        selectedPolygon={selectedPolygon}
        setSelectedPolygon={setSelectedPolygon}
        deletePolygon={deletePolygon}
        handleEditPolygon={handleEditPolygon}
        clearAllCrops={clearAllCrops}
        calculateArea={calculateArea}
        formatArea={formatArea}
        updatePolygonCrop={updatePolygonCrop}
        startDrawing={startDrawing}
        stopDrawing={stopDrawing}
        handleStopAndSaveEdit={handleStopAndSaveEdit}
        isDrawing={isDrawing}
        isEditingMode={isEditingMode}
        clearAll={clearAll}
        handleLogout={handleLogout}
        showMyPolygons={showMyPolygons}
        updatePolygonName={updatePolygonName}
        updatePolygonComment={updatePolygonComment}
        updatePolygonColor={updatePolygonColor}
        isSavingPolygon={isSavingPolygon}
        isFetchingPolygons={isFetchingPolygons}
        showCropsSection={true}        
        savePolygonToDatabase={savePolygonToDatabase}
        BASE_API_URL={BASE_API_URL}
        userRole={userRole}
        allUsers={allUsers}
        selectedUserForAdminView={selectedUserForAdminView}
        handleUserSelectForAdminView={handleUserSelectForAdminView}
        onUpdateSelectedUserEmail={handleUpdateSelectedUserEmail}
        showToast={showToast}
        currentAuthenticatedUser={currentAuthenticatedUser}
      />

      <ToastNotification
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
      />

      {showClearAllConfirm && (
        <ConfirmDialog
          message="Вы уверены, что хотите удалить ВСЕ полигоны? Это действие необратимо."
          onConfirm={handleClearAllConfirmed}
          onCancel={cancelClearAll}
          isProcessing={isSavingPolygon}
        />
      )}

      {/* PolygonAnalysisLayer теперь будет получать все необходимые пропсы, включая map */}
      {finalSelectedPolygonData && activeAnalysisType && activeAnalysisType !== 'none' && mapInstance && ( 
        <PolygonAnalysisLayer
          map={mapInstance}
          selectedPolygonData={finalSelectedPolygonData}
          activeAnalysisType={activeAnalysisType}
          analysisDateRange={analysisDateRange}
          onLoadingChange={handleAnalysisLoadingChange}
          onError={handleAnalysisError}
        />
      )}

      {isAnalysisLoading && (
        <div style={{
          position: 'absolute', bottom: '35px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.7)', color: 'white', padding: '10px 20px',
          borderRadius: '8px', zIndex: 1000, fontSize: '14px', textAlign: 'center',
        }}>
          Загрузка аналитического слоя...
        </div>
      )}

      {/* UserSelectionBlock теперь отображается для ADMIN и SUPER_ADMIN */}
      {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
        <UserSelectionBlock
          userRole={userRole}
          allUsers={allUsers}
          selectedUserForAdminView={selectedUserForAdminView}
          handleUserSelectForAdminView={handleUserSelectForAdminView}
          calculatedBottom={userBlockCalculatedBottom}
        />
      )}

      <LayerSelectionBlock
        selectedPolygonData={finalSelectedPolygonData}
        activeBaseMapType={activeBaseMapType}
        onSelectBaseMap={setActiveBaseMapType}
        activeAnalysisType={activeAnalysisType}
        onSelectAnalysisForPolygon={onSelectAnalysisForPolygon}
        setBlockHeight={setLayerBlockHeight}
      />
    </div>
  );
}
