// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';

// Импорт компонентов
import Home from './pages/Home'; // Ваша публичная домашняя страница
import MainPage from './components/MainPage'; // Ваша домашняя страница для авторизованных пользователей
import EarthData from './components/EarthData';
import RegistrationModal from './components/RegistrationModal';
import ProfileHeader from './components/ProfileHeader';
import Chat from './components/Chat';
import PolygonDrawMap from './components/ForMap/PolygonDrawMap';
import AppLayout from './components/ForMap/AppLayout';
import AdminPanel from './pages/AdminPanel';
import DemoLoginModal from './components/DemoLoginModal'; // Компонент для демо-доступа
import PrivacyPolicy from './pages/PrivacyPolicy'; // Импортируем новый компонент

function AppContent() {
  // Состояние для статуса аутентификации пользователя
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Состояние для роли пользователя (например, 'ROLE_USER', 'ROLE_ADMIN', 'ROLE_DEMO')
  const [userRole, setUserRole] = useState(null);

  // Хуки React Router для доступа к текущему местоположению и навигации
  const location = useLocation();
  const navigate = useNavigate();

  // Функция для выхода из системы
  // Очищает данные аутентификации и перенаправляет на страницу входа
  const handleLogout = useCallback(() => {
    const currentRole = localStorage.getItem('role');
    // Если это демо-пользователь, очищаем его локальные данные
    if (currentRole === 'ROLE_DEMO') {
      localStorage.removeItem('demoPolygons');
      localStorage.removeItem('demoChatHistories');
      localStorage.removeItem('lastSelectedPolygonId');
      console.log("App.jsx: Данные демо-пользователя очищены из localStorage."); // Перевод
    }
    // Очищаем токен и роль из локального хранилища
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    // Обновляем состояние аутентификации
    setIsAuthenticated(false);
    setUserRole(null);
    // Перенаправляем на страницу входа после выхода
    navigate('/login'); 
  }, [navigate]); // Зависимость от navigate, так как она используется внутри useCallback

  // Функция для обработки успешного входа (как обычных, так и демо-пользователей)
  const handleLoginSuccess = useCallback((role) => {
    setIsAuthenticated(true); // Устанавливаем статус аутентификации как true
    setUserRole(role); // Устанавливаем роль пользователя
    
    // Логика перенаправления в зависимости от роли пользователя
    if (role === 'ROLE_ADMIN' || role === 'ROLE_SUPER_ADMIN') {
      navigate('/admin-panel'); // Перенаправление администраторов на админ-панель
    } else if (role === 'ROLE_DEMO') {
      navigate('/dashboard'); // Перенаправление демо-пользователей на дашборд
    } else {
      navigate('/dashboard'); // Перенаправление обычных пользователей на дашборд
    }
  }, [navigate]); // Зависимость от navigate

  // Функция для закрытия модальных окон (например, RegistrationModal)
  // Перенаправляет на публичную домашнюю страницу
  const handleModalClose = useCallback(() => {
    navigate('/home'); 
  }, [navigate]);

  // Эффект для проверки статуса аутентификации при загрузке или изменении пути
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const isAuth = !!token; // Проверяем наличие токена для определения аутентификации

    setIsAuthenticated(isAuth); // Обновляем состояние аутентификации
    setUserRole(role); // Обновляем состояние роли пользователя

    // Маршруты, доступные ТОЛЬКО для неавторизованных пользователей
    // (страницы входа, регистрации, демо-входа)
    const unauthenticatedOnlyPaths = ['/login', '/register', '/demo-login', '/privacy-policy']; // Добавляем /privacy-policy

    // --- ОТЛАДОЧНЫЕ СООБЩЕНИЯ (можно удалить после отладки) ---
    console.log('App.jsx - Эффект useEffect запущен'); // Перевод
    console.log('Текущий путь:', location.pathname); // Перевод
    console.log('Аутентифицирован (из хранилища):', isAuth); // Перевод
    console.log('Текущий путь является путем только для неавторизованных:', unauthenticatedOnlyPaths.includes(location.pathname)); // Перевод
    // --- КОНЕЦ ОТЛАДОЧНЫХ СООБЩЕНИЙ ---

    // Логика перенаправления на основе статуса аутентификации и текущего пути
    if (!isAuth) {
      // Если пользователь НЕ авторизован:
      // Если текущий путь НЕ является одним из путей, предназначенных только для неавторизованных,
      // И текущий путь НЕ является корневым '/' или '/home' (которые публичны)
      if (!unauthenticatedOnlyPaths.includes(location.pathname) && location.pathname !== '/' && location.pathname !== '/home') {
        console.log('App.jsx - Перенаправление на /login: Не аутентифицирован и не публичный путь.'); // Перевод
        navigate('/login'); // Перенаправляем на страницу входа
      }
      // Если неавторизованный пользователь находится на '/' или '/home', остаемся на ней (Home.jsx)
      // В этом случае явное navigate не требуется, так как Route уже рендерит Home.
    } else { 
      // Если пользователь АВТОРИЗОВАН:
      // Если текущий путь является одним из путей, предназначенных только для неавторизованных
      if (unauthenticatedOnlyPaths.includes(location.pathname)) { 
        console.log('App.jsx - Перенаправление на /dashboard: Аутентифицирован и на пути только для неавторизованных.'); // Перевод
        navigate('/dashboard'); // Перенаправляем на дашборд
      }
      // Если авторизованный пользователь находится на '/' или '/home',
      // он останется там, так как эти пути теперь рендерят MainPage для авторизованных.
    }
  }, [location.pathname, navigate]); // Зависимости эффекта: реагируем на изменение пути и navigate

  // Проверка, является ли пользователь администратором или супер-администратором
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'; 

  return (
    <>
      {/* Отображаем ProfileHeader только если пользователь аутентифицирован */}
      {isAuthenticated && <ProfileHeader onLogout={handleLogout} userRole={userRole} />} 

      {/* Основной контейнер контента, с классом для стилизации в зависимости от аутентификации */}
      <div className={`main-content-wrapper ${isAuthenticated ? 'authenticated' : ''}`}> 
        <Routes>
          {/* Маршруты для НЕАВТОРИЗОВАННЫХ пользователей */}
          {!isAuthenticated && (
            <>
              {/* Публичные домашние страницы */}
              <Route path="/" element={<Home />} />
              <Route path="/home" element={<Home />} />
              {/* Страницы входа/регистрации/демо-входа */}
              <Route path="/login" element={<RegistrationModal onSuccess={handleLoginSuccess} onClose={handleModalClose} />} />
              <Route path="/register" element={<RegistrationModal onSuccess={handleLoginSuccess} onClose={handleModalClose} />} />
              <Route path="/demo-login" element={<DemoLoginModal onSuccess={handleLoginSuccess} onClose={handleModalClose} handleLogout={handleLogout} />} /> 
              <Route path="/privacy-policy" element={<PrivacyPolicy />} /> {/* Новый маршрут для политики конфиденциальности */}
              
              {/* Catch-all маршрут для неавторизованных: любой другой путь ведет на Home */}
              <Route path="*" element={<Home />} /> 
            </>
          )}

          {/* Маршруты для АВТОРИЗОВАННЫХ пользователей */}
          {isAuthenticated && (
            <>
              {/* Главные страницы для авторизованных пользователей */}
              <Route path="/home" element={<MainPage />} /> {/* Авторизованные видят MainPage */}
              <Route path="/" element={<MainPage />} /> {/* Авторизованные видят MainPage */}

              {/* Защищенные маршруты, требующие аутентификации */}
              <Route 
                path="/dashboard" 
                element={
                  <AppLayout handleLogout={handleLogout}>
                    <PolygonDrawMap handleLogout={handleLogout} />
                  </AppLayout>
                } 
              />
              <Route path="/earthdata" element={<EarthData />} />
              <Route path="/chat" element={<Chat handleLogout={handleLogout} />} />
              
              {/* Catch-all маршрут для авторизованных: любой другой путь ведет на MainPage */}
              <Route path="*" element={<MainPage />} />

              {/* Маршруты ТОЛЬКО для администраторов (доступны только если isAdmin true) */}
              {isAdmin && (
                <>
                  <Route path="/admin-panel" element={<AdminPanel />} />
                </>
              )}
            </>
          )}
        </Routes>
      </div>
    </>
  );
}

// Основной компонент App, который оборачивает AppContent в Router
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
