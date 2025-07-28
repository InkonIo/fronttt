// src/components/RegistrationModal.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom"; // Импортируем Link
import './RegistrationModal.css';

export default function RegistrationModal({ onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [login, setLogin] = useState(""); // Используется для регистрации (Username)
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true); // По умолчанию на SIGN IN
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState(0);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatNewPassword, setRepeatNewPassword] = useState("");
  const [keepMeLoggedIn, setKeepMeLoggedIn] = useState(false);

  const navigate = useNavigate();

  // Этот useEffect блок останется, так как он связан с логикой авторизации
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');
    if (token && userRole) {
      setIsRegistered(true);
    }
    // Удаленный код по частицам был здесь
  }, []); // Пустой массив зависимостей означает, что эффект запустится один раз после первого рендера

  const resetFormFields = () => {
    setEmail("");
    setLogin("");
    setPassword("");
    setConfirmPassword("");
    setAgree(false);
    setError("");
    setRecoveryCode("");
    setNewPassword("");
    setRepeatNewPassword("");
  };

  const handleTabClick = (mode) => {
    setIsLoginMode(mode);
    setIsRecovering(false);
    setRecoveryStep(0);
    resetFormFields();
  };

  async function handleRegister(e) {
    e.preventDefault();
    setError("");

    if (!login.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Пожалуйста, заполните все поля");
      return;
    }

    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    if (!agree) {
      setError("Необходимо согласиться с обработкой персональных данных");
      return;
    }

    try {
      const response = await fetch('http://localhost:8080/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: login, email, password })
      });

      const result = await response.text();
      if (!response.ok) {
        setError(result || "Ошибка регистрации");
        return;
      }

      setError("Успешная регистрация! Теперь войдите в систему.");
      handleTabClick(true); // Переключаемся на вкладку входа
    } catch (err) {
      console.error("Ошибка регистрации:", err);
      setError("Сервер не отвечает");
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    let userRole = 'ROLE_USER'; // Значение по умолчанию

    if (!email.trim() || !password) {
      setError("Введите email и пароль");
      return;
    }

    try {
      const response = await fetch("http://localhost:8080/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Ошибка входа");
        return;
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
        if (data.roles && Array.isArray(data.roles) && data.roles.length > 0) {
          userRole = data.roles[0];
          localStorage.setItem('role', userRole);
        } else {
          localStorage.setItem('role', userRole);
        }
      }

      setIsRegistered(true);
      onClose(); // Закрываем модальное окно
      onSuccess?.(userRole); // Передаем полученную роль в App.jsx для перенаправления
    } catch (err) {
      console.error("Ошибка авторизации:", err);
      setError("Ошибка подключения к серверу");
    }
  }

  async function handleRecoverPassword(e) {
    e.preventDefault();
    setError("");

    if (recoveryStep === 1) {
      if (!recoveryCode.trim()) {
        setError("Введите код восстановления");
        return;
      }
      try {
        const response = await fetch("http://localhost:8080/api/v1/recovery/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code: recoveryCode })
        });

        if (!response.ok) {
          const data = await response.text();
          setError(data || "Неверный код");
          return;
        }

        setError("Код подтверждён. Теперь введите новый пароль.");
        setRecoveryStep(2);
      } catch (err) {
        console.error("Ошибка верификации кода:", err);
        setError("Сервер недоступен");
      }
    } else if (recoveryStep === 2) {
      if (!newPassword || !repeatNewPassword) {
        setError("Введите новый пароль и повторите его");
        return;
      }
      if (newPassword !== repeatNewPassword) {
        setError("Пароли не совпадают");
        return;
      }

      try {
        const response = await fetch("http://localhost:8080/api/v1/recovery/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, newPassword })
        });

        if (!response.ok) {
          const data = await response.text();
          setError(data || "Ошибка смены пароля");
          return;
        }

        console.log("Пароль успешно обновлён!");
        setError("Пароль успешно обновлён! Вы можете войти.");
        setIsRecovering(false);
        setRecoveryStep(0);
        handleTabClick(true);
        setEmail(email);

      } catch (err) {
        console.error("Ошибка смены пароля:", err);
        setError("Сервер недоступен");
      }
    }
  }

  async function startRecovery() {
    setError("");

    if (!email.trim()) {
      setError("Введите email для восстановления");
      return;
    }

    try {
      const response = await fetch("http://localhost:8080/api/v1/recovery/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const data = await response.text();
        setError(data || "Ошибка при отправке письма");
        return;
      }

      console.log("Код восстановления отправлен на почту.");
      setError("Код восстановления отправлен на почту. Проверьте ваш email.");
      setIsRecovering(true);
      setRecoveryStep(1);
    } catch (err) {
      console.error("Ошибка восстановления:", err);
      setError("Сервер недоступен");
    }
  }

  if (isRegistered) {
      return null;
  }

  return (
    <div className="registration-modal">
      <div className="modal-overlay"></div>
      <div className="registration-wrapper">
        <div className="registration-content">
          {!isRecovering && (
            <div className="auth-tabs">
              <div className={`auth-tab ${!isLoginMode ? "active" : ""}`} onClick={() => handleTabClick(false)}>РЕГИСТРАЦИЯ</div> {/* Перевод */}
              <div className={`auth-tab ${isLoginMode ? "active" : ""}`} onClick={() => handleTabClick(true)}>ВХОД</div> {/* Перевод */}
            </div>
          )}

          {!isLoginMode && !isRecovering && ( // Форма для РЕГИСТРАЦИИ
            <form className="registration-form" onSubmit={handleRegister}>
              <div className="input-group">
                <input type="text" placeholder="Имя пользователя" value={login} onChange={(e) => setLogin(e.target.value)} required /> {/* Перевод */}
              </div>
              <div className="input-group">
                <input type="email" placeholder="Почта" value={email} onChange={(e) => setEmail(e.target.value)} required /> {/* Изменено на "Почта" */}
              </div>
              <div className="input-group">
                <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required /> {/* Перевод */}
              </div>
              <div className="input-group">
                <input type="password" placeholder="Повторите пароль" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /> {/* Перевод */}
              </div>
              <label className="checkbox-label">
  <input
    type="checkbox"
    checked={agree}
    onChange={(e) => setAgree(e.target.checked)}
  />
  <span className="checkmark"></span>
  <span className="checkbox-text">
    Я согласен с <Link to="/privacy-policy">обработкой персональных данных</Link>
  </span>
</label>

              {error && <div className="error">{error}</div>}
              <button type="submit" className="submit-btn">ЗАРЕГИСТРИРОВАТЬСЯ</button> {/* Перевод */}
            </form>
          )}

          {isLoginMode && !isRecovering && ( // Форма для ВХОДА
            <form className="registration-form" onSubmit={handleLogin}>
              <div className="input-group">
                <input type="email" placeholder="Почта" value={email} onChange={(e) => setEmail(e.target.value)} required /> {/* Изменено на "Почта" */}
              </div>
              <div className="input-group">
                <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required /> {/* Перевод */}
              </div>
              <label className="checkbox-label">
                <input type="checkbox" checked={keepMeLoggedIn} onChange={(e) => setKeepMeLoggedIn(e.target.checked)} />
                <span className="checkmark"></span> Запомнить меня {/* Перевод */}
              </label>
              <div className="forgot-password" onClick={startRecovery} style={{ cursor: 'pointer', color: '#007bff', marginTop: '8px' }}>
                Забыли пароль? {/* Перевод */}
              </div>
              {error && <div className="error">{error}</div>}
              <button type="submit" className="submit-btn">ВОЙТИ</button> {/* Перевод */}
            </form>
          )}

          {isRecovering && (
            <form className="registration-form" onSubmit={handleRecoverPassword}>
              <h2 style={{ textAlign: 'center', color: '#333' }}>Восстановление пароля</h2> {/* Перевод */}
              {recoveryStep === 0 && (
                <div className="input-group">
                  <input type="email" placeholder="Почта" value={email} onChange={(e) => setEmail(e.target.value)} required /> {/* Изменено на "Почта" */}
                  <button type="button" className="submit-btn" onClick={startRecovery} style={{ marginTop: '15px' }}>
                    Отправить код восстановления {/* Перевод */}
                  </button>
                </div>
              )}
              {recoveryStep === 1 && (
                <div className="input-group">
                  <input type="text" placeholder="Код из письма" value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} required /> {/* Перевод */}
                </div>
              )}
              {recoveryStep === 2 && (
                <>
                  <div className="input-group">
                    <input type="password" placeholder="Новый пароль" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /> {/* Перевод */}
                  </div>
                  <div className="input-group">
                    <input type="password" placeholder="Повторите новый пароль" value={repeatNewPassword} onChange={(e) => setRepeatNewPassword(e.target.value)} required /> {/* Перевод */}
                  </div>
                </>
              )}
              {error && <div className="error">{error}</div>}
              {recoveryStep > 0 && (
                <button type="submit" className="submit-btn">
                  {recoveryStep === 1 ? 'Проверить код' : 'Установить новый пароль'} {/* Перевод */}
                </button>
              )}
              <button type="button" className="cancel-btn" onClick={() => { setIsRecovering(false); setRecoveryStep(0); resetFormFields(); }} style={{ marginTop: '10px' }}>
                Отмена {/* Перевод */}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
