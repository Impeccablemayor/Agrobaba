export type Role = 'farmer' | 'buyer' | 'agro-dealer' | 'service-provider' | 'admin';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export type ListingKind = 'product_sale' | 'service_booking' | 'equipment_sale' | 'equipment_hire' | 'land_lease';

export interface Category {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  section: string;
  level: 1 | 2 | 3;
  allowedListingKinds: ListingKind[];
  sortOrder: number;
  createdBy?: string | null;
  status?: string;
  active?: boolean;
}

export type ProfileStatus = 'not_started' | 'skipped' | 'completed';

export interface TaxonomyOption {
  code: string;
  label: string;
  categoryCodes: string[];
}

export interface PersonalizationTaxonomy {
  enterprises: TaxonomyOption[];
  dealerProductTypes: TaxonomyOption[];
  providerServiceTypes: TaxonomyOption[];
  buyerTypes: TaxonomyOption[];
  buyingPurposes: TaxonomyOption[];
  purposesByBuyerType: Record<string, string[]>;
  buyingPreferences: TaxonomyOption[];
  purchaseScaleOptions: TaxonomyOption[];
  purchaseFrequencyOptions: TaxonomyOption[];
  sourcingAreaOptions: TaxonomyOption[];
  fulfillmentOptions: TaxonomyOption[];
  equipmentServiceIntentOptions: TaxonomyOption[];
  farmerActivities: TaxonomyOption[];
  farmScaleOptions: TaxonomyOption[];
  farmerPreferences: TaxonomyOption[];
  farmerNeedSectionCodes: string[];
  dealerActivities: TaxonomyOption[];
  dealerCustomerTypes: TaxonomyOption[];
  salesModelOptions: TaxonomyOption[];
  restockingFrequencyOptions: TaxonomyOption[];
  sourcingQuantityOptions: TaxonomyOption[];
  localSourcingPreferenceOptions: TaxonomyOption[];
  deliveryNeededOptions: TaxonomyOption[];
  operatingAreaOptions: TaxonomyOption[];
  deliveryCoverageOptions: TaxonomyOption[];
  dealerPreferences: TaxonomyOption[];
  dealerNeedSectionCodes: string[];
  providerEquipmentOptions: TaxonomyOption[];
  serviceDeliveryModeOptions: TaxonomyOption[];
  providerCustomerTypes: TaxonomyOption[];
  serviceOperatingAreaOptions: TaxonomyOption[];
  pricingModelOptions: TaxonomyOption[];
  availabilityOptions: TaxonomyOption[];
  serviceCapacityOptions: TaxonomyOption[];
  providerNeedSectionCodes: string[];
}

export interface RoleDefaults {
  suggestedSectionCodes: string[];
  suggestedListingKinds: ListingKind[];
}

export interface PersonalizationProfile {
  userId: string;
  primaryRole: Role;
  status: ProfileStatus;
  offerGroups: string[];
  offerCategoryCodes: string[];
  offerOther: string[];
  buyerTypes: string[];
  buyerTypeOther: string[];
  buyingPurposes: string[];
  buyingPurposeOther: string[];
  needCategoryCodes: string[];
  needOther: string[];
  preferredListingKinds: ListingKind[];
  buyingPreferences: string[];
  purchaseScale: string | null;
  purchaseFrequency: string | null;
  sourcingAreaPreference: string | null;
  fulfillmentPreference: string | null;
  farmerActivities: string[];
  farmerActivityOther: string[];
  farmScale: string | null;
  farmerPreferences: string[];
  dealerActivities: string[];
  dealerActivityOther: string[];
  dealerCustomerTypes: string[];
  dealerCustomerTypeOther: string[];
  salesModel: string | null;
  restockingFrequency: string | null;
  sourcingQuantity: string | null;
  localSourcingPreference: string | null;
  deliveryNeeded: string | null;
  operatingArea: string | null;
  deliveryCoverage: string | null;
  dealerPreferences: string[];
  providerEquipment: string[];
  providerEquipmentOther: string[];
  serviceDeliveryMode: string[];
  serviceDeliveryModeOther: string[];
  providerCustomerTypes: string[];
  providerCustomerTypeOther: string[];
  serviceOperatingArea: string | null;
  serviceAreaDetails: string[];
  pricingModel: string[];
  availability: string[];
  serviceCapacity: string | null;
  updatedAt: string | null;
  defaults: RoleDefaults;
}

export type VerificationStatus = 'unsubmitted' | 'pending' | 'approved' | 'rejected';

export interface VerificationStatusInfo {
  status: VerificationStatus;
  businessStatus: VerificationStatus | null;
  businessName: string | null;
  idNumber: string | null;
  governmentIdDocument: string | null;
  selfieDocument: string | null;
  farmName: string | null;
  cropsOrLivestock: string | null;
  businessAddress: string | null;
  productCategoriesSold: string | null;
  professionalCertificates: string | null;
  portfolioDocument: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankName: string | null;
  cacNumber: string | null;
  cacDocument: string | null;
  declarationAccepted: boolean;
  note: string | null;
  businessNote: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  businessReviewedAt: string | null;
  verified: boolean;
  businessVerified: boolean;
}

export interface PendingVerification {
  userId: string;
  name: string;
  email: string;
  role: Role;
  status: VerificationStatus;
  businessStatus: VerificationStatus | null;
  businessName: string | null;
  idNumber: string | null;
  governmentIdDocument: string | null;
  selfieDocument: string | null;
  farmName: string | null;
  cropsOrLivestock: string | null;
  businessAddress: string | null;
  productCategoriesSold: string | null;
  professionalCertificates: string | null;
  portfolioDocument: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankName: string | null;
  cacNumber: string | null;
  cacDocument: string | null;
  submittedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  country: string;
  state?: string;
  city: string;
  /** Catalogue-backed State -> City pair chosen from the dropdowns; null while unlinked (legacy
   *  text-only accounts) until the user re-selects both. Always travels as a matched pair. */
  stateId?: number | null;
  cityId?: number | null;
  contact: string;
  address: string;
  businessName?: string;
  bio?: string;
  verified: boolean;
  businessVerified: boolean;
  joinedAt: string;
  avatar: string | null;
}

export type SafeUser = Omit<User, 'password'>;

export type ProductType = 'produce' | 'product' | 'service';

export interface Product {
  id: string;
  name: string;
  description: string;
  /** Null for a negotiated listing with no public price - see `negotiated` below. */
  price: number | null;
  category: string;
  categoryId: string | null;
  categoryCode: string | null;
  listingKind: ListingKind | null;
  type: ProductType;
  size: string;
  quantity: number;
  unit: string;
  location: string;
  image: string | null;
  /** Phase 1 of the Flexible Commerce Architecture roadmap - all optional. Unset on every
   *  listing created before this phase; those keep behaving exactly as before. */
  unitType?: string | null;
  minOrderQuantity?: number | null;
  maxOrderQuantity?: number | null;
  incrementQuantity?: number | null;
  /** Phase 2 of the Flexible Commerce Architecture roadmap - optional bulk price breaks, sorted
   *  ascending by minQuantity. Empty/undefined means "flat price only". */
  priceTiers?: { minQuantity: number; pricePerUnit: number }[];
  /** Negotiated Commerce roadmap - when true, this listing has no fixed public price; buyers
   *  request a quote instead of adding to cart directly. */
  negotiated: boolean;
  sellerId: string;
  sellerName: string;
  sellerRole: Role | 'seed' | string;
  verified: boolean;
  sellerBusinessVerified: boolean;
  rating: number;
  reviews: number;
  sold: number;
  discount: number;
  tags: string[];
  createdAt: string;
  status: 'active' | 'inactive';
  /** Only set on products returned by GET /api/home/recommended - see PersonalizationScoring.explain. */
  recommendationReason?: string | null;
  /** Which RecommendationScorer produced recommendationReason (e.g. "deterministic-v1") - not
   *  rendered anywhere yet, groundwork for comparing scorers once more than one exists. */
  scoringMethod?: string | null;
}

export interface DemandResponse {
  id: string;
  responderId: string;
  responderName: string;
  responderRole: Role;
  message: string;
  price: number | null;
  productId: string | null;
  productName: string | null;
  productImage: string | null;
  productPrice: number | null;
  accepted: boolean;
  orderId: string | null;
  createdAt: string;
}

export interface Demand {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryId: string | null;
  categoryCode: string | null;
  quantity: string;
  budget: number;
  location: string;
  deadline: string;
  buyerId: string;
  buyerName: string;
  buyerRole: Role;
  responses: DemandResponse[];
  status: 'open' | 'closed' | 'matched';
  createdAt: string;
}

export interface QuoteOffer {
  id: string;
  quantity: number;
  pricePerUnit: number;
  deliveryFee: number;
  additionalFees: number;
  notes: string | null;
  total: number;
  expiresAt: string | null;
  createdAt: string;
}

export interface QuoteRequest {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  productUnit: string | null;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  requestedQuantity: number | null;
  buyerNotes: string | null;
  deliveryLocation: string | null;
  status: 'pending' | 'offer_sent' | 'accepted' | 'rejected' | 'cancelled';
  offers: QuoteOffer[];
  createdAt: string;
  updatedAt: string;
}

export interface AcceptedQuote {
  id: string;
  quoteRequestId: string;
  productId: string;
  productName: string;
  productImage: string | null;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  quantity: number;
  unit: string | null;
  pricePerUnit: number;
  deliveryFee: number;
  additionalFees: number;
  total: number;
  status: 'awaiting_checkout' | 'converted';
  orderId: string | null;
  acceptedAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  image: string | null;
  sellerId: string;
  sellerName: string;
  type: ProductType;
  addedAt: string;
  /** Cart Model completion (Flexible Commerce Architecture §4) - a pricing snapshot taken at
   *  add-to-cart time so `price` can be correctly re-resolved if the quantity is edited in-cart,
   *  without a network round-trip. Immutable thereafter, same as `price` itself. */
  unit?: string | null;
  basePrice?: number;
  priceTiers?: { minQuantity: number; pricePerUnit: number }[];
  /** Negotiated Commerce roadmap - when set, this line's price/quantity are locked from an
   *  AcceptedQuote, not live product pricing. The cart renders it read-only. */
  acceptedQuoteId?: string | null;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'confirmed' | 'cancelled';

/** Backend PaymentStatus (see com.agrobaba.entity.enums.PaymentStatus). Only PaymentService
 *  moves a payment through this machine — sellers/admin never write it directly. */
export type PaymentStatus =
  | 'PENDING'
  | 'INITIATED'
  | 'SUCCESS'
  | 'FAILED'
  | 'ABANDONED'
  | 'REVERSED'
  | 'REFUND_PENDING'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED';

export type BookingStatus = 'requested' | 'accepted' | 'declined' | 'paid' | 'in_progress' | 'completed' | 'cancelled';

export interface ServiceBooking {
  id: string;
  serviceId: string;
  serviceName: string;
  providerId: string;
  providerName: string;
  providerContact: string | null;
  providerEmail: string | null;
  customerId: string;
  customerName: string;
  customerContact: string | null;
  customerEmail: string | null;
  scheduledDate: string;
  serviceLocation: string | null;
  customerNotes: string | null;
  quotedAmount: number;
  status: BookingStatus;
  declineReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  reviewerHandle: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  invoiceNumber: string;
  items: CartItem[];
  total: number;
  buyerId: string;
  buyerName: string;
  buyerAddress: string;
  buyerPhone: string | null;
  status: OrderStatus;
  couponCode: string | null;
  discountAmount: number;
  createdAt: string;
  updatedAt: string;
  /** Current payment status for this order (null when no payment attempt exists yet). */
  paymentStatus: PaymentStatus | null;
  /** Gateway reference of the active checkout (null before a checkout was started). */
  paymentReference: string | null;
  /** Authorization URL returned by the gateway when a checkout was just initiated. Null on
   *  list views — the frontend calls POST /api/payments/initialize on demand when the
   *  buyer clicks "Pay now". */
  paymentAuthorizationUrl: string | null;
  /** True when the backend attempted to start a checkout but the gateway was unreachable.
   *  The order itself is still recoverable; the customer can retry payment from the order
   *  detail page. */
  paymentInitializationFailed: boolean;
}

export interface FlashSaleItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  category: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
}

export interface FlashSale {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  items: FlashSaleItem[];
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  content: string;
  productId: string | null;
  productName: string | null;
  demandId: string | null;
  demandTitle: string | null;
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  partnerId: string;
  partnerName: string;
  messages: Message[];
  unread: number;
  lastMessage: Message;
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved';

export interface Ticket {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  userId: string | null;
  status: TicketStatus;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  event: string;
  actor: string;
  detail: string;
  createdAt: string;
}

export interface FlashSaleSoon {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  phase: 'starting' | 'ending';
}

export interface AdminUserMetrics {
  totalUsers: number;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  usersByRole: Record<string, number>;
  emailVerifiedCount: number;
  identityVerifiedCount: number;
  businessVerifiedCount: number;
  suspendedCount: number;
}

export interface AdminListingMetrics {
  activeProducts: number;
  totalProducts: number;
  openDemands: number;
  totalDemands: number;
}

export interface AdminOrderMetrics {
  ordersByStatus: Record<string, number>;
  ordersAwaitingFulfillment: number;
  totalOrders: number;
}

export interface AdminPaymentMetrics {
  successfulPayments: number;
  pendingPayments: number;
  failedPayments: number;
  needsReviewCount: number;
  totalSuccessfulVolume: number;
  volumeLast30Days: number;
  totalRefundedVolume: number;
}

export interface AdminAttentionItem {
  id: string;
  title: string;
  description: string;
  count: number;
  link: string;
  severity: 'warning' | 'danger' | 'info';
}

export interface AdminOverview {
  pendingVerificationsCount: number;
  openTicketsCount: number;
  flashSalesSoon: FlashSaleSoon[];
  recentActions: AuditLogEntry[];
  userMetrics?: AdminUserMetrics;
  listingMetrics?: AdminListingMetrics;
  orderMetrics?: AdminOrderMetrics;
  paymentMetrics?: AdminPaymentMetrics;
  attentionItems?: AdminAttentionItem[];
}

export interface AdminUserSummary {
  id: number;
  name: string;
  publicHandle?: string | null;
  email: string;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED';
  suspendedAt?: string | null;
  suspendedReason?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  contact?: string | null;
  businessName?: string | null;
  emailVerified: boolean;
  identityVerified: boolean;
  businessVerified: boolean;
  createdAt: string;
  lastActiveAt?: string | null;
  listingsCount: number;
  demandsCount: number;
  ordersCount: number;
  transactionsCount: number;
}

export interface AdminVerificationDetail {
  id: number;
  status?: string | null;
  idNumber?: string | null;
  governmentIdDocument?: string | null;
  selfieDocument?: string | null;
  note?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  farmName?: string | null;
  cropsOrLivestock?: string | null;
  businessAddress?: string | null;
  productCategoriesSold?: string | null;
  professionalCertificates?: string | null;
  portfolioDocument?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankName?: string | null;
  declarationAccepted?: boolean;
  cacNumber?: string | null;
  cacDocument?: string | null;
  businessStatus?: string | null;
  businessNote?: string | null;
  businessReviewedAt?: string | null;
}

export interface AdminUserDetail {
  user: AdminUserSummary;
  address?: string | null;
  bio?: string | null;
  avatar?: string | null;
  authProvider?: string | null;
  googleId?: string | null;
  termsAcceptedAt?: string | null;
  termsVersion?: string | null;
  verification?: AdminVerificationDetail | null;
}

export interface AdminUserOrderSummary {
  id: number;
  invoiceNumber: string;
  total: number;
  status: string;
  itemsCount: number;
  buyerName?: string | null;
  buyerPhone?: string | null;
  buyerAddress?: string | null;
  couponCode?: string | null;
  discountAmount?: number | null;
  createdAt: string;
}

export interface AdminRefundSummary {
  id: number;
  amountNaira: number;
  status: string;
  reason?: string | null;
  createdAt: string;
  processedAt?: string | null;
}

export interface AdminUserTransactionSummary {
  id: number;
  orderId: number;
  orderInvoiceNumber?: string | null;
  amountNaira: number;
  currency: string;
  status: string;
  reference?: string | null;
  channel?: string | null;
  provider?: string | null;
  paidAt?: string | null;
  requiresReview: boolean;
  createdAt: string;
  refunds: AdminRefundSummary[];
  attemptsCount: number;
}

export interface AdminDemandBuyerSummary {
  id: number;
  name: string;
  publicHandle?: string | null;
  email: string;
  contact?: string | null;
  verified: boolean;
  businessVerified: boolean;
}

export interface AdminDemandProductSummary {
  id: number;
  name: string;
  price?: number | null;
  status?: string | null;
  image?: string | null;
}

export interface AdminDemandResponseSummary {
  id: number;
  responder?: AdminDemandBuyerSummary | null;
  product?: AdminDemandProductSummary | null;
  message: string;
  price?: number | null;
  accepted: boolean;
  orderId?: number | null;
  createdAt: string;
}

export interface AdminDemandSummary {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  categoryId?: number | null;
  requestedListingKind?: string | null;
  quantity?: string | null;
  budget?: number | null;
  location?: string | null;
  deadline?: string | null;
  status: 'OPEN' | 'CLOSED' | 'MATCHED';
  responsesCount: number;
  buyer?: AdminDemandBuyerSummary | null;
  deleted: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deleteReason?: string | null;
  createdAt: string;
}

export interface AdminDemandDetail {
  demand: AdminDemandSummary;
  responses: AdminDemandResponseSummary[];
}

export interface AdminProductSummary {
  id: number;
  name: string;
  image?: string | null;
  listingType?: string | null;
  category: string;
  categoryId?: number | null;
  price: number;
  currency: string;
  quantity?: number | null;
  unit?: string | null;
  location?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'DRAFT' | string;
  sellerId?: number | null;
  sellerName?: string | null;
  sellerEmail?: string | null;
  sellerPublicHandle?: string | null;
  sellerRole?: string | null;
  sellerVerified: boolean;
  sellerBusinessVerified: boolean;
  createdAt: string;
  updatedAt?: string | null;
  suspendedAt?: string | null;
  suspendedBy?: string | null;
  suspendedReason?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deleteReason?: string | null;
  reportsCount: number;
}

export interface AdminProductRelatedOrder {
  orderId?: number | null;
  invoiceNumber: string;
  buyerId?: number | null;
  buyerName?: string | null;
  quantity: number;
  price: number;
  total: number;
  status?: string | null;
  createdAt?: string | null;
}

export interface AdminProductDetail {
  product: AdminProductSummary;
  description?: string | null;
  images: string[];
  unitType?: string | null;
  minOrderQuantity?: number | null;
  maxOrderQuantity?: number | null;
  incrementQuantity?: number | null;
  negotiated: boolean;
  priceTiers?: Array<{
    minQuantity: number;
    maxQuantity?: number | null;
    unitPrice: number;
  }>;
  tags?: string[];
  relatedOrders: AdminProductRelatedOrder[];
  moderationHistory: AuditLogEntry[];
}

export interface SuspendProductPayload {
  reason: string;
}

export interface DeleteProductPayload {
  reason: string;
}

export interface UpdateAdminProductPayload {
  name: string;
  description?: string;
  price?: number;
  quantity?: number;
  unit?: string;
  location?: string;
  categoryId?: number;
  status?: string;
}

export interface CategoryInterestSummary {
  categoryId: number;
  categoryName: string;
  totalScore: number;
}

export interface AdminPersonalizationOverview {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsLast7Days: number;
  notInterestedCount: number;
  usersWithLearnedInterest: number;
  totalUsers: number;
  topCategoriesByInterest: CategoryInterestSummary[];
}

export interface VerificationHistoryEntry {
  event: string;
  actor: string;
  detail: string;
  createdAt: string;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface EmailMessage {
  id: number;
  providerMessageId?: string | null;
  recipient: string;
  subject: string;
  workflow?: string | null;
  status: 'SENT' | 'DELIVERED' | 'BOUNCED' | 'COMPLAINED' | 'DELAYED' | 'FAILED';
  attempts: number;
  lastErrorCategory?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Phase 1 Internal Logistics Types
// ==========================================

export type FulfillmentType = 'SELLER_MANAGED' | 'AGROBABA_MANAGED';

export type ShipmentStatus =
  | 'ARRANGEMENT_PENDING'
  | 'AWAITING_SELLER_PREPARATION'
  | 'READY_FOR_PICKUP'
  | 'AWAITING_TRANSPORTER_ASSIGNMENT'
  | 'TRANSPORTER_ASSIGNED'
  | 'PICKUP_CONFIRMED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELIVERY_FAILED'
  | 'DELIVERY_EXCEPTION'
  | 'RETURN_IN_PROGRESS'
  | 'RETURNED'
  | 'CANCELLED';

export type ProofOfDeliveryType = 'BUYER_CONFIRMATION' | 'DELIVERY_OTP' | 'SIGNED_RECEIPT' | 'ADMIN_OVERRIDE';

export interface Transporter {
  id: number;
  name: string;
  phone: string;
  altPhone?: string | null;
  email?: string | null;
  operatingLocations?: string | null;
  vehicleType?: string | null;
  cargoTypes?: string | null;
  verificationStatus: string;
  active: boolean;
  operationalNotes?: string | null;
  assignedShipmentsCount: number;
  completedShipmentsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SellerDeliveryProfile {
  id?: number | null;
  sellerId: number;
  providesDelivery: boolean;
  deliveryCoverage: 'LOCAL_ONLY' | 'SELECT_STATES' | 'NATIONWIDE';
  coveredStates?: string | null;
  baseFee: number;
  freeDeliveryThreshold?: number | null;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  pickupAddress?: string | null;
  notes?: string | null;
  updatedAt?: string | null;
}

export interface ShipmentItem {
  id: number;
  orderItemId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface ShipmentEvent {
  id: number;
  status: ShipmentStatus;
  title: string;
  description?: string | null;
  location?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  createdAt: string;
}

export interface DeliveryQuote {
  id: number;
  shipmentId: number;
  quotedAmount: number;
  currency: string;
  quoteSource: string;
  status: string;
  recordedByAdmin: string;
  notes?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export interface Shipment {
  id: number;
  trackingNumber: string;
  orderId?: number | null;
  invoiceNumber?: string | null;
  sellerId: number;
  sellerName: string;
  fulfillmentType: FulfillmentType;
  status: ShipmentStatus;
  transporterId?: number | null;
  transporterName?: string | null;
  transporterPhone?: string | null;
  manualTrackingRef?: string | null;
  pickupAddress?: string | null;
  deliveryAddress?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  deliveryFee: number;
  transporterCost?: number | null;
  deliveryOtp?: string | null;
  estimatedPickupDate?: string | null;
  actualPickupDate?: string | null;
  estimatedDeliveryDate?: string | null;
  actualDeliveryDate?: string | null;
  proofOfDeliveryType?: ProofOfDeliveryType | null;
  proofOfDeliveryNote?: string | null;
  proofOfDeliveryImageUrl?: string | null;
  confirmedBy?: string | null;
  requiresAdminAction: boolean;
  adminActionReason?: string | null;
  items: ShipmentItem[];
  events: ShipmentEvent[];
  quotes: DeliveryQuote[];
  createdAt: string;
  updatedAt: string;
}

export interface LogisticsOverview {
  totalShipments: number;
  arrangementPendingCount: number;
  awaitingSellerPrepCount: number;
  readyForPickupCount: number;
  unassignedReadyForPickupCount: number;
  inTransitCount: number;
  deliveredCount: number;
  failedOrExceptionCount: number;
  overdueDeliveriesCount: number;
  requiresAdminActionCount: number;
}

