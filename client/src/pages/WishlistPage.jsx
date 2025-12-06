import { observer } from "mobx-react-lite";
import { useStores } from "../stores/StoreProvider.jsx";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiHeart, FiPlus } from "react-icons/fi";
import WishlistCarousel from "../components/WishlistCarousel.jsx";
import AddPurchaseModal from "../components/AddPurchaseModal.jsx";

const WishlistPage = observer(() => {
  const { userStore, purchaseStore, uiStore } = useStores();
  const nav = useNavigate();
  const wishlist = purchaseStore.wishlist;

  useEffect(() => {
    if (!userStore.user) {
      nav("/login");
      return;
    }
    if (userStore.userId) {
      purchaseStore.loadForUser(userStore.userId);
    }
  }, [userStore.user, userStore.userId, purchaseStore, nav]);

  if (!userStore.user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-[#0D0D0D]">
      <header className="px-4 py-3 border-b border-[#333333] bg-[#1A1A1A] flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => nav(-1)}
          className="flex items-center gap-2 text-sm text-white hover:text-[#FFDD2D] transition-colors"
        >
          <FiArrowLeft className="w-5 h-5" />
          Назад
        </button>
        <div className="flex items-center gap-2">
          <FiHeart className="w-5 h-5 text-[#FFDD2D]" />
          <span className="font-semibold text-white">Мой вишлист</span>
        </div>
        <button
          onClick={() => uiStore.openAddPurchaseModal()}
          className="flex items-center gap-2 text-sm bg-[#FFDD2D] text-[#333333] px-4 py-2 rounded-lg font-semibold hover:bg-[#FFE855] transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          Добавить
        </button>
      </header>

      <main className="flex-1 px-4 py-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold text-white">Запланированные покупки</h2>
            <p className="text-xs text-white/60 mt-1">
              Добавляй хотелки сюда вместо мгновенной покупки
            </p>
          </div>
          <span className="text-[11px] px-2 py-1 rounded-lg bg-[#1A1A1A] text-white/60 border border-[#333333]">
            период охлаждения
          </span>
        </div>

        {wishlist.length === 0 ? (
          <div className="bg-[#1A1A1A] border border-[#333333] rounded-lg p-8 text-center">
            <FiHeart className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/70 mb-4 text-lg">Вишлист пуст</p>
            <p className="text-white/50 mb-6 text-sm">
              Добавь товары в вишлист через ассистента или кнопку "Добавить покупку"
            </p>
            <button
              onClick={() => uiStore.openAddPurchaseModal()}
              className="px-6 py-3 bg-[#FFDD2D] text-[#333333] rounded-lg font-semibold hover:bg-[#FFE855] transition-colors flex items-center gap-2 mx-auto"
            >
              <FiPlus className="w-5 h-5" />
              Добавить первую покупку
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-[#333333] bg-[#1A1A1A] p-2 sm:p-4">
            <WishlistCarousel />
          </div>
        )}
      </main>

      {uiStore.showAddPurchaseModal && (
        <AddPurchaseModal onClose={() => uiStore.closeAddPurchaseModal()} />
      )}
    </div>
  );
});

export default WishlistPage;

