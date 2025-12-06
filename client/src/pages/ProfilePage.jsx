import { observer } from "mobx-react-lite";
import { useStores } from "../stores/StoreProvider.jsx";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiUser, FiDollarSign, FiTarget, FiTrendingUp, FiShoppingCart, FiCheckCircle, FiXCircle, FiClock, FiEdit2, FiCheck, FiX } from "react-icons/fi";
import api from "../api/client";

const ProfilePage = observer(() => {
  const { userStore, purchaseStore } = useStores();
  const nav = useNavigate();
  const [editingSavings, setEditingSavings] = useState(false);
  const [savingsValue, setSavingsValue] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userStore.user) {
      nav("/login");
      return;
    }
    purchaseStore.loadForUser(userStore.userId);
  }, [userStore.user, userStore.userId]);

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
                <span className="text-white/70">Откладываю в месяц:</span>
              </div>
              <span className="font-semibold text-white">{user.savingsPerMonth?.toLocaleString() || 0} ₽</span>
            </div>
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
          </div>
        </section>


        {/* Статистика покупок */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <FiShoppingCart className="w-5 h-5 text-[#FFDD2D]" />
            <h3 className="text-lg font-semibold text-white">Статистика покупок</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-[#333333] border border-[#555555] rounded-md p-4 text-center">
              <div className="w-10 h-10 rounded-md bg-[#FFDD2D]/10 flex items-center justify-center mx-auto mb-2">
                <FiClock className="w-5 h-5 text-[#FFDD2D]" />
              </div>
              <div className="text-2xl font-semibold text-[#FFDD2D]">{planned.length}</div>
              <div className="text-xs text-white/60 mt-1">Запланировано</div>
            </div>
            <div className="bg-[#333333] border border-[#555555] rounded-md p-4 text-center">
              <div className="w-10 h-10 rounded-md bg-green-400/10 flex items-center justify-center mx-auto mb-2">
                <FiCheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-2xl font-semibold text-green-400">{purchased.length}</div>
              <div className="text-xs text-white/60 mt-1">Куплено</div>
            </div>
            <div className="bg-[#333333] border border-[#555555] rounded-md p-4 text-center">
              <div className="w-10 h-10 rounded-md bg-red-400/10 flex items-center justify-center mx-auto mb-2">
                <FiXCircle className="w-5 h-5 text-red-400" />
              </div>
              <div className="text-2xl font-semibold text-red-400">{canceled.length}</div>
              <div className="text-xs text-white/60 mt-1">Отменено</div>
            </div>
          </div>
        </section>

        {/* История покупок */}
        <section>
          <h3 className="text-lg font-semibold mb-3 text-white">История покупок</h3>
          <div className="space-y-2">
            {allPurchases.length === 0 ? (
              <p className="text-white/60 text-sm text-center py-4">
                Пока нет покупок
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {allPurchases.map(purchase => (
                  <div
                    key={purchase._id}
                    className="bg-[#333333] border border-[#555555] rounded-md p-3"
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
        </section>
      </main>
    </div>
  );
});

export default ProfilePage;

