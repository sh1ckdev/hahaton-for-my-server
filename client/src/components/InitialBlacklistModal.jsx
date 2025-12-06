import { observer } from "mobx-react-lite";
import { useStores } from "../stores/StoreProvider.jsx";
import { useState, useEffect } from "react";
import ExtendedProfileModal from "./ExtendedProfileModal";

// если AI не ответит — дефолт
const FALLBACK_CATEGORIES = [
  "игры", "подписки", "фастфуд", "одежда", "онлайн-покупки", "развлечения"
];

const InitialBlacklistModal = observer(() => {
  const { uiStore, userStore } = useStores();
  
  // ВСЕ хуки должны быть ДО условных return
  const [showExtendedProfile, setShowExtendedProfile] = useState(false);
  const [categories, setCategories] = useState([]);   // список категории
  const [selected, setSelected] = useState([]);       // выбранные пользователем
  const [loading, setLoading] = useState(true);
  const [useExtendedProfile, setUseExtendedProfile] = useState(true); // Новый флоу по умолчанию

  useEffect(() => {
    // Если пользователь уже прошел расширенную анкету, загружаем категории
    const existing = userStore.user?.notificationSettings?.excludeCategories;
    if (existing && existing.length > 0) {
      setCategories(existing);
      setSelected(existing);
      setLoading(false);
      setUseExtendedProfile(false);
      return;
    }

    // Если расширенная анкета еще не пройдена, показываем её
    if (useExtendedProfile) {
      setShowExtendedProfile(true);
      setLoading(false);
    }
  }, [userStore.user, useExtendedProfile]);

  const toggle = (cat) => {
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleExtendedProfileComplete = async () => {
    // После завершения расширенной анкеты загружаем сгенерированные категории
    await userStore.loadProfile();
    const existing = userStore.user?.notificationSettings?.excludeCategories;
    if (existing && existing.length > 0) {
      setCategories(existing);
      setSelected(existing);
      setShowExtendedProfile(false);
      setUseExtendedProfile(false);
    }
  };

  const save = async () => {
    await userStore.updateBlacklist(selected);
    uiStore.closeInitialBlacklistModal();
    userStore.user.isFirstLogin = false; // обновляем состояние без перезагрузки
  };

  // Условные return ПОСЛЕ всех хуков
  if (!uiStore.showInitialBlacklistModal || !userStore.user?.isFirstLogin) {
    return null;
  }

  // Показываем расширенную анкету, если нужно
  if (showExtendedProfile) {
    return <ExtendedProfileModal onComplete={handleExtendedProfileComplete} />;
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#333333] border border-[#555555] rounded-lg p-6 max-w-md w-full shadow-2xl">

        <h2 className="text-xl font-semibold mb-2 text-white">
          Первый шаг — сформируем твой Blacklist
        </h2>
        <p className="text-sm text-white/70 mb-4">
          Выбери категории, на которые ты хочешь тратить меньше.
          Я буду напоминать тебе о целях и охлаждать импульсивные решения 💛
        </p>

        {loading && (
          <div className="text-center text-white/60 py-6">
            🤖 Генерирую категории через AI...
          </div>
        )}

        {!loading && (
          <div className="flex flex-wrap gap-2 mb-5 max-h-[50vh] overflow-y-auto">
            {categories.map((cat) => {
              const active = selected.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggle(cat)}
                  className={
                    `px-3 py-1.5 rounded-lg text-sm border transition ` +
                    (active
                      ? "bg-[#FFDD2D] text-[#333333] border-[#FFDD2D] font-medium"
                      : "bg-[#1A1A1A] text-white border-[#555555] hover:bg-[#444444]"
                    )
                  }
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={() => uiStore.closeInitialBlacklistModal()}
            className="px-3 py-1 rounded-lg text-sm bg-[#1A1A1A] text-white/80 hover:bg-[#444444] transition-colors"
          >
            Потом
          </button>
          <button
            onClick={save}
            disabled={loading}
            className="px-4 py-1 rounded-lg text-sm bg-[#FFDD2D] text-[#333333] font-semibold hover:bg-[#FFE855] disabled:opacity-50 transition-colors"
          >
            Сохранить
          </button>
        </div>

      </div>
    </div>
  );
});

export default InitialBlacklistModal;
