export function getGoalShiftPrediction(user,purchase){
    if(!user.savingsPerMonth) return null;
  
    const deficit = purchase.price - user.currentSavings;
    const days = Math.ceil(deficit / (user.savingsPerMonth/30));
  
    return days>0 ? days : 0;
  }
  