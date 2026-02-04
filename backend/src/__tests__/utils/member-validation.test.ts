/**
 * Unit tests for member validation utilities
 */

import { describe, it, expect } from "vitest";
import {
  validateEmail,
  normalizeEmail,
  validateMemberData,
  validateMemberUpdate,
} from "../../lib/utils/member-validation";
import { MemberValidationError } from "../../lib/errors/member-errors";

describe("Member Validation", () => {
  describe("validateEmail", () => {
    it("should validate correct email addresses", () => {
      expect(validateEmail("test@example.com")).toBe(true);
      expect(validateEmail("user.name@domain.co.uk")).toBe(true);
      expect(validateEmail("user+tag@example.com")).toBe(true);
    });

    it("should reject invalid email addresses", () => {
      expect(validateEmail("invalid-email")).toBe(false);
      expect(validateEmail("@example.com")).toBe(false);
      expect(validateEmail("user@")).toBe(false);
      expect(validateEmail("user@domain")).toBe(false);
      expect(validateEmail("")).toBe(false);
    });
  });

  describe("normalizeEmail", () => {
    it("should lowercase and trim email", () => {
      expect(normalizeEmail("  TEST@EXAMPLE.COM  ")).toBe("test@example.com");
      expect(normalizeEmail("User@Example.Com")).toBe("user@example.com");
      expect(normalizeEmail("test@example.com")).toBe("test@example.com");
    });
  });

  describe("validateMemberData", () => {
    it("should validate correct member data", () => {
      const validData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "401-555-1234",
      };

      expect(() => validateMemberData(validData)).not.toThrow();
    });

    it("should throw error for missing firstName", () => {
      const invalidData = {
        lastName: "Doe",
        email: "john@example.com",
        phone: "401-555-1234",
      } as any;

      expect(() => validateMemberData(invalidData)).toThrow(
        MemberValidationError
      );
      expect(() => validateMemberData(invalidData)).toThrow("First name is required");
    });

    it("should throw error for missing lastName", () => {
      const invalidData = {
        firstName: "John",
        email: "john@example.com",
        phone: "401-555-1234",
      } as any;

      expect(() => validateMemberData(invalidData)).toThrow(
        MemberValidationError
      );
      expect(() => validateMemberData(invalidData)).toThrow("Last name is required");
    });

    it("should throw error for missing email", () => {
      const invalidData = {
        firstName: "John",
        lastName: "Doe",
        phone: "401-555-1234",
      } as any;

      expect(() => validateMemberData(invalidData)).toThrow(
        MemberValidationError
      );
      expect(() => validateMemberData(invalidData)).toThrow("Email is required");
    });

    it("should throw error for invalid email format", () => {
      const invalidData = {
        firstName: "John",
        lastName: "Doe",
        email: "invalid-email",
        phone: "401-555-1234",
      };

      expect(() => validateMemberData(invalidData)).toThrow(
        MemberValidationError
      );
      expect(() => validateMemberData(invalidData)).toThrow("Invalid email format");
    });

    it("should throw error for missing phone", () => {
      const invalidData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      } as any;

      expect(() => validateMemberData(invalidData)).toThrow(
        MemberValidationError
      );
      expect(() => validateMemberData(invalidData)).toThrow("Phone number is required");
    });

    it("should validate dateOfBirth format if provided", () => {
      const validData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "401-555-1234",
        dateOfBirth: "1990-01-15",
      };

      expect(() => validateMemberData(validData)).not.toThrow();
    });

    it("should throw error for invalid dateOfBirth format", () => {
      const invalidData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "401-555-1234",
        dateOfBirth: "01/15/1990",
      };

      expect(() => validateMemberData(invalidData)).toThrow(
        MemberValidationError
      );
      expect(() => validateMemberData(invalidData)).toThrow("YYYY-MM-DD format");
    });
  });

  describe("validateMemberUpdate", () => {
    it("should validate correct update data", () => {
      const validUpdate = {
        firstName: "Jane",
      };

      expect(() => validateMemberUpdate(validUpdate)).not.toThrow();
    });

    it("should throw error for empty firstName", () => {
      const invalidUpdate = {
        firstName: "   ",
      };

      expect(() => validateMemberUpdate(invalidUpdate)).toThrow(
        MemberValidationError
      );
      expect(() => validateMemberUpdate(invalidUpdate)).toThrow("First name cannot be empty");
    });

    it("should throw error for empty lastName", () => {
      const invalidUpdate = {
        lastName: "",
      };

      expect(() => validateMemberUpdate(invalidUpdate)).toThrow(
        MemberValidationError
      );
      expect(() => validateMemberUpdate(invalidUpdate)).toThrow("Last name cannot be empty");
    });

    it("should throw error for invalid email format", () => {
      const invalidUpdate = {
        email: "invalid-email",
      };

      expect(() => validateMemberUpdate(invalidUpdate)).toThrow(
        MemberValidationError
      );
      expect(() => validateMemberUpdate(invalidUpdate)).toThrow("Invalid email format");
    });

    it("should throw error for empty email", () => {
      const invalidUpdate = {
        email: "   ",
      };

      expect(() => validateMemberUpdate(invalidUpdate)).toThrow(
        MemberValidationError
      );
      expect(() => validateMemberUpdate(invalidUpdate)).toThrow("Email cannot be empty");
    });

    it("should throw error for negative penaltyCancellations", () => {
      const invalidUpdate = {
        penaltyCancellations: -1,
      };

      expect(() => validateMemberUpdate(invalidUpdate)).toThrow(
        MemberValidationError
      );
      expect(() => validateMemberUpdate(invalidUpdate)).toThrow("cannot be negative");
    });

    it("should validate dateOfBirth format if provided", () => {
      const validUpdate = {
        dateOfBirth: "1990-01-15",
      };

      expect(() => validateMemberUpdate(validUpdate)).not.toThrow();
    });

    it("should throw error for invalid dateOfBirth format", () => {
      const invalidUpdate = {
        dateOfBirth: "01/15/1990",
      };

      expect(() => validateMemberUpdate(invalidUpdate)).toThrow(
        MemberValidationError
      );
      expect(() => validateMemberUpdate(invalidUpdate)).toThrow("YYYY-MM-DD format");
    });
  });
});
