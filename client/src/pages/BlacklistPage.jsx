import { observer } from "mobx-react-lite";
import { useStores } from "../stores/StoreProvider.jsx";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiShield, FiCheck, FiX } from "react-icons/fi";
import { ALL_BLACKLIST_CATEGORIES } from "../utils/categories.js";

const BlacklistPage = observer(() => {
  const { userStore } = useStores();
  const nav = useNavigate();
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    const existing =
      userStore.user?.notificationSettings?.excludeCategories || [];
    setSelected(existing);
  }, [userStore.user]);

  // Объединяем сохраненные категории пользователя с полным списком
  // Убираем дубликаты и сортируем
  const availableCategories = useMemo(() => {
    const existing = userStore.user?.notificationSettings?.excludeCategories || [];
    const combined = [...new Set([...existing, ...ALL_BLACKLIST_CATEGORIES])];
    return combined.sort();
  }, [userStore.user?.notificationSettings?.excludeCategories]);

  const toggle = (cat) => {
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const save = async () => {
    await userStore.updateBlacklist(selected);
    nav("/");
  };

  if (!userStore.user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-[#0D0D0D]">
      <header className="px-4 py-4 border-b border-[#333333] bg-[#1A1A1A] flex items-center justify-between">
        <button
          onClick={() => nav(-1)}
          className="flex items-center gap-2 text-sm text-white hover:text-[#FFDD2D] transition-colors"
        >
          <FiArrowLeft className="w-5 h-5" />
          Назад
        </button>
        <div className="flex items-center gap-2">
          <FiShield className="w-5 h-5 text-[#FFDD2D]" />
          <span className="font-semibold text-white">Blacklist категорий</span>
        </div>
        <div className="w-20" />
      </header>

      <main className="flex-1 px-3 sm:px-4 py-4 sm:py-6 max-w-4xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Запрещённые категории</h1>
          <p className="text-sm text-white/70">
            Выбери категории, на которые ассистент будет обращать особое внимание.
            Покупки из этих категорий он будет блокировать или отговаривать от них.
          </p>
        </div>

        {/* Stats Card */}
        <div className="mb-6 p-3 sm:p-4 rounded-md bg-[#333333] border border-[#555555] flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 rounded-md bg-[#FFDD2D]/10 flex items-center justify-center">
              <FiShield className="w-6 h-6 text-[#FFDD2D]" />
            </div>
            <div>
              <div className="text-sm text-white/60">Всего категорий</div>
              <div className="text-xl font-bold text-white">{availableCategories.length}</div>
            </div>
          </div>
          <div className="hidden sm:block w-px h-12 bg-[#555555]" />
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 rounded-md bg-[#FFDD2D]/20 flex items-center justify-center">
              <FiCheck className="w-6 h-6 text-[#FFDD2D]" />
            </div>
            <div>
              <div className="text-sm text-white/60">Выбрано</div>
              <div className="text-xl font-bold text-[#FFDD2D]">{selected.length}</div>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 p-1">
            {availableCategories.map((cat) => {
              const active = selected.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggle(cat)}
                  className={`p-4 rounded-md border-2 transition-all relative overflow-hidden group ${
                    active
                      ? "bg-[#FFDD2D] text-[#333333] border-[#FFDD2D] shadow-lg shadow-[#FFDD2D]/20"
                      : "bg-[#333333] text-white border-[#555555] hover:border-[#FFDD2D]/50 hover:bg-[#444444]"
                  }`}
                >
                  {active && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-md bg-[#333333] flex items-center justify-center">
                      <FiCheck className="w-4 h-4 text-[#FFDD2D]" />
                    </div>
                  )}
                  <div className="text-sm font-medium text-center leading-tight pt-2">
                    {cat}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={() => setSelected([])}
            className="flex-1 px-4 py-3 rounded-md bg-[#333333] text-white font-semibold hover:bg-[#444444] border border-[#555555] transition-colors flex items-center justify-center gap-2"
          >
            <FiX className="w-5 h-5" />
            Очистить все
          </button>
          <button
            onClick={save}
            className="flex-1 px-4 py-3 rounded-md bg-[#FFDD2D] text-[#333333] font-semibold hover:bg-[#FFE855] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#FFDD2D]/20"
          >
            <FiCheck className="w-5 h-5" />
            Сохранить изменения
          </button>
        </div>
      </main>
    </div>
  );
});

export default BlacklistPage;
