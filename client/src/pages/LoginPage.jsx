import { observer } from "mobx-react-lite";
import { useStores } from "../stores/StoreProvider.jsx";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const LoginPage = observer(() => {
  const { userStore } = useStores();
  const nav = useNavigate();
  const [phone, setPhone] = useState("");
  const [nickname, setNickname] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [nicknameError, setNicknameError] = useState("");

  // Функция для форматирования телефона с маской
  const formatPhone = (value) => {
    // Удаляем все нецифровые символы
    const digits = value.replace(/\D/g, "");
    
    // Если пусто, возвращаем пустую строку
    if (digits.length === 0) {
      return "";
    }
    
    // Если начинается не с 7, добавляем 7 в начало
    let phoneDigits = digits;
    if (!phoneDigits.startsWith("7")) {
      phoneDigits = "7" + phoneDigits;
    }
    
    // Ограничиваем длину до 11 цифр (7XXXXXXXXXX)
    if (phoneDigits.length > 11) {
      phoneDigits = phoneDigits.slice(0, 11);
    }
    
    // Форматируем с маской +7 (XXX) XXX-XX-XX
    const code = phoneDigits.slice(1, 4);
    const part1 = phoneDigits.slice(4, 7);
    const part2 = phoneDigits.slice(7, 9);
    const part3 = phoneDigits.slice(9, 11);
    
    let formatted = "+7";
    if (code) {
      formatted += ` (${code}`;
      if (part1) {
        formatted += `) ${part1}`;
        if (part2) {
          formatted += `-${part2}`;
          if (part3) {
            formatted += `-${part3}`;
          }
        }
      } else if (code.length === 3) {
        formatted += ")";
      }
    }
    
    return formatted;
  };

  // Валидация телефона
  const validatePhone = (value) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length === 0) {
      return "Номер телефона обязателен";
    }
    if (cleaned.length < 11 || !cleaned.startsWith("7")) {
      return "Введите корректный номер телефона (+7XXXXXXXXXX)";
    }
    return "";
  };

  // Валидация ника
  const validateNickname = (value) => {
    if (value.trim().length === 0) {
      return "Никнейм обязателен";
    }
    if (/\s/.test(value)) {
      return "Никнейм не должен содержать пробелы";
    }
    return "";
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    setPhoneError("");
  };

  const handleNicknameChange = (e) => {
    const value = e.target.value;
    // Удаляем пробелы в реальном времени
    const trimmedValue = value.replace(/\s/g, "");
    setNickname(trimmedValue);
    setNicknameError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    const phoneValidation = validatePhone(phone);
    const nicknameValidation = validateNickname(nickname);
    
    if (phoneValidation) {
      setPhoneError(phoneValidation);
    }
    if (nicknameValidation) {
      setNicknameError(nicknameValidation);
    }
    
    if (phoneValidation || nicknameValidation) {
      return;
    }

    // Очищаем форматирование перед отправкой (оставляем только цифры с +7)
    const cleanedPhone = phone.replace(/\D/g, "");
    // После валидации cleanedPhone всегда начинается с 7
    const finalPhone = "+" + cleanedPhone;

    userStore.setCredentials(finalPhone, nickname.trim());
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
              type="tel"
              className={`w-full rounded-lg bg-[#1A1A1A] border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFDD2D] text-white ${
                phoneError ? "border-red-500" : "border-[#555555]"
              }`}
              placeholder="+7 (999) 123-45-67"
              value={phone}
              onChange={handlePhoneChange}
              onBlur={() => {
                const error = validatePhone(phone);
                setPhoneError(error);
              }}
            />
            {phoneError && (
              <p className="text-red-400 text-xs mt-1">{phoneError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm mb-1 text-white/90">
              Никнейм
            </label>
            <input
              type="text"
              className={`w-full rounded-lg bg-[#1A1A1A] border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFDD2D] text-white ${
                nicknameError ? "border-red-500" : "border-[#555555]"
              }`}
              placeholder="Alex"
              value={nickname}
              onChange={handleNicknameChange}
              onBlur={() => {
                const error = validateNickname(nickname);
                setNicknameError(error);
              }}
            />
            {nicknameError && (
              <p className="text-red-400 text-xs mt-1">{nicknameError}</p>
            )}
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
