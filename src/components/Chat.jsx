import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Chat.css';

// Максимальное количество сообщений в истории, отправляемых в OpenAI API
// Это помогает избежать ошибки "context_length_exceeded"
const MAX_MESSAGES_IN_HISTORY = 20; // Можно настроить это значение

// Новый базовый URL для вашего развернутого бэкенда
const BASE_API_URL = 'http://localhost:8080';

export default function ChatPage() {
  const [message, setMessage] = useState("");
  // chatHistories: объект, где ключи - ID полигонов, значения - массивы сообщений для этого полигона
  const [chatHistories, setChatHistories] = useState({});
  const [currentMessages, setCurrentMessages] = useState([]); // Сообщения для текущего выбранного полигона
  const messagesEndRef = useRef(null);
  const [hideIntro, setHideIntro] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedPolygonId, setSelectedPolygonId] = useState(null); 
  const [jwtToken, setJwtToken] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [userPolygons, setUserPolygons] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false); // Состояние для управления видимостью модального окна

  // Состояния для изменения размера сайдбара
  const [sidebarWidth, setSidebarWidth] = useState(220); // Начальная ширина сайдбара
  const [isResizing, setIsResizing] = useState(false); // Состояние, когда идет изменение размера

  const sidebarRef = useRef(null); // Ref для сайдбара

  // useRef для доступа к актуальным chatHistories без добавления в зависимости useCallback
  const chatHistoriesRef = useRef(chatHistories);
  useEffect(() => {
    chatHistoriesRef.current = chatHistories;
  }, [chatHistories]);

  // Функции для изменения размера сайдбара
  const startResizing = useCallback((e) => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resizeSidebar = useCallback((e) => {
    if (isResizing && sidebarRef.current) {
      const newWidth = e.clientX - sidebarRef.current.getBoundingClientRect().left;
      // Ограничиваем ширину сайдбара
      if (newWidth > 150 && newWidth < 400) { // Минимальная и максимальная ширина
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  // Эффект для добавления и удаления слушателей событий мыши для изменения размера
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resizeSidebar);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resizeSidebar);
      window.removeEventListener('mouseup', stopResizing);
    }
    // Очистка слушателей событий при размонтировании компонента или изменении isResizing
    return () => {
      window.removeEventListener('mousemove', resizeSidebar);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resizeSidebar, stopResizing]);

  // Функция для отправки сообщения на бэкенд
  const sendMessageToBackend = useCallback(async (textToSend, polygonId, isInitialPrompt = false) => {
    setIsTyping(true);

    if (!jwtToken || !polygonId) {
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'Ошибка: Вы не авторизованы или полигон не выбран.' }]);
      setIsTyping(false);
      return;
    }

    // Получаем текущую историю из ref
    const currentPolygonHistory = chatHistoriesRef.current[polygonId] || [];

    // Находим выбранный полигон, чтобы добавить его данные в контекст
    const selectedPolygon = userPolygons.find(p => p.id === polygonId);
    let polygonContext = "";
    if (selectedPolygon) {
        // Изменено системное сообщение для более явного указания ИИ использовать геоданные
        polygonContext = `Ты работаешь с полигоном. Вот его данные: Название: "${selectedPolygon.name}", Культура: "${selectedPolygon.crop}". Комментарий: "${selectedPolygon.comment || 'нет'}".`;
        
        // Добавляем геоданные, если они есть.
        // ВНИМАНИЕ: большие geo_json могут быстро превысить лимит токенов!
        if (selectedPolygon.geo_json) {
            try {
                const geoJsonParsed = JSON.parse(selectedPolygon.geo_json);
                let representativeCoords = null;
                let geoInfo = "";

                if (geoJsonParsed && geoJsonParsed.type) {
                    // Извлекаем репрезентативные координаты в зависимости от типа геометрии
                    if (geoJsonParsed.type === 'Point' && Array.isArray(geoJsonParsed.coordinates) && geoJsonParsed.coordinates.length >= 2) {
                        representativeCoords = geoJsonParsed.coordinates;
                        // GeoJSON обычно lon/lat, для отображения делаем lat/lon
                        geoInfo = `Точка: Широта ${representativeCoords[1]}, Долгота ${representativeCoords[0]}`;
                    } else if (geoJsonParsed.type === 'Polygon' && Array.isArray(geoJsonParsed.coordinates) && geoJsonParsed.coordinates[0] && geoJsonParsed.coordinates[0][0] && geoJsonParsed.coordinates[0][0].length >= 2) {
                        representativeCoords = geoJsonParsed.coordinates[0][0]; // Первая точка внешнего кольца
                        geoInfo = `Полигон (первая точка): Широта ${representativeCoords[1]}, Долгота ${representativeCoords[0]}`;
                    } else if (geoJsonParsed.type === 'MultiPolygon' && Array.isArray(geoJsonParsed.coordinates) && geoJsonParsed.coordinates[0] && geoJsonParsed.coordinates[0][0] && geoJsonParsed.coordinates[0][0][0] && geoJsonParsed.coordinates[0][0][0].length >= 2) {
                        representativeCoords = geoJsonParsed.coordinates[0][0][0]; // Первая точка первого внешнего кольца первого полигона
                        geoInfo = `Мультиполигон (первая точка первого полигона): Широта ${representativeCoords[1]}, Долгота ${representativeCoords[0]}`;
                    } else {
                        // Запасной вариант для других типов геометрии или некорректных данных
                        geoInfo = `Геоданные (структура): ${geoJsonParsed.type}`;
                    }
                }

                if (geoInfo) {
                    polygonContext += ` Местоположение: ${geoInfo}. Используй эти геоданные для определения местоположения и районирования культур, если это возможно.`;
                } else {
                    // Если не удалось извлечь репрезентативные координаты, передаем сырую строку
                    polygonContext += ` Геоданные (JSON): ${selectedPolygon.geo_json}. Используй эти геоданные для определения местоположения и районирования культур, если это возможно.`;
                }

            } catch (e) {
                console.error("Ошибка парсинга geo_json:", e);
                polygonContext += ` Геоданные (не удалось распарсить): ${selectedPolygon.geo_json}`;
            }
        }
        // НОВАЯ ИНСТРУКЦИЯ ДЛЯ ИИ: отвечать кратко и интересно
        // Когда тебя спрашивают об общей информации по текущему полигону (например, "расскажи мне инфу про этот полигон"),
        // отвечай кратко (2-3 предложения), фокусируясь на названии полигона и его культуре. Сделай ответ интересным.
        polygonContext += ` Когда тебя спрашивают об общей информации по текущему полигону (например, "расскажи мне инфу про этот полигон"), отвечай кратко (2-3 предложения), фокусируясь на названии полигона и его культуре. Сделай ответ интересным.`;
    }

    // Формируем сообщения для OpenAI API, включая предыдущий контекст
    let messagesForOpenAI = [];

    // Добавляем контекст полигона как системное сообщение, если он есть
    if (polygonContext) {
        messagesForOpenAI.push({
            role: 'system',
            content: polygonContext
        });
    }

    // Добавляем предыдущие сообщения из истории чата
    messagesForOpenAI = messagesForOpenAI.concat(currentPolygonHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    })));

    // Обрезаем историю, чтобы не превышать лимит контекста
    // Сохраняем только последние MAX_MESSAGES_IN_HISTORY сообщений
    // (плюс системное сообщение, если оно было добавлено)
    const offset = polygonContext ? 1 : 0; // Учитываем системное сообщение
    if (messagesForOpenAI.length > MAX_MESSAGES_IN_HISTORY + offset) {
      messagesForOpenAI = messagesForOpenAI.slice(-(MAX_MESSAGES_IN_HISTORY + offset));
    }

    // Добавляем новое сообщение пользователя
    messagesForOpenAI.push({ role: 'user', content: textToSend });

    // Оптимистично добавляем сообщение пользователя в UI
    setCurrentMessages(prev => [...prev, { sender: 'user', text: textToSend }]);
    setChatHistories(prev => ({
      ...prev,
      [polygonId]: [...(prev[polygonId] || []), { sender: 'user', text: textToSend }]
    }));

    try {
      const res = await fetch(`${BASE_API_URL}/api/chat/polygons/${polygonId}/messages`, { // Использование BASE_API_URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}` 
        },
        body: JSON.stringify({ message: textToSend, history: messagesForOpenAI }), 
      });

      if (!res.ok) {
        const errorData = await res.json(); 
        console.error(`https error! status: ${res.status} - ${errorData.error || 'Неизвестная ошибка'}`);
        setCurrentMessages(prev => [...prev, { sender: 'ai', text: `Ошибка сервера: ${res.status} - ${errorData.error || 'Неизвестная ошибка'}` }]);
        
        if (res.status === 401 || res.status === 403) {
          setIsLoggedIn(false);
          localStorage.removeItem('token');
        }
        // Откатываем оптимистичное обновление при ошибке
        setChatHistories(prev => ({
          ...prev,
          [polygonId]: (prev[polygonId] || []).slice(0, -1)
        }));
        setCurrentMessages(prev => prev.slice(0, -1));
        return;
      }
      const data = await res.json(); 
      console.log(`[sendMessageToBackend] Получен ответ от бэкенда для полигона ${polygonId}:`, data); // ADDED LOG

      const botResponse = data.error ? data.error : data.reply;

      setChatHistories(prev => ({
        ...prev,
        [polygonId]: [...(prev[polygonId] || []), { sender: 'ai', text: botResponse }]
      }));
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: botResponse }]);

    } catch (error) {
      console.error("Ошибка отправки сообщения:", error);
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: `Ошибка сети или сервера при отправке сообщения: ${error.message}` }]);
      // Откатываем оптимистичное обновление при сетевой ошибке
      setChatHistories(prev => ({
        ...prev,
        [polygonId]: (prev[polygonId] || []).slice(0, -1)
      }));
      setCurrentMessages(prev => prev.slice(0, -1));
    } finally {
      setIsTyping(false);
      setMessage('');
    }
  }, [jwtToken, userPolygons]);

  // Функция для загрузки истории чата для конкретного полигона
  // Теперь возвращает загруженные данные
  const fetchPolygonChatHistory = useCallback(async (polygonId, token) => {
    if (!token) {
      console.warn("Токен отсутствует, не могу загрузить историю чата.");
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'Ошибка: Токен отсутствует для загрузки истории чата.' }]);
      return []; // Возвращаем пустой массив в случае ошибки
    }
    try {
      const res = await fetch(`${BASE_API_URL}/api/chat/polygons/${polygonId}`, { // Использование BASE_API_URL
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Ошибка https при загрузке истории чата для полигона ${polygonId}: ${res.status} - ${errorText}`);
        setCurrentMessages(prev => [...prev, { sender: 'ai', text: `Не удалось загрузить историю чата для полигона. Ошибка: ${res.status}.` }]);
        if (res.status === 401 || res.status === 403) {
          setIsLoggedIn(false);
          localStorage.removeItem('token');
        }
        return []; // Возвращаем пустой массив в случае ошибки
      }
      const data = await res.json();
      console.log(`[fetchPolygonChatHistory] Получена история чата для полигона ${polygonId}:`, data); // ADDED LOG
      
      setChatHistories(prev => ({
        ...prev,
        [polygonId]: data.map(msg => ({ sender: msg.sender, text: msg.text }))
      }));
      setCurrentMessages(data.map(msg => ({ sender: msg.sender, text: msg.text }))); // Explicitly update currentMessages
      return data; // Возвращаем загруженные данные
    } catch (error) {
      console.error(`Непредвиденная ошибка при загрузке истории чата для полигона ${polygonId}:`, error);
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: `Не удалось загрузить историю чата для полигона. Ошибка сети или парсинга.` }]);
      return []; // Возвращаем пустой массив в случае ошибки
    }
  }, [jwtToken]); // Удален currentMessages из зависимостей, так как он обновляется внутри

  // Функция для обработки клика по полигону
  const handlePolygonClick = useCallback((polygon) => {
    setSelectedPolygonId(polygon.id); 
    localStorage.setItem('lastSelectedPolygonId', polygon.id); // Сохраняем ID в localStorage
    setMessage(''); // Очищаем поле ввода при выборе полигона
  }, []);

  // Функция для загрузки полигонов пользователя
  const fetchUserPolygons = useCallback(async (token) => {
    if (!token) {
      console.warn("Токен отсутствует, не могу загрузить полигоны.");
      return;
    }
    try {
      const res = await fetch(`${BASE_API_URL}/api/polygons/user`, { // Использование BASE_API_URL
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (!res.ok) {
        console.error(`Ошибка https при загрузке полигонов: ${res.status}`);
        setCurrentMessages(prev => [...prev, { sender: 'ai', text: `Не удалось загрузить полигоны. Ошибка: ${res.status}.` }]);
        if (res.status === 401 || res.status === 403) {
          setIsLoggedIn(false);
          localStorage.removeItem('token');
        }
        throw new Error(`https error! status: ${res.status}`);
      }
      const data = await res.json();
      
      if (data && data.length > 0) {
        setUserPolygons(data);
        const initialChatHistories = {}; // Перенесено сюда, чтобы не очищать глобально
        data.forEach(polygon => {
          initialChatHistories[polygon.id] = []; 
        });
        setChatHistories(initialChatHistories); // Инициализируем chatHistories только здесь
        
        // Попытка загрузить последний выбранный полигон из localStorage
        const lastSelectedId = localStorage.getItem('lastSelectedPolygonId');
        if (lastSelectedId && data.some(p => p.id === lastSelectedId)) {
          setSelectedPolygonId(lastSelectedId);
        } else {
          // Если нет сохраненного ID или он недействителен, выбираем первый полигон
          setSelectedPolygonId(data[0].id); 
          localStorage.setItem('lastSelectedPolygonId', data[0].id);
        }
      } else {
        if (isLoggedIn) {
            setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'У вас пока нет сохраненных полигонов. Создайте их, чтобы начать диалог.' }]);
            localStorage.removeItem('lastSelectedPolygonId'); // Очищаем, если полигонов нет
        }
      }
    } catch (error) {
      console.error("Ошибка загрузки полигонов:", error);
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'Не удалось загрузить полигоны. Ошибка сети или сервера.' }]);
    }
  }, [isLoggedIn]);

  // Эффект для инициализации токена и загрузки полигонов
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setJwtToken(storedToken);
      setIsLoggedIn(true); 
      setHideIntro(true); 
      fetchUserPolygons(storedToken); 
    } else {
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'Для использования чата необходима аутентификация. Пожалуйста, войдите на сайт.' }]);
      setIsLoggedIn(false);
      localStorage.removeItem('lastSelectedPolygonId'); // Очищаем, если пользователь не авторизован
    }
  }, [fetchUserPolygons]); 

  // ЭФФЕКТ: для обработки выбранного полигона
  useEffect(() => {
    const processPolygonSelection = async () => {
      if (selectedPolygonId && jwtToken) {
        // Устанавливаем текущие сообщения из кэша (может быть пустым)
        // Этот шаг важен, чтобы сразу показать то, что уже есть в кэше, пока идет загрузка
        setCurrentMessages(chatHistoriesRef.current[selectedPolygonId] || []); 
        
        // Загружаем актуальную историю чата для выбранного полигона
        await fetchPolygonChatHistory(selectedPolygonId, jwtToken);
      }
    };

    processPolygonSelection();
  }, [selectedPolygonId, jwtToken, fetchPolygonChatHistory]); // userPolygons удален из зависимостей, так как fetchUserPolygons уже вызывает setSelectedPolygonId

  // Эффект для прокрутки сообщений
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentMessages]);

  // НОВАЯ ФУНКЦИЯ: для очистки истории чата (инициирует показ модального окна)
  const handleClearHistory = useCallback(() => {
    if (!selectedPolygonId || !jwtToken) {
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'Ошибка: Полигон не выбран или вы не авторизованы.' }]);
      return;
    }
    setShowConfirmModal(true); // Показываем кастомное модальное окно подтверждения
  }, [selectedPolygonId, jwtToken]);

  // НОВАЯ ФУНКЦИЯ: подтверждение очистки истории (выполняет DELETE запрос)
  const confirmClearHistory = useCallback(async () => {
    setShowConfirmModal(false); // Скрываем модальное окно
    setIsTyping(true); // Показываем индикатор печати, пока идет удаление

    try {
      const res = await fetch(`${BASE_API_URL}/api/chat/polygons/${selectedPolygonId}/messages`, { // Использование BASE_API_URL
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        },
      });

      if (!res.ok) {
        const errorText = await res.text(); // Получаем текст ошибки для не-JSON ответов
        console.error(`Ошибка https при удалении истории чата: ${res.status} - ${errorText}`);
        setCurrentMessages(prev => [...prev, { sender: 'ai', text: `Не удалось очистить историю чата. Ошибка: ${res.status}.` }]);
        if (res.status === 401 || res.status === 403) {
          setIsLoggedIn(false);
          localStorage.removeItem('token');
        }
        return;
      }

      // Очищаем историю на клиенте
      setChatHistories(prev => {
        const newChatHistories = { ...prev };
        newChatHistories[selectedPolygonId] = [];
        return newChatHistories;
      });
      setCurrentMessages([]); // Очищаем текущие сообщения в UI
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'История чата успешно очищена.' }]);

    } catch (error) {
      console.error("Ошибка при очистке истории чата:", error);
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: `Не удалось очистить историю чата. Ошибка сети или сервера: ${error.message}` }]);
    } finally {
        setIsTyping(false); // Скрываем индикатор печати
    }
  }, [selectedPolygonId, jwtToken]);

  // НОВАЯ ФУНКЦИЯ: отмена очистки истории (скрывает модальное окно)
  const cancelClearHistory = useCallback(() => {
    setShowConfirmModal(false); // Скрываем модальное окно
  }, []);

  const handleSend = () => {
    if (!message.trim() || !selectedPolygonId) return; 
    sendMessageToBackend(message, selectedPolygonId);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && isLoggedIn && selectedPolygonId) { 
      handleSend();
    }
  };

  return (
    <div className="chat-container">
      <div 
        ref={sidebarRef} // Привязываем ref к сайдбару
        className="chat-sidebar" 
        style={{ width: sidebarWidth }} // Применяем динамическую ширину
      >
        <h3 className="sidebar-title">Мои Полигоны</h3>
        <div className="polygon-buttons-container">
          {userPolygons.length > 0 ? (
            userPolygons.map((polygon) => (
              <button
                key={polygon.id}
                className={`polygon-button ${selectedPolygonId === polygon.id ? 'selected' : ''}`} 
                onClick={() => handlePolygonClick(polygon)} 
                disabled={!isLoggedIn} 
              >
                {polygon.name} ({polygon.crop})
              </button>
            ))
          ) : (
            isLoggedIn ? (
              <p className="no-polygons-message">У вас пока нет сохраненных полигонов.</p>
            ) : (
              <p className="no-polygons-message">Загрузка полигонов...</p>
            )
          )}
        </div>
        {/* Кнопка "Очистить историю" перенесена вниз сайдбара */}
        {selectedPolygonId && isLoggedIn && (
          <button 
            className="clear-history-button" 
            onClick={handleClearHistory}
            disabled={isTyping}
          >
            Очистить историю
          </button>
        )}
        {/* Ползунок для изменения размера сайдбара */}
        <div className="chat-sidebar-resizer" onMouseDown={startResizing}></div> {/* <<< ИЗМЕНЕНО НА chat-sidebar-resizer */}
      </div>

      <div className="chat-main">
        <div className={`chat-intro ${hideIntro ? 'hide' : ''}`}>
          <h2>Агрочат ассистент</h2>
          <p>Начните диалог, выбрав полигон слева.</p>
          {!isLoggedIn && (
            <p className="login-prompt">Для использования чата необходима аутентификация.</p>
          )}
        </div>

        <div className="messages">
          {currentMessages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender === 'user' ? 'user' : 'bot'}`}>
              {msg.text}
            </div>
          ))}
          {isTyping && (
            <div className="message bot">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef}></div>
        </div>

        <div className="input-area">
          <input
            type="text"
            placeholder={isLoggedIn && selectedPolygonId ? "Введите сообщение..." : "Выберите полигон или войдите в систему..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!isLoggedIn || !selectedPolygonId} 
          />
          <button className="send-button" onClick={handleSend} disabled={!isLoggedIn || !selectedPolygonId}>
            ➤
          </button>
        </div>
      </div>

      {/* Кастомное модальное окно подтверждения */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Подтверждение</h3>
            <p>Вы уверены, что хотите очистить историю чата для этого полигона?</p>
            <div className="modal-actions">
              <button onClick={confirmClearHistory} className="modal-button confirm-button">Да</button>
              <button onClick={cancelClearHistory} className="modal-button cancel-button">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}