import { observer } from "mobx-react-lite";
import { useStores } from "../stores/StoreProvider.jsx";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const LoginPage = observer(() => {
  const { userStore } = useStores();
  const nav = useNavigate();
  const [phone, setPhone] = useState("");
  const [nickname, setNickname] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!phone) return;

    userStore.setCredentials(phone, nickname);
    await userStore.loginOrRegister();
    nav("/");
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-[#0D0D0D]">
      <div className="bg-[#333333] border border-[#555555] rounded-lg p-8 max-w-md w-full shadow-xl">
        <h1 className="text-2xl font-semibold mb-2 flex items-center gap-2 text-white">
          <span className="inline-flex h-8 w-8 rounded-full bg-[#FFDD2D] items-center justify-center text-[#333333] font-bold">
            T
          </span>
          Рациональный ассистент
        </h1>
        <p className="text-white/70 mb-6">
          Введи номер телефона и никнейм. Если тебя ещё нет — создадим профиль.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1 text-white/90">
              Номер телефона / ID
            </label>
            <input
              className="w-full rounded-lg bg-[#1A1A1A] border border-[#555555] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFDD2D] text-white"
              placeholder="+7..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-white/90">
              Никнейм
            </label>
            <input
              className="w-full rounded-lg bg-[#1A1A1A] border border-[#555555] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFDD2D] text-white"
              placeholder="Alex"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={userStore.loading}
            className="w-full py-2 rounded-lg bg-[#FFDD2D] text-[#333333] font-semibold hover:bg-[#FFE855] transition-colors disabled:opacity-60"
          >
            {userStore.loading ? "Загрузка..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
});

export default LoginPage;
