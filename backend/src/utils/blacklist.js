// базовый blacklist + простая проверка по тексту

export const DEFAULT_BLACKLIST = ["игры", "азарт", "казино"];

export const checkBlacklistByText = (category, title) => {
  const text = `${category || ""} ${title || ""}`.toLowerCase();
  for (const bad of DEFAULT_BLACKLIST) {
    if (text.includes(bad)) return bad;
  }
  return null;
};
