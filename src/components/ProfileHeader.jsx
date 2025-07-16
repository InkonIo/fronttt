import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './ProfileHeader.css';

export default function ProfileHeader({ onLogout = () => {} }) {
  const [activeSection, setActiveSection] = useState('home');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Определение активной секции
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

  // Переключение меню настроек
  const toggleSettingsMenu = () => {
    setShowSettingsMenu(prev => !prev);
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
              location.pathname === '/' || activeSection === 'home' ? 'active' : ''
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
      </div>

      <div className="profile-header-right">
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
            <button onClick={onLogout}>Выйти</button>
          </div>
        </div>
      </div>
    </header>
  );
}
