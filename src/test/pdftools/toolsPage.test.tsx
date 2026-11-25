import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import PdfTools from "@/pages/PdfTools";
import { GROUPS, additionalSections } from "@/lib/pdftools/catalog";
import { TOOLS } from "@/lib/pdftools/registry";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u", email: "sri@example.com", user_metadata: { full_name: "Sridharan Udayakumar" } } }) }));

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}</div>;
}

const renderPage = (url = "/tools") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/tools" element={<><PdfTools /><Where /></>} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

const cards = () => Array.from(document.querySelectorAll<HTMLElement>("[data-tool-card]")).map((c) => c.dataset.toolId!);

describe("PDF Tools page", () => {
  it("greets the user and shows every feature as a card on the right", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Hi Sridharan Udayakumar, let.s get started/);
    expect(cards()).toHaveLength(33);
    expect(new Set(cards()).size).toBe(33);
    const grid = document.querySelector("[data-tool-grid]")!;
    expect(within(grid as HTMLElement).getByText("Create a workflow")).toBeInTheDocument();
    // New badges are shown on the recent additions.
    const redact = document.querySelector('[data-tool-id="redact"]')!;
    expect(within(redact as HTMLElement).getByText("New")).toBeInTheDocument();
    expect(within(document.querySelector('[data-tool-id="merge"]') as HTMLElement).queryByText("New")).toBeNull();
  });

  it("lists everything else in the left Additional features menu", () => {
    renderPage();
    const menu = screen.getByRole("complementary", { name: "Additional features" });
    expect(within(menu).getByText("Additional features")).toBeInTheDocument();
    const expected = additionalSections().flatMap((s) => s.tools.map((t) => t.id));
    expect(expected.length).toBeGreaterThanOrEqual(15);
    const shown = Array.from(menu.querySelectorAll<HTMLElement>("[data-menu-link]")).map((l) => l.dataset.toolId);
    for (const id of expected) expect(shown).toContain(id);
    // The menu never repeats a main feature.
    expect(shown).not.toContain("merge");
    expect(within(menu).getByText("Bates Numbering")).toBeInTheDocument();
    expect(within(menu).getByText("Workflows")).toBeInTheDocument();
  });

  it("filters the grid by category and keeps the choice in the address", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "PDF Intelligence" }));
    expect(cards()).toEqual(["ai-summarizer", "translate-pdf", "pdf-to-markdown"]);
    expect(screen.getByTestId("where").textContent).toBe("/tools?group=intelligence");
    expect(document.querySelector("[data-workflow-card]")).toBeNull();
    expect(screen.getByRole("button", { name: "PDF Intelligence" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(cards()).toHaveLength(33);
    expect(screen.getByTestId("where").textContent).toBe("/tools");
  });

  it("opens straight onto a category from the address, with one pill per iLovePDF family", () => {
    renderPage("/tools?group=security");
    expect(cards().sort()).toEqual(["compare", "fill-sign", "protect", "redact", "unlock"]);
    for (const g of GROUPS) expect(screen.getByRole("button", { name: g.name })).toBeInTheDocument();
    const workflowLinks = screen.getAllByRole("link", { name: "Workflows" }); // the pill and the menu entry
    expect(workflowLinks.length).toBeGreaterThanOrEqual(1);
    for (const l of workflowLinks) expect(l).toHaveAttribute("href", "/tools/workflows");
  });

  it("searches across all tools, including the ones that only live in the menu", () => {
    renderPage();
    const box = screen.getByLabelText("Search tools");
    fireEvent.change(box, { target: { value: "bates" } });
    expect(cards()).toEqual(["bates"]);
    expect(screen.queryByRole("complementary", { name: "Additional features" })).toBeNull();
    expect(screen.getByText(/1 result for/)).toBeInTheDocument();
    fireEvent.change(box, { target: { value: "zzzz-nothing" } });
    expect(cards()).toEqual([]);
    expect(screen.getByText(/No tools match/)).toBeInTheDocument();
    fireEvent.change(box, { target: { value: "" } });
    expect(cards()).toHaveLength(33);
  });

  it("links each card to its tool page", () => {
    renderPage();
    expect(document.querySelector('[data-tool-id="merge"]')).toHaveAttribute("href", "/tools/merge");
    expect(document.querySelector('[data-tool-id="edit"]')).toHaveAttribute("href", "/edit");
    expect(document.querySelector('[data-tool-id="scan-to-pdf"]')).toHaveAttribute("href", "/tools/scan-to-pdf");
    for (const t of TOOLS) expect(t.route ?? `/tools/${t.id}`).toMatch(/^\//);
  });
});
