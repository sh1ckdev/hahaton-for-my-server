import { observer } from "mobx-react-lite";
import { useStores } from "../stores/StoreProvider.jsx";
import { FiDollarSign } from "react-icons/fi";
import { money } from "../utils/formatMoney.js";
import api from "../api/client.js";

const AddToSavingsModal = observer(({ purchase, onClose, onSkip }) => {
  const { userStore } = useStores();

  const handleAddToSavings = async () => {
    try {
      const currentSavings = userStore.user?.currentSavings || 0;
      const newSavings = currentSavings + purchase.price;
      
      await api.post(`/users/${userStore.userId}/bank-sync`, {
        currentSavings: newSavings
      });
      
      await userStore.loadProfile();
      onClose?.();
    } catch (err) {
      console.error("Failed to add to savings:", err);
      alert("Ошибка при добавлении в накопления");
    }
  };

  const handleSkip = () => {
    onSkip?.();
  };

  if (!purchase) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[60] p-4">
      <div className="bg-gradient-to-br from-[#1A1A1A] via-[#222222] to-[#1A1A1A] border border-[#FFDD2D]/40 rounded-lg p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-[#FFDD2D] to-[#FFE855] flex items-center justify-center shadow-lg shadow-[#FFDD2D]/30">
            <FiDollarSign className="w-7 h-7 text-[#333333]" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Добавить в накопления?</h3>
            <p className="text-sm text-white/60">Ты отменил покупку</p>
          </div>
        </div>

        <div className="bg-[#333333]/50 backdrop-blur-sm border border-[#555555]/50 rounded-lg p-4 mb-6">
          <div className="text-sm text-white/70 mb-2">Сумма покупки:</div>
          <div className="text-2xl font-bold text-[#FFDD2D]">
            {money(purchase.price)}
          </div>
          <div className="text-xs text-white/50 mt-2">
            Текущие накопления: {userStore.user?.currentSavings?.toLocaleString() || 0} ₽
          </div>
          <div className="text-xs text-white/50 mt-1">
            После добавления: {(userStore.user?.currentSavings || 0) + purchase.price} ₽
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 px-4 py-3 rounded-xl text-sm bg-[#1A1A1A] text-white/80 hover:bg-[#2A2A2A] hover:text-white transition-colors font-medium border border-[#333333]"
          >
            Пропустить
          </button>
          <button
            onClick={handleAddToSavings}
            className="flex-1 px-4 py-3 rounded-xl text-sm bg-gradient-to-r from-[#FFDD2D] to-[#FFE855] text-[#333333] font-bold hover:from-[#FFE855] hover:to-[#FFDD2D] transition-all shadow-lg shadow-[#FFDD2D]/40 hover:shadow-[#FFDD2D]/60 transform hover:scale-105"
          >
            Добавить
          </button>
        </div>
      </div>
    </div>
  );
});

export default AddToSavingsModal;

