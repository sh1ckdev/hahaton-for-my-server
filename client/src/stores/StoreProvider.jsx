import React, { createContext, useContext } from "react";
import { UserStore } from "./userStore.js";
import { PurchaseStore } from "./purchaseStore.js";
import { UIStore } from "./uiStore.js";
import { GoalStore } from "./goalStore.js";
import { NotificationStore } from "./notificationStore.js";

class RootStore {
  constructor() {
    this.userStore = new UserStore(this);
    this.purchaseStore = new PurchaseStore(this);
    this.uiStore = new UIStore(this);
    this.goalStore = new GoalStore(this);
    this.notificationStore = new NotificationStore(this);
  }
}

const StoreContext = createContext(null);

export const StoreProvider = ({ children }) => {
  const rootStore = React.useState(() => new RootStore())[0];
  return (
    <StoreContext.Provider value={rootStore}>{children}</StoreContext.Provider>
  );
};

export function useStores() {
  const context = useContext(StoreContext);
  if (!context) {   
    throw new Error("useStores must be used within a StoreProvider");
  }
  return context;
}
