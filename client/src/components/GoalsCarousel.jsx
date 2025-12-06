import { observer } from "mobx-react-lite";
import { useStores } from "../stores/StoreProvider.jsx";
import { FiTarget, FiFlag } from "react-icons/fi";

const GoalsCarousel = observer(() => {
  const { goalStore } = useStores();
  const goals = goalStore.activeGoals;

  if (!goals.length)
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FiTarget className="w-12 h-12 text-white/20 mb-3" />
        <div className="text-sm text-white/60">
          Пока нет целей. Добавь их в разделе "Управлять целями".
        </div>
      </div>
    );

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {goals.map((g) => {
        return (
          <div
            key={g._id}
            className="min-w-[240px] bg-[#1A1A1A] border border-[#444444] rounded-lg p-4 flex-shrink-0 hover:border-[#FFDD2D]/50 transition-colors"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFDD2D]/10 flex items-center justify-center flex-shrink-0">
                <FiTarget className="w-5 h-5 text-[#FFDD2D]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white mb-1">{g.title}</div>
                <div className="text-xs text-[#FFDD2D] bg-[#FFDD2D]/10 px-2 py-0.5 rounded-lg inline-flex items-center gap-1 border border-[#FFDD2D]/20">
                  <FiFlag className="w-3 h-3" />
                  Приоритет {g.priority}
                </div>
              </div>
            </div>
            <div className="text-xl font-bold text-white mb-2">
              {g.price.toLocaleString()} ₽
            </div>
            {g.description && (
              <div className="text-xs text-white/60 line-clamp-2">
                {g.description}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

export default GoalsCarousel;
