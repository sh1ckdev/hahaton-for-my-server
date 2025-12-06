import { makeAutoObservable } from "mobx";

export class UIStore {
  showFinancialProfileModal = false;
  showInitialBlacklistModal = false;
  showPaymentConfirmationModal = false;
  showAddPurchaseModal = false;
  showUserMenu = false;
  pendingPurchase = null;
  purchaseAdvice = null;
  affectedGoals = []; // Массив целей, которые пострадают: [{title, price, shiftDays}, ...]
  loadingAdvice = false;

  constructor(root) {
    this.root = root;
    makeAutoObservable(this);
  }

  openAddPurchaseModal() {
    this.showAddPurchaseModal = true;
  }

  closeAddPurchaseModal() {
    this.showAddPurchaseModal = false;
  }

  openFinancialProfileModal() {
    this.showFinancialProfileModal = true;
  }
  closeFinancialProfileModal() {
    this.showFinancialProfileModal = false;
  }

  openInitialBlacklistModal() {
    this.showInitialBlacklistModal = true;
  }
  closeInitialBlacklistModal() {
    this.showInitialBlacklistModal = false;
  }

  openPaymentConfirmationModal(purchase) {
    this.pendingPurchase = purchase;
    this.showPaymentConfirmationModal = true;
    this.purchaseAdvice = null;
    this.affectedGoals = [];
    this.loadingAdvice = true;
  }

  closePaymentConfirmationModal() {
    this.showPaymentConfirmationModal = false;
    this.pendingPurchase = null;
    this.purchaseAdvice = null;
    this.affectedGoals = [];
    this.loadingAdvice = false;
  }

  setPurchaseAdvice(advice, affectedGoals = []) {
    this.purchaseAdvice = advice;
    this.affectedGoals = affectedGoals;
    this.loadingAdvice = false;
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu() {
    this.showUserMenu = false;
  }
}
