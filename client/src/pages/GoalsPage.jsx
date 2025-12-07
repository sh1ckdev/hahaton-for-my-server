import { observer } from "mobx-react-lite";
import { useStores } from "../stores/StoreProvider.jsx";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiTarget, FiPlus, FiEdit, FiCheck, FiX, FiTrash2 } from "react-icons/fi";

const GoalsPage = observer(() => {
  const { userStore, goalStore } = useStores();
  const nav = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    if (!userStore.user) {
      nav("/login");
      return;
    }
    if (userStore.userId) {
      goalStore.loadForUser(userStore.userId, showCompleted);
    }
  }, [userStore.user, userStore.userId, showCompleted, goalStore, nav]);

  const handleAddGoal = async (goalData) => {
    try {
      await goalStore.createGoal(userStore.userId, goalData);
      setShowAddModal(false);
    } catch (e) {
      alert("Ошибка при создании цели: " + e.message);
    }
  };

  const handleUpdateGoal = async (goalId, goalData) => {
    try {
      await goalStore.updateGoal(goalId, goalData);
      setEditingGoal(null);
    } catch (e) {
      alert("Ошибка при обновлении цели: " + e.message);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!confirm("Удалить эту цель?")) return;
    try {
      await goalStore.deleteGoal(goalId);
    } catch (e) {
      alert("Ошибка при удалении цели: " + e.message);
    }
  };

  if (!userStore.user) return null;

  const goals = showCompleted ? goalStore.goals : goalStore.activeGoals;

  return (
    <div className="min-h-screen flex flex-col bg-[#0D0D0D]">
      <header className="px-3 sm:px-4 py-3 border-b border-[#333333] bg-[#1A1A1A] flex items-center justify-between">
        <button
          onClick={() => nav(-1)}
          className="flex items-center gap-1 sm:gap-2 text-sm text-white hover:text-[#FFDD2D] transition-colors flex-shrink-0"
        >
          <FiArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Назад</span>
        </button>
        <div className="flex items-center gap-2 flex-1 justify-center">
          <FiTarget className="w-5 h-5 text-[#FFDD2D] flex-shrink-0" />
          <span className="font-semibold text-white text-sm sm:text-base">Мои цели</span>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm bg-[#FFDD2D] text-[#333333] px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold hover:bg-[#FFE855] transition-colors flex-shrink-0"
        >
          <FiPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Добавить</span>
          <span className="sm:hidden">+</span>
        </button>
      </header>

      <main className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <h2 className="text-base sm:text-lg font-semibold text-white">Финансовые цели</h2>
          <label className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded"
            />
            <span className="text-white/70">Показать выполненные</span>
          </label>
        </div>

        {goals.length === 0 ? (
          <div className="bg-[#333333] border border-[#555555] rounded-md p-8 text-center">
            <p className="text-white/70 mb-4">Пока нет целей</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-[#FFDD2D] text-[#333333] rounded-md font-semibold hover:bg-[#FFE855] transition-colors"
            >
              Добавить первую цель
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => (
              <div
                key={goal._id}
                className={`bg-[#333333] border border-[#555555] rounded-md p-4 ${
                  goal.isCompleted ? "opacity-60" : ""
                }`}
              >
                {editingGoal?._id === goal._id ? (
                  <GoalEditForm
                    goal={goal}
                    onSave={(data) => handleUpdateGoal(goal._id, data)}
                    onCancel={() => setEditingGoal(null)}
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{goal.title}</h3>
                          {goal.isCompleted && (
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                              Выполнено
                            </span>
                          )}
                        </div>
                        <div className="text-2xl font-bold text-[#FFDD2D] mb-1">
                          {goal.price.toLocaleString()} ₽
                        </div>
                        {goal.description && (
                          <p className="text-sm text-white/60 mt-2">{goal.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-[#FFDD2D] bg-[#FFDD2D]/10 px-2 py-1 rounded mb-2 border border-[#FFDD2D]/20">
                          Приоритет {goal.priority}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 mt-3">
                      <button
                        onClick={() => setEditingGoal(goal)}
                        className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-[#1A1A1A] rounded-md hover:bg-[#444444] text-white transition-colors border border-[#555555]"
                      >
                        <FiEdit className="w-4 h-4" />
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleUpdateGoal(goal._id, { isCompleted: !goal.isCompleted })}
                        className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-[#1A1A1A] rounded-md hover:bg-[#444444] text-white transition-colors border border-[#555555]"
                      >
                        <FiCheck className="w-4 h-4" />
                        {goal.isCompleted ? "Вернуть" : "Выполнено"}
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(goal._id)}
                        className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-red-500/20 text-red-400 rounded-md hover:bg-red-500/30 border border-red-500/30"
                      >
                        <FiTrash2 className="w-4 h-4" />
                        Удалить
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

      </main>

      {showAddModal && (
        <GoalAddModal
          onSave={handleAddGoal}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
});

const GoalEditForm = ({ goal, onSave, onCancel }) => {
  const [title, setTitle] = useState(goal.title);
  const [price, setPrice] = useState(goal.price);
  const [priority, setPriority] = useState(goal.priority);
  const [description, setDescription] = useState(goal.description || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ title, price: Number(price), priority: Number(priority), description });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Название цели"
        required
        className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#555555] rounded-md text-white"
      />
      <input
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Сумма (₽)"
        required
        min="0"
        className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#555555] rounded-md text-white"
      />
      <div>
        <label className="text-sm text-slate-400 mb-1 block">
          Приоритет (1 = высший, 10 = низший)
        </label>
        <input
          type="number"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          min="1"
          max="10"
          required
          className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#555555] rounded-md text-white"
        />
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Описание (необязательно)"
        rows="3"
        className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#555555] rounded-md text-white"
      />
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="submit"
          className="px-4 py-2 bg-[#FFDD2D] text-[#333333] rounded-md font-semibold hover:bg-[#FFE855] transition-colors"
        >
          Сохранить
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-[#1A1A1A] rounded-md hover:bg-[#444444] text-white transition-colors"
        >
          Отмена
        </button>
      </div>
    </form>
  );
};

const GoalAddModal = ({ onSave, onClose }) => {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [priority, setPriority] = useState(1);
  const [description, setDescription] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      title,
      price: Number(price),
      priority: Number(priority),
      description
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#333333] border border-[#555555] rounded-md p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Добавить цель</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название цели *"
            required
            className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#555555] rounded-md text-white"
          />
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Сумма (₽) *"
            required
            min="0"
            className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#555555] rounded-md text-white"
          />
          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              Приоритет (1 = высший, 10 = низший) *
            </label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              min="1"
              max="10"
              required
              className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#555555] rounded-md text-white"
            />
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание (необязательно)"
            rows="3"
            className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#555555] rounded-md text-white"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#FFDD2D] text-[#333333] rounded-md font-semibold hover:bg-[#FFE855] transition-colors"
            >
              Добавить
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1A1A1A] rounded-md hover:bg-[#444444] text-white transition-colors"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoalsPage;

