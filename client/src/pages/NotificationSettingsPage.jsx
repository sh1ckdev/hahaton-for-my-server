import { observer } from "mobx-react-lite";
import { useStores } from "../stores/StoreProvider.jsx";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell, FiMail, FiSend, FiClock } from "react-icons/fi";
import api from "../api/client";

const NotificationSettingsPage = observer(() => {
  const { userStore, purchaseStore } = useStores();
  const nav = useNavigate();
  
  const [frequency, setFrequency] = useState("weekly");
  const [customFrequencyMs, setCustomFrequencyMs] = useState(null);
  const [customValue, setCustomValue] = useState("");
  const [customUnit, setCustomUnit] = useState("seconds");
  const [channels, setChannels] = useState(["ui"]);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [email, setEmail] = useState("");
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [loading, setLoading] = useState(false);
  const [botInfo, setBotInfo] = useState(null);
  const [checkingConnection, setCheckingConnection] = useState(false);

  useEffect(() => {
    if (!userStore.user) return;
    
    const settings = userStore.user.notificationSettings || {};
    setFrequency(settings.frequency || "weekly");
    setChannels(settings.channels || ["ui"]);
    
    // Восстанавливаем кастомное время
    if (settings.frequency === "custom" && settings.customFrequencyMs) {
      const ms = settings.customFrequencyMs;
      if (ms % (1000 * 60 * 60 * 24) === 0) {
        setCustomValue(String(ms / (1000 * 60 * 60 * 24)));
        setCustomUnit("days");
      } else if (ms % (1000 * 60 * 60) === 0) {
        setCustomValue(String(ms / (1000 * 60 * 60)));
        setCustomUnit("hours");
      } else if (ms % (1000 * 60) === 0) {
        setCustomValue(String(ms / (1000 * 60)));
        setCustomUnit("minutes");
      } else {
        setCustomValue(String(ms / 1000));
        setCustomUnit("seconds");
      }
      setCustomFrequencyMs(ms);
    }
    
    if (settings.emailSettings) {
      setEmailEnabled(settings.emailSettings.enabled || false);
      setEmail(settings.emailSettings.email || "");
    }
    
    if (settings.telegramSettings) {
      setTelegramEnabled(settings.telegramSettings.enabled || false);
      setTelegramChatId(settings.telegramSettings.chatId || "");
      // Если chatId уже есть, значит Telegram уже подключен
    }
  }, [userStore.user]);

  useEffect(() => {
    purchaseStore.loadForUser(userStore.userId);
    loadBotInfo();
  }, [userStore.userId]);

  const loadBotInfo = async () => {
    try {
      const res = await api.get("/users/telegram-bot-info");
      setBotInfo(res.data);
    } catch (error) {
      console.log("Telegram bot not configured or unavailable");
      setBotInfo(null);
    }
  };

  const checkTelegramConnection = async () => {
    setCheckingConnection(true);
    try {
      // Обновляем профиль пользователя, чтобы получить актуальные настройки
      await userStore.loadProfile();
      const settings = userStore.user?.notificationSettings || {};
      const tgSettings = settings.telegramSettings || {};
      
      if (tgSettings.chatId) {
        setTelegramChatId(tgSettings.chatId);
        setTelegramEnabled(true);
        alert("Telegram успешно подключен! ✅");
      } else {
        alert("Пока не подключено. Убедитесь, что вы написали /start ваш_user_id боту.");
      }
    } catch (error) {
      console.error("Error checking connection:", error);
    } finally {
      setCheckingConnection(false);
    }
  };

  const toggleChannel = (channel) => {
    setChannels(prev => 
      prev.includes(channel) 
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const calculateCustomMs = (value, unit) => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) return null;
    
    switch (unit) {
      case "seconds": return num * 1000;
      case "minutes": return num * 1000 * 60;
      case "hours": return num * 1000 * 60 * 60;
      case "days": return num * 1000 * 60 * 60 * 24;
      default: return null;
    }
  };

  const handleCustomValueChange = (value) => {
    setCustomValue(value);
    const ms = calculateCustomMs(value, customUnit);
    setCustomFrequencyMs(ms);
  };

  const handleCustomUnitChange = (unit) => {
    setCustomUnit(unit);
    const ms = calculateCustomMs(customValue, unit);
    setCustomFrequencyMs(ms);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        frequency,
        channels,
        emailSettings: {
          enabled: emailEnabled,
          email: emailEnabled ? email : ""
        },
        telegramSettings: {
          enabled: telegramEnabled
          // chatId не отправляем, если он уже сохранен через /start команду
          // и не был изменен вручную
        }
      };

      if (frequency === "custom") {
        if (!customFrequencyMs || customFrequencyMs <= 0) {
          alert("Пожалуйста, укажите корректное кастомное время");
          setLoading(false);
          return;
        }
        payload.customFrequencyMs = customFrequencyMs;
      } else {
        payload.customFrequencyMs = null;
      }

      await api.post(`/users/${userStore.userId}/notification-settings`, payload);
      
      // Перезагружаем профиль и вишлист для синхронизации
      await userStore.loadProfile();
      await purchaseStore.loadForUser(userStore.userId);
      
      nav("/");
    } catch (error) {
      console.error("Ошибка сохранения настроек:", error);
      // Если пользователь не найден - logout произойдет автоматически через loadProfile
      if (error.response?.status === 404 || error.response?.status === 401) {
        return; // loadProfile уже вызовет logout
      }
      alert("Ошибка при сохранении настроек");
    } finally {
      setLoading(false);
    }
  };

  if (!userStore.user) return null;

  const frequencyOptions = [
    { value: "daily", label: "Ежедневно", icon: "🌅" },
    { value: "weekly", label: "Еженедельно", icon: "📅" },
    { value: "monthly", label: "Ежемесячно", icon: "📆" },
    { value: "custom", label: "Кастомное время", icon: "⏱️" }
  ];

  const channelOptions = [
    { value: "ui", label: "В приложении", icon: FiBell, color: "blue" },
    { value: "email", label: "Email", icon: FiMail, color: "purple" },
    { value: "telegram", label: "Telegram", icon: FiSend, color: "cyan" }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0D0D0D]">
      <header className="px-3 sm:px-4 py-3 border-b border-[#333333] bg-[#1A1A1A] flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => nav(-1)}
          className="flex items-center gap-2 text-sm text-white hover:text-[#FFDD2D] transition-colors flex-shrink-0"
        >
          <span className="text-lg">←</span>
          <span className="hidden sm:inline">Назад</span>
        </button>
        <div className="flex items-center gap-2 flex-1 justify-center">
          <FiBell className="w-5 h-5 text-[#FFDD2D] flex-shrink-0" />
          <span className="font-semibold text-sm sm:text-base text-white text-center">Настройки уведомлений</span>
        </div>
        <div className="w-14 sm:w-14 flex-shrink-0" />
      </header>

      <main className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4 w-full">
        {/* Частота опроса */}
        <section className="bg-[#1A1A1A] border border-[#333333] rounded-lg p-4">
          <h3 className="text-base font-semibold text-white mb-3">Частота уведомлений</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {frequencyOptions.map(opt => {
              const isSelected = frequency === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFrequency(opt.value)}
                  className={`p-3 rounded-lg border transition-all text-left ${
                    isSelected
                      ? "border-[#FFDD2D] bg-[#FFDD2D]/10 text-[#FFDD2D]"
                      : "border-[#333333] bg-[#0D0D0D] hover:border-[#444444] text-white"
                  }`}
                >
                  <div className={`text-sm font-medium ${isSelected ? "text-[#FFDD2D]" : "text-white"}`}>
                    {opt.label}
                  </div>
                </button>
              );
            })}
          </div>
          
          {frequency === "custom" && (
            <div className="mt-3 p-3 bg-[#0D0D0D] rounded-lg border border-[#333333]">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    placeholder="5"
                    value={customValue}
                    onChange={(e) => handleCustomValueChange(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#444444] px-3 py-2 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#FFDD2D] focus:border-transparent"
                  />
                </div>
                <div className="flex-1">
                  <select
                    value={customUnit}
                    onChange={(e) => handleCustomUnitChange(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#444444] px-3 py-2 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#FFDD2D] focus:border-transparent"
                  >
                    <option value="seconds">Секунды</option>
                    <option value="minutes">Минуты</option>
                    <option value="hours">Часы</option>
                    <option value="days">Дни</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Каналы нотификации */}
        <section className="bg-[#1A1A1A] border border-[#333333] rounded-lg p-4">
          <h3 className="text-base font-semibold text-white mb-3">Каналы уведомлений</h3>
          
          <div className="space-y-2">
            {channelOptions.map(opt => {
              const Icon = opt.icon;
              const isSelected = channels.includes(opt.value);
              
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? "border-[#FFDD2D] bg-[#FFDD2D]/10"
                      : "border-[#333333] bg-[#0D0D0D] hover:border-[#444444]"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isSelected ? "text-[#FFDD2D]" : "text-white/60"}`} />
                  <div className="flex-1 text-sm text-white font-medium">
                    {opt.label}
                  </div>
                  <div className={`relative w-10 h-5 rounded-full transition-colors ${
                    isSelected ? "bg-[#FFDD2D]" : "bg-[#333333]"
                  }`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleChannel(opt.value)}
                      className="sr-only"
                    />
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      isSelected ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        {/* Настройки Email */}
        {channels.includes("email") && (
          <section className="bg-[#1A1A1A] border border-[#333333] rounded-lg p-4">
            <h3 className="text-base font-semibold text-white mb-3">Настройки Email</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`relative w-10 h-5 rounded-full transition-colors ${
                  emailEnabled ? "bg-[#FFDD2D]" : "bg-[#333333]"
                }`}>
                  <input
                    type="checkbox"
                    checked={emailEnabled}
                    onChange={(e) => setEmailEnabled(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    emailEnabled ? "translate-x-5" : "translate-x-0"
                  }`} />
                </div>
                <span className="text-sm text-white">Включить уведомления на Email</span>
              </label>
              {emailEnabled && (
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#444444] px-3 py-2 rounded text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-[#FFDD2D] focus:border-transparent"
                />
              )}
            </div>
          </section>
        )}

        {/* Настройки Telegram */}
        {channels.includes("telegram") && (
          <section className="bg-[#1A1A1A] border border-[#333333] rounded-lg p-4">
            <h3 className="text-base font-semibold text-white mb-3">Настройки Telegram</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`relative w-10 h-5 rounded-full transition-colors ${
                  telegramEnabled ? "bg-[#FFDD2D]" : "bg-[#333333]"
                }`}>
                  <input
                    type="checkbox"
                    checked={telegramEnabled}
                    onChange={(e) => setTelegramEnabled(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    telegramEnabled ? "translate-x-5" : "translate-x-0"
                  }`} />
                </div>
                <span className="text-sm text-white">Включить уведомления в Telegram</span>
              </label>
              
              {telegramEnabled && !telegramChatId && botInfo && (
                <div className="bg-[#0D0D0D] border border-[#333333] rounded-lg p-3 space-y-3">
                  <div className="text-xs text-white/70">
                    Для подключения Telegram:
                  </div>
                  <ol className="text-xs text-white/80 space-y-2 list-decimal list-inside ml-2">
                    <li>Откройте бота в Telegram</li>
                    <li>Напишите команду: <code className="bg-[#1A1A1A] px-1.5 py-0.5 rounded">/start {userStore.userId}</code></li>
                    <li>Нажмите кнопку ниже для проверки подключения</li>
                  </ol>
                  <div className="bg-[#1A1A1A] border border-[#333333] rounded px-2 py-1.5 text-xs">
                    <div className="text-white/60 mb-1">Ваш User ID:</div>
                    <code className="text-[#FFDD2D] break-all">{userStore.userId}</code>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={botInfo.botLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-[#0088cc] hover:bg-[#006ba3] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors text-center"
                    >
                      Открыть бота в Telegram
                    </a>
                    <button
                      onClick={checkTelegramConnection}
                      disabled={checkingConnection}
                      className="px-4 py-2 bg-[#FFDD2D] text-[#333333] text-sm font-medium rounded-lg hover:bg-[#FFE855] disabled:opacity-50 transition-colors"
                    >
                      {checkingConnection ? "Проверка..." : "Проверить"}
                    </button>
                  </div>
                </div>
              )}
              
              {telegramChatId && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-xs text-green-300">
                  ✅ Telegram подключен (Chat ID: {telegramChatId})
                </div>
              )}
              
              {telegramEnabled && !botInfo && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-300">
                  ⚠️ Telegram бот не настроен на сервере. Обратитесь к администратору.
                </div>
              )}
            </div>
          </section>
        )}

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full px-4 py-3 rounded-lg bg-[#FFDD2D] text-[#333333] font-semibold hover:bg-[#FFE855] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-[#333333] border-t-transparent rounded-full animate-spin" />
              Сохранение...
            </>
          ) : (
            "Сохранить настройки"
          )}
        </button>
      </main>
    </div>
  );
});

export default NotificationSettingsPage;

