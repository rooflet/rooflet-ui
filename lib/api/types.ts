export type PropertyType =
  | "SINGLE_FAMILY"
  | "CONDO"
  | "TOWN_HOUSE"
  | "MULTI_FAMILY";

export type ExpenseCategory =
  | "REPAIRS_MAINTENANCE"
  | "UTILITIES"
  | "PROPERTY_MANAGEMENT"
  | "INSURANCE"
  | "PROPERTY_TAX"
  | "HOA_FEES"
  | "LEGAL"
  | "PROFESSIONAL_SERVICES"
  | "LANDSCAPING"
  | "CLEANING"
  | "CAPITAL_IMPROVEMENTS"
  | "MARKETING"
  | "OTHER";

export interface PropertyResponse {
  id: string; // format: uuid
  ownerId: string; // format: uuid
  ownerName: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: PropertyType;
  bedrooms?: number; // format: int32
  bathrooms?: number;
  squareFeet?: number; // format: int32
  marketValue?: number;
  purchasePrice?: number;
  purchaseDate?: string; // format: date
  debt?: number;
  interestRate?: number;
  monthlyHoa?: number;
  monthlyPropertyTax?: number;
  monthlyInsurance?: number;
  notes?: string;
  archived: boolean;
  createdAt: string; // format: date-time
  updatedAt: string; // format: date-time
}

export interface CreatePropertyRequest {
  ownerId: string; // required, format: uuid
  address1: string; // maxLength: 255, required
  address2?: string; // maxLength: 255
  city: string; // maxLength: 100, required
  state: string; // maxLength: 2, minLength: 2, required, pattern for US states
  zipCode: string; // maxLength: 10, required
  propertyType: PropertyType; // required
  bedrooms?: number; // format: int32
  bathrooms?: number;
  squareFeet?: number; // format: int32
  marketValue?: number;
  purchasePrice?: number;
  purchaseDate?: string; // format: date
  debt?: number;
  interestRate?: number;
  monthlyHoa?: number;
  monthlyPropertyTax?: number;
  monthlyInsurance?: number;
  notes?: string;
}

export interface UpdatePropertyRequest {
  address1?: string; // maxLength: 255
  address2?: string; // maxLength: 255
  city?: string; // maxLength: 100
  state?: string; // maxLength: 2, minLength: 2
  zipCode?: string; // maxLength: 10
  propertyType?: PropertyType;
  bedrooms?: number; // format: int32
  bathrooms?: number;
  squareFeet?: number; // format: int32
  marketValue?: number;
  purchasePrice?: number;
  purchaseDate?: string; // format: date
  debt?: number;
  interestRate?: number;
  monthlyHoa?: number;
  monthlyPropertyTax?: number;
  monthlyInsurance?: number;
  notes?: string;
  archived?: boolean;
}

export interface TenantResponse {
  id: string; // format: uuid
  name: string;
  email?: string;
  phoneNumber?: string;
  propertyId?: string; // format: uuid
  propertyAddress?: string;
  leaseStartDate?: string; // format: date
  leaseEndDate?: string; // format: date
  monthlyRent?: number;
  archived: boolean;
  createdAt: string; // format: date-time
  updatedAt: string; // format: date-time
}

export interface CreateTenantRequest {
  name: string; // maxLength: 255
  email?: string;
  phoneNumber?: string; // maxLength: 20, pattern: "^[0-9]+$"
  propertyId?: string; // format: uuid
  leaseStartDate?: string; // format: date
  leaseEndDate?: string; // format: date
  monthlyRent: number; // minimum: 0.01, required
}

export interface UpdateTenantRequest {
  name?: string; // maxLength: 255
  email?: string;
  phoneNumber?: string; // maxLength: 20
  propertyId?: string; // format: uuid
  leaseStartDate?: string; // format: date
  leaseEndDate?: string; // format: date
  monthlyRent?: number;
  archived?: boolean;
}

export interface RentCollectionResponse {
  id: string; // format: uuid
  propertyId: string; // format: uuid
  propertyAddress: string;
  tenantId: string; // format: uuid
  tenantName: string;
  expectedAmount: number;
  paidAmount: number;
  paymentDate?: string; // format: date
  notes?: string;
  createdAt: string; // format: date-time
  updatedAt: string; // format: date-time
}

export interface CreateRentCollectionRequest {
  propertyId: string; // required, format: uuid
  tenantId: string; // required, format: uuid
  expectedAmount: number; // required
  paidAmount?: number; // defaults to 0
  paymentDate?: string; // format: date
  notes?: string;
}

export interface UpdateRentCollectionRequest {
  expectedAmount?: number;
  paidAmount?: number;
  paymentDate?: string; // format: date
  notes?: string;
}

// Add payment uses a generic object type as per API spec
export interface AddPaymentRequest {
  [key: string]: any;
}

export interface RentCollectionItemRequest {
  paymentDate: string; // required, format: date - Date for this rent collection period (typically first of the month)
  expectedAmount?: number; // Expected rent amount for this period (defaults to tenant's monthly rent)
  paidAmount?: number; // Amount paid for this period (defaults to 0)
  notes?: string; // Optional notes for this specific period
}

export interface BulkCreateRentCollectionsRequest {
  tenantId: string; // required, format: uuid - Tenant ID for whom to create rent collections
  items: RentCollectionItemRequest[]; // required - List of individual rent collection items with specific amounts and dates
}

export interface ExpenseResponse {
  id: string; // format: uuid
  propertyId?: string; // format: uuid
  propertyAddress?: string;
  expenseDate: string; // format: date
  category: ExpenseCategory;
  categoryDisplayName: string;
  amount: number;
  description?: string;
  createdAt: string; // format: date-time
  updatedAt: string; // format: date-time
}

export interface CreateExpenseRequest {
  propertyId?: string; // format: uuid
  expenseDate: string; // required, format: date
  category: ExpenseCategory; // required
  amount: number; // required
  description?: string;
}

export interface UpdateExpenseRequest {
  propertyId?: string; // format: uuid
  expenseDate?: string; // format: date
  category?: ExpenseCategory;
  amount?: number;
  description?: string;
}

export interface RentCollectionTotals {
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
}

// User Management types
export interface UserResponse {
  id: string; // format: uuid
  fullName: string;
  email: string;
  createdAt: string; // format: date-time
  updatedAt: string; // format: date-time
  activePortfolioId?: string; // format: uuid
  activePortfolioName?: string;
}

export interface CreateUserRequest {
  fullName: string; // required, maxLength: 100
  email: string; // required
  password: string; // required, minLength: 8
}

export interface UpdateUserRequest {
  fullName: string; // required, maxLength: 100
  email: string; // required
}

export interface UpdatePasswordRequest {
  currentPassword: string; // required
  newPassword: string; // required, minLength: 8
  confirmPassword: string; // required
}

export interface LoginRequest {
  email: string; // required
  password: string; // required
}

export interface LoginResponse {
  userId: string; // format: uuid
  fullName: string;
  email: string;
  loginTime: string; // format: date-time
  message: string;
}

// Feedback types
export interface FeedbackRequest {
  feedbackType: string; // required
  message: string; // required
  currentPage: string; // required
}

export interface MessageResponse {
  message: string;
}

// Actuator Link type
export interface Link {
  href: string;
  templated?: boolean;
}

// Error Response types
export interface FieldError {
  field: string; // Field name that failed validation
  rejectedValue?: any; // Rejected value
  message: string; // Validation error message
}

export interface ErrorResponse {
  status: number; // HTTP status code, format: int32
  message: string; // Error message
  details?: string; // Detailed error information
  fieldErrors?: FieldError[]; // List of validation errors
  timestamp: string; // Timestamp when the error occurred, format: date-time
  path: string; // Request path that caused the error
}

// Legacy User type for backward compatibility
export interface User {
  id: string; // format: uuid
  email: string;
  fullName: string;
  role?: string;
}

// Portfolio Management types
export type PortfolioRole = "OWNER" | "MANAGER" | "VIEWER";

export interface PortfolioResponse {
  id: string; // format: uuid
  name: string;
  description?: string;
  archived: boolean;
  createdAt: string; // format: date-time
  updatedAt: string; // format: date-time
}

export interface CreatePortfolioRequest {
  name: string; // required
  description?: string;
}

export interface UpdatePortfolioRequest {
  name?: string;
  description?: string;
}

export interface PortfolioMemberResponse {
  id: string; // format: uuid
  portfolioId: string; // format: uuid
  userId: string; // format: uuid
  userEmail: string;
  userFullName: string;
  role: PortfolioRole;
  createdAt: string; // format: date-time
}

export interface AddPortfolioMemberRequest {
  email: string; // required
  role: PortfolioRole; // required
}

export interface UpdatePortfolioMemberRoleRequest {
  role: PortfolioRole; // required
}
