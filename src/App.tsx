import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { RoleProtectedRoute } from './components/routing/RoleProtectedRoute';
import { GuestOnlyRoute } from './components/routing/GuestOnlyRoute';
import { PageLoadingSpinner } from './components/LoadingSpinner';

// Eagerly load landing page for instant first paint
import HomePage from './pages/HomePage';

// Lazy load auth & secondary routes to optimize bundle size
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const AdminLoginPage = lazy(() => import('./pages/auth/AdminLoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));
const AboutPage = lazy(() => import('./pages/info/AboutPage'));
const ContactPage = lazy(() => import('./pages/info/ContactPage'));
const ServicesPage = lazy(() => import('./pages/info/ServicesPage'));
const ShopPage = lazy(() => import('./pages/shop/ShopPage'));
const ProductDetailPage = lazy(() => import('./pages/shop/ProductDetailPage'));
const ServiceDetailPage = lazy(() => import('./pages/shop/ServiceDetailPage'));
const DemandBoardPage = lazy(() => import('./pages/demands/DemandBoardPage'));
const DemandDetailPage = lazy(() => import('./pages/demands/DemandDetailPage'));
const PostDemandPage = lazy(() => import('./pages/demands/PostDemandPage'));
const MyDemandsPage = lazy(() => import('./pages/demands/MyDemandsPage'));
const MyMessagesPage = lazy(() => import('./pages/messages/MyMessagesPage'));
const ChatPage = lazy(() => import('./pages/messages/ChatPage'));
const CartPage = lazy(() => import('./pages/checkout/CartPage'));
const CheckoutPage = lazy(() => import('./pages/checkout/CheckoutPage'));
const PaymentCallbackPage = lazy(() => import('./pages/checkout/PaymentCallbackPage'));
const MyAccountPage = lazy(() => import('./pages/account/MyAccountPage'));
const EditAccountPage = lazy(() => import('./pages/account/EditAccountPage'));
const ChangePasswordPage = lazy(() => import('./pages/account/ChangePasswordPage'));
const DeleteAccountPage = lazy(() => import('./pages/account/DeleteAccountPage'));
const MyListingsPage = lazy(() => import('./pages/account/MyListingsPage'));
const PostListingPage = lazy(() => import('./pages/account/PostListingPage'));
const MyOrdersPage = lazy(() => import('./pages/account/MyOrdersPage'));
const MyBookingsPage = lazy(() => import('./pages/account/MyBookingsPage'));
const MySalesPage = lazy(() => import('./pages/account/MySalesPage'));
const VerifyAccountPage = lazy(() => import('./pages/account/VerifyAccountPage'));
const QuoteDetailPage = lazy(() => import('./pages/quotes/QuoteDetailPage'));
const MyQuotesPage = lazy(() => import('./pages/quotes/MyQuotesPage'));
const ReceivedQuotesPage = lazy(() => import('./pages/quotes/ReceivedQuotesPage'));
const PersonalizationWizardPage = lazy(() => import('./pages/onboarding/PersonalizationWizardPage'));
const AdminOverviewPage = lazy(() => import('./pages/admin/AdminOverviewPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminUserDetailPage = lazy(() => import('./pages/admin/AdminUserDetailPage'));
const AdminProductsPage = lazy(() => import('./pages/admin/AdminProductsPage'));
const AdminDemandsPage = lazy(() => import('./pages/admin/AdminDemandsPage'));
const AdminPersonalizationPage = lazy(() => import('./pages/admin/AdminPersonalizationPage'));
const AdminVerificationsPage = lazy(() => import('./pages/admin/AdminVerificationsPage'));
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage'));
const AdminPaymentsPage = lazy(() => import('./pages/admin/AdminPaymentsPage'));
const AdminTransactionsPage = lazy(() => import('./pages/admin/AdminTransactionsPage'));
const AdminPayoutsPage = lazy(() => import('./pages/admin/AdminPayoutsPage'));
const AdminLogisticsPage = lazy(() => import('./pages/admin/AdminLogisticsPage'));
const AdminFlashSalesPage = lazy(() => import('./pages/admin/AdminFlashSalesPage'));
const AdminCouponsPage = lazy(() => import('./pages/admin/AdminCouponsPage'));
const AdminInfluencersPage = lazy(() => import('./pages/admin/AdminInfluencersPage'));
const AdminTicketsPage = lazy(() => import('./pages/admin/AdminTicketsPage'));
const AdminActivityPage = lazy(() => import('./pages/admin/AdminActivityPage'));
const AdminEmailsPage = lazy(() => import('./pages/admin/AdminEmailsPage'));
const AdminCategoriesPage = lazy(() => import('./pages/admin/AdminCategoriesPage'));
const NotFoundPage = lazy(() => import('./pages/info/NotFoundPage'));

function App() {
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />

        <Route path="login" element={<GuestOnlyRoute><LoginPage /></GuestOnlyRoute>} />
        <Route path="register" element={<GuestOnlyRoute><RegisterPage /></GuestOnlyRoute>} />
        <Route path="forgot-password" element={<GuestOnlyRoute><ForgotPasswordPage /></GuestOnlyRoute>} />
        <Route path="reset-password" element={<GuestOnlyRoute><ResetPasswordPage /></GuestOnlyRoute>} />
        {/* Reachable by both guests and signed-in users: the link arrives by email and must work
            regardless of the current session state. */}
        <Route path="verify-email" element={<VerifyEmailPage />} />
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
        <Route path="payment/callback" element={<PaymentCallbackPage />} />

        <Route path="account" element={<ProtectedRoute><MyAccountPage /></ProtectedRoute>} />
        <Route path="account/edit" element={<ProtectedRoute><EditAccountPage /></ProtectedRoute>} />
        <Route path="account/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
        <Route path="account/delete" element={<ProtectedRoute><DeleteAccountPage /></ProtectedRoute>} />
        <Route path="account/my-listings" element={<ProtectedRoute><MyListingsPage /></ProtectedRoute>} />
        <Route path="account/post-listing" element={<ProtectedRoute><PostListingPage /></ProtectedRoute>} />
        <Route path="account/listings/:id/edit" element={<ProtectedRoute><PostListingPage /></ProtectedRoute>} />
        <Route path="account/my-orders" element={<ProtectedRoute><MyOrdersPage /></ProtectedRoute>} />
        <Route path="account/my-bookings" element={<ProtectedRoute><MyBookingsPage /></ProtectedRoute>} />
        <Route path="account/my-sales" element={<ProtectedRoute><MySalesPage /></ProtectedRoute>} />
        <Route path="account/verify" element={<ProtectedRoute><VerifyAccountPage /></ProtectedRoute>} />
        <Route path="account/quotes" element={<ProtectedRoute><MyQuotesPage /></ProtectedRoute>} />
        <Route path="account/quotes/received" element={<ProtectedRoute><ReceivedQuotesPage /></ProtectedRoute>} />
        <Route path="account/quotes/:id" element={<ProtectedRoute><QuoteDetailPage /></ProtectedRoute>} />
        <Route path="onboarding" element={<ProtectedRoute><PersonalizationWizardPage /></ProtectedRoute>} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route element={<RoleProtectedRoute role="admin"><AdminLayout /></RoleProtectedRoute>}>
        <Route path="admin" element={<AdminOverviewPage />} />
        <Route path="admin/users" element={<AdminUsersPage />} />
        <Route path="admin/users/:id" element={<AdminUserDetailPage />} />
        <Route path="admin/products" element={<AdminProductsPage />} />
        <Route path="admin/demands" element={<AdminDemandsPage />} />
        <Route path="admin/personalization" element={<AdminPersonalizationPage />} />
        <Route path="admin/orders" element={<AdminOrdersPage />} />
        <Route path="admin/payments" element={<AdminPaymentsPage />} />
        <Route path="admin/transactions" element={<AdminTransactionsPage />} />
        <Route path="admin/payouts" element={<AdminPayoutsPage />} />
        <Route path="admin/logistics" element={<AdminLogisticsPage />} />
        <Route path="admin/verifications" element={<AdminVerificationsPage />} />
        <Route path="admin/flash-sales" element={<AdminFlashSalesPage />} />
        <Route path="admin/coupons" element={<AdminCouponsPage />} />
        <Route path="admin/influencers" element={<AdminInfluencersPage />} />
        <Route path="admin/tickets" element={<AdminTicketsPage />} />
        <Route path="admin/categories" element={<AdminCategoriesPage />} />
        <Route path="admin/activity" element={<AdminActivityPage />} />
        <Route path="admin/emails" element={<AdminEmailsPage />} />
      </Route>
    </Routes>
    </Suspense>
  );
}

export default App;
