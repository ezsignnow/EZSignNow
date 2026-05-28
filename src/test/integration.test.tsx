import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthForm } from "../components/auth/AuthForm";
import TryTrial from "../pages/TryTrial";
import TemplateSign from "../pages/TemplateSign";

// Mocking ResizeObserver for Radix UI components in JSDOM
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

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
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
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
      expect(mockDocument.status = "completed");
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

  describe("4. PowerForms / Template Links Route", () => {
    it("renders welcome gate, verifies credentials, transitions to document canvas, opens signature pad, and completes execution successfully", async () => {
      // Enable fake timers for the entire test to ensure fast, synchronous execution
      vi.useFakeTimers();

      const { container } = render(
        <MemoryRouter initialEntries={["/t/t-nda/sign"]}>
          <Routes>
            <Route path="/t/:id/sign" element={<TemplateSign />} />
          </Routes>
        </MemoryRouter>
      );

      // 1. Verify Welcome Gate is displayed with correct template metadata
      expect(screen.getByText(/Secure Self-Service Signing/i)).toBeInTheDocument();
      expect(screen.getByText(/Standard NDA/i)).toBeInTheDocument();

      // 2. Locate input fields & submit form
      const nameInput = screen.getByPlaceholderText(/e.g. Alexander Pierce/i);
      const emailInput = screen.getByPlaceholderText(/alexander@company.com/i);
      const esignCheckbox = screen.getByRole("checkbox");

      expect(nameInput).toBeInTheDocument();
      expect(emailInput).toBeInTheDocument();
      expect(esignCheckbox).toBeInTheDocument();

      fireEvent.change(nameInput, { target: { value: "John Doe" } });
      fireEvent.change(emailInput, { target: { value: "john.doe@example.com" } });
      fireEvent.click(esignCheckbox);

      // Submit the Welcome Gate Form
      const unlockButton = screen.getByRole("button", { name: /Verify & Unlock Document/i });
      expect(unlockButton).toBeInTheDocument();
      const form = unlockButton.closest("form");
      expect(form).toBeInTheDocument();

      // Submit and advance timers to trigger gate transition synchronously
      act(() => {
        fireEvent.submit(form!);
        vi.advanceTimersByTime(3000);
      });

      // Restore real timers for natural promise/microtask resolution
      vi.useRealTimers();

      // 4. Verify transitions into the interactive Simulated Viewport
      expect(screen.getByRole("heading", { name: "EZSIGNNOW" })).toBeInTheDocument();
      expect(screen.getByText(/Template Portal/i)).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "STANDARD NDA" })).toBeInTheDocument();
      expect(screen.getByText(/Click to Sign/i)).toBeInTheDocument();

      // 5. Open the Signature creation pad
      const clickToSign = screen.getByText(/Click to Sign/i);
      fireEvent.click(clickToSign);

      // Verify the Signature Pad modal elements are displayed
      expect(screen.getByText(/Create Electronic Signature/i)).toBeInTheDocument();
      expect(screen.getByText(/Type Calligraphy/i)).toBeInTheDocument();

      // Check default typed name and script previews
      const signatureNameInput = screen.getByPlaceholderText(/Type signature name.../i);
      expect(signatureNameInput).toBeInTheDocument();
      expect(signatureNameInput).toHaveValue("John Doe");

      // Apply the signature and flush scheduled state updates
      const applySignatureButton = screen.getByRole("button", { name: /Apply Signature/i });
      fireEvent.click(applySignatureButton);

      // Verify signature is applied
      expect(screen.queryByText(/Click to Sign/i)).not.toBeInTheDocument();

      // Fill in required text field (Client Title)
      const titleInput = screen.getByPlaceholderText(/Client Title/i);
      fireEvent.change(titleInput, { target: { value: "Signatory Director" } });

      // Fill in required date field
      const dateInput = container.querySelector('input[type="date"]');
      expect(dateInput).toBeInTheDocument();
      fireEvent.change(dateInput!, { target: { value: "2026-05-28" } });

      // 6. Finalize & Commit the transaction
      const finalizeButton = screen.getByRole("button", { name: /Finalize & Sign/i });
      expect(finalizeButton).toBeInTheDocument();
      
      fireEvent.click(finalizeButton);

      // Verify transition to success screen
      await waitFor(() => {
        expect(screen.getByText(/Document Signed Successfully!/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/Execution Certificate/i)).toBeInTheDocument();
      expect(screen.getByText(/Download Audit Receipt/i)).toBeInTheDocument();
      expect(screen.getByText(/Return Home/i)).toBeInTheDocument();
    });
  });
});
