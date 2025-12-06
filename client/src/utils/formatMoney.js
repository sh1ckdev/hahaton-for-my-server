export const money = (v) =>
    Number(v).toLocaleString("ru-RU", { style: "currency", currency: "RUB" });
  