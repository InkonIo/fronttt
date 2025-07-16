import React, { useState, useEffect } from 'react';
// Убедитесь, что этот CSS файл существует и содержит стили для вашей таблицы
import './AdminPanel.css'; 

// Базовый URL вашего бэкенда
const API_BASE_URL = 'http://localhost:8080/api/v1'; // Измените, если ваш бэкенд на другом домене/порту

// Компонент AdminPanel
const AdminPanel = () => { // Изменил имя функции на AdminPanel, чтобы соответствовать вашему экспорту
    // Используем 'adminToken' и 'userRole' для localStorage
    const [token, setToken] = useState(localStorage.getItem('adminToken') || ''); 
    const [currentUserRole, setCurrentUserRole] = useState(localStorage.getItem('userRole') || ''); 
    const [users, setUsers] = useState([]); 
    const [loading, setLoading] = useState(false); 
    const [error, setError] = useState(''); 
    const [successMessage, setSuccessMessage] = useState(''); 
    const [editingUserId, setEditingUserId] = useState(null); 
    const [newEmail, setNewEmail] = useState(''); // Для редактирования email
    const [newPassword, setNewPassword] = useState(''); // Для сброса пароля
    const [newRoleForUser, setNewRoleForUser] = useState(''); // Новая роль для редактируемого пользователя

    // Эффект для загрузки пользователей при монтировании компонента или изменении токена
    useEffect(() => {
        if (token) {
            fetchUsers();
        } else {
            setUsers([]); // Очищаем список, если нет токена
        }
    }, [token]); // Зависимость от token, чтобы перезагружать при изменении

    // Функция для входа в систему (для демонстрации)
    const handleLogin = async (email, password) => {
        setLoading(true);
        setError('');
        setSuccessMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/auth/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: email, password: password }), 
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка входа');
            }

            const data = await response.json();
            setToken(data.adminToken); // Сохраняем токен
            localStorage.setItem('adminToken', data.adminToken);

            // Определяем роль текущего пользователя на основе email (для демонстрации)
            // В реальном приложении, лучше получать роль из ответа сервера при логине
            // Предполагаем, что роль приходит в токене или отдельном поле data.role
            // Если роль не приходит, можно использовать email для тестовых ролей
            let roleFromBackend = data.role; // Предположим, что бэкенд возвращает роль
            if (!roleFromBackend) { // Запасной вариант для демонстрации
                if (email === 'superadmin@example.com') {
                    roleFromBackend = 'SUPER_ADMIN';
                } else if (email === 'admin@example.com') {
                    roleFromBackend = 'ADMIN';
                } else {
                    roleFromBackend = 'UNKNOWN'; 
                }
            }
            setCurrentUserRole(roleFromBackend);
            localStorage.setItem('userRole', roleFromBackend);

            setSuccessMessage('Вход выполнен успешно!');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Функция для выхода
    const handleLogout = () => {
        setToken('');
        setCurrentUserRole('');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('userRole');
        setUsers([]);
        setSuccessMessage('Вы вышли из системы.');
    };

    // Функция для получения списка пользователей
    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_BASE_URL}/admin/users`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                // Если 403, это может быть из-за отсутствия токена или прав
                if (response.status === 403) {
                    setError('У вас нет прав для просмотра пользователей или ваш сеанс истек. Пожалуйста, войдите снова.');
                    handleLogout(); // Предлагаем выйти
                } else {
                    throw new Error(errorData.message || 'Не удалось получить список пользователей.');
                }
            } else {
                const data = await response.json();
                setUsers(data);
                setSuccessMessage('Список пользователей загружен.');
            }
        } catch (err) {
            console.error("Ошибка при запросе пользователей:", err);
            setError(err.message || "Не удалось подключиться к серверу.");
        } finally {
            setLoading(false);
        }
    };

    // Функция для начала редактирования пользователя
    const handleEditClick = (user) => {
        setEditingUserId(user.id);
        setNewEmail(user.email);
        setNewPassword(''); // Пароль не отображаем, только сброс
        setNewRoleForUser(user.role); // Устанавливаем текущую роль для редактирования
    };

    // Функция для отмены редактирования
    const handleCancelEdit = () => {
        setEditingUserId(null);
        setNewEmail('');
        setNewPassword('');
        setNewRoleForUser('');
    };

    // Функция для сохранения новой роли (доступно только SUPER_ADMIN)
    const handleSaveRole = async (userId) => {
        // Проверка на стороне клиента: только SUPER_ADMIN может менять роли
        if (currentUserRole !== 'SUPER_ADMIN') {
            setError('У вас нет прав для изменения роли пользователя.');
            return;
        }

        setLoading(true);
        setError('');
        setSuccessMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ newRole: newRoleForUser }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Не удалось обновить роль пользователя.');
            }

            setSuccessMessage(`Роль пользователя ${userId} успешно изменена на ${newRoleForUser}.`);
            setEditingUserId(null); 
            setNewRoleForUser(''); 
            fetchUsers(); // Обновляем список пользователей
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Функция для сохранения нового Email (доступно ADMIN и SUPER_ADMIN)
    const handleSaveEmail = async (userId) => {
        setLoading(true);
        setError('');
        setSuccessMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/email`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newEmail), // Email отправляется как простая строка
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Не удалось обновить email пользователя.');
            }

            setSuccessMessage(`Email пользователя ${userId} успешно изменен на ${newEmail}.`);
            setEditingUserId(null); 
            setNewEmail(''); 
            fetchUsers(); 
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Функция для сброса пароля (доступно ADMIN и SUPER_ADMIN)
    const handleResetPassword = async (userId) => {
        if (!newPassword || newPassword.length < 6) { // Пример минимальной длины
            setError("Новый пароль должен быть не менее 6 символов.");
            return;
        }
        // Замена window.confirm на модальное окно, так как alert/confirm запрещены
        if (!window.confirm("Вы уверены, что хотите сбросить пароль для этого пользователя?")) {
            return;
        }

        setLoading(true);
        setError('');
        setSuccessMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/password`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newPassword), // Пароль отправляется как простая строка
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Не удалось сбросить пароль.');
            }

            setSuccessMessage(`Пароль пользователя ${userId} успешно сброшен.`);
            setEditingUserId(null); 
            setNewPassword(''); 
            fetchUsers(); 
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Функция для удаления пользователя (доступно ADMIN и SUPER_ADMIN)
    const handleDeleteUser = async (userId) => {
        // Замена window.confirm на модальное окно, так как alert/confirm запрещены
        if (!window.confirm("Вы уверены, что хотите удалить этого пользователя? Это действие необратимо.")) {
            return;
        }

        setLoading(true);
        setError('');
        setSuccessMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Не удалось удалить пользователя.');
            }

            setSuccessMessage(`Пользователь ${userId} успешно удален.`);
            fetchUsers(); 
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Компонент формы входа
    const LoginForm = ({ onLogin, loading, error }) => {
        const [email, setEmail] = useState('superadmin@example.com'); 
        const [password, setPassword] = useState('superadminpass'); 

        const handleSubmit = (e) => {
            e.preventDefault();
            onLogin(email, password);
        };

        return (
            <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Вход для SUPER_ADMIN / ADMIN</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                            Email:
                        </label>
                        <input
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                            Пароль:
                        </label>
                        <input
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <button
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-300"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? 'Вход...' : 'Войти'}
                        </button>
                    </div>
                    {error && <p className="text-red-500 text-xs italic mt-4 text-center">{error}</p>}
                </form>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6 font-inter">
            {!token ? (
                // Если токена нет, показываем форму входа
                <LoginForm onLogin={handleLogin} loading={loading} error={error} />
            ) : (
                // Если токен есть, показываем панель администратора
                <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
                    <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Панель управления пользователями</h1>
                    <div className="flex justify-between items-center mb-6">
                        <p className="text-lg text-gray-700">
                            Вы вошли как: <span className="font-semibold text-blue-600">{currentUserRole}</span>
                        </p>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-300"
                        >
                            Выйти
                        </button>
                    </div>

                    {loading && <p className="text-blue-500 text-center mb-4">Загрузка...</p>}
                    {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                    {successMessage && <p className="text-green-500 text-center mb-4">{successMessage}</p>}

                    {/* Таблица пользователей теперь видна как для ADMIN, так и для SUPER_ADMIN */}
                    {(currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'ADMIN') ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 border-b">ID</th>
                                        <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 border-b">Email</th>
                                        <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 border-b">Роль</th>
                                        <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 border-b">Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length > 0 ? (
                                        users.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50 border-b">
                                                <td className="py-3 px-4 text-sm text-gray-800">{user.id}</td>
                                                <td className="py-3 px-4 text-sm text-gray-800">
                                                    {editingUserId === user.id ? (
                                                        <input
                                                            type="email"
                                                            value={newEmail}
                                                            onChange={(e) => setNewEmail(e.target.value)}
                                                            className="border rounded py-1 px-2 text-gray-700 focus:outline-none focus:shadow-outline"
                                                        />
                                                    ) : (
                                                        user.email
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-800">
                                                    {/* Выпадающий список для выбора роли виден только для SUPER_ADMIN при редактировании */}
                                                    {editingUserId === user.id && currentUserRole === 'SUPER_ADMIN' ? (
                                                        <select
                                                            className="border rounded py-1 px-2 text-gray-700 focus:outline-none focus:shadow-outline"
                                                            value={newRoleForUser}
                                                            onChange={(e) => setNewRoleForUser(e.target.value)}
                                                        >
                                                            <option value="USER">USER</option>
                                                            <option value="ADMIN">ADMIN</option>
                                                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                                                        </select>
                                                    ) : (
                                                        <span className={`font-medium ${
                                                            user.role === 'SUPER_ADMIN' ? 'text-purple-600' :
                                                            user.role === 'ADMIN' ? 'text-indigo-600' :
                                                            'text-gray-600'
                                                        }`}>
                                                            {user.role}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-sm">
                                                    {editingUserId === user.id ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {/* Кнопки сохранения email и роли */}
                                                            <button
                                                                onClick={() => handleSaveEmail(user.id)}
                                                                className="bg-green-500 hover:bg-green-700 text-white py-1 px-3 rounded-lg text-xs transition duration-300"
                                                                disabled={loading}
                                                            >
                                                                Сохранить Email
                                                            </button>
                                                            {/* Кнопка сохранения роли только для SUPER_ADMIN */}
                                                            {currentUserRole === 'SUPER_ADMIN' && (
                                                                <button
                                                                    onClick={() => handleSaveRole(user.id)}
                                                                    className="bg-green-500 hover:bg-green-700 text-white py-1 px-3 rounded-lg text-xs transition duration-300"
                                                                    disabled={loading}
                                                                >
                                                                    Сохранить Роль
                                                                </button>
                                                            )}
                                                            {/* Поле и кнопка сброса пароля */}
                                                            <input
                                                                type="password"
                                                                placeholder="Новый пароль"
                                                                value={newPassword}
                                                                onChange={(e) => setNewPassword(e.target.value)}
                                                                className="password-input"
                                                            />
                                                            <button
                                                                onClick={() => handleResetPassword(user.id)}
                                                                className="bg-orange-500 hover:bg-orange-700 text-white py-1 px-3 rounded-lg text-xs transition duration-300"
                                                                disabled={loading}
                                                            >
                                                                Сбросить Пароль
                                                            </button>
                                                            <button
                                                                onClick={handleCancelEdit}
                                                                className="bg-gray-400 hover:bg-gray-600 text-white py-1 px-3 rounded-lg text-xs transition duration-300"
                                                            >
                                                                Отмена
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            <button
                                                                onClick={() => handleEditClick(user)}
                                                                className="bg-blue-500 hover:bg-blue-700 text-white py-1 px-3 rounded-lg text-xs transition duration-300"
                                                                disabled={loading}
                                                            >
                                                                Редактировать
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                className="bg-red-500 hover:bg-red-700 text-white py-1 px-3 rounded-lg text-xs transition duration-300"
                                                                disabled={loading}
                                                            >
                                                                Удалить
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="py-4 text-center text-gray-500">
                                                Пользователи не найдены.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        // Сообщение, если пользователь не SUPER_ADMIN и не ADMIN
                        <p className="text-center text-red-500 mt-4">
                            У вас нет прав администратора для доступа к этой панели.
                        </p>
                    )}
                </div>
            )}
            {/* Tailwind CSS CDN */}
            <script src="https://cdn.tailwindcss.com"></script>
            {/* Google Fonts - Inter */}
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            <style>
                {`
                body {
                    font-family: 'Inter', sans-serif;
                }
                /* Дополнительные стили, если нужны, из AdminPanel.css */
                .admin-panel-container {
                    padding: 30px;
                    background-color: #f0f2f5;
                    min-height: calc(100vh - 30px);
                    color: #333;
                }
                h1 {
                    color: #2c3e50;
                    margin-bottom: 20px;
                    text-align: center;
                }
                .users-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                    background-color: #fff;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }
                .users-table th, .users-table td {
                    border: 1px solid #ddd;
                    padding: 12px 15px;
                    text-align: left;
                }
                .users-table th {
                    background-color: #4CAF50;
                    color: white;
                    text-transform: uppercase;
                    font-size: 14px;
                }
                .users-table tr:nth-child(even) {
                    background-color: #f9f9f9;
                }
                .users-table tr:hover {
                    background-color: #f1f1f1;
                }
                .password-input {
                    padding: 8px;
                    margin-top: 5px;
                    margin-right: 5px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    width: 150px;
                }
                /* Стили для кнопок, если они не покрываются Tailwind */
                .action-btn {
                    padding: 8px 12px;
                    margin-right: 5px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    transition: background-color 0.2s ease;
                }
                `}
            </style>
        </div>
    );
};

export default AdminPanel;
