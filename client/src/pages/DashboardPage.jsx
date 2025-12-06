// DashboardPage.jsx
import { observer } from "mobx-react-lite";
import { useStores } from "../stores/StoreProvider.jsx";
import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FiUser, FiTarget, FiShield, FiBell, FiPlus, FiChevronDown, FiLogOut, FiHeart, FiArrowRight, FiMenu, FiX } from "react-icons/fi";
import InitialBlacklistModal from "../components/InitialBlacklistModal.jsx";
import GoalsCarousel from "../components/GoalsCarousel.jsx";
import WishlistCarousel from "../components/WishlistCarousel.jsx";
import ChatFloatingButton from "../components/ChatFloatingButton.jsx";
import ChatPanel from "../components/ChatPanel.jsx";
import AddPurchaseModal from "../components/AddPurchaseModal.jsx";

const DashboardPage = observer(() => {
  const { userStore, purchaseStore, uiStore, goalStore, notificationStore } = useStores();
  const [chatOpen, setChat] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const nav = useNavigate();
  const userMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    if (!userStore.user && userStore.userId) {
      userStore.loadProfile();
    }
  }, [userStore]);

  // Загружаем данные при наличии userId
  useEffect(() => {
    if (userStore.userId) {
      purchaseStore.loadForUser(userStore.userId);
      goalStore.loadForUser(userStore.userId);
      notificationStore.loadForUser(userStore.userId);
    }
  }, [userStore.userId, purchaseStore, goalStore, notificationStore]);

  // Автоматическое обновление уведомлений каждые 5 секунд
  useEffect(() => {
    if (!userStore.userId) {
      console.log("[NOTIFICATIONS] ⚠️ No userId, skipping notification loading");
      return;
    }

    console.log(`[NOTIFICATIONS] 🔄 Starting notification polling for user ${userStore.userId}`);
    
    // Загружаем сразу
    notificationStore.loadForUser(userStore.userId);

    // Затем каждые 5 секунд
    const interval = setInterval(() => {
      console.log(`[NOTIFICATIONS] 🔄 Polling notifications for user ${userStore.userId}`);
      notificationStore.loadForUser(userStore.userId);
    }, 5000);

    return () => {
      console.log(`[NOTIFICATIONS] 🛑 Stopping notification polling for user ${userStore.userId}`);
      clearInterval(interval);
    };
  }, [userStore.userId, notificationStore]);

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        uiStore.closeUserMenu();
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && !event.target.closest('[data-burger-toggle]')) {
        setMobileMenuOpen(false);
      }
    };

    if (uiStore.showUserMenu || mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [uiStore.showUserMenu, uiStore, mobileMenuOpen]);

  if (!userStore.user) return null;

  const name = userStore.user.nickname || userStore.user.userId;
  const salary = userStore.user.salary || 0;
  const spent = purchaseStore.currentMonthSpent;
  const percent = salary ? Math.min(100, Math.round((spent / salary) * 100)) : 0;
  const currentSavings = userStore.user.currentSavings || 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#0D0D0D] py-4 gap-4">
      {/* HEADER */}
      <header className="rounded-md border border-[#333333] bg-[#1A1A1A] px-3 sm:px-4 md:px-6 py-2 sm:py-3 flex items-center justify-between shadow-lg relative flex-wrap sm:flex-nowrap gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Бургер меню для мобильных */}
          <button
            data-burger-toggle
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden h-8 w-8 rounded-lg bg-[#333333] border border-[#555555] flex items-center justify-center text-white hover:bg-[#444444] hover:border-[#FFDD2D]/50 transition-colors flex-shrink-0"
          >
            {mobileMenuOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
          </button>

          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-[#FFDD2D] flex items-center justify-center text-[#333333] font-extrabold text-base sm:text-lg shadow-md flex-shrink-0">
            T
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] sm:text-xs uppercase tracking-wide text-[#333333] bg-[#FFDD2D] px-1.5 sm:px-2 py-0.5 rounded-lg inline-flex w-fit font-semibold">
              Rational Assistant
            </span>
            <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-white/60 hidden sm:block">Добро пожаловать,</div>
            <button
              onClick={() => uiStore.toggleUserMenu()}
              className="hidden sm:block text-left group min-w-0"
            >
              <div className="text-sm sm:text-base md:text-lg font-semibold leading-tight text-white group-hover:text-[#FFDD2D] transition-colors flex items-center gap-1 sm:gap-2 truncate">
                <FiUser className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="truncate">{name}</span>
                <FiChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform flex-shrink-0 ${uiStore.showUserMenu ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {/* Имя пользователя на мобильных */}
            <div className="sm:hidden text-sm font-semibold text-white truncate">
              {name}
            </div>
          </div>
        </div>

        {/* User Menu Dropdown */}
        {uiStore.showUserMenu && (
          <div
            ref={userMenuRef}
            className="absolute top-full left-0 sm:left-4 right-0 sm:right-auto mt-3 w-[calc(100vw-2rem)] sm:w-80 max-w-[calc(100vw-2rem)] sm:max-w-80 bg-[#1A1A1A] border border-[#333333] rounded-md shadow-2xl z-50 overflow-hidden backdrop-blur-sm"
          >
            <div className="p-2">
              <div className="px-4 py-3 border-b border-[#333333] mb-2">
                <div className="text-xs text-white/50 mb-1">Меню пользователя</div>
                <div className="text-sm font-semibold text-white">{name}</div>
              </div>
              
              <div className="space-y-1">
                <Link
                  to="/profile"
                  onClick={() => uiStore.closeUserMenu()}
                  className="flex items-center gap-3 p-3 rounded-md bg-[#333333] hover:bg-[#444444] border border-transparent hover:border-[#FFDD2D]/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-md bg-[#FFDD2D]/10 flex items-center justify-center group-hover:bg-[#FFDD2D]/20 transition-colors">
                    <FiUser className="w-5 h-5 text-[#FFDD2D]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">Личный кабинет</div>
                    <div className="text-xs text-white/50">Профиль и финансы</div>
                  </div>
                </Link>
                
                <Link
                  to="/wishlist"
                  onClick={() => uiStore.closeUserMenu()}
                  className="flex items-center gap-3 p-3 rounded-md bg-[#333333] hover:bg-[#444444] border border-transparent hover:border-[#FFDD2D]/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-md bg-[#FFDD2D]/10 flex items-center justify-center group-hover:bg-[#FFDD2D]/20 transition-colors">
                    <FiHeart className="w-5 h-5 text-[#FFDD2D]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">Мой вишлист</div>
                    <div className="text-xs text-white/50">Запланированные покупки</div>
                  </div>
                </Link>
                
                <Link
                  to="/goals"
                  onClick={() => uiStore.closeUserMenu()}
                  className="flex items-center gap-3 p-3 rounded-md bg-[#333333] hover:bg-[#444444] border border-transparent hover:border-[#FFDD2D]/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-md bg-[#FFDD2D]/10 flex items-center justify-center group-hover:bg-[#FFDD2D]/20 transition-colors">
                    <FiTarget className="w-5 h-5 text-[#FFDD2D]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">Управлять целями</div>
                    <div className="text-xs text-white/50">Финансовые цели</div>
                  </div>
                </Link>
                
                <Link
                  to="/blacklist"
                  onClick={() => uiStore.closeUserMenu()}
                  className="flex items-center gap-3 p-3 rounded-md bg-[#333333] hover:bg-[#444444] border border-transparent hover:border-[#FFDD2D]/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-md bg-[#FFDD2D]/10 flex items-center justify-center group-hover:bg-[#FFDD2D]/20 transition-colors">
                    <FiShield className="w-5 h-5 text-[#FFDD2D]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">Запрещённые категории</div>
                    <div className="text-xs text-white/50">Blacklist категорий</div>
                  </div>
                </Link>
                
                <Link
                  to="/notification-settings"
                  onClick={() => uiStore.closeUserMenu()}
                  className="flex items-center gap-3 p-3 rounded-md bg-[#333333] hover:bg-[#444444] border border-transparent hover:border-[#FFDD2D]/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-md bg-[#FFDD2D]/10 flex items-center justify-center group-hover:bg-[#FFDD2D]/20 transition-colors">
                    <FiBell className="w-5 h-5 text-[#FFDD2D]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">Настройки уведомлений</div>
                    <div className="text-xs text-white/50">Уведомления и оповещения</div>
                  </div>
                </Link>
              </div>

              <div className="pt-2 mt-2 border-t border-[#333333]">
                <button
                  onClick={() => {
                    userStore.logout();
                    uiStore.closeUserMenu();
                    nav("/login");
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-md bg-[#333333] hover:bg-red-500/20 border border-transparent hover:border-red-500/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-md bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                    <FiLogOut className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-red-400">Выйти</div>
                    <div className="text-xs text-white/50">Выйти из аккаунта</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Notifications bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowNotifications((prev) => !prev);
                if (!notificationStore.notifications.length && userStore.userId) {
                  notificationStore.loadForUser(userStore.userId);
                }
              }}
              className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-[#333333] border border-[#555555] flex items-center justify-center text-white/80 hover:border-[#FFDD2D]/60 hover:text-[#FFDD2D] transition-colors"
            >
              <FiBell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {notificationStore.unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] px-1 rounded-full bg-red-500 text-[9px] sm:text-[10px] font-bold text-white flex items-center justify-center">
                  {notificationStore.unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-[calc(100vw-4rem)] sm:w-80 max-w-[calc(100vw-4rem)] sm:max-w-80 bg-[#1A1A1A] border border-[#333333] rounded-md shadow-2xl z-40 overflow-hidden">
                <div className="px-4 py-3 border-b border-[#333333] flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">
                    Уведомления
                  </span>
                  <button
                    type="button"
                    className="text-xs text-[#FFDD2D] hover:opacity-80"
                    onClick={async () => {
                      await notificationStore.markAllRead(userStore.userId);
                    }}
                  >
                    Отметить прочитанными
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notificationStore.notifications.length === 0 ? (
                    <div className="px-4 py-4 text-xs text-white/60">
                      Пока нет уведомлений
                    </div>
                  ) : (
                    notificationStore.notifications.map((n) => (
                      <button
                        key={n._id}
                        type="button"
                        onClick={() => {
                          setShowNotifications(false);
                          // переход к вишлисту
                          nav("/wishlist");
                        }}
                        className={`w-full text-left px-4 py-3 text-xs border-b border-[#333333] last:border-b-0 ${
                          n.isRead ? "bg-[#1A1A1A]" : "bg-[#262626]"
                        } hover:bg-[#333333] transition-colors group`}
                      >
                        <div className="text-white/90 mb-1">
                          {n.message}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <div className="text-[10px] text-white/40">
                            {n.sentAt
                              ? new Date(n.sentAt).toLocaleString()
                              : ""}
                          </div>
                          <div className="text-[10px] text-[#FFDD2D]/60 group-hover:text-[#FFDD2D] transition-colors flex items-center gap-1">
                            Открыть вишлист <FiArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

              <button
                className="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg bg-[#FFDD2D] text-[#333333] font-semibold hover:bg-[#FFE855] transition-colors text-xs sm:text-sm shadow-md flex items-center gap-1 sm:gap-2 whitespace-nowrap"
                onClick={() => uiStore.openAddPurchaseModal()}
              >
                <FiPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Добавить покупку</span>
                <span className="sm:hidden">Добавить</span>
              </button>
        </div>
      </header>

      {/* Мобильное боковое меню */}
      {mobileMenuOpen && (
        <>
          {/* Затемнение фона */}
          <div 
            className="fixed inset-0 bg-black/70 z-40 sm:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Боковое меню */}
          <div
            ref={mobileMenuRef}
            className="fixed left-0 top-0 bottom-0 w-[85%] max-w-[320px] bg-[#1A1A1A] border-r border-[#333333] shadow-2xl z-50 overflow-y-auto sm:hidden"
          >
            <div className="p-4 border-b border-[#333333] sticky top-0 bg-[#1A1A1A] z-10">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs text-white/50 mb-1">Меню</div>
                  <div className="text-sm font-semibold text-white">{name}</div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-8 w-8 rounded-lg bg-[#333333] border border-[#555555] flex items-center justify-center text-white hover:bg-[#444444] transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-2 space-y-1">
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-md bg-[#333333] hover:bg-[#444444] border border-transparent hover:border-[#FFDD2D]/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-md bg-[#FFDD2D]/10 flex items-center justify-center group-hover:bg-[#FFDD2D]/20 transition-colors">
                  <FiUser className="w-5 h-5 text-[#FFDD2D]" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">Личный кабинет</div>
                  <div className="text-xs text-white/50">Профиль и финансы</div>
                </div>
              </Link>
              
              <Link
                to="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-md bg-[#333333] hover:bg-[#444444] border border-transparent hover:border-[#FFDD2D]/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-md bg-[#FFDD2D]/10 flex items-center justify-center group-hover:bg-[#FFDD2D]/20 transition-colors">
                  <FiHeart className="w-5 h-5 text-[#FFDD2D]" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">Мой вишлист</div>
                  <div className="text-xs text-white/50">Запланированные покупки</div>
                </div>
              </Link>
              
              <Link
                to="/goals"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-md bg-[#333333] hover:bg-[#444444] border border-transparent hover:border-[#FFDD2D]/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-md bg-[#FFDD2D]/10 flex items-center justify-center group-hover:bg-[#FFDD2D]/20 transition-colors">
                  <FiTarget className="w-5 h-5 text-[#FFDD2D]" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">Управлять целями</div>
                  <div className="text-xs text-white/50">Финансовые цели</div>
                </div>
              </Link>
              
              <Link
                to="/blacklist"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-md bg-[#333333] hover:bg-[#444444] border border-transparent hover:border-[#FFDD2D]/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-md bg-[#FFDD2D]/10 flex items-center justify-center group-hover:bg-[#FFDD2D]/20 transition-colors">
                  <FiShield className="w-5 h-5 text-[#FFDD2D]" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">Запрещённые категории</div>
                  <div className="text-xs text-white/50">Blacklist категорий</div>
                </div>
              </Link>
              
              <Link
                to="/notification-settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-md bg-[#333333] hover:bg-[#444444] border border-transparent hover:border-[#FFDD2D]/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-md bg-[#FFDD2D]/10 flex items-center justify-center group-hover:bg-[#FFDD2D]/20 transition-colors">
                  <FiBell className="w-5 h-5 text-[#FFDD2D]" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">Настройки уведомлений</div>
                  <div className="text-xs text-white/50">Уведомления и оповещения</div>
                </div>
              </Link>

              <div className="pt-2 mt-2 border-t border-[#333333]">
                <button
                  onClick={() => {
                    userStore.logout();
                    setMobileMenuOpen(false);
                    nav("/login");
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-md bg-[#333333] hover:bg-red-500/20 border border-transparent hover:border-red-500/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-md bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                    <FiLogOut className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-red-400">Выйти</div>
                    <div className="text-xs text-white/50">Выйти из аккаунта</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TOP STRIP / HIGHLIGHT */}
      <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-[#FFDD2D] via-[#FFE855] to-[#FFDD2D]/60" />

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col gap-5">
        {/* SUMMARY CARDS */}
        <section className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* SPEND CARD */}
          <div className="relative overflow-hidden rounded-md border border-[#333333] bg-[#333333] p-4 sm:p-5 shadow-lg">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#FFDD2D]/10 blur-3xl pointer-events-none" />
            <div className="flex items-start justify-between mb-3 relative z-10">
              <div>
                <div className="text-xs text-white/60 mb-1">
                  Траты в этом месяце
                </div>
                <div className="text-3xl sm:text-4xl font-semibold text-white">
                  {spent.toLocaleString()} ₽
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-white/60">Лимит месяца</div>
                <div className="text-sm font-medium text-white">
                  {salary.toLocaleString()} ₽
                </div>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="mt-2 relative z-10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] uppercase tracking-wide text-white/60">
                  Использовано
                </span>
                <span className="text-xs font-medium text-white">
                  {percent}% бюджета
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#1A1A1A] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    percent < 70
                      ? "bg-[#FFDD2D]"
                      : percent < 90
                      ? "bg-[#FFE855]"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="mt-1.5 text-[11px] text-white/60">
                {percent < 70 && "Профиль расхода выглядит комфортно."}
                {percent >= 70 && percent < 90 && "Темп трат выше среднего — будь внимателен к импульсивным покупкам."}
                {percent >= 90 && "Бюджет почти исчерпан. Стоит временно сократить необязательные категории."}
              </div>
            </div>
          </div>

          {/* BALANCE / SAVINGS CARD */}
          <div className="rounded-md border border-[#333333] bg-[#333333] p-4 sm:p-5 flex flex-col justify-between shadow-lg">
            <div>
              <div className="text-xs text-white/60 mb-1.5">
                Текущий накопленный баланс
              </div>
              <div className="text-3xl sm:text-4xl font-semibold mb-2 text-white">
                {currentSavings.toLocaleString()} ₽
              </div>
            </div>
            <div className="mt-2 text-xs text-white/60 leading-relaxed">
              На основе того, сколько ты откладываешь и уже накопил,
              ассистент подсказывает, когда крупные хотелки станут комфортными
              и какие траты сейчас мешают этому.
            </div>
          </div>
        </section>

        {/* GOALS */}
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-semibold text-white">
                Цели
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-lg bg-[#1A1A1A] text-white/60 border border-[#333333]">
                финансовые цели
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/goals"
                className="text-xs text-[#FFDD2D] hover:opacity-80 transition"
              >
                Управлять →
              </Link>
              <span className="hidden sm:inline text-xs text-white/60">
                Крупные финансовые цели с приоритетами, которые учитываются при покупках.
              </span>
            </div>
          </div>
          <div className="rounded-md border border-[#333333] bg-[#333333] p-3 sm:p-4">
            <GoalsCarousel />
          </div>
        </section>

        {/* WISHLIST */}
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-semibold text-white">
                Wishlist
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-lg bg-[#1A1A1A] text-white/60 border border-[#333333]">
                период охлаждения
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/wishlist"
                className="text-xs text-[#FFDD2D] hover:text-[#FFE855] transition-colors font-medium"
              >
                Управлять →
              </Link>
              <span className="hidden sm:inline text-xs text-white/60">
                Добавляй хотелки сюда вместо мгновенной покупки.
              </span>
            </div>
          </div>
          <div className="rounded-md border border-[#333333] bg-[#333333] p-3 sm:p-4">
            <WishlistCarousel />
          </div>
        </section>


      </main>

      {uiStore.showInitialBlacklistModal && <InitialBlacklistModal />}
      {uiStore.showAddPurchaseModal && (
        <AddPurchaseModal onClose={() => uiStore.closeAddPurchaseModal()} />
      )}

      <ChatFloatingButton onClick={() => setChat(true)} />
      <ChatPanel open={chatOpen} onClose={() => setChat(false)} />
    </div>
  );
});

export default DashboardPage;
