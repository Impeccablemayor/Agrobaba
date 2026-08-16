export type Role = 'farmer' | 'buyer' | 'agro-dealer' | 'service-provider' | 'admin';

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
  city: string;
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
  price: number;
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
  price: number;
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
  status: 'open' | 'closed';
  createdAt: string;
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
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'confirmed';

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
  paymentSubmitted: boolean;
  paymentMode: string | null;
  transactionRef: string | null;
  paymentDate: string | null;
  createdAt: string;
  updatedAt: string;
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
  paid: boolean;
  paymentSubmitted: boolean;
  paymentMode: string | null;
  paymentDate: string | null;
  transactionRef: string | null;
  couponCode: string | null;
  discountAmount: number;
  createdAt: string;
  updatedAt: string;
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

export interface PaymentSubmission {
  orderId: string;
  invoiceNumber: string;
  buyerName: string;
  total: number;
  paymentMode: string | null;
  transactionRef: string | null;
  paymentDate: string | null;
}

export interface FlashSaleSoon {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  phase: 'starting' | 'ending';
}

export interface AdminOverview {
  pendingVerificationsCount: number;
  paymentSubmissionsCount: number;
  paymentSubmissions: PaymentSubmission[];
  openTicketsCount: number;
  flashSalesSoon: FlashSaleSoon[];
  recentActions: AuditLogEntry[];
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
