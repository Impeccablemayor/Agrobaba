import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { GuestOnlyRoute } from './components/routing/GuestOnlyRoute';

import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import AdminLoginPage from './pages/auth/AdminLoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import AboutPage from './pages/info/AboutPage';
import ContactPage from './pages/info/ContactPage';
import ServicesPage from './pages/info/ServicesPage';
import ShopPage from './pages/shop/ShopPage';
import ProductDetailPage from './pages/shop/ProductDetailPage';
import ServiceDetailPage from './pages/shop/ServiceDetailPage';
import DemandBoardPage from './pages/demands/DemandBoardPage';
import DemandDetailPage from './pages/demands/DemandDetailPage';
import PostDemandPage from './pages/demands/PostDemandPage';
import MyDemandsPage from './pages/demands/MyDemandsPage';
import MyMessagesPage from './pages/messages/MyMessagesPage';
import ChatPage from './pages/messages/ChatPage';
import CartPage from './pages/checkout/CartPage';
import CheckoutPage from './pages/checkout/CheckoutPage';
import PayOfflinePage from './pages/checkout/PayOfflinePage';
import ConfirmPaymentPage from './pages/checkout/ConfirmPaymentPage';
import MyAccountPage from './pages/account/MyAccountPage';
import EditAccountPage from './pages/account/EditAccountPage';
import ChangePasswordPage from './pages/account/ChangePasswordPage';
import DeleteAccountPage from './pages/account/DeleteAccountPage';
import MyListingsPage from './pages/account/MyListingsPage';
import PostListingPage from './pages/account/PostListingPage';
import MyOrdersPage from './pages/account/MyOrdersPage';
import MyBookingsPage from './pages/account/MyBookingsPage';
import MySalesPage from './pages/account/MySalesPage';
import VerifyAccountPage from './pages/account/VerifyAccountPage';
import AdminVerificationsPage from './pages/admin/AdminVerificationsPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminFlashSalesPage from './pages/admin/AdminFlashSalesPage';
import AdminCouponsPage from './pages/admin/AdminCouponsPage';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />

        <Route path="login" element={<GuestOnlyRoute><LoginPage /></GuestOnlyRoute>} />
        <Route path="register" element={<GuestOnlyRoute><RegisterPage /></GuestOnlyRoute>} />
        <Route path="portal-77x-admin" element={<GuestOnlyRoute><AdminLoginPage /></GuestOnlyRoute>} />

        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="services" element={<ServicesPage />} />

        <Route path="shop" element={<ShopPage />} />
        <Route path="shop/product/:id" element={<ProductDetailPage />} />
        <Route path="shop/service/:id" element={<ServiceDetailPage />} />

        <Route path="demands" element={<DemandBoardPage />} />
        <Route path="demands/:id" element={<DemandDetailPage />} />
        <Route path="demands/new" element={<ProtectedRoute><PostDemandPage /></ProtectedRoute>} />
        <Route path="demands/mine" element={<ProtectedRoute><MyDemandsPage /></ProtectedRoute>} />

        <Route path="messages" element={<ProtectedRoute><MyMessagesPage /></ProtectedRoute>} />
        <Route path="messages/:partnerId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />

        <Route path="cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
        <Route path="checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
        <Route path="pay-offline" element={<ProtectedRoute><PayOfflinePage /></ProtectedRoute>} />
        <Route path="confirm-payment" element={<ProtectedRoute><ConfirmPaymentPage /></ProtectedRoute>} />

        <Route path="account" element={<ProtectedRoute><MyAccountPage /></ProtectedRoute>} />
        <Route path="account/edit" element={<ProtectedRoute><EditAccountPage /></ProtectedRoute>} />
        <Route path="account/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
        <Route path="account/delete" element={<ProtectedRoute><DeleteAccountPage /></ProtectedRoute>} />
        <Route path="account/my-listings" element={<ProtectedRoute><MyListingsPage /></ProtectedRoute>} />
        <Route path="account/post-listing" element={<ProtectedRoute><PostListingPage /></ProtectedRoute>} />
        <Route path="account/my-orders" element={<ProtectedRoute><MyOrdersPage /></ProtectedRoute>} />
        <Route path="account/my-bookings" element={<ProtectedRoute><MyBookingsPage /></ProtectedRoute>} />
        <Route path="account/my-sales" element={<ProtectedRoute><MySalesPage /></ProtectedRoute>} />
        <Route path="account/verify" element={<ProtectedRoute><VerifyAccountPage /></ProtectedRoute>} />

        <Route path="admin/verifications" element={<ProtectedRoute><AdminVerificationsPage /></ProtectedRoute>} />
        <Route path="admin/orders" element={<ProtectedRoute><AdminOrdersPage /></ProtectedRoute>} />
        <Route path="admin/flash-sales" element={<ProtectedRoute><AdminFlashSalesPage /></ProtectedRoute>} />
        <Route path="admin/coupons" element={<ProtectedRoute><AdminCouponsPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default App;
