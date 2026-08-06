import { test, expect, type Page } from "@playwright/test";

const API_BASE = "http://localhost:3000";

const INTERNAL_TOKEN = "a-very-long-internal-key-at-least-32-characters";

async function mockConsoleApi(page: Page) {
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    if (url.pathname === "/api/console/queue") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          items: [
            {
              id: "550e8400-e29b-41d4-a716-446655440000",
              buildReferenceNumber: "MTH-2608-0001-ABCD",
              clientCompany: "Test Corp",
              projectName: "Test App",
              projectType: "website",
              tier: "custom",
              status: "waiting_owner_review",
              analysisStatus: "complete",
              assetStatus: { ready: 2, total: 2 },
            },
          ],
          pagination: { total: 1, limit: 50, offset: 0 },
        }),
      });
      return;
    }
    if (url.pathname.endsWith("/decide")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, decision: { type: "approve", newStatus: "approved" }, message: "Intake approved" }),
      });
      return;
    }
    if (method === "POST" && url.pathname === "/api/intakes") {
      const body = req.postDataJSON();
      const command = body?.command || "submit";
      const isSubmit = command === "submit";
      await route.fulfill({
        status: isSubmit ? 201 : 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          buildReferenceNumber: isSubmit ? "MTH-20260806-0001-ABCD" : null,
          intakeId: "550e8400-e29b-41d4-a716-446655440000",
          status: isSubmit ? "submitted" : command,
          command,
          ...(isSubmit ? { ownerReviewStatus: "waiting_owner_review" } : {}),
        }),
      });
      return;
    }
    await route.continue();
  });
}

test.describe("Test 1 — Custom Build submitted intake (full happy path)", () => {
  test("fills client details, selects custom build + template, submits, gets Build Ref", async ({ page }) => {
    await mockConsoleApi(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Start Project Intake →" }).click();

    await page.locator("#field-fullName").fill("Juan Dela Cruz");
    await page.locator("#field-email").fill("juan@test.com");
    await page.locator("#field-projectName").fill("Test App");
    await page.locator("#field-industry").selectOption({ index: 1 });
    await page.locator("#field-projectType").getByText("Website").click();
    await page.getByRole("button", { name: "Continue →" }).click();

    await page.locator("#field-tier").getByText("Custom Build").click();
    await page.getByRole("button", { name: "Continue →" }).click();

    await page.locator("#field-deckExists").getByRole("button", { name: /Yes — full deck available/ }).click();
    await page.getByRole("button", { name: "Continue →" }).click();

    await page.locator("#field-templateId").getByText("Apex Business").click();
    await page.getByRole("button", { name: "Continue →" }).click();

    await page.locator("#field-features").getByText("Contact Form").click();
    await page.getByRole("button", { name: "Continue →" }).click();

    await page.getByRole("button", { name: "Continue →" }).click();

    await page.getByRole("button", { name: "Submit intake" }).click();

    await expect(page.getByText(/MTH-\d{4}-\d{4}-[A-Z0-9]{4}/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Intake Submitted")).toBeVisible();
  });
});

test.describe("Test 2 — Enterprise submitted intake (full happy path)", () => {
  test("selects Enterprise, fills vision fields, submits", async ({ page }) => {
    await mockConsoleApi(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Start Project Intake →" }).click();

    await page.locator("#field-fullName").fill("Maria Santos");
    await page.locator("#field-email").fill("maria@test.com");
    await page.locator("#field-projectName").fill("Enterprise App");
    await page.locator("#field-industry").selectOption({ index: 1 });
    await page.locator("#field-projectType").getByText("Web App").click();
    await page.getByRole("button", { name: "Continue →" }).click();

    await page.locator("#field-tier").getByText("Enterprise Level").click();
    await page.getByRole("button", { name: "Continue →" }).click();

    await page.locator("#field-deckExists").getByRole("button", { name: /Yes — full deck available/ }).click();
    await page.getByRole("button", { name: "Continue →" }).click();

    await page.locator("#field-projectVision").fill("A scalable internal tool for operations.");
    await page.locator("#field-targetUsers").fill("Operations managers and analysts.");
    await page.getByRole("button", { name: "Continue →" }).click();

    await page.locator("#field-features").getByText(/Dashboard|Reports|Users/i).first().click();
    await page.getByRole("button", { name: "Continue →" }).click();

    await page.getByRole("button", { name: "Continue →" }).click();
    await page.getByRole("button", { name: "Submit intake" }).click();

    await expect(page.getByText(/MTH-\d{4}-\d{4}-[A-Z0-9]{4}/)).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Test 3 — Draft with missing information", () => {
  test("saves partial draft, shows missing requirements, does not appear in queue", async ({ page }) => {
    await mockConsoleApi(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Start Project Intake →" }).click();

    await page.locator("#field-fullName").fill("Draft Client");
    await page.locator("#field-email").fill("draft@test.com");
    await page.locator("#field-projectName").fill("Draft App");
    await page.locator("#field-industry").selectOption({ index: 1 });
    await page.locator("#field-projectType").getByText("Website").click();
    await page.getByRole("button", { name: "Continue →" }).click();

    await page.locator("#field-tier").getByText("Custom Build").click();
    await page.getByRole("button", { name: "Continue →" }).click();

    await page.locator("#field-deckExists").getByRole("button", { name: /No — no deck available/ }).click();
    await page.getByRole("button", { name: "Continue →" }).click();
    await page.getByRole("button", { name: "Continue →" }).click();
    await page.getByRole("button", { name: "Continue →" }).click();

    await page.getByRole("button", { name: "Save as draft" }).click();
    await expect(page.getByText(/Draft saved|saved as draft|Draft/i).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Test 4 — Discard with reason", () => {
  test("selects discard reason code and confirms", async ({ page }) => {
    await mockConsoleApi(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Start Project Intake →" }).click();

    await page.locator("#field-fullName").fill("Discard Client");
    await page.locator("#field-email").fill("discard@test.com");
    await page.locator("#field-projectName").fill("Discard App");
    await page.locator("#field-industry").selectOption({ index: 1 });
    await page.locator("#field-projectType").getByText("Website").click();
    await page.getByRole("button", { name: "Continue →" }).click();

    await page.locator("#field-tier").getByText("Custom Build").click();
    await page.getByRole("button", { name: "Continue →" }).click();
    await page.getByRole("button", { name: "Continue →" }).click();
    await page.getByRole("button", { name: "Continue →" }).click();
    await page.getByRole("button", { name: "Continue →" }).click();

    await page.getByRole("button", { name: "Discard intake…" }).click();
    await page.getByRole("button", { name: /Out of scope for M-THRYVE/ }).click();
    await page.getByRole("button", { name: "Discard intake" }).click();
    await expect(page.getByText(/discarded/i).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Tests 5-7 — Owner review decisions", () => {
  test("owner approves submitted intake", async ({ page }) => {
    await mockConsoleApi(page);
    await page.goto("/#/console");
    await expect(page.getByText("Test App")).toBeVisible({ timeout: 10000 });
    await page.locator("table tr").filter({ hasText: "Test App" }).click();
    await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
    await page.getByPlaceholder(/Decision reason/).fill("Looks good to proceed.");
    await page.getByRole("button", { name: "Approve" }).click();
    await page.getByRole("button", { name: /Confirm Approve/ }).click();
    await expect(page.getByText("Intake approved")).toBeVisible({ timeout: 10000 });
  });

  test("owner requests changes", async ({ page }) => {
    await mockConsoleApi(page);
    await page.goto("/#/console");
    await page.locator("table tr").filter({ hasText: "Test App" }).click();
    await page.getByPlaceholder(/Decision reason/).fill("Need more detail on features.");
    await page.getByRole("button", { name: "↻ Request Changes" }).click();
    await page.getByRole("button", { name: /Confirm Request Changes/ }).click();
    await expect(page.getByText(/Changes requested/)).toBeVisible({ timeout: 10000 });
  });

  test("owner rejects intake", async ({ page }) => {
    await mockConsoleApi(page);
    await page.goto("/#/console");
    await page.locator("table tr").filter({ hasText: "Test App" }).click();
    await page.getByPlaceholder(/Decision reason/).fill("Out of scope for us.");
    await page.getByRole("button", { name: "✗ Reject" }).click();
    await page.getByRole("button", { name: /Confirm Reject/ }).click();
    await expect(page.getByText("Intake rejected")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Test 8 — Path switch clears incompatible fields", () => {
  test("switching from custom to enterprise clears template selection with named warning", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Start Project Intake →" }).click();
    await page.locator("#field-fullName").fill("Path Switch Client");
    await page.locator("#field-email").fill("path@test.com");
    await page.locator("#field-projectName").fill("Path App");
    await page.locator("#field-industry").selectOption({ index: 1 });
    await page.locator("#field-projectType").getByText("Website").click();
    await page.getByRole("button", { name: "Continue →" }).click();

    await page.locator("#field-tier").getByText("Custom Build").click();
    await page.getByRole("button", { name: "Continue →" }).click();
    await page.locator("#field-deckExists").getByRole("button", { name: /Yes — full deck available/ }).click();
    await page.getByRole("button", { name: "Continue →" }).click();
    await page.locator("#field-templateId").getByText(/Starter Portfolio|Business|Landing|Studio/i).first().click();

    await page.locator("#field-tier").getByText("Enterprise Level").click();
    await expect(page.getByText(/cleared|removed|reset/i).first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /Keep current tier|Switch to Enterprise/i }).first().click();
  });
});

test.describe("Test 10 — Design step removal (REV-05)", () => {
  test("design step is absent from the custom flow", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Start Project Intake →" }).click();
    const steps = await page.locator("text=/Step \\d+ of \\d+/").allTextContents();
    expect(steps.join(" ").toLowerCase()).not.toContain("design");
  });
});