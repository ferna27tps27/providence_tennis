/**
 * Member type definitions for MVP implementation
 */

export interface Member {
  // Core Identity (Required)
  id: string;                    // Unique identifier (timestamp-based)
  memberNumber: string;          // Display number (e.g., "MEM-0001")
  firstName: string;             // First name
  lastName: string;              // Last name
  email: string;                 // Email (unique, used for login)
  phone: string;                 // Phone number
  isActive: boolean;             // Active/inactive status (default: true)
  createdAt: string;             // ISO 8601 timestamp
  lastModified: string;          // ISO 8601 timestamp
  
  // Personal Information (Optional)
  dateOfBirth?: string;          // Date of birth (YYYY-MM-DD)
  gender?: string;               // Gender (e.g., "Male", "Female", "Other")
  address?: string;              // Address as single string (simplified)
  
  // Account Settings
  penaltyCancellations?: number; // Count of penalty cancellations (default: 0)
  notes?: string;                // Internal notes about member
  unsubscribeEmail?: boolean;    // Unsubscribe from emails (default: false)
  
  // Authentication Fields (Phase 1)
  passwordHash?: string;          // Hashed password (bcrypt)
  emailVerified?: boolean;       // Email verification status (default: false)
  
  // Role Management (Phase 2)
  role?: "player" | "coach" | "parent" | "admin"; // Member role (default: "player")
  
  // Custom Fields (Tennis-specific)
  ntrpRating?: string;           // Tennis rating (e.g., "4.5")
  ustaNumber?: string;           // USTA number
}

export interface MemberRequest {
  // Required for creation
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isActive?: boolean;            // Default: true
  
  // Optional fields
  memberNumber?: string;         // Auto-generated if not provided
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  notes?: string;
  ntrpRating?: string;
  ustaNumber?: string;
  password?: string;              // Password for signup (will be hashed)
  role?: "player" | "coach" | "parent" | "admin"; // Member role (default: "player")
}

export interface MemberFilter {
  status?: "all" | "active" | "inactive";
  search?: string;                // Search by name, email, phone, member number
}
