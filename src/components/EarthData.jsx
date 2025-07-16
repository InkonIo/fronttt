// src/components/EarthData.jsx
import React, { useEffect, useState } from 'react';
import './EarthData.css'; 

const EarthData = () => {
  const [soilData, setSoilData] = useState(null);
  const [selectedInfo, setSelectedInfo] = useState('');

  useEffect(() => {
    const mockData = {
      humidity: 68,
      soilMoisture: 45,
      t0: 295,
      t10: 289,
      pressure: 1013,
      windSpeed: 5.2
    };
    setSoilData(mockData);
  }, []);

  const handleInfoClick = (type) => {
    if (!soilData) return;

    switch (type) {
      case 'humidity':
        setSelectedInfo(`Влажность воздуха сейчас составляет ${soilData.humidity}% — отличное время для посадки!`);
        break;
      case 'soilMoisture':
        setSelectedInfo(`Влажность почвы составляет ${soilData.soilMoisture}% — почва готова для посадки и полива.`);
        break;
      case 'tempSurface':
        setSelectedInfo(`Температура на поверхности — ${soilData.t0}K. Проверьте условия перед посадкой.`);
        break;
      case 'tempDeep':
        setSelectedInfo(`Температура на глубине 10 см — ${soilData.t10}K. Корневая система будет чувствовать себя комфортно.`);
        break;
      case 'pressure':
        setSelectedInfo(`Давление ${soilData.pressure} гПа — стабильное, благоприятное для работы в поле.`);
        break;
      case 'wind':
        setSelectedInfo(`Ветер ${soilData.windSpeed} м/с — спокойный, не повлияет на обработку растений.`);
        break;
      default:
        setSelectedInfo('');
    }
  };

  return (
    <div className="earth-dashboard-container">
      {/* Hero section with background image */}
      <div className="earth-hero-section">
        <div className="earth-hero-overlay"></div>
        {/* Animated particles */}
        <div className="earth-particles">
          {[...Array(30)].map((_, i) => (
            <div key={i} className="earth-particle" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${4 + Math.random() * 3}s`
            }}></div>
          ))}
        </div>
        
        {/* Content overlay */}
        <div className="earth-hero-content">
          <div className="earth-hero-text-container">
            <h1 className="earth-hero-title">Автоматизированные<br />данные почвы</h1>
            <p className="earth-hero-subtitle">
              Этот раздел предназначен для углубленного мониторинга и отслеживания текущего состояния почвы в режиме реального времени.
            </p>
          </div>
        </div>
      </div>

      {/* Data cards section */}
      <div className="earth-data-section">
        <div className="earth-data-grid">
          <div 
            className="earth-data-card"
            onClick={() => handleInfoClick('humidity')}
          >
            <div className="earth-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8 6 8 12 12 16C16 12 16 6 12 2Z" fill="currentColor"/>
              </svg>
            </div>
            <h3>Влажность</h3>
            <div className="earth-card-value">{soilData?.humidity}%</div>
          </div>

          <div 
            className="earth-data-card"
            onClick={() => handleInfoClick('soilMoisture')}
          >
            <div className="earth-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20Z" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M8 12L10 14L16 8" stroke="currentColor" strokeWidth="2"/>
                <path d="M2 12H4M20 12H22M12 2V4M12 20V22" stroke="currentColor" strokeWidth="1"/>
              </svg>
            </div>
            <h3>Влажность почвы</h3>
            <div className="earth-card-value">{soilData?.soilMoisture}%</div>
          </div>

          <div 
            className="earth-data-card"
            onClick={() => handleInfoClick('tempSurface')}
          >
            <div className="earth-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="10" y="3" width="4" height="12" rx="2" fill="currentColor"/>
                <circle cx="12" cy="17" r="3" fill="currentColor"/>
                <path d="M12 14V17" stroke="white" strokeWidth="1"/>
              </svg>
            </div>
            <h3>Темп. поверх.</h3>
            <div className="earth-card-value">{soilData?.t0}K</div>
          </div>

          <div 
            className="earth-data-card"
            onClick={() => handleInfoClick('tempDeep')}
          >
            <div className="earth-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="10" y="3" width="4" height="12" rx="2" fill="currentColor"/>
                <circle cx="12" cy="17" r="3" fill="currentColor"/>
                <path d="M12 14V17" stroke="white" strokeWidth="1"/>
                <rect x="8" y="20" width="8" height="2" fill="currentColor" opacity="0.6"/>
              </svg>
            </div>
            <h3>Темп. 10см</h3>
            <div className="earth-card-value">{soilData?.t10}K</div>
          </div>

          <div 
            className="earth-data-card"
            onClick={() => handleInfoClick('pressure')}
          >
            <div className="earth-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 12C12.5523 12 13 11.5523 13 11C13 10.4477 12.5523 10 12 10C11.4477 10 11 10.4477 11 11C11 11.5523 11.4477 12 12 12Z" fill="currentColor"/>
                <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <h3>Давление</h3>
            <div className="earth-card-value">{soilData?.pressure}</div>
          </div>

          <div 
            className="earth-data-card"
            onClick={() => handleInfoClick('wind')}
          >
            <div className="earth-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M8 15C8.5 15.5 9.5 16 11 16S13.5 15.5 14 15M8 9C8.5 9.5 9.5 10 11 10S13.5 9.5 14 9M2 12C2.5 12.5 3.5 13 5 13S7.5 12.5 8 12" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <h3>Ветер</h3>
            <div className="earth-card-value">{soilData?.windSpeed}</div>
          </div>
        </div>

        {/* Info display */}
        {selectedInfo && (
          <div className="earth-info-display">
            <p>{selectedInfo}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EarthData;