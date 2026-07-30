export type Role = 'farmer' | 'buyer' | 'agro-dealer' | 'service-provider' | 'admin';

export type VerificationStatus = 'unsubmitted' | 'pending' | 'approved' | 'rejected';

export interface VerificationStatusInfo {
  status: VerificationStatus;
  businessName: string | null;
  idNumber: string | null;
  note: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  verified: boolean;
}

export interface PendingVerification {
  userId: string;
  name: string;
  email: string;
  role: Role;
  businessName: string | null;
  idNumber: string | null;
  document: string | null;
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
  customerId: string;
  customerName: string;
  scheduledDate: string;
  serviceLocation: string | null;
  customerNotes: string | null;
  quotedAmount: number;
  status: BookingStatus;
  declineReason: string | null;
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
  buyerPhone: string;
  status: OrderStatus;
  paid: boolean;
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

export interface Ticket {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  userId: string | null;
  status: 'open' | 'closed';
  createdAt: string;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';
