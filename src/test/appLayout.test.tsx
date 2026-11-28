import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";

let mockUser: unknown = null;

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser, loading: false, signOut: vi.fn() }),
  isEmailVerified: (u: { email_confirmed_at?: string } | null) => !!u?.email_confirmed_at,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/i18n", () => ({
  useT: () => (key: string) => key,
  LanguageSwitcher: () => null,
}));

const verifiedUser = { id: "u1", email: "owner@example.com", email_confirmed_at: "2026-01-01T00:00:00Z" };

function renderAt(path: string, requireAuth?: boolean) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>login page</div>} />
        <Route
          path="/document/:id/view"
          element={
            <AppLayout requireAuth={requireAuth}>
              <div>signing page</div>
            </AppLayout>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppLayout", () => {
  beforeEach(() => {
    mockUser = null;
  });

  it("shows a public screen to signed-out visitors without the account sidebar", () => {
    renderAt("/document/abc/view", false);
    expect(screen.getByText("signing page")).toBeInTheDocument();
    expect(screen.queryByText("login page")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("EZSignNow dashboard")).not.toBeInTheDocument();
  });

  it("still sends signed-out visitors to /login on protected screens", () => {
    renderAt("/document/abc/view");
    expect(screen.getByText("login page")).toBeInTheDocument();
    expect(screen.queryByText("signing page")).not.toBeInTheDocument();
  });

  it("gives signed-in users the sidebar, with a phone menu button that opens and closes it", () => {
    mockUser = verifiedUser;
    renderAt("/document/abc/view", false);
    expect(screen.getByText("signing page")).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Open menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByTestId("sidebar-backdrop"));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});

describe("App routes", () => {
  it("does not require sign-in for the signing link route", async () => {
    const src = (await import("../App.tsx?raw")).default as string;
    const line = src.split("\n").find((l) => l.includes('path="/document/:id/view"'));
    expect(line).toContain("requireAuth={false}");
  });
});
