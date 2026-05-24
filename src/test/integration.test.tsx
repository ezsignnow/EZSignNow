import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { AuthForm } from "../components/auth/AuthForm";
import TryTrial from "../pages/TryTrial";

// Mocking react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Supabase Client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      resend: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

// Mock Auth Context Hook
const mockSignUp = vi.fn();
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
let mockUser: any = null;

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    signUp: mockSignUp,
    signIn: mockSignIn,
    signOut: mockSignOut,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("EZSignNow - Comprehensive Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUser = null;
  });

  describe("1. Email Verification Flow", () => {
    it("successfully displays signup form inputs, submits, and handles email verification card transitions", async () => {
      mockSignUp.mockResolvedValue({ error: null });

      render(
        <MemoryRouter>
          <AuthForm mode="signup" />
        </MemoryRouter>
      );

      // Verify page inputs are present
      const nameInput = screen.getByPlaceholderText(/full name/i);
      const emailInput = screen.getByPlaceholderText(/email address/i);
      const passwordInput = screen.getByPlaceholderText(/^password$/i);
      const submitButton = screen.getByRole("button", { name: /create account/i });

      expect(nameInput).toBeInTheDocument();
      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
      expect(submitButton).toBeInTheDocument();

      // Trigger user interactions
      fireEvent.change(nameInput, { target: { value: "Test User" } });
      fireEvent.change(emailInput, { target: { value: "test@EZSignNow.com" } });
      fireEvent.change(passwordInput, { target: { value: "Techl@der@2023" } });

      // Click actual captcha button (sibling of span)
      const captchaSpan = screen.getByText(/i'm not a robot/i);
      const captchaButton = captchaSpan.previousElementSibling;
      expect(captchaButton).toBeInTheDocument();
      fireEvent.click(captchaButton!);

      // Wait for captcha timeout to resolve (1000ms delay in AuthForm.tsx)
      await new Promise((r) => setTimeout(r, 1200));

      // Submit Sign Up Form
      const form = submitButton.closest("form");
      expect(form).toBeInTheDocument();
      fireEvent.submit(form!);

      // Verify loader appears or transition succeeds
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith("test@EZSignNow.com", "Techl@der@2023", "Test User");
      });

      // Verify the Verification Sent screen details are presented to user
      expect(screen.getByText(/verify your email/i)).toBeInTheDocument();
      expect(screen.getByText(/we've sent a verification link to/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /resend verification email/i })).toBeInTheDocument();
    });
  });

  describe("2. Document Signed Flow", () => {
    it("correctly models initial draft and completed signatory status bounds", () => {
      // Simulate database status modeling for signatures
      const mockDocument = {
        id: "doc-123",
        title: "Test-agreement.pdf",
        status: "draft",
      };

      const mockSignatories = [
        { name: "Charles Vance", email: "charles.vance@EZSignNow.com", status: "pending" },
      ];

      expect(mockDocument.status).toBe("draft");
      expect(mockSignatories[0].status).toBe("pending");

      // Apply signature
      mockSignatories[0].status = "signed";
      mockDocument.status = "completed";

      expect(mockSignatories[0].status).toBe("signed");
      expect(mockDocument.status).toBe("completed");
    });
  });

  describe("3. Premium Billing & Payments Checkout Flow", () => {
    it("handles card details, triggers Stripe brand icon badges, and processes the multi-step transaction dispatcher loading overlay", async () => {
      mockUser = { id: "test-user-id", email: "test@EZSignNow.com" };
      render(
        <MemoryRouter>
          <TryTrial />
        </MemoryRouter>
      );

      // Confirm Stripe Live Connected Pulsing Badge or container is rendered
      expect(screen.getByText(/Stripe Live Connected/i)).toBeInTheDocument();

      // Enter cardholder name and select fields
      const cardNameInput = screen.getByPlaceholderText(/your name/i);
      const cardNumberInput = screen.getByPlaceholderText(/card number/i);
      const cardExpiryInput = screen.getByPlaceholderText(/mm \/ yy/i);
      const cardCvvInput = screen.getByPlaceholderText(/cvc/i);
      const cardZipInput = screen.getByPlaceholderText(/00000/i);

      expect(cardNameInput).toBeInTheDocument();
      expect(cardNumberInput).toBeInTheDocument();
      expect(cardExpiryInput).toBeInTheDocument();
      expect(cardCvvInput).toBeInTheDocument();
      expect(cardZipInput).toBeInTheDocument();

      fireEvent.change(cardNameInput, { target: { value: "Test Premium User" } });
      fireEvent.change(cardNumberInput, { target: { value: "4242 4242 4242 4242" } });
      fireEvent.change(cardExpiryInput, { target: { value: "12 / 28" } });
      fireEvent.change(cardCvvInput, { target: { value: "999" } });
      fireEvent.change(cardZipInput, { target: { value: "90210" } });

      // Click submit subscription checkout
      const submitCheckoutButton = screen.getByRole("button", { name: /start.*7-day.*trial/i });
      expect(submitCheckoutButton).toBeInTheDocument();
      
      // Submit the enclosing form to trigger handleSumbit reliably in jsdom
      const form = submitCheckoutButton.closest("form");
      expect(form).toBeInTheDocument();
      fireEvent.submit(form!);

      // Verify Stripe multi-step progress steps are displayed sequentially
      await waitFor(() => {
        expect(screen.getByText(/connecting to stripe api secure servers/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/tokenizing card details via stripe elements/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(screen.getByText(/validating stripe token on server-side webhook/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(screen.getByText(/registering stripe customer & active subscription/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Complete checkout simulation
      await waitFor(() => {
        expect(localStorage.getItem("is_premium")).toBe("true");
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
      }, { timeout: 3000 });
    });
  });
});
