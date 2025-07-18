// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';

import Home from './pages/Home'; // Убедитесь, что это ваша публичная домашняя страница
import MainPage from './components/MainPage'; // Ваша домашняя страница для авторизованных пользователей
import EarthData from './components/EarthData';
import RegistrationModal from './components/RegistrationModal';
import ProfileHeader from './components/ProfileHeader';
import Chat from './components/Chat';
import PolygonDrawMap from './components/ForMap/PolygonDrawMap';
import AppLayout from './components/ForMap/AppLayout';
import AdminPanel from './pages/AdminPanel';
import DemoLoginModal from './components/DemoLoginModal'; // ИМПОРТ НОВОГО КОМПОНЕНТА ДЛЯ ДЕМО-ДОСТУПА


function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Функция для выхода из системы (только очистка данных и состояния, без навигации)
 const handleLogout = useCallback(() => {
  const currentRole = localStorage.getItem('role');
  if (currentRole === 'ROLE_DEMO') {
    localStorage.removeItem('demoPolygons');
    localStorage.removeItem('demoChatHistories');
    localStorage.removeItem('lastSelectedPolygonId');
    console.log("App.jsx: Demo user data cleared from localStorage.");
  }
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  setIsAuthenticated(false);
  setUserRole(null);
  // navigate('/login'); // This line should be removed or commented out in App.jsx
}, []);

  // Функция для обработки успешного входа (как обычных, так и демо)
  const handleLoginSuccess = useCallback((role) => {
    setIsAuthenticated(true);
    setUserRole(role);
    
    // Логика перенаправления в зависимости от роли
    if (role === 'ROLE_ADMIN' || role === 'ROLE_SUPER_ADMIN') {
      navigate('/admin-panel'); // Перенаправление на админ-панель
    } else if (role === 'ROLE_DEMO') {
      navigate('/dashboard'); // Перенаправление демо-пользователей на дашборд (или другую демо-страницу)
    } else {
      navigate('/dashboard'); // Перенаправление обычных пользователей на дашборд
    }
  }, [navigate]);

  // НОВАЯ ФУНКЦИЯ: для закрытия модальных окон (перенаправление на домашнюю страницу)
  const handleModalClose = useCallback(() => {
    navigate('/home'); // Перенаправляем на публичную домашнюю страницу при закрытии модала
  }, [navigate]);

  // Эффект для проверки статуса аутентификации при загрузке/обновлении страницы
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const isAuth = !!token; // Проверяем наличие токена

    setIsAuthenticated(isAuth);
    setUserRole(role);

    // Список публичных маршрутов, доступных без авторизации
    const publicPaths = ['/', '/home', '/login', '/register', '/demo-login']; 

    // --- ОТЛАДОЧНЫЕ СООБЩЕНИЯ ---
    console.log('App.jsx - useEffect triggered');
    console.log('Current Path:', location.pathname);
    console.log('Is Authenticated (from storage):', isAuth);
    console.log('Is Current Path a Public Path:', publicPaths.includes(location.pathname));
    // --- КОНЕЦ ОТЛАДОЧНЫХ СООБЩЕНИЙ ---

    // Логика перенаправления
    if (!isAuth) {
      // Если пользователь не авторизован и находится на защищенном маршруте, перенаправляем на /login
      if (!publicPaths.includes(location.pathname)) {
        console.log('App.jsx - Redirecting to /login: Not authenticated and not a public path.');
        navigate('/login');
      }
    } else { // Если пользователь авторизован
      // Если авторизованный пользователь пытается зайти на публичные страницы входа/регистрации/демо, перенаправляем на дашборд
      if (publicPaths.includes(location.pathname)) { 
        console.log('App.jsx - Redirecting to /dashboard: Authenticated and on a public path.');
        navigate('/dashboard');
      }
    }
  }, [location.pathname, navigate]); // Убрали isAuthenticated из зависимостей, так как используем isAuth напрямую

  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'; // Проверка роли администратора

  return (
    <>
      {/* ✨ ИЗМЕНЕНО: Передача userRole в ProfileHeader */}
      {isAuthenticated && <ProfileHeader onLogout={handleLogout} userRole={userRole} />} 

      {/* Основной контейнер контента */}
      <div className={`main-content-wrapper ${isAuthenticated ? 'authenticated' : ''}`}> 
        <Routes>
          {/* Маршруты для неавторизованных пользователей */}
          {!isAuthenticated && (
            <>
              <Route path="/" element={<Home />} />
              <Route path="/home" element={<Home />} />
              {/* RegistrationModal рендерится напрямую как элемент маршрута */}
              <Route path="/login" element={<RegistrationModal onSuccess={handleLoginSuccess} onClose={handleModalClose} />} /> {/* ДОБАВЛЕНО onClose */}
              <Route path="/register" element={<RegistrationModal onSuccess={handleLoginSuccess} onClose={handleModalClose} />} /> {/* ДОБАВЛЕНО onClose */}
              {/* ✨ ИЗМЕНЕНО: Передача handleLogout в DemoLoginModal */}
              <Route path="/demo-login" element={<DemoLoginModal onSuccess={handleLoginSuccess} onClose={handleModalClose} handleLogout={handleLogout} />} /> 
              
              {/* Catch-all для неавторизованных: любой другой путь ведет на Home */}
              <Route path="*" element={<Home />} /> 
            </>
          )}

          {/* Маршруты для авторизованных пользователей */}
          {isAuthenticated && (
            <>
              <Route path="/home" element={<Home />} />
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
              <Route path="/" element={<MainPage />} />
              <Route path="*" element={<MainPage />} />

              {/* Маршруты только для администраторов */}
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

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
