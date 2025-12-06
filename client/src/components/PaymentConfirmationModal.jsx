import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { useStores } from "../stores/StoreProvider.jsx";
import { FiAlertTriangle, FiX, FiHeart, FiCheck } from "react-icons/fi";
import { money } from "../utils/formatMoney.js";
import api from "../api/client.js";

const PaymentConfirmationModal = observer(() => {
  const { uiStore, purchaseStore } = useStores();
  
  // Запрашиваем AI совет при открытии модального окна (только если не заблокирована)
  useEffect(() => {
    if (uiStore.showPaymentConfirmationModal && uiStore.pendingPurchase && uiStore.loadingAdvice && uiStore.pendingPurchase._id) {
      const purchase = uiStore.pendingPurchase;
      
      // Если покупка заблокирована категорией, не запрашиваем совет
      if (purchase.blockedByCategory) {
        uiStore.setPurchaseAdvice(null, []);
        return;
      }
      
      api.get(`/ai/purchase-advice/${purchase._id}`)
        .then(res => {
          uiStore.setPurchaseAdvice(
            res.data.advice,
            res.data.affectedGoals || []
          );
        })
        .catch(err => {
          console.error("Failed to load AI advice:", err);
          uiStore.setPurchaseAdvice(
            `Ты собираешься купить "${purchase.title}" за ${money(purchase.price)}. Подтверди покупку или добавь в вишлист?`,
            []
          );
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiStore.showPaymentConfirmationModal, uiStore.pendingPurchase?._id, uiStore.loadingAdvice]);

  if (!uiStore.showPaymentConfirmationModal || !uiStore.pendingPurchase) return null;

  const purchase = uiStore.pendingPurchase;
  const isBlocked = purchase.blockedByCategory;

  const handleConfirm = async () => {
    try {
      await purchaseStore.confirmPurchase(purchase._id);
      uiStore.closePaymentConfirmationModal();
    } catch (err) {
      console.error("Failed to confirm purchase:", err);
    }
  };

  const handleAddToWishlist = async () => {
    try {
      await purchaseStore.addToWishlist(purchase._id);
      uiStore.closePaymentConfirmationModal();
    } catch (err) {
      console.error("Failed to add to wishlist:", err);
    }
  };

  const handleClose = () => {
    uiStore.closePaymentConfirmationModal();
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-[#1A1A1A] via-[#222222] to-[#1A1A1A] border border-[#FFDD2D]/40 rounded-lg p-0 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-hidden relative">
        {/* Декоративный градиент сверху */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-[#FFDD2D]" />
        
        {/* Закрыть кнопка */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-[#333333]/80 backdrop-blur-sm hover:bg-red-500/20 hover:border-red-500/50 border border-[#555555] flex items-center justify-center text-white/70 hover:text-white transition-all z-10"
        >
          <FiX className="w-5 h-5" />
        </button>

        <div className="p-6 overflow-y-auto max-h-[90vh]">
          {/* Заголовок */}
          <div className="flex items-center gap-4 mb-6 pr-12">
            <div className="relative">
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-[#FFDD2D] to-[#FFE855] flex items-center justify-center shadow-lg shadow-[#FFDD2D]/30">
                <span className="text-2xl">💳</span>
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-2 border-[#1A1A1A] animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Новая транзакция</h2>
              <p className="text-xs text-white/50 font-medium">Проверь перед подтверждением</p>
            </div>
          </div>

          {/* Информация о покупке - карточка */}
          <div className="bg-[#333333]/50 backdrop-blur-sm border border-[#555555]/50 rounded-lg p-5 mb-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFDD2D]/5 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="text-xs text-white/50 mb-2 font-medium uppercase tracking-wide">Название</div>
                  <div className="text-lg font-bold text-white">{purchase.title}</div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-xs text-white/50 mb-2 font-medium uppercase tracking-wide">Сумма</div>
                  <div className="text-3xl font-extrabold text-[#FFDD2D] leading-tight">
                    {money(purchase.price)}
                  </div>
                </div>
              </div>

              {(purchase.aiCategory || purchase.category) && (
                <div className="flex items-center gap-2">
                  <div className="text-xs text-white/50 font-medium uppercase tracking-wide">Категория:</div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FFDD2D]/10 text-[#FFDD2D] border border-[#FFDD2D]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FFDD2D]" />
                    {purchase.aiCategory || purchase.category}
                  </div>
                </div>
              )}

              {purchase.description && (
                <div className="mt-3 pt-3 border-t border-[#555555]/50">
                  <div className="text-xs text-white/50 mb-1 font-medium uppercase tracking-wide">Описание</div>
                  <div className="text-sm text-white/80">{purchase.description}</div>
                </div>
              )}
            </div>
          </div>

          {/* Блокировка по категории */}
          {isBlocked ? (
            <div className="mb-5">
              <div className="relative overflow-hidden rounded-xl">
                {/* Анимированный градиентный фон */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-600/40 via-red-500/30 to-orange-500/20" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_red-500/20,_transparent_60%)]" />
                
                {/* Контент */}
                <div className="relative border-2 border-red-500/60 rounded-xl p-6 shadow-2xl backdrop-blur-sm">
                  {/* Заголовок блока */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-xl bg-red-500/40 backdrop-blur-sm flex items-center justify-center border-2 border-red-400/60 shadow-lg">
                        <FiAlertTriangle className="w-7 h-7 text-red-300" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full animate-ping" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <div className="text-lg font-extrabold text-red-300 mb-1 flex items-center gap-2">
                        🚫 ПОКУПКА ЗАБЛОКИРОВАНА
                      </div>
                      <div className="text-xs text-white/70">Категория находится в запрещенном списке</div>
                    </div>
                  </div>

                  {/* Текст сообщения */}
                  <div className="bg-[#1A1A1A]/70 backdrop-blur-sm rounded-lg p-5 border border-red-500/30">
                    <div className="text-sm leading-relaxed text-white/90 font-medium">
                      <span className="font-bold text-red-300">Нейронка определила</span>, что покупка <span className="font-bold text-red-300">"{purchase.title}"</span> относится к категории <span className="font-bold text-red-300">"{purchase.category || purchase.aiCategory}"</span>, которая находится в твоем списке запрещенных категорий.
                      <br /><br />
                      Ассистент <span className="font-bold">не рекомендует</span> совершать покупки из этой категории, так как ты сам добавил её в blacklist для контроля своих трат.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* AI Совет - премиум блок */
            <div className="mb-5">
              {uiStore.loadingAdvice ? (
                <div className="bg-gradient-to-br from-[#333333]/60 to-[#2A2A2A]/60 backdrop-blur-sm border border-[#555555]/50 rounded-xl p-6 shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#FFDD2D]/20 to-[#FFDD2D]/10 flex items-center justify-center border border-[#FFDD2D]/30">
                        <span className="text-3xl animate-pulse">🤖</span>
                      </div>
                      <div className="absolute inset-0 rounded-xl border-2 border-[#FFDD2D]/30 animate-ping" />
                    </div>
                    <div className="flex-1">
                      <div className="text-base font-bold text-white mb-1">Ассистент анализирует...</div>
                      <div className="text-xs text-white/60">Проверяю влияние на твои финансовые цели</div>
                    </div>
                  </div>
                </div>
              ) : uiStore.purchaseAdvice ? (
                <div className="relative overflow-hidden rounded-xl">
                  {/* Анимированный градиентный фон */}
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/30 via-orange-500/25 to-[#FFDD2D]/25" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#FFDD2D/15,_transparent_50%)]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_red-500/10,_transparent_50%)]" />
                  
                  {/* Контент */}
                  <div className="relative border-2 border-red-500/60 rounded-xl p-6 shadow-2xl backdrop-blur-sm">
                    {/* Заголовок блока */}
                    <div className="flex items-center gap-4 mb-5">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500/40 to-orange-500/30 backdrop-blur-sm flex items-center justify-center border-2 border-red-400/60 shadow-lg">
                          <FiAlertTriangle className="w-7 h-7 text-red-300" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full animate-ping" />
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full" />
                      </div>
                      <div className="flex-1">
                        <div className="text-lg font-extrabold text-red-300 mb-1 flex items-center gap-2">
                          💡 СОВЕТ АССИСТЕНТА
                        </div>
                        <div className="text-xs text-white/70">Финансовый анализ завершен</div>
                      </div>
                    </div>

                    {/* Текст совета */}
                    <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#0D0D0D]/80 backdrop-blur-sm rounded-xl p-5 mb-5 border border-red-500/30 shadow-inner">
                      <div className="text-sm leading-relaxed text-white/95 whitespace-pre-line font-medium">
                        {uiStore.purchaseAdvice}
                      </div>
                    </div>

                    {/* Информация о сдвиге целей - премиум вид */}
                    {uiStore.affectedGoals && uiStore.affectedGoals.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                          <FiHeart className="w-5 h-5 text-red-400" />
                          <div className="text-xs font-extrabold text-red-400 uppercase tracking-wider">
                            Влияние на финансовые цели
                          </div>
                        </div>
                        {uiStore.affectedGoals.map((goal, idx) => (
                          <div 
                            key={idx} 
                            className="bg-gradient-to-r from-red-500/15 via-orange-500/15 to-red-500/15 border border-red-500/40 rounded-xl p-5 hover:border-red-500/60 transition-all relative overflow-hidden shadow-lg"
                          >
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-red-500 via-orange-500 to-red-500" />
                            <div className="flex items-center justify-between pl-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="text-base font-bold text-white">"{goal.title}"</div>
                                  <div className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-500/30 text-red-300 border border-red-500/50">
                                    Приоритет {goal.priority}
                                  </div>
                                </div>
                                <div className="text-xs text-white/70">
                                  Цель: {goal.price.toLocaleString()} ₽
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <div className="text-3xl font-extrabold text-red-300 leading-tight">
                                  {goal.shiftDays}
                                </div>
                                <div className="text-[10px] text-white/60 font-medium uppercase tracking-wide">
                                  дней задержки
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}

        {/* Кнопки действий */}
        {isBlocked ? (
          <div className="flex justify-center mt-6">
            <button
              onClick={handleClose}
              className="px-8 py-3.5 rounded-xl text-base bg-gradient-to-r from-red-500 to-red-600 text-white font-bold hover:from-red-600 hover:to-red-700 transition-all shadow-lg shadow-red-500/40 hover:shadow-red-500/60 transform hover:scale-105"
            >
              Понятно
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={handleAddToWishlist}
              disabled={uiStore.loadingAdvice}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm bg-gradient-to-r from-[#333333] to-[#2A2A2A] text-white border border-[#555555] hover:bg-gradient-to-r hover:from-[#444444] hover:to-[#3A3A3A] hover:border-[#FFDD2D]/50 transition-all disabled:opacity-50 font-semibold shadow-lg"
            >
              <FiHeart className="w-5 h-5" />
              Добавить в вишлист
            </button>
            <button
              onClick={handleClose}
              disabled={uiStore.loadingAdvice}
              className="px-5 py-3.5 rounded-xl text-sm bg-[#1A1A1A] text-white/80 hover:bg-[#2A2A2A] hover:text-white transition-colors disabled:opacity-50 font-medium border border-[#333333]"
            >
              Отменить
            </button>
            <button
              onClick={handleConfirm}
              disabled={uiStore.loadingAdvice}
              className="px-6 py-3.5 rounded-xl text-sm bg-gradient-to-r from-red-500 to-red-600 text-white font-bold hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50 shadow-lg shadow-red-500/40 hover:shadow-red-500/60 transform hover:scale-105"
            >
              Всё равно купить
            </button>
          </div>
        )}
      </div>
    </div>
  </div>);
});

export default PaymentConfirmationModal;
