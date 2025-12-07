import { observer } from "mobx-react-lite";
import { useStores } from "../stores/StoreProvider.jsx";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiUser, FiDollarSign, FiTarget, FiTrendingUp, FiShoppingCart, FiCheckCircle, FiXCircle, FiClock, FiEdit2, FiCheck, FiX, FiPlus, FiTrash2, FiChevronDown, FiChevronUp } from "react-icons/fi";
import api from "../api/client";

// Компонент круговой диаграммы
const PurchasePieChart = ({ planned, purchased, canceled, total }) => {
  if (total === 0) return null;

  const size = 200;
  const radius = 70;
  const centerX = size / 2;
  const centerY = size / 2;
  const circumference = 2 * Math.PI * radius;

  const plannedPercent = (planned / total) * 100;
  const purchasedPercent = (purchased / total) * 100;
  const canceledPercent = (canceled / total) * 100;

  // Функция для создания сегмента круга
  const createArc = (startPercent, endPercent) => {
    const startAngle = (startPercent / 100) * 360 - 90; // -90 чтобы начать сверху
    const endAngle = (endPercent / 100) * 360 - 90;
    
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);
    
    const largeArc = endPercent - startPercent > 50 ? 1 : 0;
    
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  let currentPercent = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {/* Запланировано */}
        {planned > 0 && (
          <path
            d={createArc(currentPercent, currentPercent + plannedPercent)}
            fill="#FFDD2D"
          />
        )}
        {planned > 0 && (currentPercent += plannedPercent)}
        
        {/* Куплено */}
        {purchased > 0 && (
          <path
            d={createArc(currentPercent, currentPercent + purchasedPercent)}
            fill="#4ADE80"
          />
        )}
        {purchased > 0 && (currentPercent += purchasedPercent)}
        
        {/* Отменено */}
        {canceled > 0 && (
          <path
            d={createArc(currentPercent, currentPercent + canceledPercent)}
            fill="#F87171"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-3xl font-bold text-white">{total}</div>
          <div className="text-xs text-white/60">Всего</div>
        </div>
      </div>
    </div>
  );
};

const ProfilePage = observer(() => {
  const { userStore, purchaseStore } = useStores();
  const nav = useNavigate();
  const [editingSavings, setEditingSavings] = useState(false);
  const [savingsValue, setSavingsValue] = useState("");
  const [editingSavingsPercentage, setEditingSavingsPercentage] = useState(false);
  const [savingsPercentageValue, setSavingsPercentageValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cooldownRules, setCooldownRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [cooldownRulesExpanded, setCooldownRulesExpanded] = useState(false);

  const loadCooldownRules = useCallback(async () => {
    if (!userStore.userId) return;
    try {
      const res = await api.get(`/users/${userStore.userId}/cooldown-rules`);
      setCooldownRules(res.data || []);
    } catch (error) {
      console.error("Ошибка загрузки правил охлаждения:", error);
    }
  }, [userStore.userId]);

  useEffect(() => {
    if (!userStore.user) {
      nav("/login");
      return;
    }
    purchaseStore.loadForUser(userStore.userId);
    loadCooldownRules();
  }, [userStore.user, userStore.userId, purchaseStore, loadCooldownRules, nav]);

  if (!userStore.user) return null;

  const user = userStore.user;
  const allPurchases = purchaseStore.purchases || [];
  const purchased = allPurchases.filter(p => p.status === "purchased");
  const canceled = allPurchases.filter(p => p.status === "canceled");
  const planned = allPurchases.filter(p => p.status === "planned");

  const handleEditSavings = () => {
    setSavingsValue(user.currentSavings?.toString() || "0");
    setEditingSavings(true);
  };

  const handleSaveSavings = async () => {
    const numValue = Number(savingsValue.replace(/\s/g, ""));
    if (isNaN(numValue) || numValue < 0) {
      alert("Пожалуйста, введите корректную сумму");
      return;
    }

    setLoading(true);
    try {
      await api.post(`/users/${userStore.userId}/bank-sync`, {
        currentSavings: numValue
      });
      await userStore.loadProfile();
      setEditingSavings(false);
    } catch (error) {
      console.error("Ошибка обновления накоплений:", error);
      alert("Ошибка при сохранении накоплений");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingSavings(false);
    setSavingsValue("");
  };

  const handleEditSavingsPercentage = () => {
    const currentPercentage = user.extendedProfile?.savingsPercentage || 0;
    setSavingsPercentageValue(currentPercentage);
    setEditingSavingsPercentage(true);
  };

  const handleSaveSavingsPercentage = async () => {
    const numValue = Number(savingsPercentageValue);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      alert("Пожалуйста, введите корректный процент (0-100)");
      return;
    }

    setLoading(true);
    try {
      const salary = user.salary || 0;
      const calculatedSavingsPerMonth = Math.round((salary * numValue) / 100);
      
      await api.post(`/users/${userStore.userId}/profile`, {
        extendedProfile: {
          ...user.extendedProfile,
          savingsPercentage: numValue
        },
        savingsPerMonth: calculatedSavingsPerMonth
      });
      await userStore.loadProfile();
      setEditingSavingsPercentage(false);
    } catch (error) {
      console.error("Ошибка обновления процента отложений:", error);
      alert("Ошибка при сохранении процента отложений");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEditPercentage = () => {
    setEditingSavingsPercentage(false);
    setSavingsPercentageValue(0);
  };

  const handleSaveCooldownRules = async () => {
    setLoadingRules(true);
    try {
      await api.post(`/users/${userStore.userId}/cooldown-rules`, cooldownRules);
      alert("Правила охлаждения успешно сохранены!");
    } catch (error) {
      console.error("Ошибка сохранения правил:", error);
      alert("Ошибка при сохранении правил охлаждения");
    } finally {
      setLoadingRules(false);
    }
  };

  const addCooldownRule = () => {
    const lastRule = cooldownRules[cooldownRules.length - 1];
    const newMin = lastRule ? lastRule.maxAmount : 0;
    setCooldownRules([
      ...cooldownRules,
      {
        minAmount: newMin,
        maxAmount: newMin + 10000,
        days: 7
      }
    ]);
  };

  const updateCooldownRule = (index, field, value) => {
    const updated = [...cooldownRules];
    updated[index] = { ...updated[index], [field]: Number(value) || 0 };
    setCooldownRules(updated);
  };

  const removeCooldownRule = (index) => {
    if (cooldownRules.length <= 1) {
      alert("Должно быть хотя бы одно правило");
      return;
    }
    setCooldownRules(cooldownRules.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0D0D0D]">
      <header className="px-4 py-3 border-b border-[#333333] bg-[#1A1A1A] flex items-center justify-between">
        <button
          onClick={() => nav(-1)}
          className="flex items-center gap-2 text-sm text-white hover:text-[#FFDD2D] transition-colors"
        >
          <FiArrowLeft className="w-5 h-5" />
          Назад
        </button>
        <div className="flex items-center gap-2">
          <FiUser className="w-5 h-5 text-[#FFDD2D]" />
          <span className="font-semibold text-white">Личный кабинет</span>
        </div>
        <div className="w-20" />
      </header>

      <main className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Финансовый профайл */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <FiDollarSign className="w-5 h-5 text-[#FFDD2D]" />
            <h3 className="text-lg font-semibold text-white">Финансовый профайл</h3>
          </div>
          <div className="bg-[#333333] border border-[#555555] rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-md bg-[#1A1A1A]">
              <div className="flex items-center gap-3">
                <FiTrendingUp className="w-5 h-5 text-[#FFDD2D]" />
                <span className="text-white/70">Зарплата в месяц:</span>
              </div>
              <span className="font-semibold text-white">{user.salary?.toLocaleString() || 0} ₽</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-[#1A1A1A]">
              <div className="flex items-center gap-3">
                <FiTarget className="w-5 h-5 text-[#FFDD2D]" />
                <div className="flex flex-col">
                <span className="text-white/70">Откладываю в месяц:</span>
                  {user.extendedProfile?.savingsPercentage !== undefined && (
                    <span className="text-xs text-white/50">
                      {user.extendedProfile.savingsPercentage}% от зарплаты
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
              <span className="font-semibold text-white">{user.savingsPerMonth?.toLocaleString() || 0} ₽</span>
                {!editingSavingsPercentage && (
                  <button
                    onClick={handleEditSavingsPercentage}
                    className="p-1.5 rounded hover:bg-[#444444] text-white/60 hover:text-[#FFDD2D] transition-colors"
                    title="Редактировать процент отложений"
                  >
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {editingSavingsPercentage && (
              <div className="bg-[#1A1A1A] border border-[#333333] rounded-md p-4 space-y-3">
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Процент от зарплаты для отложений
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={savingsPercentageValue}
                      onChange={(e) => setSavingsPercentageValue(Number(e.target.value))}
                      className="flex-1"
                    />
                    <div className="w-20 text-right">
                      <span className="text-lg font-semibold text-white">{savingsPercentageValue}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-white/50 mt-1">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                  </div>
                </div>
                {user.salary > 0 && (
                  <div className="bg-[#0D0D0D] border border-[#333333] rounded-md p-3">
                    <div className="text-xs text-white/60 mb-1">Будешь откладывать:</div>
                    <div className="text-xl font-bold text-[#FFDD2D]">
                      {Math.round((user.salary * savingsPercentageValue) / 100).toLocaleString()} ₽/месяц
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleSaveSavingsPercentage}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-[#FFDD2D] text-[#333333] font-semibold rounded-lg hover:bg-[#FFE855] transition-colors disabled:opacity-50"
                  >
                    Сохранить
                  </button>
                  <button
                    onClick={handleCancelEditPercentage}
                    disabled={loading}
                    className="px-4 py-2 bg-[#333333] text-white border border-[#555555] rounded-lg hover:bg-[#444444] transition-colors disabled:opacity-50"
                  >
                    Отмена
                  </button>
                </div>
            </div>
            )}
            <div className="flex items-center justify-between p-3 rounded-md bg-[#1A1A1A]">
              <div className="flex items-center gap-3">
                <FiDollarSign className="w-5 h-5 text-[#FFDD2D]" />
                <span className="text-white/70">Текущие накопления:</span>
              </div>
              {editingSavings ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={savingsValue}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setSavingsValue(value);
                    }}
                    onBlur={(e) => {
                      const num = Number(e.target.value.replace(/\s/g, ""));
                      if (!isNaN(num)) {
                        setSavingsValue(num.toLocaleString("ru-RU"));
                      }
                    }}
                    onFocus={(e) => {
                      const num = Number(e.target.value.replace(/\s/g, ""));
                      if (!isNaN(num)) {
                        setSavingsValue(num.toString());
                      }
                    }}
                    className="w-32 bg-[#333333] border border-[#555555] px-2 py-1 rounded text-white text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#FFDD2D]"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveSavings}
                    disabled={loading}
                    className="p-1.5 rounded bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors disabled:opacity-50"
                    title="Сохранить"
                  >
                    <FiCheck className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={loading}
                    className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors disabled:opacity-50"
                    title="Отмена"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{user.currentSavings?.toLocaleString() || 0} ₽</span>
                  <button
                    onClick={handleEditSavings}
                    className="p-1.5 rounded hover:bg-[#444444] text-white/60 hover:text-[#FFDD2D] transition-colors"
                    title="Редактировать накопления"
                  >
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-[#1A1A1A]">
              <div className="flex items-center gap-3">
                <FiTarget className="w-5 h-5 text-[#FFDD2D]" />
                <div className="flex flex-col">
                  <span className="text-white/70">Учитывать текущие накопления</span>
                  <span className="text-xs text-white/50">При расчете даты "Комфортно купить"</span>
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    await api.post(`/users/${userStore.userId}/bank-sync`, {
                      considerSavings: !user.considerSavings
                    });
                    await userStore.loadProfile();
                  } catch (error) {
                    console.error("Ошибка обновления настройки:", error);
                    alert("Ошибка при сохранении настройки");
                  }
                }}
                className="flex items-center"
                title={user.considerSavings ? "Отключить учет накоплений" : "Включить учет накоплений"}
              >
                <div className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                  user.considerSavings ? "bg-[#FFDD2D]" : "bg-[#333333]"
                }`}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                    user.considerSavings ? "translate-x-5" : "translate-x-0"
                  }`} />
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* Правила охлаждения */}
        <section>
          <button
            onClick={() => setCooldownRulesExpanded(!cooldownRulesExpanded)}
            className="w-full flex items-center justify-between mb-3 p-3 bg-[#333333] border border-[#555555] rounded-md hover:bg-[#3a3a3a] transition-colors"
          >
            <div className="flex items-center gap-2">
                <FiClock className="w-5 h-5 text-[#FFDD2D]" />
              <h3 className="text-lg font-semibold text-white">Правила охлаждения</h3>
            </div>
            {cooldownRulesExpanded ? (
              <FiChevronUp className="w-5 h-5 text-white/60" />
            ) : (
              <FiChevronDown className="w-5 h-5 text-white/60" />
            )}
          </button>
          {cooldownRulesExpanded && (
            <div className="bg-[#333333] border border-[#555555] rounded-md p-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm text-white/70">
                  Настройте периоды охлаждения в зависимости от суммы покупки
                </p>
                <p className="text-xs text-white/50 mt-1">
                  Система будет рекомендовать подумать над покупкой указанное количество дней
                </p>
              </div>
              <button
                onClick={addCooldownRule}
                className="flex items-center gap-2 text-sm bg-[#FFDD2D] text-[#333333] px-4 py-2 rounded-lg font-semibold hover:bg-[#FFE855] transition-colors whitespace-nowrap"
              >
                <FiPlus className="w-4 h-4" />
                Добавить правило
              </button>
            </div>

            {cooldownRules.length === 0 ? (
              <div className="bg-[#1A1A1A] border border-[#444444] rounded-md p-8 text-center">
                <p className="text-white/70 mb-4">Правила охлаждения не настроены</p>
                <button
                  onClick={addCooldownRule}
                  className="px-4 py-2 bg-[#FFDD2D] text-[#333333] rounded-md font-semibold hover:bg-[#FFE855] transition-colors"
                >
                  Добавить первое правило
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {cooldownRules.map((rule, index) => (
                    <div
                      key={index}
                      className="bg-[#1A1A1A] border border-[#444444] rounded-lg p-4 sm:p-5"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#FFDD2D]"></div>
                          <span className="text-sm font-semibold text-white">Правило {index + 1}</span>
                        </div>
                        <button
                          onClick={() => removeCooldownRule(index)}
                          className="p-2 bg-red-500/20 text-red-400 rounded-md hover:bg-red-500/30 border border-red-500/30 transition-colors"
                          title="Удалить правило"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-white/70 mb-2">
                            От суммы (₽)
                          </label>
                          <input
                            type="number"
                            value={rule.minAmount || 0}
                            onChange={(e) => updateCooldownRule(index, "minAmount", e.target.value)}
                            min="0"
                            className="w-full px-3 py-2.5 bg-[#333333] border border-[#555555] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FFDD2D] focus:border-transparent transition-all"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-white/70 mb-2">
                            До суммы (₽)
                          </label>
                          <input
                            type="number"
                            value={rule.maxAmount || 0}
                            onChange={(e) => updateCooldownRule(index, "maxAmount", e.target.value)}
                            min={rule.minAmount || 0}
                            className="w-full px-3 py-2.5 bg-[#333333] border border-[#555555] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FFDD2D] focus:border-transparent transition-all"
                            placeholder="0"
                          />
                          {index === cooldownRules.length - 1 && (
                            <p className="text-xs text-white/50 mt-1.5">
                              (максимальный диапазон)
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-white/70 mb-2">
                            Дней охлаждения
                          </label>
                          <input
                            type="number"
                            value={rule.days || 0}
                            onChange={(e) => updateCooldownRule(index, "days", e.target.value)}
                            min="1"
                            className="w-full px-3 py-2.5 bg-[#333333] border border-[#555555] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FFDD2D] focus:border-transparent transition-all"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-[#444444]">
                        <div className="flex items-center gap-2 text-sm text-white/80">
                          <FiClock className="w-4 h-4 text-[#FFDD2D]" />
                          <span>
                            Покупки от <span className="font-semibold text-white">{rule.minAmount?.toLocaleString()} ₽</span> до <span className="font-semibold text-white">{rule.maxAmount?.toLocaleString()} ₽</span> → период охлаждения <span className="font-semibold text-[#FFDD2D]">{rule.days}</span> {rule.days === 1 ? "день" : rule.days < 5 ? "дня" : "дней"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSaveCooldownRules}
                  disabled={loadingRules}
                  className="w-full px-4 py-3 bg-[#FFDD2D] text-[#333333] rounded-lg font-semibold hover:bg-[#FFE855] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loadingRules ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#333333] border-t-transparent rounded-full animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    "Сохранить правила"
                  )}
                </button>
              </>
            )}
            </div>
          )}
        </section>

        {/* Статистика покупок и История покупок */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <FiShoppingCart className="w-5 h-5 text-[#FFDD2D]" />
            <h3 className="text-lg font-semibold text-white">Покупки</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Статистика покупок - слева на десктопе */}
            <div className="bg-[#333333] border border-[#555555] rounded-md p-4 sm:p-6">
              <h4 className="text-base font-semibold text-white mb-4">Статистика</h4>
              {allPurchases.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-white/60 text-sm">Пока нет покупок</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-center items-center mb-6">
                    <PurchasePieChart 
                      planned={planned.length}
                      purchased={purchased.length}
                      canceled={canceled.length}
                      total={allPurchases.length}
                    />
          </div>
                  <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-[#FFDD2D]"></div>
                      <div className="text-sm text-white/70">
                        <span className="font-semibold text-white">{planned.length}</span> Запланировано
              </div>
            </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-green-400"></div>
                      <div className="text-sm text-white/70">
                        <span className="font-semibold text-white">{purchased.length}</span> Куплено
              </div>
            </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-red-400"></div>
                      <div className="text-sm text-white/70">
                        <span className="font-semibold text-white">{canceled.length}</span> Отменено
              </div>
            </div>
          </div>
                </>
              )}
            </div>

            {/* История покупок - справа на десктопе */}
            <div className="bg-[#333333] border border-[#555555] rounded-md p-4 sm:p-6">
              <h4 className="text-base font-semibold text-white mb-4">История транзакций</h4>
          <div className="space-y-2">
            {allPurchases.length === 0 ? (
              <p className="text-white/60 text-sm text-center py-4">
                Пока нет покупок
              </p>
            ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                {allPurchases.map(purchase => (
                  <div
                    key={purchase._id}
                        className="bg-[#1A1A1A] border border-[#444444] rounded-md p-3"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-white">{purchase.title}</div>
                        {purchase.category && (
                          <div className="text-xs text-white/60 mt-1">
                            Категория: {purchase.category}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-white">{purchase.price?.toLocaleString()} ₽</div>
                        <div className={`text-xs mt-1 ${
                          purchase.status === "purchased" ? "text-green-400" :
                          purchase.status === "canceled" ? "text-red-400" :
                          "text-[#FFDD2D]"
                        }`}>
                          {purchase.status === "purchased" ? "Куплено" :
                           purchase.status === "canceled" ? "Отменено" :
                           "Запланировано"}
                        </div>
                      </div>
                    </div>
                    {purchase.createdAt && (
                      <div className="text-xs text-white/50">
                        {new Date(purchase.createdAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
});

export default ProfilePage;

