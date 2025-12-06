import { observer } from "mobx-react-lite";
import { useStores } from "../stores/StoreProvider.jsx";
import { useState } from "react";
import api from "../api/client";
import { useNavigate } from "react-router-dom";

const AddPurchasePage = observer(() => {
  const { userStore, purchaseStore } = useStores();
  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [useAI, setUseAI] = useState(true);

  const create = async () => {
    await api.post(`/purchases/${userStore.userId}`, {
      title,
      price: Number(price),
      useAiCategory: useAI
    });

    await purchaseStore.loadForUser(userStore.userId);
    nav("/");
  };

  return (
    <div className="p-5 max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Добавить покупку</h1>
      <input
        placeholder="Название"
        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        placeholder="Цена"
        type="number"
        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />
      <label className="flex gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={useAI}
          onChange={(e) => setUseAI(e.target.checked)}
        />
        Определить категорию через AI
      </label>
      <button
        className="w-full bg-primary text-black font-semibold py-2 rounded-xl"
        onClick={create}
      >
        Добавить
      </button>
      <button onClick={()=>nav("/")} className="text-slate-400 text-sm">← Назад</button>
    </div>
  );
});

export default AddPurchasePage;
