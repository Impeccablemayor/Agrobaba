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

export interface VerificationHistoryEntry {
  event: string;
  actor: string;
  detail: string;
  createdAt: string;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';
