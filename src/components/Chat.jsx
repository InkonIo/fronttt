import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Chat.css';
import { jwtDecode } from 'jwt-decode'; // Import jwtDecode

// Maximum number of messages in history sent to OpenAI API
// This helps avoid "context_length_exceeded" errors
const MAX_MESSAGES_IN_HISTORY = 20; // This value can be adjusted

// NEW: Limit for chat messages in DEMO mode (user message + AI response = 2 messages)
const DEMO_CHAT_MESSAGE_LIMIT = 100; // Changed limit to 100

// New base URL for your deployed backend
const BASE_API_URL = 'http://localhost:8080';

export default function ChatPage({ handleLogout }) { // Added handleLogout prop
  const [message, setMessage] = useState("");
  // chatHistories: object where keys are polygon IDs, values are arrays of messages for that polygon
  const [chatHistories, setChatHistories] = useState({});
  const [currentMessages, setCurrentMessages] = useState([]); // Messages for the currently selected polygon
  const messagesEndRef = useRef(null);
  const [hideIntro, setHideIntro] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedPolygonId, setSelectedPolygonId] = useState(null); 
  const [jwtToken, setJwtToken] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [userPolygons, setUserPolygons] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false); // State to manage confirmation modal visibility
  const [userRole, setUserRole] = useState(null); // State to store user role

  // States for sidebar resizing
  const [sidebarWidth, setSidebarWidth] = useState(220); // Initial sidebar width
  const [isResizing, setIsResizing] = useState(false); // State when resizing is in progress

  const sidebarRef = useRef(null); // Ref for sidebar

  // useRef to access actual chatHistories without adding to useCallback dependencies
  const chatHistoriesRef = useRef(chatHistories);
  useEffect(() => {
    chatHistoriesRef.current = chatHistories;
  }, [chatHistories]);

  // Functions for sidebar resizing
  const startResizing = useCallback((e) => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resizeSidebar = useCallback((e) => {
    if (isResizing && sidebarRef.current) {
      const newWidth = e.clientX - sidebarRef.current.getBoundingClientRect().left;
      // Limit sidebar width
      if (newWidth > 150 && newWidth < 400) { // Minimum and maximum width
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  // Effect for adding and removing mouse event listeners for resizing
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resizeSidebar);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resizeSidebar);
      window.removeEventListener('mouseup', stopResizing);
    }
    // Cleanup event listeners on component unmount or isResizing change
    return () => {
      window.removeEventListener('mousemove', resizeSidebar);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resizeSidebar, stopResizing]);

  // Function to send message to backend
  const sendMessageToBackend = useCallback(async (textToSend, polygonId) => {
    setIsTyping(true);

    // Optimistically add user message to UI
    setCurrentMessages(prev => [...prev, { sender: 'user', text: textToSend }]);
    setChatHistories(prev => ({
      ...prev,
      [polygonId]: [...(prev[polygonId] || []), { sender: 'user', text: textToSend }]
    }));

    // If DEMO user, check limit first
    if (userRole === 'DEMO') {
        const currentPolygonHistory = chatHistoriesRef.current[polygonId] || [];
        // Check if the demo chat limit has been reached (DEMO_CHAT_MESSAGE_LIMIT user messages)
        if (currentPolygonHistory.filter(msg => msg.sender === 'user').length >= DEMO_CHAT_MESSAGE_LIMIT) {
            // Rollback optimistic update for user message as we are not sending it
            setChatHistories(prev => ({
                ...prev,
                [polygonId]: (prev[polygonId] || []).slice(0, -1)
            }));
            setCurrentMessages(prev => prev.slice(0, -1));

            setCurrentMessages(prev => [...prev, { sender: 'ai', text: `В демо-режиме количество сообщений ограничено ${DEMO_CHAT_MESSAGE_LIMIT}. Пожалуйста, зарегистрируйтесь для неограниченного доступа.` }]);
            setIsTyping(false);
            setMessage('');
            return; // STOP here if limit reached
        }
        // If not limited, proceed to backend call for DEMO user
    }

    // Logic for all users (including DEMO if not limited)
    // ✨ ДОБАВЛЕНО: Логирование перед отправкой запроса
    console.log("sendMessageToBackend: jwtToken =", jwtToken);
    console.log("sendMessageToBackend: userRole =", userRole);
    console.log("sendMessageToBackend: selectedPolygonId =", polygonId);


    if (!jwtToken || !polygonId) {
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'Ошибка: Вы не авторизованы или полигон не выбран.' }]);
      setIsTyping(false);
      // Rollback optimistic update on error
      setChatHistories(prev => ({
        ...prev,
        [polygonId]: (prev[polygonId] || []).slice(0, -1)
      }));
      setCurrentMessages(prev => prev.slice(0, -1));
      return;
    }

    // Get current history from ref
    const currentPolygonHistory = chatHistoriesRef.current[polygonId] || [];

    // Find the selected polygon to add its data to the context
    const selectedPolygon = userPolygons.find(p => p.id === polygonId);
    let polygonContext = "";
    if (selectedPolygon) {
        polygonContext = `Ты работаешь с полигоном. Вот его данные: Название: "${selectedPolygon.name}", Культура: "${selectedPolygon.crop}". Комментарий: "${selectedPolygon.comment || 'нет'}".`;
        
        // Add geodata if available.
        // WARNING: large geo_json can quickly exceed token limit!
        if (selectedPolygon.geoJson) { // Changed from geo_json to geoJson to match PolygonArea entity
            try {
                const geoJsonParsed = JSON.parse(selectedPolygon.geoJson);
                let representativeCoords = null;
                let geoInfo = "";

                if (geoJsonParsed && geoJsonParsed.type) {
                    // Extract representative coordinates depending on geometry type
                    if (geoJsonParsed.type === 'Point' && Array.isArray(geoJsonParsed.coordinates) && geoJsonParsed.coordinates.length >= 2) {
                        representativeCoords = geoJsonParsed.coordinates;
                        // GeoJSON is usually lon/lat, for display we make it lat/lon
                        geoInfo = `Точка: Широта ${representativeCoords[1]}, Долгота ${representativeCoords[0]}`;
                    } else if (geoJsonParsed.type === 'Polygon' && Array.isArray(geoJsonParsed.coordinates) && geoJsonParsed.coordinates[0] && geoJsonParsed.coordinates[0][0] && geoJsonParsed.coordinates[0][0].length >= 2) {
                        representativeCoords = geoJsonParsed.coordinates[0][0]; // First point of outer ring
                        geoInfo = `Полигон (первая точка): Широта ${representativeCoords[1]}, Долгота ${representativeCoords[0]}`;
                    } else if (geoJsonParsed.type === 'MultiPolygon' && Array.isArray(geoJsonParsed.coordinates) && geoJsonParsed.coordinates[0] && geoJsonParsed.coordinates[0][0] && geoJsonParsed.coordinates[0][0][0] && geoJsonParsed.coordinates[0][0][0].length >= 2) {
                        representativeCoords = geoJsonParsed.coordinates[0][0][0]; // First point of the first outer ring of the first polygon
                        geoInfo = `Мультиполигон (первая точка первого полигона): Широта ${representativeCoords[1]}, Долгота ${representativeCoords[0]}`;
                    } else {
                        // Fallback for other geometry types or invalid data
                        geoInfo = `Геоданные (структура): ${geoJsonParsed.type}`;
                    }
                }

                if (geoInfo) {
                    polygonContext += ` Местоположение: ${geoInfo}. Используй эти геоданные для определения местоположения и районирования культур, если это возможно.`;
                } else {
                    // If representative coordinates could not be extracted, pass raw string
                    polygonContext += ` Геоданные (не удалось распарсить): ${selectedPolygon.geoJson}. Используй эти геоданные для определения местоположения и районирования культур, если это возможно.`;
                }

            } catch (e) {
                console.error("Ошибка парсинга geoJson:", e);
                polygonContext += ` Геоданные (не удалось распарсить): ${selectedPolygon.geoJson}`;
            }
        }
        // NEW INSTRUCTION FOR AI: answer briefly and interestingly
        // When asked for general information about the current polygon (e.g., "tell me info about this polygon"),
        // answer briefly (2-3 sentences), focusing on the polygon name and its crop. Make the answer interesting.
        polygonContext += ` Когда тебя спрашивают об общей информации по текущему полигону (например, "расскажи мне инфу про этот полигон"), отвечай кратко (2-3 предложения), фокусируясь на названии полигона и его культуре. Сделай ответ интересным.`;
    }

    // Form messages for OpenAI API, including previous context
    let messagesForOpenAI = [];

    // Add polygon context as a system message if available
    if (polygonContext) {
        messagesForOpenAI.push({
            role: 'system',
            content: polygonContext
        });
    }

    // Add previous messages from chat history
    messagesForOpenAI = messagesForOpenAI.concat(currentPolygonHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    })));

    // Trim history to avoid exceeding context limit
    // Keep only the last MAX_MESSAGES_IN_HISTORY messages
    // (plus system message, if added)
    const offset = polygonContext ? 1 : 0; // Account for system message
    if (messagesForOpenAI.length > MAX_MESSAGES_IN_HISTORY + offset) {
      messagesForOpenAI = messagesForOpenAI.slice(-(MAX_MESSAGES_IN_HISTORY + offset));
    }

    // Add new user message
    messagesForOpenAI.push({ role: 'user', content: textToSend });

    try {
      const res = await fetch(`${BASE_API_URL}/api/chat/polygons/${polygonId}/messages`, { // Using BASE_API_URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}` 
        },
        body: JSON.stringify({ message: textToSend, history: messagesForOpenAI }), 
      });

      if (!res.ok) {
        const errorData = await res.json(); 
        console.error(`https error! status: ${res.status} - ${errorData.error || 'Unknown error'}`);
        setCurrentMessages(prev => [...prev, { sender: 'ai', text: `Ошибка сервера: ${res.status} - ${errorData.error || 'Unknown error'}` }]);
        
        if (res.status === 401 || res.status === 403) {
          setIsLoggedIn(false);
          localStorage.removeItem('token');
          if (handleLogout) handleLogout(); // Call handleLogout from props
        }
        // Rollback optimistic update on error
        setChatHistories(prev => ({
          ...prev,
          [polygonId]: (prev[polygonId] || []).slice(0, -1)
        }));
        setCurrentMessages(prev => prev.slice(0, -1));
        return;
      }
      const data = await res.json(); 
      console.log(`[sendMessageToBackend] Received response from backend for polygon ${polygonId}:`, data); // ADDED LOG

      const botResponse = data.error ? data.error : data.reply;

      setChatHistories(prev => {
        const updatedHistory = [...(prev[polygonId] || []), { sender: 'ai', text: botResponse }];
        const newChatHistories = { ...prev, [polygonId]: updatedHistory };
        // Save to localStorage if DEMO user
        if (userRole === 'DEMO') {
            localStorage.setItem('demoChatHistories', JSON.stringify(newChatHistories));
        }
        return newChatHistories;
      });
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: botResponse }]);

    } catch (error) {
      console.error("Error sending message:", error);
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: `Ошибка сети или сервера при отправке сообщения: ${error.message}` }]);
      // Rollback optimistic update on network error
      setChatHistories(prev => ({
        ...prev,
        [polygonId]: (prev[polygonId] || []).slice(0, -1)
      }));
      setCurrentMessages(prev => prev.slice(0, -1));
    } finally {
      setIsTyping(false);
      setMessage('');
    }
  }, [jwtToken, userPolygons, userRole, handleLogout]); // Added userRole, handleLogout to dependencies

  // Function to load chat history for a specific polygon
  // Now returns loaded data
  const fetchPolygonChatHistory = useCallback(async (polygonId, token) => {
    // If DEMO user, load from localStorage
    if (userRole === 'DEMO') {
        try {
            const storedChatHistories = localStorage.getItem('demoChatHistories');
            if (storedChatHistories) {
                const parsedHistories = JSON.parse(storedChatHistories);
                const historyForPolygon = parsedHistories[polygonId] || [];
                setChatHistories(prev => ({ ...prev, [polygonId]: historyForPolygon }));
                setCurrentMessages(historyForPolygon);
                console.log(`[fetchPolygonChatHistory] Loaded demo chat history for polygon ${polygonId}:`, historyForPolygon);
                return historyForPolygon;
            }
        } catch (e) {
            console.error("Error loading demo chat histories from localStorage:", e);
            localStorage.removeItem('demoChatHistories');
        }
        setCurrentMessages([]);
        return [];
    }

    // Logic for non-DEMO users
    if (!token) {
      console.warn("Токен отсутствует, не могу загрузить историю чата.");
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'Ошибка: Токен отсутствует для загрузки истории чата.' }]);
      return []; // Return empty array on error
    }
    try {
      const res = await fetch(`${BASE_API_URL}/api/chat/polygons/${polygonId}`, { // Using BASE_API_URL
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`HTTPS error loading chat history for polygon ${polygonId}: ${res.status} - ${errorText}`);
        setCurrentMessages(prev => [...prev, { sender: 'ai', text: `Не удалось загрузить историю чата для полигона. Ошибка: ${res.status}.` }]);
        if (res.status === 401 || res.status === 403) {
          setIsLoggedIn(false);
          localStorage.removeItem('token');
          if (handleLogout) handleLogout(); // Call handleLogout from props
        }
        return []; // Return empty array on error
      }
      const data = await res.json();
      console.log(`[fetchPolygonChatHistory] Received chat history for polygon ${polygonId}:`, data); // ADDED LOG
      
      setChatHistories(prev => ({
        ...prev,
        [polygonId]: data.map(msg => ({ sender: msg.sender, text: msg.text }))
      }));
      setCurrentMessages(data.map(msg => ({ sender: msg.sender, text: msg.text }))); // Explicitly update currentMessages
      return data; // Return loaded data
    } catch (error) {
      console.error(`Unexpected error loading chat history for polygon ${polygonId}:`, error);
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: `Не удалось загрузить историю чата для полигона. Ошибка сети или парсинга.` }]);
      return []; // Return empty array on error
    }
  }, [jwtToken, userRole, handleLogout]); // Added userRole, handleLogout to dependencies

  // Function to handle polygon click
  const handlePolygonClick = useCallback(async (polygon) => {
    setSelectedPolygonId(polygon.id); 
    localStorage.setItem('lastSelectedPolygonId', polygon.id); // Save ID to localStorage
    setMessage(''); // Clear input field when selecting a polygon

    // For DEMO user, load chat history from localStorage immediately
    if (userRole === 'DEMO') {
        const storedChatHistories = localStorage.getItem('demoChatHistories');
        if (storedChatHistories) {
            try {
                const parsedHistories = JSON.parse(storedChatHistories);
                setCurrentMessages(parsedHistories[polygon.id] || []);
                setChatHistories(parsedHistories); // Ensure full history object is set
            } catch (e) {
                console.error("Error parsing demo chat histories from localStorage on polygon click:", e);
                localStorage.removeItem('demoChatHistories');
                setCurrentMessages([]);
                setChatHistories({});
            }
        } else {
            setCurrentMessages([]);
            setChatHistories({});
        }
    } else {
        // For non-DEMO users, fetch from backend
        await fetchPolygonChatHistory(polygon.id, jwtToken);
    }
  }, [userRole, jwtToken, fetchPolygonChatHistory]); // Added userRole, jwtToken, fetchPolygonChatHistory to dependencies

  // Function to load user polygons
  const fetchUserPolygons = useCallback(async (token, role) => {
    // If DEMO user, load from localStorage
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

    // Logic for non-DEMO users
    if (!token) {
      console.warn("Токен отсутствует, не могу загрузить полигоны.");
      return;
    }
    try {
      const res = await fetch(`${BASE_API_URL}/api/polygons/user`, { // Using BASE_API_URL
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (!res.ok) {
        console.error(`HTTPS error loading polygons: ${res.status}`);
        setCurrentMessages(prev => [...prev, { sender: 'ai', text: `Не удалось загрузить полигоны. Ошибка: ${res.status}.` }]);
        if (res.status === 401 || res.status === 403) {
          setIsLoggedIn(false);
          localStorage.removeItem('token');
          if (handleLogout) handleLogout(); // Call handleLogout from props
        }
        throw new Error(`HTTPS error! status: ${res.status}`);
      }
      const data = await res.json();
      
      if (data && data.length > 0) {
        setUserPolygons(data);
        const initialChatHistories = {}; // Moved here to avoid global clearing
        data.forEach(polygon => {
          initialChatHistories[polygon.id] = []; 
        });
        setChatHistories(initialChatHistories); // Initialize chatHistories only here
        
        // Attempt to load the last selected polygon from localStorage
        const lastSelectedId = localStorage.getItem('lastSelectedPolygonId');
        if (lastSelectedId && data.some(p => p.id === lastSelectedId)) {
          setSelectedPolygonId(lastSelectedId);
        } else {
          // If no saved ID or it's invalid, select the first polygon
          setSelectedPolygonId(data[0].id); 
          localStorage.setItem('lastSelectedPolygonId', data[0].id);
        }
      } else {
        if (isLoggedIn) {
            setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'У вас пока нет сохраненных полигонов. Создайте их, чтобы начать диалог.' }]);
            localStorage.removeItem('lastSelectedPolygonId'); // Clear if no polygons
        }
      }
    } catch (error) {
      console.error("Error loading polygons:", error);
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'Не удалось загрузить полигоны. Ошибка сети или сервера.' }]);
    }
  }, [isLoggedIn, handleLogout]); // Added handleLogout to dependencies

  // Effect for token initialization and polygon loading
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setJwtToken(storedToken);
      setIsLoggedIn(true); 
      setHideIntro(true); 

      try {
        const decodedToken = jwtDecode(storedToken);
        const roles = decodedToken.roles || [];
        if (roles.includes('ROLE_DEMO')) {
            setUserRole('DEMO');
            // Do NOT clear demoChatHistories here, only on explicit logout
            // Do NOT clear demoPolygons here, it's handled by PolygonDrawMap
            fetchUserPolygons(storedToken, 'DEMO'); // Fetch demo polygons
        } else {
            setUserRole('USER'); // Default or other roles
            fetchUserPolygons(storedToken, 'USER'); // Fetch real polygons
        }
      } catch (error) {
        console.error("Error decoding token in Chat.jsx:", error);
        setUserRole(null);
        setIsLoggedIn(false);
        localStorage.removeItem('token');
        if (handleLogout) handleLogout();
      }
    } else {
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'Для использования чата необходима аутентификация. Пожалуйста, войдите на сайт.' }]);
      setIsLoggedIn(false);
      localStorage.removeItem('lastSelectedPolygonId'); // Clear if user is not authenticated
      setUserRole(null); // Ensure user role is null if not logged in
    }
  }, [fetchUserPolygons, handleLogout]); // Added handleLogout to dependencies

  // EFFECT: for handling selected polygon
  useEffect(() => {
    const processPolygonSelection = async () => {
      if (selectedPolygonId && jwtToken) {
        // Set current messages from cache (can be empty)
        // This step is important to immediately show what's already in the cache while loading
        setCurrentMessages(chatHistoriesRef.current[selectedPolygonId] || []); 
        
        // Load actual chat history for the selected polygon
        await fetchPolygonChatHistory(selectedPolygonId, jwtToken);
      } else if (!selectedPolygonId) {
          setCurrentMessages([]); // Clear messages if no polygon is selected
      }
    };

    processPolygonSelection();
  }, [selectedPolygonId, jwtToken, fetchPolygonChatHistory]); // userPolygons removed from dependencies, as fetchUserPolygons already calls setSelectedPolygonId

  // Effect for scrolling messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentMessages]);

  // NEW FUNCTION: to clear chat history (triggers modal display)
  const handleClearHistory = useCallback(() => {
    if (!selectedPolygonId || !jwtToken) {
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'Ошибка: Полигон не выбран или вы не авторизованы.' }]);
      return;
    }
    setShowConfirmModal(true); // Show custom confirmation modal
  }, [selectedPolygonId, jwtToken]);

  // NEW FUNCTION: confirm clear history (executes DELETE request or local clear)
  const confirmClearHistory = useCallback(async () => {
    setShowConfirmModal(false); // Hide modal
    setIsTyping(true); // Show typing indicator while deleting

    // If DEMO user, clear locally
    if (userRole === 'DEMO') {
        setChatHistories(prev => {
            const newChatHistories = { ...prev };
            newChatHistories[selectedPolygonId] = [];
            localStorage.setItem('demoChatHistories', JSON.stringify(newChatHistories));
            return newChatHistories;
        });
        setCurrentMessages([]); // Clear current messages in UI
        setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'История чата успешно очищена локально (демо-режим).' }]);
        setIsTyping(false);
        return;
    }

    // Logic for non-DEMO users
    try {
      const res = await fetch(`${BASE_API_URL}/api/chat/polygons/${selectedPolygonId}/messages`, { // Using BASE_API_URL
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        },
      });

      if (!res.ok) {
        const errorText = await res.text(); // Get error text for non-JSON responses
        console.error(`HTTPS error deleting chat history: ${res.status} - ${errorText}`);
        setCurrentMessages(prev => [...prev, { sender: 'ai', text: `Не удалось очистить историю чата. Ошибка: ${res.status}.` }]);
        if (res.status === 401 || res.status === 403) {
          setIsLoggedIn(false);
          localStorage.removeItem('token');
          if (handleLogout) handleLogout(); // Call handleLogout from props
        }
        return;
      }

      // Clear history on client
      setChatHistories(prev => {
        const newChatHistories = { ...prev };
        newChatHistories[selectedPolygonId] = [];
        return newChatHistories;
      });
      setCurrentMessages([]); // Clear current messages in UI
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: 'История чата успешно очищена.' }]);

    } catch (error) {
      console.error("Error clearing chat history:", error);
      setCurrentMessages(prev => [...prev, { sender: 'ai', text: `Не удалось очистить историю чата. Ошибка сети или сервера: ${error.message}` }]);
    } finally {
        setIsTyping(false); // Hide typing indicator
    }
  }, [selectedPolygonId, jwtToken, userRole, handleLogout]); // Added userRole, handleLogout to dependencies

  // NEW FUNCTION: cancel clear history (hides modal)
  const cancelClearHistory = useCallback(() => {
    setShowConfirmModal(false); // Hide modal
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

  // handleLogout from props
  const onLogout = useCallback(() => {
    if (userRole === 'DEMO') {
      localStorage.removeItem('demoPolygons');
      localStorage.removeItem('demoChatHistories');
      localStorage.removeItem('lastSelectedPolygonId'); // Clear last selected polygon for demo
      console.log("Demo user data cleared from localStorage.");
    }
    handleLogout(); // Call the original handleLogout from App.jsx
  }, [userRole, handleLogout]);


  return (
    <div className="chat-container">
      <div 
        ref={sidebarRef} // Bind ref to sidebar
        className="chat-sidebar" 
        style={{ width: sidebarWidth }} // Apply dynamic width
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
        {/* "Clear History" button moved to the bottom of the sidebar */}
        {selectedPolygonId && isLoggedIn && (
          <button 
            className="clear-history-button" 
            onClick={handleClearHistory}
            disabled={isTyping}
          >
            Очистить историю
          </button>
        )}
        {/* Resizer for sidebar */}
        <div className="chat-sidebar-resizer" onMouseDown={startResizing}></div> {/* <<< CHANGED TO chat-sidebar-resizer */}
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

      {/* Custom confirmation modal window */}
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
