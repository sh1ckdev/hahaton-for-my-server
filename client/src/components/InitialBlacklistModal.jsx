import { observer } from "mobx-react-lite";
import { useStores } from "../stores/StoreProvider.jsx";
import { useState, useEffect } from "react";
import { FiFileText, FiZap, FiList, FiLoader } from "react-icons/fi";
import ExtendedProfileModal from "./ExtendedProfileModal";
import ChatProfileModal from "./ChatProfileModal";

// если AI не ответит — дефолт
const FALLBACK_CATEGORIES = [
  "игры", "подписки", "фастфуд", "одежда", "онлайн-покупки", "развлечения"
];

const InitialBlacklistModal = observer(() => {
  const { uiStore, userStore } = useStores();
  
  // ВСЕ хуки должны быть ДО условных return
  const [showExtendedProfile, setShowExtendedProfile] = useState(false);
  const [showProfileChoice, setShowProfileChoice] = useState(false);
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
      setShowProfileChoice(false);
      return;
    }

    // Если расширенная анкета еще не пройдена, показываем выбор способа заполнения
    if (useExtendedProfile && !showExtendedProfile) {
      setShowProfileChoice(true);
      setLoading(false);
    }
  }, [userStore.user, useExtendedProfile, showExtendedProfile]);

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
      setShowProfileChoice(false);
      setUseExtendedProfile(false);
    }
  };

  // Отслеживаем закрытие чат-бота и обновляем категории
  useEffect(() => {
    if (!uiStore.showChatProfileModal && showProfileChoice) {
      // Чат-бот закрыт, загружаем категории
      const existing = userStore.user?.notificationSettings?.excludeCategories;
      if (existing && existing.length > 0) {
        setCategories(existing);
        setSelected(existing);
        setShowProfileChoice(false);
        setUseExtendedProfile(false);
      }
    }
  }, [uiStore.showChatProfileModal, showProfileChoice, userStore.user]);

  // Запрещаем закрытие по ESC в модальном окне выбора способа заполнения и blacklist
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && (showProfileChoice || uiStore.showInitialBlacklistModal)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    if (showProfileChoice || uiStore.showInitialBlacklistModal) {
      document.addEventListener("keydown", handleEscape, true);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [showProfileChoice, uiStore.showInitialBlacklistModal]);

  const save = async () => {
    await userStore.updateBlacklist(selected);
    uiStore.closeInitialBlacklistModal();
    userStore.user.isFirstLogin = false; // обновляем состояние без перезагрузки
  };

  // Условные return ПОСЛЕ всех хуков
  if (!uiStore.showInitialBlacklistModal || !userStore.user?.isFirstLogin) {
    return null;
  }

  // Показываем выбор способа заполнения профиля
  if (showProfileChoice) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-[#1A1A1A] via-[#222222] to-[#1A1A1A] border border-[#FFDD2D]/40 rounded-lg p-6 max-w-md w-full shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#FFDD2D] to-[#FFE855] flex items-center justify-center shadow-lg shadow-[#FFDD2D]/30">
              <FiFileText className="w-6 h-6 text-[#333333]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Заполнение профиля</h2>
              <p className="text-sm text-white/60">Выбери удобный способ</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <button
              onClick={() => {
                uiStore.openChatProfileModal();
                setShowProfileChoice(false);
              }}
              className="w-full p-4 bg-[#333333]/50 border border-[#555555]/50 rounded-lg hover:border-[#FFDD2D]/50 transition-all text-left group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FFDD2D]/20 to-[#FFDD2D]/10 flex items-center justify-center border border-[#FFDD2D]/30 group-hover:border-[#FFDD2D] transition-colors">
                  <FiZap className="w-5 h-5 text-[#FFDD2D]" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white">Чат-бот</div>
                  <div className="text-xs text-white/60">Просто расскажи о себе</div>
                </div>
              </div>
              <p className="text-sm text-white/70">
                Напиши всё в свободной форме, а AI заполнит анкету автоматически
              </p>
            </button>

            <button
              onClick={() => {
                setShowExtendedProfile(true);
                setShowProfileChoice(false);
              }}
              className="w-full p-4 bg-[#333333]/50 border border-[#555555]/50 rounded-lg hover:border-[#FFDD2D]/50 transition-all text-left group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FFDD2D]/20 to-[#FFDD2D]/10 flex items-center justify-center border border-[#FFDD2D]/30 group-hover:border-[#FFDD2D] transition-colors">
                  <FiList className="w-5 h-5 text-[#FFDD2D]" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white">Форма</div>
                  <div className="text-xs text-white/60">Пошаговое заполнение</div>
                </div>
              </div>
              <p className="text-sm text-white/70">
                Заполни анкету по шагам, выбирая из предложенных вариантов
              </p>
            </button>
          </div>
        </div>
      </div>
    );
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
          Я буду напоминать тебе о целях и охлаждать импульсивные решения
        </p>

        {loading && (
          <div className="text-center text-white/60 py-6">
            <div className="flex items-center justify-center gap-2">
              <FiLoader className="w-5 h-5 animate-spin" />
              <span>Генерирую категории через AI...</span>
            </div>
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
