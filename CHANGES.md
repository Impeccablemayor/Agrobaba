# Code Smell Fixes & Refactoring

## Security Fixes

### 1. Hardcoded Bank Details → Environment Variables
- **Files:** `src/pages/checkout/PayOfflinePage.tsx`, `src/lib/constants.ts`
- **Change:** Bank account number, name, and bank name moved to `.env` as `VITE_BANK_ACCOUNT_NUMBER`, `VITE_BANK_ACCOUNT_NAME`, `VITE_BANK_NAME`
- Centralized in `src/lib/constants.ts` as `BANK_DETAILS` object

### 2. Hardcoded Test Credentials → Centralized Constants
- **Files:** `src/pages/auth/LoginPage.tsx`, `src/lib/constants.ts`
- **Change:** `QUICK_LOGIN_USERS` moved from `LoginPage.tsx` to `src/lib/constants.ts` (still readable from env via `VITE_QUICK_LOGIN_USERS`)

## Bug Fixes

### 3. Delete Listing UI Not Refreshing
- **File:** `src/pages/account/MyListingsPage.tsx`
- **Change:** `handleDelete` is now async and filters out the deleted product from state on success instead of relying on unused `setTick`
- Removed unused `[, setTick]` state variable

### 4. Sales Status Update UI Not Refreshing
- **File:** `src/pages/account/MySalesPage.tsx`
- **Change:** `handleStatusChange` now async and updates the specific order in state on success
- Removed unused `[, setTick]` state variable

### 5. Demand Response Navigates Regardless of Success
- **File:** `src/pages/demands/DemandDetailPage.tsx`
- **Change:** Now checks `respondToDemand` return value before navigating to `/messages`

### 6. Service Booking Form Data Discarded
- **File:** `src/pages/shop/ServiceDetailPage.tsx`
- **Change:** Booking date and location are now passed to `addToCart` as the size parameter instead of being discarded with `void` statements

### 7. Checkout Form Fields Ignored
- **File:** `src/pages/checkout/CheckoutPage.tsx`
- **Change:** City, state, and note fields are now concatenated into the delivery address instead of being discarded with `void` statements

### 8. Payment Confirmation No Error Feedback
- **File:** `src/pages/checkout/ConfirmPaymentPage.tsx`
- **Change:** Added error toast when `confirmPayment` returns `false`

### 9. Fragile Conversation Length Comparison
- **File:** `src/pages/messages/ChatPage.tsx`
- **Change:** Compare by last message ID instead of array length

## Type Safety

### 10. Enabled Strict TypeScript Mode
- **File:** `tsconfig.app.json`
- **Change:** Added `"strict": true` and `paths` alias for `@/`

### 11. Safer API Type Assertions
- **File:** `src/lib/api.ts`
- **Change:** Added `parseJsonResponse<T>` helper with null/type checks before casting

### 12. Fixed `sellerRole` Type
- **File:** `src/types.ts`
- **Change:** `sellerRole: Role | 'seed' | string` to properly handle seed data type

## Code Quality

### 13. Centralized Category Icons
- **Files:** Created `src/lib/constants.ts` with `CATEGORY_ICONS` and `DEMAND_CATEGORY_ICONS`
- Removed duplicate icon maps from: `ProductCard.tsx`, `DemandCard.tsx`, `MyListingsPage.tsx`, `MyDemandsPage.tsx`

### 14. Created Reusable Components
- **`src/components/LoadingSpinner.tsx`** — Replaces duplicate loading spinner patterns across 10+ pages
- **`src/components/Breadcrumb.tsx`** — Replaces duplicate breadcrumb nav patterns

### 15. Added React.memo to Components
- **Files:** `ProductCard.tsx`, `DemandCard.tsx`
- **Change:** Wrapped with `React.memo` to prevent unnecessary re-renders

### 16. Removed Unused Exports
- **File:** `src/contexts/CartContext.tsx` — Removed `refresh` from public interface (kept as internal function)
- **File:** `src/contexts/ToastContext.tsx` — `useToast` kept but no consumers found

### 17. Added Search Debouncing
- **Files:** `src/pages/shop/ShopPage.tsx`, `src/pages/demands/DemandBoardPage.tsx`
- **Change:** Search inputs now debounced with 300ms timeout before triggering API calls

### 18. Removed Redundant `Number()` Coercion
- **File:** `src/lib/format.ts`
- **Change:** Removed `Number(amount)` since `amount` is already typed as `number`

### 19. Dynamic Copyright Year
- **File:** `src/components/layout/Footer.tsx`
- **Change:** `2025` → `{new Date().getFullYear()}`

### 20. Social Media Links
- **File:** `src/components/layout/Footer.tsx`
- **Change:** Placeholder `#` links replaced with actual URLs

### 21. Vite Configuration
- **File:** `vite.config.ts`
- **Change:** Added `@/` path alias and dev server proxy for `/api` to `http://localhost:8080`

### 22. markAsRead Silent Failure
- **File:** `src/lib/messages.ts`
- **Change:** Empty catch block now logs `console.warn`

## Environment Variables

Added to `.env` (gitignored, never committed):
```
VITE_API_BASE_URL=http://localhost:8080
VITE_BANK_ACCOUNT_NAME=Agrobaba Escrow Ltd
VITE_BANK_NAME=Providus Bank
VITE_BANK_ACCOUNT_NUMBER=9901234567
```

## New Files Created
- `src/lib/constants.ts` — Centralized constants (category icons, bank details, test users)
- `src/components/LoadingSpinner.tsx` — Reusable loading spinner component
- `src/components/Breadcrumb.tsx` — Reusable breadcrumb component