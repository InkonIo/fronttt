import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './ProfileHeader.css';

// Add userRole to props
export default function ProfileHeader({ onLogout = () => {}, userRole }) {
  const [activeSection, setActiveSection] = useState('home');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active section
  useEffect(() => {
    if (location.pathname === '/') {
      setActiveSection('home');
    } else if (location.pathname === '/dashboard') {
      setActiveSection('map');
    } else if (location.pathname === '/chat') {
      setActiveSection('ai-chat');
    } else if (location.pathname === '/earthdata') {
      setActiveSection('soil-data');
    }
  }, [location.pathname]);

  // Toggle settings menu
  const toggleSettingsMenu = () => {
    setShowSettingsMenu(prev => !prev);
  };

  // Updated logout function
  const handleLogoutClick = () => {
    // If user is DEMO, redirect to https://agrofarm.kz/
    if (userRole === 'ROLE_DEMO') { // Ensure role check matches stored role (e.g., 'ROLE_DEMO')
      onLogout(); // Call the original logout function (clears localStorage)
      window.location.href = 'https://agrofarm.kz/'; // Redirect to external URL
    } else {
      onLogout(); // For regular users, call the original logout function (which navigates to /login)
      navigate('/login'); // Explicitly navigate to /login for non-demo users
    }
  };

  return (
    <header className="profile-header">
      <div className="profile-header-left">
        <div className="profile-header-logo">AGRO</div>

        <nav className="profile-header-nav">
          <a
            href="#"
            onClick={e => {
              e.preventDefault();
              navigate('/');
              setActiveSection('home');
            }}
            className={`profile-header-nav-link ${
              location.pathname === '/home' || activeSection === 'home' ? 'active' : ''
            }`}
          >
            Главная
          </a>
          <a
            href="#"
            onClick={e => {
              e.preventDefault();
              navigate('/dashboard');
              setActiveSection('map');
            }}
            className={`profile-header-nav-link ${
              location.pathname === '/dashboard' || activeSection === 'map' ? 'active' : ''
            }`}
          >
            Карта
          </a>
          <a
            href="#"
            onClick={e => {
              e.preventDefault();
              navigate('/chat');
              setActiveSection('ai-chat');
            }}
            className={`profile-header-nav-link ${
              location.pathname === '/chat' || activeSection === 'ai-chat' ? 'active' : ''
            }`}
          >
            ИИ-чат
          </a>
          <Link
            to="/earthdata"
            onClick={() => setActiveSection('soil-data')}
            className={`profile-header-nav-link ${
              location.pathname === '/earthdata' || activeSection === 'soil-data' ? 'active' : ''
            }`}
          >
            Данные почвы
          </Link>
          <a
            href="#"
            onClick={e => {
              e.preventDefault();
              setActiveSection('recommendations');
            }}
            className={`profile-header-nav-link ${
              activeSection === 'recommendations' ? 'active' : ''
            }`}
          >
            Рекомендации
          </a>
        </nav>

        {/* Перемещаем settings-container сюда, чтобы он был в одном flex-контейнере с остальными элементами */}
        <div className="settings-container">
          <button
            onClick={toggleSettingsMenu}
            title="Настройки"
            className="profile-header-button settings-button"
            aria-label="Настройки пользователя"
          >
            ⚙️
          </button>

          <div className={`settings-dropdown ${showSettingsMenu ? 'show' : ''}`}>
            <button onClick={handleLogoutClick}>Выйти</button> {/* Use new function */}
          </div>
        </div>
      </div>

      {/* profile-header-right больше не нужен, так как его содержимое перемещено */}
      {/* <div className="profile-header-right"></div> */}
    </header>
  );
}
