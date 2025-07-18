// src/components/DemoLoginModal.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Если нужно перенаправление после входа
import './RegistrationModal.css'; // Используем тот же CSS для единообразия стилей

// Добавим handleLogout в пропсы
export default function DemoLoginModal({ onClose, onSuccess, handleLogout }) {
  const [login, setLogin] = useState(""); // ИЗМЕНЕНО: Теперь начинается с пустой строки
  const [password, setPassword] = useState(""); // ИЗМЕНЕНО: Теперь начинается с пустой строки
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    // Эта логика для частиц и оверлея, как в RegistrationModal
    const container = document.querySelector('.registration-modal'); // Можно использовать другой класс, если хотите отдельный стиль
    if (!container) return;

    const particles = [];
    for (let i = 0; i < 50; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.animationDuration = `${Math.random() * 5 + 5}s`;
      particle.style.animationDelay = `${Math.random() * 5}s`;
      container.appendChild(particle);
      particles.push(particle);
    }

    return () => {
      particles.forEach(p => p.remove());
    };
  }, []);

  async function handleDemoLogin(e) {
    e.preventDefault();
    setError("");

    // Оставляем проверку, чтобы убедиться, что пользователь ввел правильные демо-данные
    if (login !== "TEST" || password !== "TEST") {
      setError("Для демо-доступа используйте Логин: TEST, Пароль: TEST");
      return;
    }

    try {
      const response = await fetch("http://localhost:8080/api/v1/auth/demo/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: login,
          password: password
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Ошибка демо-входа");
        return;
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
        // Для демо-пользователя роль всегда будет "ROLE_DEMO"
        localStorage.setItem('role', "ROLE_DEMO"); 
      }

      onClose(); // Закрываем модальное окно после успешного входа
      onSuccess?.("ROLE_DEMO"); // Передаем роль "ROLE_DEMO" в родительский компонент (например, App.jsx) для перенаправления
    } catch (err) {
      console.error("Ошибка демо-авторизации:", err);
      setError("Ошибка подключения к серверу");
    }
  }

  // Обновленная функция для кнопки "Отмена"
  const handleCancelClick = () => {
    if (handleLogout) { // Проверяем, что handleLogout передан
      handleLogout(); // Вызываем handleLogout для очистки localStorage
    }
    window.location.href = 'https://agrofarm.kz/'; // Перенаправление на указанный URL
    // onClose(); // onClose здесь не нужен, так как handleLogout уже перенаправляет
  };

  return (
    <div className="registration-modal"> {/* Используем тот же класс модального окна */}
      {/* УДАЛЕНО: onClick={onClose} из modal-overlay */}
      <div className="modal-overlay"></div> 
      <div className="registration-wrapper">
        <div className="registration-content">
          <h2 style={{ textAlign: 'center', color: 'white', marginBottom: '30px' }}>Демо-доступ к платформе AgroFarm</h2>
          <form className="registration-form" onSubmit={handleDemoLogin}>
            <div className="input-group">
              <input 
                type="text" 
                placeholder="Логин (например, TEST)" // ИЗМЕНЕНО: Обновленный плейсхолдер
                value={login} 
                onChange={(e) => setLogin(e.target.value)} 
                required 
                // УДАЛЕНО: readOnly
              />
            </div>
            <div className="input-group">
              <input 
                type="password" 
                placeholder="Пароль (например, TEST)" // ИЗМЕНЕНО: Обновленный плейсхолдер
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required 
                // УДАЛЕНО: readOnly
              />
            </div>
            {error && <div className="error">{error}</div>}
            <button type="submit" className="submit-btn">ВОЙТИ В ДЕМО-РЕЖИМ</button>
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={handleCancelClick} // Используем новую функцию для обработки клика
              style={{ marginTop: '10px', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white' }}
            >
              Отмена
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
