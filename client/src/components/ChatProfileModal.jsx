import { observer } from "mobx-react-lite";
import { useState, useEffect, useRef } from "react";
import { useStores } from "../stores/StoreProvider.jsx";
import { FiSend, FiZap, FiRotateCw } from "react-icons/fi";
import api from "../api/client.js";

const ChatProfileModal = observer(({ onComplete }) => {
  const { userStore, uiStore, goalStore } = useStores();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [lastFailedMessage, setLastFailedMessage] = useState(null); // Последнее сообщение, которое не удалось отправить
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Инициализация чата при открытии
  useEffect(() => {
    if (uiStore.showChatProfileModal) {
      const welcomeMessage = {
        role: "assistant",
        text: "Привет! Я помогу тебе заполнить финансовый профиль. Просто расскажи мне о себе в свободной форме: сколько ты зарабатываешь, на что тратишь деньги, какие у тебя финансовые цели, есть ли долги и т.д. Можешь писать всё одним сообщением или по частям - я всё пойму!"
      };
      setMessages([welcomeMessage]);
      setInputMessage("");
      setIsComplete(false);
      setProfileData(null);
      setLastFailedMessage(null);
      
      // Фокус на инпут через небольшую задержку
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [uiStore.showChatProfileModal]);

  // Скролл вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Запрещаем закрытие по ESC
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && uiStore.showChatProfileModal) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    if (uiStore.showChatProfileModal) {
      document.addEventListener("keydown", handleEscape, true);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [uiStore.showChatProfileModal]);

  const handleSend = async () => {
    if (!inputMessage.trim() || loading || isComplete) return;

    const userMessage = {
      role: "user",
      text: inputMessage.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setLoading(true);

    try {
      // Отправляем сообщение на бэкенд для обработки
      // Фильтруем только сообщения пользователя и ассистента (исключаем system и error)
      const validMessages = messages.filter(m => m.role === "user" || m.role === "assistant");
      const response = await api.post("/ai/parse-profile", {
        userId: userStore.userId,
        message: userMessage.text,
        conversationHistory: validMessages.map(m => ({
          role: m.role,
          content: m.text
        }))
      });

      const { reply, isProfileComplete, parsedProfile } = response.data;

      // Очищаем сохраненное сообщение об ошибке при успешной отправке
      setLastFailedMessage(null);

      // Добавляем ответ ассистента
      setMessages(prev => [...prev, {
        role: "assistant",
        text: reply
      }]);

      // Если профиль готов, сохраняем данные
      if (isProfileComplete && parsedProfile) {
        setProfileData(parsedProfile);
        setIsComplete(true);
        
        // Показываем предложение сохранить
        setMessages(prev => [...prev, {
          role: "system",
          text: "Профиль заполнен! Нажми кнопку ниже, чтобы сохранить данные."
        }]);
      }
    } catch (error) {
      console.error("Ошибка при отправке сообщения:", error);
      console.error("Детали ошибки:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });
      
      // Сохраняем сообщение для возможности повторной отправки
      setLastFailedMessage(userMessage.text);
      
      // Формируем более информативное сообщение об ошибке
      let errorMessage = "Извини, произошла ошибка при обработке информации. Попробуй еще раз или переключись на форму заполнения.";
      
      if (error.response?.status === 500) {
        errorMessage = "Сервер временно недоступен. Пожалуйста, попробуй позже или используй форму заполнения.";
      } else if (error.response?.status === 404) {
        errorMessage = "Пользователь не найден. Пожалуйста, обнови страницу и попробуй снова.";
      } else if (error.response?.data?.error) {
        errorMessage = `Ошибка: ${error.response.data.error}`;
      } else if (!error.response) {
        errorMessage = "Не удалось подключиться к серверу. Проверь интернет-соединение.";
      }
      
      setMessages(prev => [...prev, {
        role: "error",
        text: errorMessage
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileData) return;

    setLoading(true);
    try {
      // Сохраняем базовые данные профиля
      if (profileData.salary || profileData.currentSavings !== undefined) {
        await api.post(`/users/${userStore.userId}/profile`, {
          salary: profileData.salary || 0,
          currentSavings: profileData.currentSavings || 0,
          savingsPerMonth: profileData.savingsPerMonth || 0
        });
      }

      // Сохраняем расширенный профиль
      if (profileData.extendedProfile) {
        await api.post(`/users/${userStore.userId}/profile`, {
          extendedProfile: profileData.extendedProfile,
          savingsPerMonth: profileData.savingsPerMonth || 0
        });
      }

      // Создаем финансовые цели (параллельно для ускорения)
      if (profileData.goals && profileData.goals.length > 0) {
        const goalPromises = profileData.goals
          .filter(goal => goal.title && goal.price)
          .map(goal => 
            goalStore.createGoal(userStore.userId, {
              title: goal.title,
              price: Number(goal.price) || 0,
              priority: Number(goal.priority) || 5,
              description: goal.description || ""
            }).catch(error => {
              console.error(`Ошибка при создании цели "${goal.title}":`, error);
              return null; // Продолжаем создание других целей даже при ошибке
            })
          );
        
        await Promise.all(goalPromises);
      }

      // Генерируем blacklist (неблокирующая операция с увеличенным timeout)
      if (profileData.extendedProfile) {
        try {
          const contextText = `
Зарплата: ${profileData.salary || 0}₽/месяц
Откладывает: ${profileData.savingsPerMonth || 0}₽/месяц
Текущие накопления: ${profileData.currentSavings || 0}₽

На что тратит больше всего: ${(profileData.extendedProfile.topSpendingCategories || []).join(", ")}
Импульсивные категории: ${(profileData.extendedProfile.impulsiveCategories || []).join(", ")}
Финансовые цели: ${(profileData.goals || []).map(g => `${g.title} (${g.price}₽, приоритет ${g.priority})`).join(", ")}
Категории, мешающие целям: ${(profileData.extendedProfile.blockingCategories || []).join(", ")}
Процент отложений: ${profileData.extendedProfile.savingsPercentage || 0}%
Есть долги: ${profileData.extendedProfile.hasDebts ? "да" : "нет"}
          `.trim();

          // Используем увеличенный timeout для AI-запроса (30 секунд)
          const blacklistResponse = await api.post("/ai/suggest-blacklist", {
            profileSummary: contextText
          }, {
            timeout: 30000 // 30 секунд для AI-запроса
          });

          if (blacklistResponse.data.categories && blacklistResponse.data.categories.length > 0) {
            await api.post(`/users/${userStore.userId}/blacklist`, {
              categories: blacklistResponse.data.categories
            }, {
              timeout: 10000
            });
          }
        } catch (error) {
          // Если генерация blacklist не удалась, не блокируем сохранение профиля
          console.warn("Не удалось сгенерировать blacklist, но профиль сохранен:", error);
          // Можно показать уведомление пользователю, но не критично
        }
      }

      // Обновляем данные пользователя
      await userStore.loadProfile();
      await goalStore.loadForUser(userStore.userId);

      // Закрываем модальное окно
      uiStore.closeChatProfileModal();

      // Вызываем callback
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Ошибка при сохранении профиля:", error);
      alert("Ошибка при сохранении данных. Попробуй еще раз.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!uiStore.showChatProfileModal) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-gradient-to-br from-[#1A1A1A] via-[#222222] to-[#1A1A1A] border-0 sm:border border-[#FFDD2D]/40 rounded-none sm:rounded-lg max-w-3xl w-full h-full sm:h-[80vh] sm:max-h-[800px] shadow-2xl flex flex-col relative overflow-hidden">
        {/* Заголовок */}
        <div className="p-4 border-b border-[#555555]/50 flex items-center justify-between bg-gradient-to-r from-[#333333]/50 to-[#2A2A2A]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FFDD2D] to-[#FFE855] flex items-center justify-center shadow-lg shadow-[#FFDD2D]/30">
              <FiZap className="w-5 h-5 text-[#333333]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Чат-бот для заполнения профиля</h2>
              <p className="text-xs text-white/60">Расскажи о себе, и я заполню анкету автоматически</p>
            </div>
          </div>
        </div>

        {/* Область сообщений */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((message, index) => {
            if (message.role === "system") {
              return (
                <div key={index} className="text-center">
                  <div className="inline-block px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/50 text-sm text-blue-300">
                    {message.text}
                  </div>
                </div>
              );
            }

            const isError = message.role === "error";

            return (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-[#FFDD2D] to-[#FFE855] text-[#333333]"
                      : isError
                      ? "bg-red-500/20 border border-red-500/50 text-red-300"
                      : "bg-[#333333]/50 border border-[#555555]/50 text-white"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap break-words">{message.text}</div>
                  {isError && lastFailedMessage && (
                    <button
                      onClick={() => {
                        setInputMessage(lastFailedMessage);
                        // Удаляем сообщение об ошибке и последнее сообщение пользователя из истории (если оно совпадает)
                        setMessages(prev => {
                          const filtered = prev.filter((_, i) => i !== index); // Удаляем сообщение об ошибке
                          // Находим индекс последнего сообщения пользователя, которое совпадает с неудачным
                          let lastUserMessageIndex = -1;
                          for (let i = filtered.length - 1; i >= 0; i--) {
                            if (filtered[i].role === "user" && filtered[i].text === lastFailedMessage) {
                              lastUserMessageIndex = i;
                              break;
                            }
                          }
                          // Удаляем последнее сообщение пользователя, если оно совпадает
                          if (lastUserMessageIndex !== -1) {
                            return filtered.filter((_, i) => i !== lastUserMessageIndex);
                          }
                          return filtered;
                        });
                        setTimeout(() => {
                          inputRef.current?.focus();
                          // Прокручиваем к концу после фокуса
                          inputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                        }, 100);
                      }}
                      className="mt-2 w-full px-3 py-1.5 rounded-lg bg-red-500/30 hover:bg-red-500/40 border border-red-500/50 text-white text-xs font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <FiRotateCw className="w-3 h-3" />
                      Повторить предыдущее сообщение
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#333333]/50 border border-[#555555]/50 rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Кнопка сохранения, если профиль готов */}
        {isComplete && profileData && (
          <div className="p-4 border-t border-[#555555]/50 bg-[#2A2A2A]/50">
            <button
              onClick={handleSaveProfile}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FFDD2D] to-[#FFE855] text-[#333333] font-bold hover:from-[#FFE855] hover:to-[#FFDD2D] transition-all shadow-lg shadow-[#FFDD2D]/40 hover:shadow-[#FFDD2D]/60 disabled:opacity-50"
            >
              {loading ? "Сохранение..." : "Сохранить профиль"}
            </button>
          </div>
        )}

        {/* Поле ввода */}
        <div className="p-4 border-t border-[#555555]/50 bg-[#2A2A2A]/50">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Расскажи о своих финансах..."
              disabled={loading || isComplete}
              className="flex-1 bg-[#333333] border border-[#555555] rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#FFDD2D] resize-none disabled:opacity-50"
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={!inputMessage.trim() || loading || isComplete}
              className="px-4 py-3 rounded-lg bg-gradient-to-r from-[#FFDD2D] to-[#FFE855] text-[#333333] font-bold hover:from-[#FFE855] hover:to-[#FFDD2D] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <FiSend className="w-5 h-5" />
            </button>
          </div>
          {isComplete && (
            <p className="text-xs text-white/50 mt-2 text-center">
              Профиль заполнен. Нажми кнопку "Сохранить профиль" выше, чтобы применить изменения.
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

export default ChatProfileModal;

