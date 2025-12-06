import { useState } from "react";
import { observer } from "mobx-react-lite";
import { useStores } from "../stores/StoreProvider.jsx";
import api from "../api/client";
import { PURCHASE_CATEGORIES } from "../utils/categories.js";
import { money } from "../utils/formatMoney.js";

const CATEGORIES = PURCHASE_CATEGORIES;

const AddPurchaseModal = observer(({ onClose }) => {
  const { userStore, purchaseStore } = useStores();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [url, setUrl] = useState("");
  const [ai, setAi] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showAdvice, setShowAdvice] = useState(false);
  const [advice, setAdvice] = useState("");
  const [createdPurchase, setCreatedPurchase] = useState(null);

  const submit = async () => {
    if (!title || !price) {
      alert("Заполните название и цену");
      return;
    }

    setLoading(true);
    try {
      // Создаем покупку
      const response = await api.post(`/purchases/${userStore.userId}`, {
        title,
        price: Number(price),
        category: category || undefined,
        url: url || undefined,
        useAiCategory: ai && !category
      });

      const purchase = response.data;
      setCreatedPurchase(purchase);

      // Если покупка не заблокирована, получаем совет ассистента
      if (purchase.status === "planned" && !purchase.blockedByCategory) {
        try {
          const adviceResponse = await api.get(`/ai/purchase-advice/${purchase._id}`);
          setAdvice(adviceResponse.data.advice || "Покупка добавлена в список запланированных.");
          setShowAdvice(true);
        } catch (e) {
          console.error("Error getting advice:", e);
          // Показываем модалку даже без совета
          setAdvice("Покупка добавлена. Хотите добавить её в вишлист?");
          setShowAdvice(true);
        }
      } else if (purchase.blockedByCategory) {
        // Если заблокирована - показываем сообщение
        setAdvice(`Я определил, что покупка "${purchase.title}" за ${money(purchase.price)} относится к категории "${purchase.category || purchase.aiCategory}", которая находится в вашем blacklist.`);
        setShowAdvice(true);
      } else {
        // Если сразу куплена или отменена
        await purchaseStore.loadForUser(userStore.userId);
        onClose();
      }
    } catch (error) {
      console.error("Error creating purchase:", error);
      alert("Ошибка при добавлении покупки");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWishlist = async () => {
    if (!createdPurchase) return;
    
    // Покупка уже создана как planned, просто закрываем модалку
    await purchaseStore.loadForUser(userStore.userId);
    setShowAdvice(false);
    onClose();
  };

  const handleConfirmPurchase = async () => {
    if (!createdPurchase) return;
    
    // Отмечаем как купленную
    await api.post(`/purchases/bought/${createdPurchase._id}`);
    await purchaseStore.loadForUser(userStore.userId);
    setShowAdvice(false);
    onClose();
  };

  const handleCancel = async () => {
    if (!createdPurchase) return;
    
    // Отменяем покупку
    await api.post(`/purchases/cancel/${createdPurchase._id}`);
    await purchaseStore.loadForUser(userStore.userId);
    setShowAdvice(false);
    onClose();
  };

  // Показываем модалку с советом ассистента
  if (showAdvice && createdPurchase) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-[#333333] border border-[#555555] p-4 sm:p-5 rounded-lg w-full sm:w-96 max-w-[90vw] max-h-[90vh] overflow-y-auto space-y-3 sm:space-y-4">
          <h2 className="font-semibold text-lg text-white">Совет ассистента</h2>
          
          <div className="bg-[#1A1A1A] border border-[#555555] rounded-lg p-4">
            <p className="text-sm text-white/90 whitespace-pre-wrap">{advice}</p>
          </div>

          {createdPurchase.blockedByCategory ? (
            <div className="flex gap-2">
              <button 
                onClick={handleCancel}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg font-semibold hover:bg-red-600 transition-colors"
              >
                Понятно
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button 
                onClick={handleAddToWishlist}
                className="flex-1 bg-[#FFDD2D] text-[#333333] py-2 rounded-lg font-semibold hover:bg-[#FFE855] transition-colors"
              >
                Добавить в вишлист
              </button>
              <button 
                onClick={handleConfirmPurchase}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg font-semibold hover:bg-green-600 transition-colors"
              >
                Всё равно купить
              </button>
              <button 
                onClick={handleCancel}
                className="flex-1 bg-[#1A1A1A] text-white border border-[#555555] py-2 rounded-lg font-semibold hover:bg-[#444444] transition-colors"
              >
                Отменить
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#333333] border border-[#555555] p-4 sm:p-5 rounded-lg w-full sm:w-80 max-w-[90vw] max-h-[90vh] overflow-y-auto space-y-3">
        <h2 className="font-semibold text-lg text-white">Новая покупка</h2>
        <input 
          className="bg-[#1A1A1A] border border-[#555555] w-full px-3 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FFDD2D]" 
          placeholder="Название товара" 
          value={title} 
          onChange={e=>setTitle(e.target.value)}
        />
        <input 
          className="bg-[#1A1A1A] border border-[#555555] w-full px-3 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FFDD2D]" 
          type="number" 
          placeholder="Цена (₽)" 
          value={price} 
          onChange={e=>setPrice(e.target.value)}
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
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <label className="flex gap-2 text-sm text-white/80">
          <input type="checkbox" checked={ai} onChange={e=>setAi(e.target.checked)}/> 
          Использовать AI для категории (если не выбрана)
        </label>
        <button 
          onClick={submit} 
          disabled={loading}
          className="w-full bg-[#FFDD2D] text-[#333333] py-2 rounded-lg font-semibold hover:bg-[#FFE855] disabled:opacity-50 transition-colors"
        >
          {loading ? "Добавление..." : "Добавить"}
        </button>
        <button onClick={onClose} className="w-full text-white/60 text-sm hover:text-white transition-colors">Отмена</button>
      </div>
    </div>
  );
});

export default AddPurchaseModal;
