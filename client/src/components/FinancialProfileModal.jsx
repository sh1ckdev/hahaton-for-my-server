import { observer } from "mobx-react-lite";
import { useStores } from "../stores/StoreProvider.jsx";
import { useState } from "react";
import api from "../api/client";

const FinancialProfileModal = observer(() => {
  const { userStore, uiStore } = useStores();
  const [salary, setSalary] = useState(userStore.user?.salary || "");
  const [loading, setLoading] = useState(false);

  // Условный return ПОСЛЕ всех хуков
  if (!userStore.user?.isFirstLogin || (userStore.user?.salary && userStore.user?.salary > 0)) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!salary) {
      alert("Пожалуйста, укажите зарплату");
      return;
    }

    setLoading(true);
    try {
      await api.post(`/users/${userStore.userId}/profile`, {
        salary: Number(salary),
        currentSavings: userStore.user?.currentSavings || 0
        // savingsPerMonth будет рассчитан автоматически в расширенной анкете
      });
      
      // Обновляем данные пользователя
      await userStore.loadProfile();
      
      // Закрываем модалку финансового профайла
      uiStore.closeFinancialProfileModal();
      
      // Если это первый вход, открываем blacklist modal
      if (userStore.user?.isFirstLogin) {
        uiStore.openInitialBlacklistModal();
      }
    } catch (error) {
      console.error("Ошибка сохранения профиля:", error);
      // Если пользователь не найден - logout произойдет автоматически через loadProfile
      if (error.response?.status === 404 || error.response?.status === 401) {
        return; // loadProfile уже вызовет logout
      }
      alert("Ошибка при сохранении данных");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#333333] border border-[#555555] rounded-lg p-6 max-w-md w-full shadow-2xl">
        <h2 className="text-xl font-semibold mb-2 text-white">
          Настройка финансового профиля
        </h2>
        <p className="text-sm text-white/70 mb-6">
          Для работы приложения необходимо указать базовую информацию о ваших финансах
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-2 text-white/90">
              Зарплата в месяц (₽)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              className="w-full rounded-lg bg-[#1A1A1A] border border-[#555555] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFDD2D] text-white"
              placeholder="50000"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              required
            />
          </div>


          <div className="flex justify-end gap-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm bg-[#FFDD2D] text-[#333333] font-semibold hover:bg-[#FFE855] disabled:opacity-50 transition-colors"
            >
              {loading ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default FinancialProfileModal;

