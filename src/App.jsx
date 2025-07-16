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

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Функция для выхода из системы
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setIsAuthenticated(false);
    setUserRole(null);
    navigate('/login');
  }, [navigate]);

  // Функция для обработки успешного входа
  const handleLoginSuccess = useCallback((role) => {
    setIsAuthenticated(true);
    setUserRole(role);
    navigate('/dashboard'); // Перенаправление на дашборд после успешного входа
  }, [navigate]);

  // Эффект для проверки статуса аутентификации при загрузке/обновлении страницы
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const isAuth = !!token; // Проверяем наличие токена

    setIsAuthenticated(isAuth);
    setUserRole(role);

    // Список публичных маршрутов
    // Обратите внимание: '/' теперь обрабатывается явно в Routes для неавторизованных
    const publicPaths = ['/login', '/register', '/home']; 

    // Логика перенаправления для неавторизованных пользователей
    // Если пользователь не авторизован и пытается получить доступ к защищенному маршруту,
    // перенаправляем его на страницу входа.
    // Путь '/' не включен сюда, так как он теперь явно ведет на Home для неавторизованных.
    if (!isAuth && !publicPaths.includes(location.pathname) && location.pathname !== '/') {
      navigate('/login');
    } 
    // Логика перенаправления для авторизованных пользователей
    // Если пользователь авторизован и находится на странице входа или регистрации,
    // перенаправляем его на дашборд.
    else if (isAuth && (location.pathname === '/login' || location.pathname === '/register')) {
        navigate('/dashboard');
    }
    // В остальных случаях (авторизован и на защищенной странице, или авторизован и на публичной)
    // React Router сам отрендерит нужный компонент, без принудительного перенаправления.
  }, [location.pathname, navigate, isAuthenticated]); // Добавлено isAuthenticated в зависимости

  const isAdmin = userRole === 'ADMIN'; // Проверка роли администратора

  return (
    <>
      {isAuthenticated && <ProfileHeader onLogout={handleLogout} />} {/* Отображаем заголовок профиля, если пользователь авторизован */}

      {/* Основной контейнер контента, с классом для стилизации в зависимости от аутентификации */}
      <div className={`main-content-wrapper ${isAuthenticated ? 'authenticated' : ''}`}> 
        <Routes>
          {/* Маршруты для неавторизованных пользователей */}
          {!isAuthenticated && (
            <>
              <Route path="/" element={<Home />} /> {/* Для неавторизованных '/' ведет на Home */}
              <Route path="/home" element={<Home />} /> {/* Home также доступен по прямому пути */}
              <Route path="/login" element={<RegistrationModal onSuccess={handleLoginSuccess} />} />
              <Route path="/register" element={<RegistrationModal onSuccess={handleLoginSuccess} />} />
              {/* Catch-all для неавторизованных: любой другой путь ведет на RegistrationModal */}
              <Route path="*" element={<RegistrationModal onSuccess={handleLoginSuccess} />} /> 
            </>
          )}

          {/* Маршруты для авторизованных пользователей */}
          {isAuthenticated && (
            <>
              <Route path="/home" element={<Home />} /> {/* Home также доступен для авторизованных */}
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
              <Route path="/" element={<MainPage />} /> {/* Для авторизованных '/' ведет на MainPage */}
              <Route path="*" element={<MainPage />} /> {/* Catch-all для авторизованных */}

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
