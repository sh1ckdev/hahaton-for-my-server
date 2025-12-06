// App.jsx
import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { observer } from "mobx-react-lite";
import { useStores } from "./stores/StoreProvider.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import BlacklistPage from "./pages/BlacklistPage.jsx";
import NotificationSettingsPage from "./pages/NotificationSettingsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import GoalsPage from "./pages/GoalsPage.jsx";
import WishlistPage from "./pages/WishlistPage.jsx";
import PaymentConfirmationModal from "./components/PaymentConfirmationModal.jsx";
import FinancialProfileModal from "./components/FinancialProfileModal.jsx";

const App = observer(() => {
  const { userStore, purchaseStore } = useStores();

  // Подключение к SSE стриму для получения уведомлений о платежах
  useEffect(() => {
    if (!userStore.user || !userStore.userId) return;

    const stream = purchaseStore.connectBankStream(userStore.userId);
    return () => {
      if (stream) stream.close();
    };
  }, [userStore.user, userStore.userId, purchaseStore]);


  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans">
      <div className="mx-auto max-w-6xl px-3 sm:px-4 lg:px-6">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              userStore.isAuthenticated ? (
                <DashboardPage />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/blacklist"
            element={
              userStore.isAuthenticated ? (
                <BlacklistPage />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/notification-settings"
            element={
              userStore.isAuthenticated ? (
                <NotificationSettingsPage />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/profile"
            element={
              userStore.isAuthenticated ? (
                <ProfilePage />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/goals"
            element={
              userStore.isAuthenticated ? (
                <GoalsPage />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/wishlist"
            element={
              userStore.isAuthenticated ? (
                <WishlistPage />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </div>
      <PaymentConfirmationModal />
      <FinancialProfileModal />
    </div>
  );
});

export default App;
