import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSave, FiTrash2, FiEdit2, FiX, FiCheck, FiAlertCircle } from "react-icons/fi";
import api from "../api/client.js";

// Функция для подсветки переменных в тексте промпта
const highlightVariables = (text) => {
  if (!text) return text;
  
  // Регулярное выражение для поиска переменных в формате {variableName}
  const variableRegex = /\{([^}]+)\}/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = variableRegex.exec(text)) !== null) {
    // Добавляем текст до переменной
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Добавляем подсвеченную переменную
    parts.push(
      <span
        key={match.index}
        className="px-1 py-0.5 bg-[#FFDD2D]/20 text-[#FFDD2D] rounded border border-[#FFDD2D]/30 font-semibold"
      >
        {match[0]}
      </span>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Добавляем оставшийся текст
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : text;
};

const PromptsAdminPage = () => {
  const nav = useNavigate();
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState(null);
  const [editedPrompt, setEditedPrompt] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/prompts");
      setPrompts(res.data);
      setError(null);
    } catch (err) {
      console.error("Failed to load prompts:", err);
      setError("Ошибка загрузки промптов");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (prompt) => {
    setEditingKey(prompt.key);
    setEditedPrompt({
      name: prompt.name,
      description: prompt.description,
      template: prompt.template,
      variables: prompt.variables || [],
      isActive: prompt.isActive
    });
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditedPrompt(null);
    setError(null);
    setSuccess(null);
  };

  const handleSave = async (key) => {
    try {
      setError(null);
      setSuccess(null);
      
      if (!editedPrompt.template.trim()) {
        setError("Шаблон промпта не может быть пустым");
        return;
      }

      await api.put(`/prompts/${key}`, editedPrompt);
      setSuccess("Промпт успешно сохранен");
      setEditingKey(null);
      setEditedPrompt(null);
      await loadPrompts();
      
      // Скрываем сообщение об успехе через 3 секунды
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to save prompt:", err);
      setError(err.response?.data?.error || "Ошибка сохранения промпта");
    }
  };

  const handleDelete = async (key) => {
    try {
      setError(null);
      await api.delete(`/prompts/${key}`);
      setSuccess("Промпт успешно удален");
      setShowDeleteConfirm(null);
      await loadPrompts();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to delete prompt:", err);
      setError(err.response?.data?.error || "Ошибка удаления промпта");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-white">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] py-4 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => nav("/")}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4"
          >
            <FiArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Назад</span>
          </button>
          
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Управление промптами LLM
          </h1>
          <p className="text-white/60 text-sm">
            Редактирование промптов для AI-ассистента
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3">
            <FiAlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-300">{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-3">
            <FiCheck className="w-5 h-5 text-green-400 flex-shrink-0" />
            <span className="text-green-300">{success}</span>
          </div>
        )}

        {/* Prompts List */}
        <div className="space-y-4">
          {prompts.map((prompt) => (
            <div
              key={prompt.key}
              className="bg-[#1A1A1A] border border-[#333333] rounded-lg p-4 sm:p-6"
            >
              {editingKey === prompt.key ? (
                // Edit Mode
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Ключ промпта
                    </label>
                    <div className="px-3 py-2 bg-[#0D0D0D] border border-[#333333] rounded-md text-white/60 text-sm">
                      {prompt.key}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Название
                    </label>
                    <input
                      type="text"
                      value={editedPrompt.name}
                      onChange={(e) =>
                        setEditedPrompt({ ...editedPrompt, name: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#333333] rounded-md text-white focus:border-[#FFDD2D] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Описание
                    </label>
                    <textarea
                      value={editedPrompt.description}
                      onChange={(e) =>
                        setEditedPrompt({ ...editedPrompt, description: e.target.value })
                      }
                      rows={2}
                      className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#333333] rounded-md text-white focus:border-[#FFDD2D] focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Шаблон промпта
                    </label>
                    <div className="relative">
                      <textarea
                        value={editedPrompt.template}
                        onChange={(e) =>
                          setEditedPrompt({ ...editedPrompt, template: e.target.value })
                        }
                        rows={15}
                        className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#333333] rounded-md text-white font-mono text-sm focus:border-[#FFDD2D] focus:outline-none resize-y"
                        spellCheck={false}
                      />
                      {/* Подсветка переменных в режиме редактирования (показываем подсказку) */}
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-white/50">
                        Используйте переменные в фигурных скобках:
                      </span>
                      <span className="px-2 py-0.5 bg-[#FFDD2D]/20 text-[#FFDD2D] rounded border border-[#FFDD2D]/30 text-xs font-mono font-semibold">
                        {"{"}variableName{"}"}
                      </span>
                      {editedPrompt.variables && editedPrompt.variables.length > 0 && (
                        <>
                          <span className="text-xs text-white/50">Доступные:</span>
                          {editedPrompt.variables.map((variable) => (
                            <span
                              key={variable}
                              className="px-2 py-0.5 bg-[#FFDD2D]/20 text-[#FFDD2D] rounded border border-[#FFDD2D]/30 text-xs font-mono"
                            >
                              {"{"}
                              {variable}
                              {"}"}
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Переменные (через запятую)
                    </label>
                    <input
                      type="text"
                      value={editedPrompt.variables.join(", ")}
                      onChange={(e) =>
                        setEditedPrompt({
                          ...editedPrompt,
                          variables: e.target.value
                            .split(",")
                            .map((v) => v.trim())
                            .filter(Boolean)
                        })
                      }
                      className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#333333] rounded-md text-white focus:border-[#FFDD2D] focus:outline-none"
                      placeholder="contextText, data, etc."
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editedPrompt.isActive}
                        onChange={(e) =>
                          setEditedPrompt({ ...editedPrompt, isActive: e.target.checked })
                        }
                        className="w-4 h-4 rounded border-[#333333] bg-[#0D0D0D] text-[#FFDD2D] focus:ring-[#FFDD2D]"
                      />
                      <span className="text-sm text-white/70">Активен</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#333333]">
                    <button
                      onClick={() => handleSave(prompt.key)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#FFDD2D] text-[#333333] font-semibold rounded-lg hover:bg-[#FFE855] transition-colors"
                    >
                      <FiSave className="w-4 h-4" />
                      Сохранить
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-2 px-4 py-2 bg-[#333333] text-white border border-[#555555] rounded-lg hover:bg-[#444444] transition-colors"
                    >
                      <FiX className="w-4 h-4" />
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-white">{prompt.name}</h3>
                        {!prompt.isActive && (
                          <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                            Неактивен
                          </span>
                        )}
                        <span className="px-2 py-1 bg-[#333333] text-white/60 text-xs rounded">
                          v{prompt.version}
                        </span>
                      </div>
                      <div className="text-sm text-white/60 mb-1">
                        <span className="font-mono text-[#FFDD2D]">{prompt.key}</span>
                      </div>
                      {prompt.description && (
                        <p className="text-sm text-white/70 mt-2">{prompt.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(prompt)}
                        className="p-2 bg-[#333333] border border-[#555555] rounded-lg hover:bg-[#444444] hover:border-[#FFDD2D]/50 transition-colors"
                        title="Редактировать"
                      >
                        <FiEdit2 className="w-4 h-4 text-white" />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(prompt.key)}
                        className="p-2 bg-[#333333] border border-[#555555] rounded-lg hover:bg-red-500/20 hover:border-red-500/50 transition-colors"
                        title="Удалить"
                      >
                        <FiTrash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#0D0D0D] border border-[#333333] rounded-md p-4">
                    <div className="text-xs text-white/50 mb-2">Шаблон:</div>
                    <div className="text-xs text-white/80 font-mono whitespace-pre-wrap break-words">
                      {highlightVariables(prompt.template)}
                    </div>
                  </div>

                  {prompt.variables && prompt.variables.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs text-white/50">Переменные:</span>
                      {prompt.variables.map((variable) => (
                        <span
                          key={variable}
                          className="px-2 py-1 bg-[#FFDD2D]/10 text-[#FFDD2D] text-xs rounded border border-[#FFDD2D]/30"
                        >
                          {"{"}
                          {variable}
                          {"}"}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {prompts.length === 0 && (
          <div className="text-center py-12 text-white/60">
            Промпты не найдены
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] border border-[#333333] rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Удалить промпт?</h3>
            <p className="text-white/70 text-sm mb-6">
              Вы уверены, что хотите удалить промпт "{prompts.find(p => p.key === showDeleteConfirm)?.name}"? 
              Это действие нельзя отменить.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                Удалить
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-[#333333] text-white border border-[#555555] rounded-lg hover:bg-[#444444] transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptsAdminPage;

