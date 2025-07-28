// components/ForMap/WeatherDisplay.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import './WeatherDisplay.css'; // Импортируем файл стилей

// !!! ВАЖНО: ВАШ API-КЛЮЧ ДЛЯ VISUAL CROSSING WEATHER API !!!
// Убедитесь, что этот ключ 'LZSBVS9Y74M92SKSKBZMFKMEP' активен на вашем аккаунте Visual Crossing.
// Бесплатный план поддерживает исторические данные (до 1 года) и прогноз (до 15 дней).
const VISUAL_CROSSING_API_KEY = 'LZSBVS9Y74M92SKSKBZMFKMEP'; 
const BASE_WEATHER_API_URL = 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline';

export default function WeatherDisplay({ mapCenter, zoom, selectedPolygonBounds, activeAnalysisType }) {
  const map = useMap(); // Получаем экземпляр карты из контекста Leaflet
  const [currentWeather, setCurrentWeather] = useState(null); // Текущие погодные условия (для верхней части)
  const [allTimelineDays, setAllTimelineDays] = useState([]); // Все дни (история + прогноз) для навигации
  const [todaySummary, setTodaySummary] = useState(null); // Сводка за сегодня из массива дней (для H/L)
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isWidgetVisible, setIsWidgetVisible] = useState(false); // Состояние видимости виджета, по умолчанию скрыт

  // Состояние для навигации по дням в нижней части виджета
  const [displayIndex, setDisplayIndex] = useState(0); 
  const [transitionClass, setTransitionClass] = useState(''); // Для анимации

  // Функция для получения эмодзи погоды на основе кода иконки Visual Crossing
  const getWeatherEmoji = (iconCode) => {
    switch (iconCode) {
      case 'clear-day': return '☀️';
      case 'clear-night': return '🌙';
      case 'partly-cloudy-day': return '⛅';
      case 'partly-cloudy-night': return '☁️🌙';
      case 'cloudy': return '☁️';
      case 'rain': return '🌧️';
      case 'snow': return '❄️';
      case 'wind': return '🌬️';
      case 'fog': return '🌫️';
      case 'thunder-rain': return '⛈️';
      case 'thunder-showers-day': return '⛈️';
      case 'thunder-showers-night': return '⛈️';
      case 'showers-day': return '🌦️';
      case 'showers-night': return '🌧️';
      case 'hail': return '🌨️';
      default: return '❓'; // Неизвестная погода
    }
  };

  // Вспомогательная функция для форматирования даты в YYYY-MM-DD
  const formatDate = (date) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) { // Проверяем, является ли дата валидной
      console.error("Ошибка: Неверная дата передана в formatDate:", date);
      return null; // Возвращаем null или пустую строку, если дата невалидна
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Функция для получения данных о погоде
  const fetchWeatherData = useCallback(async (lat, lon) => {
    if (!VISUAL_CROSSING_API_KEY) { 
      setError('Ошибка: API-ключ Visual Crossing не установлен. Пожалуйста, замените его на ваш реальный ключ.');
      setIsLoading(false); // Убедимся, что загрузка завершилась
      return;
    }
    setIsLoading(true);
    setError(null);
    setCurrentWeather(null);
    setAllTimelineDays([]);
    setTodaySummary(null);
    setDisplayIndex(0); 

    try {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30); // 30 дней назад
      const fifteenDaysFromNow = new Date();
      fifteenDaysFromNow.setDate(today.getDate() + 15); // 15 дней вперед (лимит бесплатного тарифа)

      const thirtyDaysAgoFormatted = formatDate(thirtyDaysAgo);
      const fifteenDaysFromNowFormatted = formatDate(fifteenDaysFromNow);

      // Если какая-то из дат невалидна, прекращаем запрос
      if (!thirtyDaysAgoFormatted || !fifteenDaysFromNowFormatted) {
        throw new Error('Не удалось сформировать корректные даты для запроса погоды.');
      }

      // Единый запрос для текущих условий, исторических данных и прогноза
      // Запрашиваем данные на весь период, чтобы сформировать единую временную шкалу
      const response = await fetch(
        `${BASE_WEATHER_API_URL}/${lat},${lon}/${thirtyDaysAgoFormatted}/${fifteenDaysFromNowFormatted}?unitGroup=metric&key=${VISUAL_CROSSING_API_KEY}&lang=ru&include=current,days`
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка загрузки погоды: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      console.log("Данные погоды от API:", data); // Выводим полные данные для отладки

      // Устанавливаем текущие погодные условия для верхней части виджета
      if (data.currentConditions) {
        let currentDatetimeForDisplay = data.currentConditions.datetime;
        
        // Visual Crossing API currentConditions.datetime часто предоставляет только время (например, "14:30:00").
        // Нам нужно объединить его с сегодняшней датой, чтобы new Date() мог его корректно разобрать.
        if (currentDatetimeForDisplay && currentDatetimeForDisplay.includes(':') && !currentDatetimeForDisplay.includes('-')) {
          const todayDateString = formatDate(new Date()); // Получаем сегодняшнюю дату в формате YYYY-MM-DD
          currentDatetimeForDisplay = `${todayDateString}T${currentDatetimeForDisplay}`; // Формируем ISO-подобную строку
        }

        setCurrentWeather({
          ...data.currentConditions,
          datetime: currentDatetimeForDisplay // Используем объединенное или оригинальное значение datetime
        });
      } else {
        setError('Не удалось получить текущие погодные условия из ответа API.');
      }

      // Устанавливаем все данные временной шкалы (история + прогноз) для навигации
      if (data.days && data.days.length > 0) {
        setAllTimelineDays(data.days);
        // Находим индекс сегодняшнего дня в массиве allTimelineDays
        const todayDateString = formatDate(today);
        const todayIndexInTimeline = data.days.findIndex(day => day.datetime === todayDateString);
        setDisplayIndex(todayIndexInTimeline !== -1 ? todayIndexInTimeline : 0); // Устанавливаем начальный индекс на сегодня

        // Устанавливаем сводку за сегодня для отображения H/L в главной секции
        if (todayIndexInTimeline !== -1) {
          setTodaySummary(data.days[todayIndexInTimeline]);
        }
      } else {
        setError('Не удалось получить данные временной шкалы (история/прогноз) из ответа API.');
      }

    } catch (err) {
      console.error('Ошибка при получении данных о погоде:', err);
      setError(err.message || 'Не удалось загрузить данные о погоде.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Эффект для обновления погоды: теперь только при монтировании и затем раз в час
  useEffect(() => {
    if (!map) return;

    let targetLat, targetLon;

    // Определяем координаты для запроса
    if (activeAnalysisType && activeAnalysisType !== 'none' && selectedPolygonBounds) {
        const center = selectedPolygonBounds.getCenter();
        targetLat = center.lat;
        targetLon = center.lng;
        console.log("WeatherDisplay: Используем центр полигона для погоды:", targetLat, targetLon);
    } else {
        const currentCenter = map.getCenter();
        targetLat = currentCenter.lat;
        targetLon = currentCenter.lng;
        console.log("WeatherDisplay: Используем центр карты для погоды:", targetLat, targetLon);
    }

    // Вызываем запрос погоды сразу при монтировании
    fetchWeatherData(targetLat, targetLon);

    // Устанавливаем интервал для обновления раз в час (3600000 миллисекунд = 1 час)
    const intervalId = setInterval(() => {
        // Пересчитываем координаты на случай, если карта была перемещена
        let currentTargetLat, currentTargetLon;
        if (activeAnalysisType && activeAnalysisType !== 'none' && selectedPolygonBounds) {
            const center = selectedPolygonBounds.getCenter();
            currentTargetLat = center.lat;
            currentTargetLon = center.lng;
        } else {
            const currentCenter = map.getCenter();
            currentTargetLat = currentCenter.lat;
            currentTargetLon = currentCenter.lng;
        }
        fetchWeatherData(currentTargetLat, currentTargetLon);
    }, 3600000); // Обновление раз в час

    // Очистка интервала при размонтировании компонента
    return () => {
      clearInterval(intervalId);
    };
  }, [map, fetchWeatherData, selectedPolygonBounds, activeAnalysisType]); // Зависимости: map, fetchWeatherData, selectedPolygonBounds, activeAnalysisType

  // Обработчики навигации для кнопок "Предыдущий" и "Следующий"
  const handlePrevDay = () => {
    if (displayIndex > 0) {
      setTransitionClass('slide-out-right');
      setTimeout(() => {
        setDisplayIndex(prev => prev - 1);
        setTransitionClass('slide-in-left');
      }, 300); // Длительность анимации
    }
  };

  const handleNextDay = () => {
    if (displayIndex < allTimelineDays.length - 1) {
      setTransitionClass('slide-out-left');
      setTimeout(() => {
        setDisplayIndex(prev => prev + 1);
        setTransitionClass('slide-in-right');
      }, 300); // Длительность анимации
    }
  };

  // Функция для рендеринга карточки дня (используется для навигации)
  const renderDailyCard = (dayData) => {
    if (!dayData) return null;
    const dateString = dayData.datetime;
    let formattedDate = 'Н/Д';
    if (dateString) {
      const d = new Date(dateString);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      } else {
        console.warn("Предупреждение: Неверная дата в dayData.datetime для daily card:", dateString);
      }
    } else {
      console.warn("Предупреждение: dayData.datetime отсутствует для daily card.");
    }

    return (
      <div className={`weather-daily-card ${transitionClass}`}>
        <p className="weather-daily-card-date">
          {formattedDate}
        </p>
        {dayData.icon && <span className="weather-daily-card-emoji">{getWeatherEmoji(dayData.icon)}</span>}
        <p className="weather-daily-card-temp">{dayData.temp ? dayData.temp.toFixed(0) : 'Н/Д'}°</p>
        <p className="weather-daily-card-conditions">{dayData.conditions || ''}</p>
      </div>
    );
  };

  // Отображение состояния загрузки и ошибок
  // Виджет всегда скрыт, если isWidgetVisible === false
  // Состояния загрузки и ошибки отображаются только если виджет видим
  if (isLoading) {
    return (
      <>
        {/* Кнопка переключения видимости виджета */}
        <button 
          className="toggle-weather-button" 
          onClick={() => setIsWidgetVisible(prev => !prev)}
          title={isWidgetVisible ? 'Скрыть погоду' : 'Показать погоду'}
        >
          <span className="weather-toggle-icon">{isWidgetVisible ? '🌙' : '☀️'}</span>
        </button>
        <div className="weather-widget-container" style={{ display: isWidgetVisible ? 'flex' : 'none' }}>
          <div className="weather-header">
            <h3 className="weather-title">Загрузка погоды...</h3>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {/* Кнопка переключения видимости виджета */}
        <button 
          className="toggle-weather-button" 
          onClick={() => setIsWidgetVisible(prev => !prev)}
          title={isWidgetVisible ? 'Скрыть погоду' : 'Показать погоду'}
        >
          <span className="weather-toggle-icon">{isWidgetVisible ? '🌙' : '☀️'}</span>
        </button>
        <div className="weather-widget-container weather-error-state" style={{ display: isWidgetVisible ? 'flex' : 'none' }}>
          <div className="weather-header">
            <h3 className="weather-title">Ошибка</h3>
          </div>
          <p>{error}</p>
        </div>
      </>
    );
  }

  // Если нет данных о погоде, показываем только кнопку переключения
  if (!currentWeather || allTimelineDays.length === 0) {
    return (
      <>
        {/* Кнопка переключения видимости виджета */}
        <button 
          className="toggle-weather-button" 
          onClick={() => setIsWidgetVisible(prev => !prev)}
          title={isWidgetVisible ? 'Скрыть погоду' : 'Показать погоду'}
        >
          <span className="weather-toggle-icon">{isWidgetVisible ? '🌙' : '☀️'}</span>
        </button>
      </>
    );
  }

  const { temp, feelslike, humidity, windspeed, icon, conditions, datetime } = currentWeather; 
  
  // Убедимся, что datetime существует и валиден перед форматированием
  let currentDate = 'Н/Д';
  if (datetime) {
    const d = new Date(datetime);
    if (!isNaN(d.getTime())) {
      currentDate = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } else {
      console.warn("Предупреждение: Неверная дата в currentWeather.datetime:", datetime);
    }
  } else {
    console.warn("Предупреждение: currentWeather.datetime отсутствует.");
  }

  // Проверка для кнопок навигации
  const isPrevDisabled = displayIndex === 0;
  const isNextDisabled = displayIndex === allTimelineDays.length - 1;

  return (
    <>
      {/* Кнопка переключения видимости виджета */}
      <button 
        className="toggle-weather-button" 
        onClick={() => setIsWidgetVisible(prev => !prev)}
        title={isWidgetVisible ? 'Скрыть погоду' : 'Показать погоду'}
      >
        <span className="weather-toggle-icon">{isWidgetVisible ? '🌙' : '☀️'}</span>
      </button>

      {/* Сам виджет погоды */}
      <div className="weather-widget-container" style={{ display: isWidgetVisible ? 'flex' : 'none' }}>
        <div className="weather-header">
          <h3 className="weather-title">
            <span className="weather-icon-large">{getWeatherEmoji(icon)}</span> Сегодняшняя погода
          </h3>
          <span className="weather-date">{currentDate}</span>
        </div>

        <div className="weather-main">
          <div className="weather-temp-display">
            {icon && <span className="weather-main-emoji">{getWeatherEmoji(icon)}</span>}
            <p className="weather-temp-value">{temp ? temp.toFixed(1) : 'Н/Д'}°</p>
          </div>
          <div className="weather-description-feels-like">
            <p className="weather-description">{conditions || 'нет данных'}</p>
            <p className="weather-feels-like">Ощущается как {feelslike ? feelslike.toFixed(1) : 'Н/Д'}°C</p>
            {/* H/L для текущего дня берем из todaySummary */}
            {todaySummary && (
              <p className="weather-feels-like">
                H:{todaySummary.tempmax ? todaySummary.tempmax.toFixed(1) : 'Н/Д'}° L:{todaySummary.tempmin ? todaySummary.tempmin.toFixed(1) : 'Н/Д'}°
              </p>
            )}
          </div>
        </div>

        <div className="weather-details-grid">
          <div className="weather-detail-item">
            <span className="weather-detail-icon">💧</span>
            <div>
              <p className="weather-detail-value">{humidity ? humidity.toFixed(0) : 'Н/Д'}%</p>
              <p className="weather-detail-label">Влажность</p>
            </div>
          </div>
          <div className="weather-detail-item">
            <span className="weather-detail-icon">💨</span>
            <div>
              <p className="weather-detail-value">{windspeed ? windspeed.toFixed(1) : 'Н/Д'} м/с</p>
              <p className="weather-detail-label">Скорость ветра</p>
            </div>
          </div>
        </div>

        {/* Навигация по дням (история и прогноз) */}
        {allTimelineDays.length > 0 && (
          <div className="weather-daily-navigation">
            <button onClick={handlePrevDay} disabled={isPrevDisabled} className="weather-nav-button">
              &lt;
            </button>
            {renderDailyCard(allTimelineDays[displayIndex])}
            <button onClick={handleNextDay} disabled={isNextDisabled} className="weather-nav-button">
              &gt;
            </button>
          </div>
        )}
      </div>
    </>
  );
}
