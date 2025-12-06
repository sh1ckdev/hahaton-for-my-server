import { observer } from "mobx-react-lite";
import { useStores } from "../stores/StoreProvider.jsx";
import { useState, useEffect, useRef } from "react";
import { FiHeart, FiBell, FiBellOff, FiSettings, FiEdit2, FiTrash2, FiX } from "react-icons/fi";
import { PURCHASE_CATEGORIES } from "../utils/categories.js";
import api from "../api/client.js";

const intervals = [
  { label: "Каждый день", value: 1 },
  { label: "Раз в неделю", value: 7 },
  { label: "Раз в месяц", value: 30 }
];

const WishlistCarousel = observer(() => {
  const { purchaseStore, userStore } = useStores();
  const wishlist = purchaseStore.wishlist;
  const [openId, setOpenId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, openUpward: false });
  const menuRef = useRef(null);
  const cardRefs = useRef({});

  // Перезагружаем вишлист при изменении профиля пользователя (для синхронизации настроек)
  useEffect(() => {
    if (userStore.userId && userStore.user?.notificationSettings) {
      purchaseStore.loadForUser(userStore.userId);
    }
  }, [userStore.user?.notificationSettings, userStore.userId, purchaseStore, userStore.user]);

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openId) {
        // Проверяем, не кликнули ли мы внутри меню или на кнопку открытия меню
        const clickedElement = event.target.closest('[data-menu-toggle], [data-menu-content]');
        if (!clickedElement) {
          setOpenId(null);
        }
      }
    };

    const handleScroll = () => setOpenId(null);
    const handleResize = () => setOpenId(null);

    if (openId) {
      // Небольшая задержка, чтобы не закрывать меню сразу при открытии
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        // Также закрываем при скролле
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleResize);
      }, 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [openId]);

  if (!wishlist.length)
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FiHeart className="w-12 h-12 text-white/20 mb-3" />
        <div className="text-sm text-white/60">
          Wishlist пуст. Добавь хотели через ассистента/бэк.
        </div>
      </div>
    );

  const handleToggleNotify = async (item, enabled, days) => {
    // enabled === null -> использовать глобальные настройки
    // enabled === true -> включить индивидуально с интервалом days
    // enabled === false -> отключить для этой покупки
    const interval = enabled === true ? (days || null) : null;
    await purchaseStore.toggleWishlistNotification(item._id, enabled, interval);
    // Закрываем меню после выбора
    setOpenId(null);
  };

  const handleDeletePurchase = async (purchaseId) => {
    if (!confirm("Удалить эту покупку из вишлиста?")) return;
    try {
      await api.post(`/purchases/cancel/${purchaseId}`);
      await purchaseStore.loadForUser(userStore.userId);
      setEditingId(null);
    } catch (e) {
      console.error("Failed to delete purchase:", e);
      alert("Ошибка при удалении покупки");
    }
  };

  // Находим открытую покупку для отображения меню
  const openPurchase = wishlist.find(w => w._id === openId);

  return (
    <>
      <div ref={menuRef} className="flex flex-col sm:flex-row sm:gap-3 sm:overflow-x-auto pb-1 gap-3">
        {wishlist.map((w) => {
          const cooldown = w.cooldownUntil ? new Date(w.cooldownUntil) : null;
          const comfortable = w.comfortableFrom ? new Date(w.comfortableFrom) : null;

          // notifyEnabled: null = глобальные настройки, true = включено индивидуально, false = отключено
          const notifyEnabled = w.notifyEnabled;
          const isUsingGlobal = notifyEnabled === null || notifyEnabled === undefined;
          const isEnabled = notifyEnabled === true;

          return (
            <div
              ref={(el) => {
                if (el) cardRefs.current[w._id] = el;
              }}
              key={w._id}
              className="w-full sm:min-w-[260px] sm:flex-shrink-0 bg-[#1A1A1A] border border-[#444444] rounded-lg p-2.5 sm:p-3 relative"
            >
            <div className="flex justify-between items-start mb-1">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">{w.title}</div>
                <div className="text-xs text-white/60">{w.category}</div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(w._id);
                    setOpenId(null);
                  }}
                  className="h-7 w-7 rounded-full flex items-center justify-center border border-[#555555] bg-[#333333] text-white/70 hover:text-[#FFDD2D] hover:border-[#FFDD2D]/50 transition-colors"
                  title="Редактировать"
                >
                  <FiEdit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  data-menu-toggle
                  onClick={(e) => {
                  e.stopPropagation();
                  if (openId === w._id) {
                    setOpenId(null);
                  } else {
                    // Получаем позицию карточки, а не кнопки
                    const card = cardRefs.current[w._id];
                    if (card) {
                      const rect = card.getBoundingClientRect();
                      const menuWidth = 224; // w-56 = 224px
                      const estimatedMenuHeight = 220; // Примерная высота меню
                      const viewportHeight = window.innerHeight;
                      const viewportWidth = window.innerWidth;
                      
                      // Вычисляем позицию по горизонтали
                      let left = rect.right - menuWidth;
                      // Проверяем, не выходит ли меню за левый край
                      if (left < 10) {
                        left = 10; // Отступ от края
                      }
                      // Проверяем, не выходит ли меню за правый край
                      if (left + menuWidth > viewportWidth - 10) {
                        left = viewportWidth - menuWidth - 10;
                      }
                      
                      // Вычисляем позицию по вертикали
                      const spaceAbove = rect.top;
                      const spaceBelow = viewportHeight - rect.bottom;
                      
                      // Определяем направление открытия меню
                      // Открываем вверх, если места сверху достаточно
                      let openUpward = false;
                      let top = 0;
                      
                      if (spaceAbove >= estimatedMenuHeight + 10) {
                        // Достаточно места сверху - открываем вверх
                        openUpward = true;
                        top = rect.top;
                      } else if (spaceBelow >= estimatedMenuHeight + 10) {
                        // Достаточно места снизу - открываем вниз
                        openUpward = false;
                        top = rect.bottom;
                      } else {
                        // Недостаточно места ни сверху, ни снизу - выбираем лучший вариант
                        if (spaceAbove > spaceBelow) {
                          // Больше места сверху - открываем вверх, но с ограничением
                          openUpward = true;
                          top = Math.max(10, rect.top);
                          // Если меню всё равно не помещается, открываем вниз с ограничением
                          if (top < estimatedMenuHeight + 10) {
                            openUpward = false;
                            top = Math.min(rect.bottom, viewportHeight - 10);
                          }
                        } else {
                          // Больше места снизу - открываем вниз, но с ограничением
                          openUpward = false;
                          top = Math.min(rect.bottom, viewportHeight - estimatedMenuHeight - 10);
                          // Если меню всё равно не помещается, открываем вверх с ограничением
                          if (top + estimatedMenuHeight > viewportHeight - 10) {
                            openUpward = true;
                            top = Math.max(10, rect.top);
                          }
                        }
                      }
                      
                      setMenuPosition({
                        top: top,
                        left: left,
                        openUpward: openUpward
                      });
                    }
                    setOpenId(w._id);
                  }
                }}
                className={`h-8 w-8 rounded-full flex items-center justify-center border transition-colors ${
                  isUsingGlobal
                    ? "bg-blue-500/20 text-blue-400 border-blue-500/50"
                    : isEnabled
                    ? "bg-[#FFDD2D] text-[#333333] border-[#FFDD2D]"
                    : "bg-[#333333] text-white/60 border-[#555555] hover:bg-[#444444]"
                }`}
                title={
                  isUsingGlobal 
                    ? "Используются глобальные настройки" 
                    : isEnabled 
                    ? "Уведомления включены индивидуально" 
                    : "Уведомления отключены"
                }
              >
                {isUsingGlobal ? (
                  <FiSettings className="w-4 h-4" />
                ) : isEnabled ? (
                  <FiBell className="w-4 h-4" />
                ) : (
                  <FiBellOff className="w-4 h-4" />
                )}
              </button>
              </div>
            </div>
            <div className="text-sm text-white mb-2 font-medium">
              {w.price.toLocaleString()} ₽
            </div>

              {cooldown && (
                <div className="text-xs text-white/60 mb-1">
                  Период охлаждения до{" "}
                  <span className="text-[#FFDD2D]">
                    {cooldown.toLocaleDateString()}
                  </span>
                </div>
              )}
              {comfortable && comfortable.getTime() > (cooldown?.getTime() || 0) && (
                <div className="text-xs text-blue-400/80">
                  Комфортно купить с{" "}
                  <span className="text-blue-300 font-medium">
                    {comfortable.toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Выпадающее меню вне структуры overflow */}
      {openPurchase && (() => {
        const notifyEnabled = openPurchase.notifyEnabled;
        const notifyEveryDays = openPurchase.notifyEveryDays;
        const isUsingGlobal = notifyEnabled === null || notifyEnabled === undefined;
        const isEnabled = notifyEnabled === true;
        const isDisabled = notifyEnabled === false;
        
        // Получаем информацию о глобальных настройках для отображения
        const globalSettings = userStore.user?.notificationSettings || {};
        const globalFrequency = globalSettings.frequency || "weekly";
        
        return (
          <div 
            data-menu-content 
            className="fixed bg-[#333333] border border-[#555555] rounded-lg p-2 text-xs z-[100] w-56 shadow-xl overflow-y-auto"
            style={{
              top: menuPosition.openUpward ? `${menuPosition.top}px` : `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              transform: menuPosition.openUpward ? 'translateY(-100%)' : 'none',
              maxHeight: 'min(300px, calc(100vh - 20px))',
              maxWidth: 'calc(100vw - 20px)'
            }}
          >
            <div className="mb-2 text-white font-semibold">Настройки уведомлений</div>
            <div className="space-y-1">
              {/* Опция: Использовать глобальные настройки */}
              <button
                onClick={() => handleToggleNotify(openPurchase, null, null)}
                className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors ${
                  isUsingGlobal
                    ? "bg-blue-500/30 text-blue-300 border border-blue-500/50"
                    : "bg-[#1A1A1A] text-white hover:bg-[#444444]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiSettings className="w-3 h-3" />
                  <span>Глобальные настройки</span>
                </div>
                {isUsingGlobal && (
                  <div className="text-[10px] text-blue-400/70 mt-0.5 ml-5">
                    {(() => {
                      if (globalFrequency === "daily") return "Ежедневно";
                      if (globalFrequency === "weekly") return "Еженедельно";
                      if (globalFrequency === "monthly") return "Ежемесячно";
                      if (globalFrequency === "custom") {
                        const ms = globalSettings.customFrequencyMs || 0;
                        if (ms % (1000 * 60 * 60 * 24) === 0) {
                          return `Кастом: ${ms / (1000 * 60 * 60 * 24)} дней`;
                        } else if (ms % (1000 * 60 * 60) === 0) {
                          return `Кастом: ${ms / (1000 * 60 * 60)} часов`;
                        } else if (ms % (1000 * 60) === 0) {
                          return `Кастом: ${ms / (1000 * 60)} минут`;
                        } else {
                          return `Кастом: ${ms / 1000} секунд`;
                        }
                      }
                      return "Еженедельно";
                    })()}
                  </div>
                )}
              </button>
              
              {/* Разделитель */}
              <div className="border-t border-[#555555] my-1" />
              
              {/* Индивидуальные интервалы */}
              {intervals.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleToggleNotify(openPurchase, true, opt.value)}
                  className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors ${
                    isEnabled && notifyEveryDays === opt.value
                      ? "bg-[#FFDD2D] text-[#333333]"
                      : "bg-[#1A1A1A] text-white hover:bg-[#444444]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              
              {/* Разделитель */}
              <div className="border-t border-[#555555] my-1" />
              
              {/* Отключить уведомления */}
              <button
                onClick={() => handleToggleNotify(openPurchase, false, null)}
                className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors ${
                  isDisabled
                    ? "bg-red-500/30 text-red-300 border border-red-500/50"
                    : "bg-[#1A1A1A] text-white/60 hover:bg-[#444444] border border-[#555555]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiBellOff className="w-3 h-3" />
                  <span>Не напоминать</span>
                </div>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Модалка редактирования покупки */}
      {editingId && (() => {
        const purchase = wishlist.find(w => w._id === editingId);
        if (!purchase) return null;
        
        return <EditPurchaseModal 
          purchase={purchase} 
          onClose={() => setEditingId(null)}
          onSave={async (data) => {
            await purchaseStore.updatePurchase(purchase._id, data);
            setEditingId(null);
          }}
          onDelete={() => handleDeletePurchase(purchase._id)}
        />;
      })()}
    </>
  );
});

// Модалка для редактирования покупки
const EditPurchaseModal = ({ purchase, onClose, onSave, onDelete }) => {
  const [title, setTitle] = useState(purchase.title || "");
  const [price, setPrice] = useState(purchase.price || "");
  const [category, setCategory] = useState(purchase.category || "");
  const [url, setUrl] = useState(purchase.url || "");
  const [useAiCategory, setUseAiCategory] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !price) {
      alert("Заполните название и цену");
      return;
    }

    setLoading(true);
    try {
      await onSave({
        title,
        price: Number(price),
        category: category || undefined,
        url: url || undefined,
        useAiCategory: useAiCategory && !category
      });
    } catch (error) {
      console.error("Error updating purchase:", error);
      alert("Ошибка при обновлении покупки");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#333333] border border-[#555555] p-5 rounded-lg w-80 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-lg text-white">Редактировать покупку</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input 
            className="bg-[#1A1A1A] border border-[#555555] w-full px-3 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FFDD2D]" 
            placeholder="Название товара" 
            value={title} 
            onChange={e=>setTitle(e.target.value)}
            required
          />
          <input 
            className="bg-[#1A1A1A] border border-[#555555] w-full px-3 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FFDD2D]" 
            type="number" 
            placeholder="Цена (₽)" 
            value={price} 
            onChange={e=>setPrice(e.target.value)}
            required
            min="0"
          />
          <input 
            className="bg-[#1A1A1A] border border-[#555555] w-full px-3 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FFDD2D]" 
            type="url" 
            placeholder="Ссылка на товар (опционально)" 
            value={url} 
            onChange={e=>setUrl(e.target.value)}
          />
          <select
            className="bg-[#1A1A1A] border border-[#555555] w-full px-3 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FFDD2D]"
            value={category}
            onChange={e=>setCategory(e.target.value)}
          >
            <option value="">Выберите категорию (опционально)</option>
            {PURCHASE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <label className="flex gap-2 text-sm text-white/80">
            <input 
              type="checkbox" 
              checked={useAiCategory} 
              onChange={e=>setUseAiCategory(e.target.checked)}
            /> 
            Использовать AI для категории (если не выбрана)
          </label>
          <div className="flex gap-2">
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#FFDD2D] text-[#333333] py-2 rounded-lg font-semibold hover:bg-[#FFE855] disabled:opacity-50 transition-colors"
            >
              {loading ? "Сохранение..." : "Сохранить"}
            </button>
            <button 
              type="button"
              onClick={onClose} 
              className="px-4 py-2 bg-[#1A1A1A] text-white border border-[#555555] rounded-lg hover:bg-[#444444] transition-colors"
            >
              Отмена
            </button>
          </div>
          <button 
            type="button"
            onClick={() => {
              if (confirm("Удалить эту покупку из вишлиста?")) {
                onDelete();
              }
            }}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            <FiTrash2 className="w-4 h-4" />
            Удалить из вишлиста
          </button>
        </form>
      </div>
    </div>
  );
};

export default WishlistCarousel;
