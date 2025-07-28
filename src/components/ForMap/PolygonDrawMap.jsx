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
// Новые импорты для метрик из папки Metrics
import NDVIMetricDisplay from './Metrics/NDVIMetricDisplay';
import MoistureIndexMetricDisplay from './Metrics/MoistureIndexMetricDisplay';
import NDSIMetricDisplay from './Metrics/NDSIMetricDisplay';
import NDWIMetricDisplay from './Metrics/NDWIMetricDisplay';
import SceneClassificationLegend from './Metrics/SceneClassificationLegend';
// Новые импорты для описаний композитов
import FalseColorVegetationDisplay from './Metrics/FalseColorVegetationDisplay';
import FalseColorUrbanDisplay from './Metrics/FalseColorUrbanDisplay';
import SWIRDisplay from './Metrics/SWIRDisplay';

import * as L from 'leaflet';
import './Map.css';
import { jwtDecode } from 'jwt-decode';

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
    console.warn("ensurePolygonClosed: Координаты слишком короткие или отсутствуют для замыкания.", coordinates);
    return coordinates;
  }
  let cleanedCoordinates = [...coordinates];
  // Удаляем дублирующиеся точки в конце, которые могут быть результатом двойного клика или ошибки
  while (cleanedCoordinates.length >= 2 &&
         cleanedCoordinates[cleanedCoordinates.length - 1][0] === cleanedCoordinates[cleanedCoordinates.length - 2][0] &&
         cleanedCoordinates[cleanedCoordinates.length - 1][1] === cleanedCoordinates[cleanedCoordinates.length - 2][1]) {
    cleanedCoordinates.pop();
  }
  
  if (cleanedCoordinates.length < 3) {
      console.warn("ensurePolygonClosed: После очистки дубликатов осталось менее 3 точек. Невозможно замкнуть.", cleanedCoordinates);
      return cleanedCoordinates; // Нельзя замкнуть полигон из менее чем 3 точек
  }

  const firstPoint = cleanedCoordinates[0];
  const lastPoint = cleanedCoordinates[cleanedCoordinates.length - 1];
  if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
    console.log("ensurePolygonClosed: Замыкаем полигон, добавляя первую точку в конец.");
    return [...cleanedCoordinates, firstPoint];
  }
  console.log("ensurePolygonClosed: Полигон уже замкнут.");
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

  // Инициализация activeBaseMapType из localStorage или по умолчанию 'openstreetmap'
  const [activeBaseMapType, setActiveBaseMapType] = useState(() => {
    const savedBaseMap = localStorage.getItem('selectedBaseMap');
    return savedBaseMap || 'openstreetmap';
  });

  const [userRole, setUserRole] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserForAdminView, setSelectedUserForAdminView] = useState(null);
  const [currentAuthenticatedUser, setCurrentAuthenticatedUser] = useState(null);

  // Состояния для хранения высоты и ширины LayerSelectionBlock
  const [layerBlockHeight, setLayerBlockHeight] = useState(0);
  const [layerBlockWidth, setLayerBlockWidth] = useState(0);
  const layerBlockInitialBottom = 35; // Начальный отступ снизу для LayerSelectionBlock

  // Состояние для отслеживания, развернут ли LayerSelectionBlock
  const [isLayerSelectionBlockExpanded, setIsLayerSelectionBlockExpanded] = useState(false);

  // НОВОЕ СОСТОЯНИЕ: для управления видимостью сайдбара на мобильных устройствах
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 

  const navigate = useNavigate();

  // State for map instance
  const [mapInstance, setMapInstance] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, visible: true });
    const timer = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const calculateArea = useCallback((coordinates) => {
    if (coordinates.length < 3) {
        console.warn("calculateArea: Недостаточно точек для расчета площади.", coordinates);
        return 0;
    }

    const R = 6378137; // Радиус Земли в метрах
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

  // Function to save polygons to localStorage for DEMO user
  const saveDemoPolygonsToLocalStorage = useCallback((currentPolygons) => {
    if (userRole === 'DEMO') {
      try {
        localStorage.setItem('demoPolygons', JSON.stringify(currentPolygons));
        console.log("PolygonDrawMap: Demo polygons saved to localStorage.");
      } catch (e) {
        console.error("Error saving demo polygons to localStorage:", e);
        showToast('Error saving demo polygons locally.', 'error');
      }
    }
  }, [userRole, showToast]);

  // Define showMyPolygons before savePolygonToDatabase
  const showMyPolygons = useCallback(async (userIdToFetch = null) => {
    // If userRole === 'DEMO', load from localStorage
    if (userRole === 'DEMO') {
      console.log("PolygonDrawMap: DEMO user detected. Loading polygons from localStorage.");
      try {
        const storedPolygons = localStorage.getItem('demoPolygons');
        if (storedPolygons) {
          const parsedPolygons = JSON.parse(storedPolygons);
          if (Array.isArray(parsedPolygons) && parsedPolygons.every(p => p && p.coordinates && Array.isArray(p.coordinates))) {
            const closedPolygons = parsedPolygons.map(p => ({
              ...p,
              coordinates: ensurePolygonClosed(p.coordinates)
            })).filter(p => p.coordinates.length >= 3); // Фильтруем некорректные полигоны
            setPolygons(closedPolygons);
            showToast(`Loaded ${closedPolygons.length} polygons from local storage for DEMO user.`, 'success');
          } else {
            console.warn('Invalid demo polygons data format in localStorage. Clearing.');
            localStorage.removeItem('demoPolygons');
            setPolygons([]);
          }
        } else {
          setPolygons([]);
          showToast('No polygons found in local storage for DEMO user.', 'info');
        }
      } catch (error) {
        console.error("Error loading demo polygons from localStorage:", error);
        showToast('Error loading demo polygons from local storage.', 'error');
        localStorage.removeItem('demoPolygons');
        setPolygons([]);
      } finally {
        setIsFetchingPolygons(false);
      }
      return; // Exit, as DEMO user does not need to access backend
    }

    // Logic for non-DEMO users (USER, ADMIN, SUPER_ADMIN)
    const fetchUrl = (userIdToFetch !== null && !isNaN(Number(userIdToFetch)))
      ? `${BASE_API_URL}/api/polygons/user/${userIdToFetch}`
      : `${BASE_API_URL}/api/polygons/user`;

    showToast(`Loading polygons${(userIdToFetch !== null && !isNaN(Number(userIdToFetch))) ? ` for user ${userIdToFetch}` : ' for current user'} from server...`, 'info');
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Error: Authentication token is missing. Please log in again.', 'error');
      console.error('Error: Authentication token is missing.');
      if (handleLogout) {
        handleLogout();
      } else {
        navigate('/login');
      }
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
            
            const ownerId = item.userId || null; 
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
              ownerRole: ownerRole, 
              ownerId: ownerId 
            };
          }).filter(p => p.coordinates.length >= 3); // Фильтруем полигоны с менее чем 3 точками
          setPolygons(loadedPolygons);
          showToast(`Loaded ${loadedPolygons.length} polygons from server.`, 'success');
          setIsDrawing(false);
          setIsEditingMode(false);
          setEditingMapPolygon(null);
          editableFGRef.current?.clearLayers();

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
  }, [showToast, handleLogout, navigate, userRole, currentAuthenticatedUser, saveDemoPolygonsToLocalStorage]);

  // savePolygonToDatabase now accepts an optional targetUserId
  const savePolygonToDatabase = useCallback(async (polygonData, isUpdate = false, targetUserId = null) => {
    const { id, name, coordinates, crop, comment, color } = polygonData;
    if (!name || name.trim() === '') {
      showToast('Error saving: polygon name cannot be empty.', 'error');
      console.error('Error saving: polygon name cannot be empty.');
      return;
    }
    if (!coordinates || coordinates.length < 3) {
      showToast('Error saving: polygon must have at least 3 coordinates.', 'error');
      console.error('Error saving: polygon must have at least 3 coordinates.');
      return;
    }

    // If DEMO user, save locally and simulate success
    if (userRole === 'DEMO') {
      setPolygons(prev => {
        const updatedPolys = isUpdate 
          ? prev.map(p => p.id === id ? { ...polygonData, ownerRole: 'DEMO', ownerId: 0 } : p)
          : [...prev, { ...polygonData, ownerRole: 'DEMO', ownerId: 0 }];
        saveDemoPolygonsToLocalStorage(updatedPolys); // Save to localStorage
        return updatedPolys;
      });
      setSelectedPolygon(polygonData); // Update selected polygon
      setIsEditingMode(false); // Disable editing mode after saving
      showToast(`Polygon "${name}" successfully ${isUpdate ? 'updated' : 'saved'} locally (demo mode)!`, 'success');
      setIsSavingPolygon(false);
      return;
    }

    // Logic for non-DEMO users (USER, ADMIN, SUPER_ADMIN)
    let geoJsonCoords = ensurePolygonClosed(coordinates).map(coord => [coord[1], coord[0]]);
    const geoJsonGeometry = {
        type: "Polygon",
        coordinates: [geoJsonCoords]
    };
    const geoJsonString = JSON.stringify(geoJsonGeometry);
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Error: Authentication token is missing. Please log in.', 'error');
      if (handleLogout) handleLogout();
      else navigate('/login');
      return;
    }
    setIsSavingPolygon(true);
    try {
      const method = isUpdate ? 'PUT' : 'POST';
      const url = isUpdate ? `${BASE_API_URL}/api/polygons/${id}` : `${BASE_API_URL}/api/polygons/create${targetUserId ? `?targetUserId=${targetUserId}` : ''}`;
      
      const polygonIdToSend = id.startsWith('temp-') ? id.substring(5) : id; 
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: polygonIdToSend, 
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
        throw new Error(`Error ${isUpdate ? 'updating' : 'saving'} polygon on server: ${errorMessage}`);
      }
      
      showToast(`Polygon "${name}" successfully ${isUpdate ? 'updated' : 'saved'} on server!`, 'success');

      if (!isUpdate) {
        showMyPolygons(targetUserId || null); 
      } else {
        showMyPolygons(selectedUserForAdminView ? selectedUserForAdminView.id : null);
        setSelectedPolygon(null); 
        setIsEditingMode(false);
      }

    } catch (error) {
      showToast(`Failed to ${isUpdate ? 'update' : 'save'} polygon on server: ${error.message}`, 'error');
      console.error(`Error ${isUpdate ? 'updating' : 'saving'} polygon on server:`, error);
    } finally {
      setIsSavingPolygon(false);
    }
  }, [showToast, handleLogout, navigate, setSelectedPolygon, setIsEditingMode, showMyPolygons, selectedUserForAdminView, userRole, saveDemoPolygonsToLocalStorage]);

  const startDrawing = () => {
    // NEW: Limit drawing to 30 polygons for DEMO user
    if (userRole === 'DEMO' && polygons.length >= 30) {
      showToast('В демо-режиме можно нарисовать до 30 полигонов. Пожалуйста, зарегистрируйтесь для создания большего количества.', 'warning');
      return;
    }

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
  
  // Add this useEffect hook
  useEffect(() => {
    if (currentAuthenticatedUser) {
      // This will fetch polygons either for the current user (if selectedUserForAdminView is null),
      // or for the selected user if ADMIN/SUPER_ADMIN has selected someone.
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
    console.log("onPolygonComplete: Замкнутые координаты полигона:", closedCoordinates); // Логирование
    if (closedCoordinates.length < 3) {
      showToast('Полигон должен иметь минимум 3 точки.', 'error');
      setIsDrawing(false);
      setDrawnPointsCount(0);
      return;
    }

    const newPolygonId = crypto.randomUUID(); 
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    const newPolygon = {
      id: newPolygonId, 
      coordinates: closedCoordinates,
      color: randomColor,
      crop: null,
      name: `Новый полигон ${new Date().toLocaleString()}`,
      comment: null
    };
    // REMOVED: setPolygons((prev) => [...prev, newPolygon]);
    setIsDrawing(false);
    setDrawnPointsCount(0);
    setSelectedPolygon(newPolygon);
    showToast('Полигон нарисован и сохранен локально! Отправка на сервер...', 'info');
    
    // Pass targetUserId if ADMIN selected a USER for impersonation
    let targetIdForNewPolygon = null;
    if (userRole === 'ADMIN' && selectedUserForAdminView && selectedUserForAdminView.role === 'USER') {
        targetIdForNewPolygon = selectedUserForAdminView.id;
    } else if (userRole === 'SUPER_ADMIN' && selectedUserForAdminView) {
        // SUPER_ADMIN can create for any selected user
        targetIdForNewPolygon = selectedUserForAdminView.id;
    }
    savePolygonToDatabase(newPolygon, false, targetIdForNewPolygon); 
  }, [savePolygonToDatabase, showToast, userRole, selectedUserForAdminView]); 

  const updatePolygonColor = useCallback((polygonId, newColor) => {
    setPolygons((prev) => {
      const updatedPolys = prev.map((p) =>
        p.id === polygonId ? { ...p, color: newColor } : p
      );
      // If DEMO user, save to localStorage
      saveDemoPolygonsToLocalStorage(updatedPolys);
      if (selectedPolygon && selectedPolygon.id === polygonId) {
        setSelectedPolygon(updatedPolys.find(p => p.id === polygonId));
      }
      return updatedPolys;
    });
  }, [selectedPolygon, saveDemoPolygonsToLocalStorage]);

  const deletePolygon = useCallback(async (id) => {
    // If DEMO user, delete locally and simulate success
    if (userRole === 'DEMO') {
      setPolygons((prev) => {
        const updatedPolys = prev.filter((p) => p.id !== id);
        saveDemoPolygonsToLocalStorage(updatedPolys); // Save to localStorage
        return updatedPolys;
      });
      setSelectedPolygon(null);
      if (editingMapPolygon && editingMapPolygon.id === id) {
        setIsEditingMode(false);
        setEditingMapPolygon(null);
      }
      showToast('Полигон удален локально (демо-режим)!', 'success');
      return; // Exit, as DEMO user does not need to access backend
    }

    // Logic for non-DEMO users (USER, ADMIN, SUPER_ADMIN)
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Error: Authentication token is missing. Please log in.', 'error');
      console.error('Error: Authentication token is missing.');
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
        showToast(`Error deleting polygon from server: ${errorMessage}`, 'error');
        if (response.status === 401 || response.status === 403) {
          if (handleLogout) {
            handleLogout();
          } else {
            navigate('/login');
          }
        }
        throw new Error(`Error deleting polygon from server: ${response.status} - ${errorMessage}`);
      }
      showToast('Полигон успешно удален с сервера!', 'success');
      showMyPolygons(selectedUserForAdminView ? selectedUserForAdminView.id : null);
    } catch (error) {
      showToast(`Не удалось удалить полигон с сервера: ${error.message}`, 'error');
      console.error('Error deleting polygon from DB:', error);
    }
  }, [editingMapPolygon, showToast, handleLogout, navigate, showMyPolygons, selectedUserForAdminView, userRole, saveDemoPolygonsToLocalStorage]); 

  const confirmClearAll = useCallback(() => {
    setShowClearAllConfirm(true);
  }, []);

  const cancelClearAll = useCallback(() => {
    setShowClearAllConfirm(false);
    showToast('Clearing all polygons canceled.', 'info');
  }, [showToast]);

  const handleClearAllConfirmed = useCallback(async () => {
    setShowClearAllConfirm(false);
    showToast('Starting to clear all polygons...', 'info');
    setPolygons([]);
    setSelectedPolygon(null);
    setIsDrawing(false);
    setIsEditingMode(false);
    setEditingMapPolygon(null);
    editableFGRef.current?.clearLayers();

    // If DEMO user, clear localStorage
    if (userRole === 'DEMO') {
      localStorage.removeItem('demoPolygons');
      showToast('All polygons deleted locally (demo mode)!', 'success');
      return; // Exit, as DEMO user does not need to access backend
    }

    // Logic for non-DEMO users (USER, ADMIN, SUPER_ADMIN)
    showToast('All polygons deleted locally. Sending request to server...', 'info');
    const token = localStorage.getItem('token'); 
    if (!token) {
      showToast('Error: Authentication token is missing. Please log in.', 'error');
      console.error('Error: Authentication token is missing.');
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
            showToast(`Error clearing all polygons from server: ${errorMessage}`, 'error');
            if (response.status === 401 || response.status === 403) {
              if (handleLogout) {
                handleLogout();
              } else {
                navigate('/login');
              }
            }
            throw new Error(`Error clearing all polygons from server: ${response.status} - ${errorMessage}`);
        }
        showToast('All polygons successfully deleted from server!', 'success');
        showMyPolygons(selectedUserForAdminView ? selectedUserForAdminView.id : null);
    } catch (error) {
        showToast(`Не удалось очистить все полигоны с сервера: ${error.message}`, 'error');
        console.error('Error clearing all polygons from DB:', error);
    } finally {
      setIsSavingPolygon(false);
    }
  }, [showToast, handleLogout, navigate, showMyPolygons, selectedUserForAdminView, userRole]); 

  const clearAll = useCallback(() => {
    if (polygons.length === 0) {
      showToast('No polygons on the map to delete.', 'info');
      return;
    }
    confirmClearAll();
  }, [polygons.length, confirmClearAll, showToast]);

  const clearAllCrops = useCallback(() => {
    setPolygons((prev) => {
      const updatedPolys = prev.map((p) => ({ ...p, crop: null, comment: null, color: '#0000FF' }));
      saveDemoPolygonsToLocalStorage(updatedPolys); // Save to localStorage
      return updatedPolys;
    });
    if (selectedPolygon) {
      setSelectedPolygon(prev => ({ ...prev, crop: null, comment: null, color: '#0000FF' }));
    }
    showToast('Все культуры, комментарии и цвета полигонов сброшены. Синхронизируйте с сервером вручную, если необходимо.', 'info');
  }, [showToast, selectedPolygon, saveDemoPolygonsToLocalStorage]);

  const updatePolygonCrop = useCallback((polygonId, newCrop) => {
    setPolygons((prev) => {
      const updatedPolys = prev.map((p) => (p.id === polygonId ? { ...p, crop: newCrop } : p));
      saveDemoPolygonsToLocalStorage(updatedPolys); // Save to localStorage
      if (selectedPolygon && selectedPolygon.id === polygonId) {
        setSelectedPolygon(updatedPolys.find(p => p.id === polygonId));
      }
      return updatedPolys;
    });
  }, [selectedPolygon, saveDemoPolygonsToLocalStorage]);

  const updatePolygonName = useCallback((polygonId, newName) => {
    setPolygons((prev) => {
      const updatedPolys = prev.map((p) =>
        p.id === polygonId ? { ...p, name: newName } : p
      );
      saveDemoPolygonsToLocalStorage(updatedPolys); // Save to localStorage
      if (selectedPolygon && selectedPolygon.id === polygonId) {
        setSelectedPolygon(updatedPolys.find(p => p.id === polygonId));
      }
      return updatedPolys;
    });
  }, [selectedPolygon, saveDemoPolygonsToLocalStorage]);

  const updatePolygonComment = useCallback((polygonId, newComment) => {
    setPolygons((prev) => {
      const updatedPolys = prev.map((p) =>
        p.id === polygonId ? { ...p, comment: newComment } : p
      );
      saveDemoPolygonsToLocalStorage(updatedPolys); // Save to localStorage
      if (selectedPolygon && selectedPolygon.id === polygonId) {
        setSelectedPolygon(updatedPolys.find(p => p.id === polygonId));
      }
      return updatedPolys;
    });
  }, [selectedPolygon, saveDemoPolygonsToLocalStorage]);

  const onSelectAnalysisForPolygon = useCallback((polygonData, analysisType) => {
    if (selectedPolygon && selectedPolygon.id === polygonData.id && activeAnalysisType === analysisType) {
      setActiveAnalysisType('none'); // Turn off layer if already active for the same polygon
      showToast(`Layer "${analysisType}" for polygon turned off.`, 'info');
    } else {
      setSelectedPolygon(polygonData); // Set selected polygon
      setActiveAnalysisType(analysisType); // Set analysis type

      // Set date range as Date objects
      const today = new Date();
      const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, today.getDate());
      setAnalysisDateRange([twoMonthsAgo, today]); // Pass Date objects
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
                  // Убедимся, что координаты в формате [lat, lon]
                  updatedCoordinates = layer.toGeoJSON().geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
                  leafletLayerToDisableEditing = layer;
              }
          });
      }
      if (!updatedCoordinates || updatedCoordinates.length === 0) {
          console.log("handleStopAndSaveEdit: Не удалось получить обновленные координаты из Leaflet слоя. Использую editingMapPolygon.coordinates.");
          updatedCoordinates = editingMapPolygon ? editingMapPolygon.coordinates : null;
      }

      if (!updatedCoordinates || updatedCoordinates.length < 3) { // Проверяем на минимум 3 точки
          console.error("handleStopAndSaveEdit: Critical error: Не удалось получить обновленные координаты для сохранения или их меньше 3.");
          showToast('Ошибка: Не удалось получить корректные координаты полигона для сохранения (минимум 3 точки).', 'error');
          return;
      }

      const currentPolygonInState = polygons.find(p => p.id === editingMapPolygon?.id);
      
      if (currentPolygonInState) { 
          const updatedPoly = { 
              ...currentPolygonInState, 
              coordinates: ensurePolygonClosed(updatedCoordinates), // Замыкаем координаты здесь
          }; 
          
          setPolygons(prev => {
            const newPolygons = prev.map(p => p.id === updatedPoly.id ? updatedPoly : p);
            saveDemoPolygonsToLocalStorage(newPolygons); // Save to localStorage
            return newPolygons;
          }); 
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
  }, [isDrawing, stopDrawing, isEditingMode, editingMapPolygon, polygons, savePolygonToDatabase, showToast, selectedPolygon, saveDemoPolygonsToLocalStorage]);

  const onPolygonEdited = useCallback(async (e) => {
    console.log("onPolygonEdited: Событие редактирования полигона на карте.");
    let editedLayers = e.layers;
    editedLayers.eachLayer((layer) => {
        if (layer instanceof L.Polygon) {
            const newCoordinates = layer.toGeoJSON().geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
            console.log("onPolygonEdited: Новые координаты после редактирования:", newCoordinates);

            setPolygons(prevPolygons => {
                const newPolygons = prevPolygons.map(p => {
                    if (editingMapPolygon && p.id === editingMapPolygon.id) {
                        return { ...p, coordinates: ensurePolygonClosed(newCoordinates) }; // Замыкаем здесь
                    }
                    return p;
                });
                saveDemoPolygonsToLocalStorage(newPolygons); // Save to localStorage
                return newPolygons;
            });
            setEditingMapPolygon(prev => prev ? { ...prev, coordinates: ensurePolygonClosed(newCoordinates) } : null);
        }
    });
    showToast('Форма полигона изменена. Нажмите "Сохранить" для сохранения изменений.', 'info');
  }, [editingMapPolygon, setPolygons, setEditingMapPolygon, showToast, saveDemoPolygonsToLocalStorage]);

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
  }, [BASE_API_URL, userRole]); 

  const handleUpdateSelectedUserEmail = useCallback(async (userId, newEmail) => {
    showToast(`Attempting to update user ${userId} email to ${newEmail}...`, 'info');
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Error: Authentication token is missing. Please log in.', 'error');
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
        // Send newEmail as a plain string without JSON.stringify
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
      // Update email in selectedUserForAdminView and allUsers state
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

  // NEW FUNCTION: Update user role
  const handleUpdateUserRole = useCallback(async (userId, newRole) => {
    showToast(`Attempting to update user ${userId} role to ${newRole}...`, 'info');
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Error: Authentication token is missing. Please log in.', 'error');
      if (handleLogout) handleLogout();
      else navigate('/login');
      return;
    }
    try {
      const response = await fetch(`${BASE_API_URL}/api/v1/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newRole: newRole }),
      });

      const responseBody = await parseResponseBody(response);
      if (!response.ok) {
        let errorMessage = response.statusText;
        if (typeof responseBody === 'object' && responseBody !== null && responseBody.message) {
          errorMessage = responseBody.message;
        } else if (typeof responseBody === 'string' && responseBody.length > 0) {
          errorMessage = responseBody;
        }
        throw new Error(`Error updating role: ${response.status} - ${errorMessage}`);
      }
      showToast(`User ${userId} role successfully updated to ${newRole}!`, 'success');
      // Update role in allUsers and selectedUserForAdminView
      setAllUsers(prevUsers => prevUsers.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      if (selectedUserForAdminView && selectedUserForAdminView.id === userId) {
        setSelectedUserForAdminView(prev => ({ ...prev, role: newRole }));
      }
    } catch (error) {
      showToast(`Failed to update user role: ${error.message}`, 'error');
      console.error('Error updating user role:', error);
    }
  }, [showToast, handleLogout, navigate, selectedUserForAdminView]);


  // useEffect for user role and data initialization
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
        // If token is missing, redirect to login immediately
        if (handleLogout) {
            handleLogout();
        } else {
            navigate('/login');
        }
        return;
    }

    try {
        const decodedToken = jwtDecode(token);
        console.log("Decoded Token:", decodedToken);
        const roles = decodedToken.roles || []; 
        
        let userIdFromToken = null;
        if (decodedToken.id !== undefined && decodedToken.id !== null && !isNaN(Number(decodedToken.id))) {
            userIdFromToken = Number(decodedToken.id);
        } else if (decodedToken.userId !== undefined && decodedToken.userId !== null && !isNaN(Number(decodedToken.userId))) {
            userIdFromToken = Number(decodedToken.userId);
        } else {
            console.warn("JWT does not contain a numerical 'id' or 'userId' claim. Cannot use 'sub' (email) as numerical ID for API requests. Setting currentAuthenticatedUser.id to null.");
            showToast('Warning: User ID is not numerical. Polygon loading/editing might be limited.', 'warning');
        }

        setCurrentAuthenticatedUser({ id: userIdFromToken, email: decodedToken.sub, role: roles[0] }); 

        if (roles.includes('ROLE_SUPER_ADMIN')) {
            setUserRole('SUPER_ADMIN');
        } else if (roles.includes('ROLE_ADMIN')) {
            setUserRole('ADMIN');
        } else if (roles.includes('ROLE_DEMO')) {
            setUserRole('DEMO');
            showToast('Демо-режим: Ваши полигоны будут сохраняться локально и удаляться при выходе.', 'info');
        } else {
            setUserRole('USER');
        }
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
  }, [handleLogout, navigate, showToast, fetchAllUsers]); 

  // Сохранение activeBaseMapType в localStorage при его изменении
  useEffect(() => {
    localStorage.setItem('selectedBaseMap', activeBaseMapType);
  }, [activeBaseMapType]);


  // useEffect for loading polygons, depends on userRole, currentAuthenticatedUser, selectedUserForAdminView
  useEffect(() => {
    if (!userRole || !currentAuthenticatedUser) {
        console.log("PolygonDrawMap: Deferred polygon loading: userRole or currentAuthenticatedUser not yet set.");
        return;
    }

    // Polygon loading logic is now entirely within showMyPolygons
    // This useEffect now simply calls showMyPolygons
    if (userRole === 'USER') { 
      showMyPolygons(null); 
    } else if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      const idToFetch = selectedUserForAdminView 
        ? Number(selectedUserForAdminView.id) 
        : (currentAuthenticatedUser.id !== null && !isNaN(Number(currentAuthenticatedUser.id)) ? Number(currentAuthenticatedUser.id) : null);
      showMyPolygons(idToFetch);
    } else if (userRole === 'DEMO') {
        showMyPolygons(null);
    }
  }, [userRole, currentAuthenticatedUser, selectedUserForAdminView, showMyPolygons]); 


  // useEffect for updating currentAuthenticatedUser.id from allUsers
  useEffect(() => {
    if (currentAuthenticatedUser && currentAuthenticatedUser.email && allUsers.length > 0) {
      const foundUser = allUsers.find(user => user.email === currentAuthenticatedUser.email);
      if (foundUser && foundUser.id !== currentAuthenticatedUser.id && !isNaN(Number(foundUser.id))) {
        console.log(`PolygonDrawMap: Обновляем currentAuthenticatedUser ID from: ${currentAuthenticatedUser.id} to: ${Number(foundUser.id)}`);
        setCurrentAuthenticatedUser(prev => ({ ...prev, id: Number(foundUser.id) }));
      }
    }
  }, [allUsers, currentAuthenticatedUser]); 


  // useEffect: Update selectedPolygon when polygons list is updated
  useEffect(() => {
    if (selectedPolygon && polygons.length > 0) {
      const updatedSelected = polygons.find(p => p.id === selectedPolygon.id);

      if (updatedSelected && (updatedSelected.ownerId !== selectedPolygon.ownerId || selectedPolygon.ownerId === null)) {
        console.log("PolygonDrawMap: Updating selectedPolygon.ownerId from:", selectedPolygon.ownerId, "to:", updatedSelected.ownerId);
        setSelectedPolygon(updatedSelected);
      }
    }
  }, [polygons, selectedPolygon, setSelectedPolygon]); 

  // useEffect for logging polygons array after update
  useEffect(() => {
    console.log("PolygonDrawMap: Polygons state updated:", polygons);
    polygons.forEach(p => {
      console.log(`  Polygon ID: ${p.id}, Owner ID: ${p.ownerId}, Owner Role: ${p.ownerRole}`);
      const area = calculateArea(p.coordinates);
      console.log(`  Polygon ID: ${p.id}, Calculated Area: ${area} m², Formatted Area: ${formatArea(area)}`);
    });
  }, [polygons, calculateArea, formatArea]);


  const handleUserSelectForAdminView = useCallback((event) => {
    const userId = event.target.value;
    const user = allUsers.find(u => String(u.id) === userId); 
    setSelectedUserForAdminView(user || null);

    if (user) {
        showToast(`Просмотр полигонов для пользователя: ${user.email}`, 'info');
        showMyPolygons(Number(user.id));
    } else {
        if (currentAuthenticatedUser?.id !== null && !isNaN(Number(currentAuthenticatedUser.id))) {
            showToast('Просмотр полигонов текущего администратора.', 'info');
            showMyPolygons(Number(currentAuthenticatedUser.id));
        } else {
            console.warn("handleUserSelectForAdminView: Current authenticated user ID is unavailable or not numerical for loading administrator polygons.");
            showToast('Error: Failed to determine current administrator ID for loading polygons.', 'error');
        }
    }
  }, [allUsers, showMyPolygons, showToast, currentAuthenticatedUser]);

  // NEW FUNCTION: flyToPolygon
  const flyToPolygon = useCallback((polygon) => {
    if (mapInstance && polygon && polygon.coordinates && polygon.coordinates.length > 0) {
      // Calculate centroid (simple average for now)
      const outerRing = Array.isArray(polygon.coordinates[0][0]) 
                            ? polygon.coordinates[0] 
                            : polygon.coordinates; 
      
      const validCoords = outerRing.filter(coord => {
        if (!Array.isArray(coord) || coord.length !== 2) {
          return false;
        }
        const lat = parseFloat(coord[0]);
        const lng = parseFloat(coord[1]);
        return !isNaN(lat) && !isNaN(lng);
      }).map(coord => [parseFloat(coord[0]), parseFloat(coord[1])]);

      if (validCoords.length > 0) {
        const latSum = validCoords.reduce((sum, coord) => sum + coord[0], 0);
        const lngSum = validCoords.reduce((sum, coord) => sum + coord[1], 0);
        const center = [latSum / validCoords.length, lngSum / validCoords.length];
        
        mapInstance.flyTo(center, 15); // Fly to center with zoom level 15
        showToast(`Перемещение к полигону: ${polygon.name}`, 'info');
      } else {
        showToast(`Невозможно переместиться к полигону "${polygon.name}": некорректные координаты.`, 'error');
      }
    } else {
      showToast('Экземпляр карты или данные полигона недоступны для перемещения.', 'error');
    }
  }, [mapInstance, showToast]);


  const finalSelectedPolygonData = selectedPolygon;

  // Вычисляем позицию UserSelectionBlock над LayerSelectionBlock
  const userBlockCalculatedBottom = `${layerBlockInitialBottom + layerBlockHeight + 10}px`; // +10px для отступа

  // УДАЛЕН ЭФФЕКТ, КОТОРЫЙ ВЫКЛЮЧАЛ АНАЛИТИЧЕСКИЙ СЛОЙ ПРИ СВОРЧИВАНИИ LayerSelectionBlock
  // useEffect(() => {
  //   if (!isLayerSelectionBlockExpanded && activeAnalysisType !== 'none') {
  //     setActiveAnalysisType('none');
  //     showToast('Аналитический слой выключен, так как панель слоев свернута.', 'info');
  //   }
  // }, [isLayerSelectionBlockExpanded, activeAnalysisType, showToast]);

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
        flyToPolygon={flyToPolygon}
        // ПРОПСЫ для управления видимостью сайдбара
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
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

      {/* LayerSelectionBlock */}
      <LayerSelectionBlock
        selectedPolygonData={finalSelectedPolygonData}
        activeBaseMapType={activeBaseMapType}
        onSelectBaseMap={setActiveBaseMapType}
        activeAnalysisType={activeAnalysisType}
        onSelectAnalysisForPolygon={onSelectAnalysisForPolygon}
        setBlockHeight={setLayerBlockHeight} // Передаем функцию для установки высоты
        setBlockWidth={setLayerBlockWidth}   // Передаем функцию для установки ширины
        onExpandChange={setIsLayerSelectionBlockExpanded} // Передаем функцию для обновления состояния развернутости
      />
      
      {/* UserSelectionBlock теперь располагается над LayerSelectionBlock */}
      {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
        <UserSelectionBlock
          userRole={userRole}
          allUsers={allUsers}
          selectedUserForAdminView={selectedUserForAdminView}
          handleUserSelectForAdminView={handleUserSelectForAdminView}
          layerSelectionBlockHeight={layerBlockHeight} // Передаем высоту LayerSelectionBlock
          onUpdateUserRole={handleUpdateUserRole}
        />
      )}
      
      {/* Компоненты метрик и описаний, располагающиеся справа от LayerSelectionBlock */}
      <NDVIMetricDisplay
        activeAnalysisType={activeAnalysisType}
        layerSelectionBlockWidth={layerBlockWidth}
        isLayerSelectionBlockExpanded={isLayerSelectionBlockExpanded}
      />
      <MoistureIndexMetricDisplay
        activeAnalysisType={activeAnalysisType}
        layerSelectionBlockWidth={layerBlockWidth}
        isLayerSelectionBlockExpanded={isLayerSelectionBlockExpanded}
      />
      <NDSIMetricDisplay
        activeAnalysisType={activeAnalysisType}
        layerSelectionBlockWidth={layerBlockWidth}
        isLayerSelectionBlockExpanded={isLayerSelectionBlockExpanded}
      />
      <NDWIMetricDisplay
        activeAnalysisType={activeAnalysisType}
        layerSelectionBlockWidth={layerBlockWidth}
        isLayerSelectionBlockExpanded={isLayerSelectionBlockExpanded}
      />
      <SceneClassificationLegend
        activeAnalysisType={activeAnalysisType}
        layerSelectionBlockWidth={layerBlockWidth}
        isLayerSelectionBlockExpanded={isLayerSelectionBlockExpanded}
      />
      {/* Новые компоненты описаний для композитов */}
      <FalseColorVegetationDisplay
        activeAnalysisType={activeAnalysisType}
        layerSelectionBlockWidth={layerBlockWidth}
        isLayerSelectionBlockExpanded={isLayerSelectionBlockExpanded}
      />
      <FalseColorUrbanDisplay
        activeAnalysisType={activeAnalysisType}
        layerSelectionBlockWidth={layerBlockWidth}
        isLayerSelectionBlockExpanded={isLayerSelectionBlockExpanded}
      />
      <SWIRDisplay
        activeAnalysisType={activeAnalysisType}
        layerSelectionBlockWidth={layerBlockWidth}
        isLayerSelectionBlockExpanded={isLayerSelectionBlockExpanded}
      />
      
    </div>
  );
}
