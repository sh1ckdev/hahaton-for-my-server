import { observer } from "mobx-react-lite";
import { useStores } from "../stores/StoreProvider.jsx";
import { useState } from "react";
import { FiX, FiPlus } from "react-icons/fi";
import api from "../api/client";

// Категории для анкеты
const SPENDING_CATEGORIES = [
  "Рестораны и кафе",
  "Фастфуд",
  "Кофе навынос",
  "Доставка еды",
  "Такси и каршеринг",
  "Подписки и сервисы",
  "Онлайн-шопинг",
  "Развлечения",
  "Игры и внутриигровые покупки",
  "Алкоголь и табак",
  "Электроника и гаджеты",
  "Одежда и аксессуары",
  "Красота и уход",
  "Путешествия",
  "Хобби",
  "Другое"
];

const ExtendedProfileModal = observer(({ onComplete }) => {
  const { userStore, goalStore } = useStores();
  
  // Шаг 1: На что тратит больше всего
  const [topSpending, setTopSpending] = useState([]);
  
  // Шаг 2: Импульсивные категории
  const [impulsiveCategories, setImpulsiveCategories] = useState([]);
  
  // Шаг 3: Финансовые цели
  const [financialGoals, setFinancialGoals] = useState([]); // Массив целей с полями
  
  // Шаг 4: Категории, мешающие целям
  const [blockingCategories, setBlockingCategories] = useState([]);
  
  // Шаг 5: Процент отложений
  const [savingsPercentage, setSavingsPercentage] = useState(20);
  
  // Шаг 6: Долги
  const [hasDebts, setHasDebts] = useState(false);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const totalSteps = 6;

  const toggleCategory = (category, setter, current) => {
    setter(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Формируем контекст для AI
      const contextText = `
Зарплата: ${userStore.user?.salary || 0}₽/месяц
Откладывает: ${userStore.user?.savingsPerMonth || 0}₽/месяц
Текущие накопления: ${userStore.user?.currentSavings || 0}₽

На что тратит больше всего: ${topSpending.join(", ")}
Импульсивные категории: ${impulsiveCategories.join(", ")}
Финансовые цели: ${financialGoals.length > 0 ? financialGoals.map(g => `${g.title} (${g.price}₽, приоритет ${g.priority})`).join(", ") : "не указаны"}
Категории, мешающие целям: ${blockingCategories.join(", ")}
Процент отложений: ${savingsPercentage}%
Есть долги: ${hasDebts ? "да" : "нет"}
      `.trim();

      // Создаем финансовые цели в системе целей
      if (financialGoals && financialGoals.length > 0) {
        for (const goal of financialGoals) {
          if (goal.title && goal.title.trim()) {
            try {
              await goalStore.createGoal(userStore.userId, {
                title: goal.title.trim(),
                price: Number(goal.price) || 0,
                priority: Number(goal.priority) || 5,
                description: ""
              });
            } catch (error) {
              console.error(`Ошибка при создании цели "${goal.title}":`, error);
            }
          }
        }
      }

      // Сохраняем данные анкеты в профиль пользователя (БЕЗ financialGoals, так как они уже в целях)
      await api.post(`/users/${userStore.userId}/profile`, {
        extendedProfile: {
          topSpendingCategories: topSpending,
          impulsiveCategories: impulsiveCategories,
          financialGoals: "", // Очищаем, так как цели теперь в системе целей
          blockingCategories: blockingCategories,
          savingsPercentage: savingsPercentage,
          hasDebts: hasDebts
        }
      });

      // Отправляем на генерацию blacklist
      // Используем путь без префикса /api, так как baseURL уже содержит /api
      const response = await api.post("/ai/suggest-blacklist", {
        profileSummary: contextText
      });

      // Сохраняем сгенерированные категории
      if (response.data.categories && response.data.categories.length > 0) {
        await api.post(`/users/${userStore.userId}/blacklist`, {
          categories: response.data.categories
        });
      }

      // Обновляем профиль и загружаем цели
      await userStore.loadProfile();
      await goalStore.loadForUser(userStore.userId);
      
      // Завершаем анкету
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Ошибка при сохранении анкеты:", error);
      alert("Ошибка при сохранении данных");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-2 text-white">
              На что ты тратишь больше всего денег?
            </h3>
            <p className="text-sm text-white/70 mb-4">
              Выбери все подходящие категории (можно несколько)
            </p>
            <div className="flex flex-wrap gap-2">
              {SPENDING_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat, setTopSpending, topSpending)}
                  className={`px-3 py-2 rounded-lg text-sm border transition ${
                    topSpending.includes(cat)
                      ? "bg-[#FFDD2D] text-[#333333] border-[#FFDD2D]"
                      : "bg-[#1A1A1A] text-white border-[#555555] hover:bg-[#444444]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-2 text-white">
              Какие категории трат ты считаешь импульсивными?
            </h3>
            <p className="text-sm text-white/70 mb-4">
              Покупки, о которых потом жалеешь
            </p>
            <div className="flex flex-wrap gap-2">
              {SPENDING_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat, setImpulsiveCategories, impulsiveCategories)}
                  className={`px-3 py-2 rounded-lg text-sm border transition ${
                    impulsiveCategories.includes(cat)
                      ? "bg-[#FFDD2D] text-[#333333] border-[#FFDD2D]"
                      : "bg-[#1A1A1A] text-white border-[#555555] hover:bg-[#444444]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-2 text-white">
              Есть ли у тебя финансовые цели?
            </h3>
            <p className="text-sm text-white/70 mb-4">
              Добавь свои финансовые цели с приоритетом и стоимостью
            </p>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {financialGoals.map((goal, index) => (
                <div key={index} className="bg-[#1A1A1A] border border-[#555555] rounded-lg p-4 space-y-3">
                  <div>
                    <label className="block text-xs text-white/70 mb-1">Название цели</label>
                    <input
                      type="text"
                      value={goal.title || ""}
                      onChange={(e) => {
                        const newGoals = [...financialGoals];
                        newGoals[index] = { ...newGoals[index], title: e.target.value };
                        setFinancialGoals(newGoals);
                      }}
                      placeholder="Например: Квартира"
                      className="w-full bg-[#333333] border border-[#555555] px-3 py-2 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FFDD2D]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-white/70 mb-1">Стоимость (₽)</label>
                      <input
                        type="number"
                        value={goal.price || ""}
                        onChange={(e) => {
                          const newGoals = [...financialGoals];
                          newGoals[index] = { ...newGoals[index], price: e.target.value };
                          setFinancialGoals(newGoals);
                        }}
                        placeholder="5000000"
                        min="0"
                        className="w-full bg-[#333333] border border-[#555555] px-3 py-2 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FFDD2D]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/70 mb-1">Приоритет (1-10)</label>
                      <input
                        type="number"
                        value={goal.priority || 5}
                        onChange={(e) => {
                          const newGoals = [...financialGoals];
                          newGoals[index] = { ...newGoals[index], priority: Math.min(10, Math.max(1, parseInt(e.target.value) || 5)) };
                          setFinancialGoals(newGoals);
                        }}
                        min="1"
                        max="10"
                        className="w-full bg-[#333333] border border-[#555555] px-3 py-2 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FFDD2D]"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setFinancialGoals(financialGoals.filter((_, i) => i !== index));
                    }}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    <FiX className="w-3 h-3" />
                    Удалить цель
                  </button>
                </div>
              ))}
              
              <button
                onClick={() => {
                  setFinancialGoals([...financialGoals, { title: "", price: "", priority: 5 }]);
                }}
                className="w-full py-3 border-2 border-dashed border-[#555555] rounded-lg text-white/70 hover:text-white hover:border-[#FFDD2D] transition-colors text-sm flex items-center justify-center gap-2"
              >
                <FiPlus className="w-4 h-4" />
                Добавить цель
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-2 text-white">
              Какие траты мешают достижению целей?
            </h3>
            <p className="text-sm text-white/70 mb-4">
              Выбери категории, которые отвлекают от целей
            </p>
            <div className="flex flex-wrap gap-2">
              {SPENDING_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat, setBlockingCategories, blockingCategories)}
                  className={`px-3 py-2 rounded-lg text-sm border transition ${
                    blockingCategories.includes(cat)
                      ? "bg-[#FFDD2D] text-[#333333] border-[#FFDD2D]"
                      : "bg-[#1A1A1A] text-white border-[#555555] hover:bg-[#444444]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-2 text-white">
              Какой процент дохода ты хочешь откладывать?
            </h3>
            <p className="text-sm text-white/70 mb-4">
              {savingsPercentage}% от зарплаты
            </p>
            <input
              type="range"
              min="0"
              max="50"
              value={savingsPercentage}
              onChange={(e) => setSavingsPercentage(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/60">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-2 text-white">
              Есть ли у тебя кредиты или долги?
            </h3>
            <p className="text-sm text-white/70 mb-4">
              Это поможет точнее определить категории для ограничения
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setHasDebts(true)}
                className={`flex-1 px-4 py-3 rounded-lg border transition ${
                  hasDebts
                    ? "bg-yellow-400 text-black border-yellow-400"
                    : "bg-[#1d1f24] text-gray-200 border-[#31343a] hover:bg-[#2a2d33]"
                }`}
              >
                Да
              </button>
              <button
                onClick={() => setHasDebts(false)}
                className={`flex-1 px-4 py-3 rounded-lg border transition ${
                  !hasDebts
                    ? "bg-yellow-400 text-black border-yellow-400"
                    : "bg-[#1d1f24] text-gray-200 border-[#31343a] hover:bg-[#2a2d33]"
                }`}
              >
                Нет
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#333333] border border-[#555555] rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-white">
              Расширенная анкета
            </h2>
            <span className="text-sm text-white/70">
              Шаг {currentStep} из {totalSteps}
            </span>
          </div>
          <div className="w-full bg-[#1A1A1A] rounded-lg h-2">
            <div
              className="bg-[#FFDD2D] h-2 rounded-lg transition-all"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="mb-6">
          {renderStep()}
        </div>

        <div className="flex justify-between gap-2">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="px-4 py-2 rounded-lg text-sm bg-[#1A1A1A] text-white/80 hover:bg-[#444444] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Назад
          </button>
          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              className="px-4 py-2 rounded-lg text-sm bg-[#FFDD2D] text-[#333333] font-semibold hover:bg-[#FFE855] transition-colors"
            >
              Далее →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm bg-[#FFDD2D] text-[#333333] font-semibold hover:bg-[#FFE855] disabled:opacity-50 transition-colors"
            >
              {loading ? "Сохранение..." : "Завершить"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default ExtendedProfileModal;

