import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Chat.css';
import { jwtDecode } from 'jwt-decode';

const MAX_MESSAGES_IN_HISTORY = 20;
const DEMO_CHAT_MESSAGE_LIMIT = 100; // Лимит сообщений для демо-режима
const BASE_API_URL = 'http://localhost:8080';

export default function ChatPage({ handleLogout }) {
  const [message, setMessage] = useState("");
  const [chatHistories, setChatHistories] = useState({});
  const [currentMessages, setCurrentMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const [hideIntro, setHideIntro] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedPolygonId, setSelectedPolygonId] = useState(null);
  const [jwtToken, setJwtToken] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userPolygons, setUserPolygons] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [polygonToDelete, setPolygonToDelete] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [isResizing, setIsResizing] = useState(false);
  const [userRole, setUserRole] = useState(null); // 'DEMO' or 'USER'

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const sidebarRef = useRef(null);
  const chatHistoriesRef = useRef(chatHistories); // Ref for current chatHistories state

  // Обновляем ссылку на chatHistories при каждом изменении chatHistories
  useEffect(() => {
    chatHistoriesRef.current = chatHistories;
  }, [chatHistories]);

  // Прокрутка к последнему сообщению
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Эффект для прокрутки при изменении сообщений
  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  // Логика изменения размера сайдбара
  const startResizing = useCallback((e) => {
    if (window.innerWidth > 768) {
      setIsResizing(true);
    }
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resizeSidebar = useCallback((e) => {
    if (isResizing && sidebarRef.current) {
      const newWidth = e.clientX - sidebarRef.current.getBoundingClientRect().left;
      if (newWidth > 150 && newWidth < 400) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resizeSidebar);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resizeSidebar);
      window.removeEventListener('mouseup', stopResizing);
    };
    return () => {
      window.removeEventListener('mousemove', resizeSidebar);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resizeSidebar, stopResizing]);

  // useCallback для fetchUserPolygons, чтобы избежать лишних ререндеров
  const fetchUserPolygons = useCallback(async (token, role) => {
    if (role === 'DEMO') {
        try {
            const storedPolygons = localStorage.getItem('demoPolygons');
            if (storedPolygons) {
                const parsedPolygons = JSON.parse(storedPolygons);
                setUserPolygons(parsedPolygons);
                const initialChatHistories = {};
                parsedPolygons.forEach(polygon => {
                    initialChatHistories[polygon.id] = [];
                });
                setChatHistories(initialChatHistories);

                const lastSelectedId = localStorage.getItem('lastSelectedPolygonId');
                if (lastSelectedId && parsedPolygons.some(p => p.id === lastSelectedId)) {
                    setSelectedPolygonId(lastSelectedId);
                } else if (parsedPolygons.length > 0) {
                    setSelectedPolygonId(parsedPolygons[0].id);
                    localStorage.setItem('lastSelectedPolygonId', parsedPolygons[0].id);
                } else {
                    setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'У вас пока нет сохраненных полигонов. Создайте их, чтобы начать диалог.' }]);
                    localStorage.removeItem('lastSelectedPolygonId');
                }
            } else {
                setUserPolygons([]);
                setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'У вас пока нет сохраненных полигонов. Создайте их, чтобы начать диалог.' }]);
                localStorage.removeItem('lastSelectedPolygonId');
            }
        } catch (e) {
            console.error("Error loading demo polygons from localStorage:", e);
            localStorage.removeItem('demoPolygons');
            setUserPolygons([]);
            setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'Ошибка загрузки демо-полигонов.' }]);
        }
        return;
    }

    // Логика для USER роли (загрузка с бэкенда)
    if (!token) {
      console.warn("Токен отсутствует, не могу загрузить полигоны.");
      return;
    }
    try {
      const response = await fetch(`${BASE_API_URL}/api/polygons/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setUserPolygons(data);
          const initialChatHistories = {};
          data.forEach(polygon => {
            initialChatHistories[polygon.id] = [];
          });
          setChatHistories(initialChatHistories);

          const lastSelectedId = localStorage.getItem('lastSelectedPolygonId');
          if (lastSelectedId && data.some(p => p.id === lastSelectedId)) {
            setSelectedPolygonId(lastSelectedId);
          } else {
            setSelectedPolygonId(data[0].id);
            localStorage.setItem('lastSelectedPolygonId', data[0].id);
          }
        } else {
          if (isLoggedIn) {
              setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'У вас пока нет сохраненных полигонов. Создайте их, чтобы начать диалог.' }]);
              localStorage.removeItem('lastSelectedPolygonId');
          }
        }
      } else {
        console.error("Failed to fetch polygons:", response.statusText);
        if (response.status === 401 || response.status === 403) {
          handleLogout();
        }
        setCurrentMessages(prev => [...prev, { sender: 'ai', text: `Не удалось загрузить полигоны. Ошибка: ${response.status}.` }]);
      }
    } catch (error) {
      console.error("Error fetching polygons:", error);
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'Не удалось загрузить полигоны. Ошибка сети или сервера.' }]);
    }
  }, [isLoggedIn, handleLogout]);

  // useCallback для fetchPolygonChatHistory, чтобы избежать лишних ререндеров
  const fetchPolygonChatHistory = useCallback(async (polygonId, token) => {
    if (userRole === 'DEMO') {
        try {
            const storedChatHistories = localStorage.getItem('demoChatHistories');
            if (storedChatHistories) {
                const parsedHistories = JSON.parse(storedChatHistories);
                const historyForPolygon = parsedHistories[polygonId] || [];
                setChatHistories(prev => ({ ...prev, [polygonId]: historyForPolygon }));
                setCurrentMessages(historyForPolygon);
                return historyForPolygon;
            }
        } catch (e) {
            console.error("Error loading demo chat histories from localStorage:", e);
            localStorage.removeItem('demoChatHistories');
        }
        setCurrentMessages([]);
        return [];
    }

    // Логика для USER роли (загрузка с бэкенда)
    if (!token) {
      console.warn("Токен отсутствует, не могу загрузить историю чата.");
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'Ошибка: Токен отсутствует для загрузки истории чата.' }]);
      return [];
    }
    try {
      const response = await fetch(`${BASE_API_URL}/api/chat/polygons/${polygonId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.ok) {
        const data = await response.json();
        setChatHistories(prev => ({
          ...prev,
          [polygonId]: data.map(msg => ({ sender: msg.sender, text: msg.text }))
        }));
        setCurrentMessages(data.map(msg => ({ sender: msg.sender, text: msg.text })));
        return data;
      } else {
        const errorText = await response.text();
        console.error(`Failed to fetch chat history: ${response.status} - ${errorText}`);
        if (response.status === 401 || response.status === 403) {
          handleLogout();
        }
        setCurrentMessages(prev => [...prev, { sender: 'ai', text: `Не удалось загрузить историю чата для полигона. Ошибка: ${response.status}.` }]);
        return [];
      }
    } catch (error) {
      console.error("Error fetching chat history:", error);
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: `Не удалось загрузить историю чата для полигона. Ошибка сети или парсинга.` }]);
      return [];
    }
  }, [userRole, handleLogout]);

  // Инициализация токена и загрузка полигонов при монтировании компонента
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setJwtToken(token);
      setIsLoggedIn(true);
      setHideIntro(true);

      try {
        const decodedToken = jwtDecode(token);
        const roles = decodedToken.roles || [];
        if (roles.includes('ROLE_DEMO')) {
            setUserRole('DEMO');
            fetchUserPolygons(token, 'DEMO'); // Загружаем демо-полигоны
        } else {
            setUserRole('USER');
            fetchUserPolygons(token, 'USER'); // Загружаем полигоны пользователя
        }
      } catch (error) {
        console.error("Failed to decode JWT token:", error);
        setIsLoggedIn(false);
        localStorage.removeItem('token');
        if (handleLogout) handleLogout();
      }
    } else {
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'Для использования чата необходима аутентификация. Пожалуйста, войдите на сайт.' }]);
      setIsLoggedIn(false);
      localStorage.removeItem('lastSelectedPolygonId');
      setUserRole(null);
    }
  }, [fetchUserPolygons, handleLogout]);

  // Функция отправки сообщения на бэкенд (теперь общая для всех ролей, но с учетом DEMO_CHAT_MESSAGE_LIMIT)
  const sendMessageToBackend = useCallback(async (textToSend, polygonId) => {
    setIsTyping(true); // Включаем индикатор набора текста

    // Добавляем сообщение пользователя в текущий чат и историю локально
    setCurrentMessages(prev => [...prev, { sender: 'user', text: textToSend }]);
    setChatHistories(prev => ({
      ...prev,
      [polygonId]: [...(prev[polygonId] || []), { sender: 'user', text: textToSend }]
    }));

    // Проверка лимита сообщений для DEMO-пользователей
    if (userRole === 'DEMO') {
        const currentPolygonHistory = chatHistoriesRef.current[polygonId] || [];
        if (currentPolygonHistory.filter(msg => msg.sender === 'user').length >= DEMO_CHAT_MESSAGE_LIMIT) {
            // Откатываем последнее сообщение пользователя, если лимит достигнут
            setChatHistories(prev => ({
                ...prev,
                [polygonId]: (prev[polygonId] || []).slice(0, -1)
            }));
            setCurrentMessages(prev => prev.slice(0, -1));

            setCurrentMessages(prev => [...prev, { sender: 'ai', text: `В демо-режиме количество сообщений ограничено ${DEMO_CHAT_MESSAGE_LIMIT}. Пожалуйста, зарегистрируйтесь для неограниченного доступа.` }]);
            setIsTyping(false); // Выключаем индикатор
            setMessage('');
            return; // Выходим, чтобы не отправлять на бэкенд
        }
    }

    // Если нет токена или полигона, показываем ошибку и откатываем сообщение
    if (!jwtToken || !polygonId) {
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'Ошибка: Вы не авторизованы или полигон не выбран.' }]);
      setIsTyping(false); // Выключаем индикатор
      setChatHistories(prev => ({
        ...prev,
        [polygonId]: (prev[polygonId] || []).slice(0, -1)
      }));
      setCurrentMessages(prev => prev.slice(0, -1));
      return;
    }

    // Формирование контекста полигона для ИИ
    const currentPolygonHistory = chatHistoriesRef.current[polygonId] || [];
    const selectedPolygon = userPolygons.find(p => p.id === polygonId);
    let polygonContext = "";
    if (selectedPolygon) {
        polygonContext = `Ты работаешь с полигоном. Вот его данные: Название: "${selectedPolygon.name}", Культура: "${selectedPolygon.crop}". Комментарий: "${selectedPolygon.comment || 'нет'}".`;

        if (selectedPolygon.geoJson) {
            try {
                const geoJsonParsed = JSON.parse(selectedPolygon.geoJson);
                let representativeCoords = null;
                let geoInfo = "";

                if (geoJsonParsed && geoJsonParsed.type) {
                    if (geoJsonParsed.type === 'Point' && Array.isArray(geoJsonParsed.coordinates) && geoJsonParsed.coordinates.length >= 2) {
                        representativeCoords = geoJsonParsed.coordinates;
                        geoInfo = `Точка: Широта ${representativeCoords[1]}, Долгота ${representativeCoords[0]}`;
                    } else if (geoJsonParsed.type === 'Polygon' && Array.isArray(geoJsonParsed.coordinates) && geoJsonParsed.coordinates[0] && geoJsonParsed.coordinates[0][0] && geoJsonParsed.coordinates[0][0].length >= 2) {
                        representativeCoords = geoJsonParsed.coordinates[0][0];
                        geoInfo = `Полигон (первая точка): Широта ${representativeCoords[1]}, Долгота ${representativeCoords[0]}`;
                    } else {
                        geoInfo = `Геоданные (структура): ${geoJsonParsed.type}`;
                    }
                }

                if (geoInfo) {
                    polygonContext += ` Местоположение: ${geoInfo}. Используй эти геоданные для определения местоположения и районирования культур, если это возможно.`;
                } else {
                    polygonContext += ` Геоданные (не удалось распарсить): ${selectedPolygon.geoJson}. Используй эти геоданные для определения местоположения и районирования культур, если это возможно.`;
                }

            } catch (e) {
                console.error("Ошибка парсинга geoJson:", e);
                polygonContext += ` Геоданные (не удалось распарсить): ${selectedPolygon.geoJson}`;
            }
        }
        polygonContext += ` Когда тебя спрашивают об общей информации по текущему полигону (например, "расскажи мне инфу про этот полигон"), отвечай кратко (2-3 предложения), фокусируясь на названии полигона и его культуре. Сделай ответ интересным.`;
    }

    // Формируем сообщения для OpenAI с правильными полями 'role' и 'content'
    let messagesForOpenAI = [];
    if (polygonContext) {
        messagesForOpenAI.push({
            role: 'system', // 'role' вместо 'sender'
            content: polygonContext // 'content' вместо 'text'
        });
    }

    messagesForOpenAI = messagesForOpenAI.concat(currentPolygonHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant', // Маппинг 'sender' в 'role'
      content: msg.text // Маппинг 'text' в 'content'
    })));

    const offset = polygonContext ? 1 : 0;
    if (messagesForOpenAI.length > MAX_MESSAGES_IN_HISTORY + offset) {
      messagesForOpenAI = messagesForOpenAI.slice(-(MAX_MESSAGES_IN_HISTORY + offset));
    }

    messagesForOpenAI.push({ role: 'user', content: textToSend }); // 'role' и 'content' для нового сообщения

    // Отправка запроса на бэкенд для получения ответа от ИИ (общая для всех ролей)
    try {
      const response = await fetch(`${BASE_API_URL}/api/chat/polygons/${polygonId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ message: textToSend, history: messagesForOpenAI }), // Отправляем messagesForOpenAI
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`HTTP error! status: ${response.status} - ${errorData.error || 'Unknown error'}`);
        setCurrentMessages(prev => [...prev, { sender: 'ai', text: `Ошибка сервера: ${response.status} - ${errorData.error || 'Unknown error'}` }]);

        if (response.status === 401 || response.status === 403) {
          setIsLoggedIn(false);
          localStorage.removeItem('token');
          if (handleLogout) handleLogout();
        }
        // Откатываем сообщение пользователя, если сервер вернул ошибку
        setChatHistories(prev => ({
          ...prev,
          [polygonId]: (prev[polygonId] || []).slice(0, -1)
        }));
        setCurrentMessages(prev => prev.slice(0, -1));
        return;
      }
      const data = await response.json();
      const botResponse = data.error ? data.error : data.reply;

      setChatHistories(prev => {
        const updatedHistory = [...(prev[polygonId] || []), { sender: 'ai', text: botResponse }];
        const newChatHistories = { ...prev, [polygonId]: updatedHistory };
        // Если DEMO пользователь, сохраняем историю в localStorage
        if (userRole === 'DEMO') {
            localStorage.setItem('demoChatHistories', JSON.stringify(newChatHistories));
        }
        return newChatHistories;
      });
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: botResponse }]);

    } catch (error) {
      console.error("Error sending message:", error);
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: `Ошибка сети или сервера при отправке сообщения: ${error.message}` }]);
      // Откатываем сообщение пользователя при ошибке сети/сервера
      setChatHistories(prev => ({
        ...prev,
        [polygonId]: (prev[polygonId] || []).slice(0, -1)
      }));
      setCurrentMessages(prev => prev.slice(0, -1));
    } finally {
      setIsTyping(false); // Выключаем индикатор набора текста
      setMessage('');
    }
  }, [jwtToken, userPolygons, userRole, handleLogout]); // userRole добавлен в зависимости

  // Обработчик отправки сообщения
  const handleSend = () => {
    if (!message.trim() || !selectedPolygonId) return;
    sendMessageToBackend(message, selectedPolygonId);
  }; 

  // Обработчик нажатия клавиши Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && isLoggedIn && selectedPolygonId) {
      handleSend();
    }
  };

  // Обработчик клика по полигону
  const handlePolygonClick = useCallback(async (polygon) => {
    setSelectedPolygonId(polygon.id);
    localStorage.setItem('lastSelectedPolygonId', polygon.id);
    setMessage('');

    // Загрузка истории чата в зависимости от роли
    await fetchPolygonChatHistory(polygon.id, jwtToken);
    
    if (window.innerWidth <= 768) {
        setIsMobileSidebarOpen(false);
    }
  }, [jwtToken, fetchPolygonChatHistory]);

  // *** Удален handleCreatePolygon и связанная логика ***

  // Обработчик очистки истории (показывает модальное окно)
  const handleClearHistory = useCallback(() => {
    if (!selectedPolygonId || !jwtToken) {
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'Ошибка: Полигон не выбран или вы не авторизованы.' }]);
      return;
    }
    setPolygonToDelete(selectedPolygonId);
    setShowConfirmModal(true);
  }, [selectedPolygonId, jwtToken]);

  // Подтверждение очистки истории
  const confirmClearHistory = useCallback(async () => {
    setShowConfirmModal(false);
    setIsTyping(true);

    if (userRole === 'DEMO') {
        setChatHistories(prev => {
            const newChatHistories = { ...prev };
            newChatHistories[polygonToDelete] = [];
            localStorage.setItem('demoChatHistories', JSON.stringify(newChatHistories));
            return newChatHistories;
        });
        if (selectedPolygonId === polygonToDelete) {
            setCurrentMessages([]);
        }
        setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'История чата успешно очищена локально (демо-режим).' }]);
        setIsTyping(false);
        setPolygonToDelete(null);
        return;
    }

    // Логика для USER роли (удаление через бэкенд)
    try {
      const response = await fetch(`${BASE_API_URL}/api/chat/polygons/${polygonToDelete}/messages`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        },
      });

      if (response.ok) {
        setChatHistories(prev => {
          const newChatHistories = { ...prev };
          newChatHistories[polygonToDelete] = [];
          return newChatHistories;
        });
        if (selectedPolygonId === polygonToDelete) {
            setCurrentMessages([]);
        }
        setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'История чата успешно очищена.' }]);
      } else {
        const errorText = await response.text();
        console.error(`Failed to clear chat history: ${response.status} - ${errorText}`);
        setCurrentMessages(prev => [...prev, { sender: 'ai', text: `Не удалось очистить историю чата. Ошибка: ${response.status}.` }]);
        if (response.status === 401 || response.status === 403) {
          handleLogout();
        }
      }
    } catch (error) {
      console.error("Error clearing chat history:", error);
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: `Не удалось очистить историю чата. Ошибка сети или сервера: ${error.message}` }]);
    } finally {
        setIsTyping(false);
        setPolygonToDelete(null);
    }
  }, [selectedPolygonId, jwtToken, userRole, handleLogout, polygonToDelete]);

  // Отмена очистки истории
  const cancelClearHistory = useCallback(() => {
    setShowConfirmModal(false);
    setPolygonToDelete(null);
  }, []);

  // Обработчик выхода из системы
  const onLogout = useCallback(() => {
    if (userRole === 'DEMO') {
      localStorage.removeItem('demoPolygons');
      localStorage.removeItem('demoChatHistories');
      localStorage.removeItem('lastSelectedPolygonId');
      console.log("Demo user data cleared from localStorage.");
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('lastSelectedPolygonId');
      console.log("User data cleared from localStorage.");
    }
    handleLogout();
  }, [userRole, handleLogout]);

  // Эффект для закрытия мобильного сайдбара при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isMobileSidebarOpen &&
        sidebarRef.current && !sidebarRef.current.contains(event.target) &&
        !event.target.closest('.menu-button')
      ) {
        setIsMobileSidebarOpen(false);
      }
    };

    if (isMobileSidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    };

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileSidebarOpen]);

  return (
    <div className="chat-container">
      <div className={`overlay ${isMobileSidebarOpen ? 'active' : ''}`} onClick={() => setIsMobileSidebarOpen(false)}></div>

      <div
        ref={sidebarRef}
        className={`chat-sidebar ${window.innerWidth <= 768 && isMobileSidebarOpen ? 'active' : ''}`}
        style={{ width: window.innerWidth > 768 ? sidebarWidth : '' }}
      >
        <h3 className="sidebar-title">Мои Полигоны</h3>
        <div className="polygon-buttons-container">
          {userPolygons.length > 0 ? (
            userPolygons.map((polygon) => (
              <button
                key={polygon.id}
                className={`polygon-button ${selectedPolygonId === polygon.id ? "selected" : ""}`}
                onClick={() => handlePolygonClick(polygon)}
                disabled={!isLoggedIn}
              >
                <span className="polygon-name">{polygon.name} ({polygon.crop || 'Нет культуры'})</span>
                {/* Кнопка очистки истории для конкретного полигона */}
                <span
                  className="clear-polygon-button"
                  onClick={(e) => {
                    e.stopPropagation(); // Предотвращаем срабатывание handlePolygonClick
                    handleClearHistory(polygon.id);
                  }}
                  title="Очистить историю для этого полигона"
                >
                  &#x2715;
                </span>
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

        {/* Кнопка "Создать полигон" удалена */}
        {/*
        {isLoggedIn && (
          <button
            className="create-polygon-button"
            onClick={handleCreatePolygon}
            disabled={isTyping}
          >
            Создать полигон
          </button>
        )}
        */}

        {selectedPolygonId && isLoggedIn && (
          <button
            className="clear-history-button"
            onClick={handleClearHistory}
            disabled={isTyping}
          >
            Очистить историю
          </button>
        )}
        {window.innerWidth > 768 && (
          <div className="chat-sidebar-resizer" onMouseDown={startResizing}></div>
        )}
      </div>

      <div className="chat-main">
        <div className="chat-header">
          <button className="menu-button" onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}>
            &#9776;
          </button>
          <span className="chat-header-title">
            {selectedPolygonId ? userPolygons.find(p => p.id === selectedPolygonId)?.name : 'Чат'}
          </span>
          <div style={{width: '40px'}}></div> {/* Для выравнивания */}
        </div>

        <div className="messages-container">
          {!hideIntro && (
            <div className="chat-intro">
              <h2>Агрочат ассистент</h2>
              <p>Начните диалог, выбрав полигон слева.</p>
              {!isLoggedIn && (
                <p className="login-prompt">Для использования чата необходима аутентификация.</p>
              )}
            </div>
          )}
          {currentMessages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender}`}>
              {msg.text}
            </div>
          ))}
          {isTyping && (
            <div className="message ai">
              <div className="typing-indicator">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <input
            type="text"
            placeholder={isLoggedIn && selectedPolygonId && userRole === 'DEMO' && currentMessages.filter(msg => msg.sender === 'user').length >= DEMO_CHAT_MESSAGE_LIMIT ? `Достигнут лимит ${DEMO_CHAT_MESSAGE_LIMIT} сообщений в демо-режиме.` : (isLoggedIn && selectedPolygonId ? "Введите сообщение..." : "Выберите полигон или войдите в систему...")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!isLoggedIn || !selectedPolygonId || (userRole === 'DEMO' && currentMessages.filter(msg => msg.sender === 'user').length >= DEMO_CHAT_MESSAGE_LIMIT)}
          />
          <button className="send-button" onClick={handleSend} disabled={!isLoggedIn || !selectedPolygonId || (userRole === 'DEMO' && currentMessages.filter(msg => msg.sender === 'user').length >= DEMO_CHAT_MESSAGE_LIMIT)}>
            ➤
          </button>
        </div>
      </div>

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
