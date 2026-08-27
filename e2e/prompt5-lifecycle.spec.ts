import { expect, test, type Page } from "@playwright/test";

const INTAKE_ID = "550e8400-e29b-41d4-a716-446655440005";
const CLIENT_ID = "660e8400-e29b-41d4-a716-446655440005";
const ASSET_ID = "770e8400-e29b-41d4-a716-446655440005";
const REFERENCE_NUMBER = "MTH-2608-0005-UPLD";
const SIGNED_URL = `http://signed-upload.test/${ASSET_ID}`;

const uploadedAsset = {
  assetId: ASSET_ID,
  filename: "brand-guide.pdf",
  mimeType: "application/pdf",
  sizeBytes: 17,
  assetStatus: "uploaded",
  scanStatus: "pending",
  requirementKey: "company-assets",
};

const requiredResources = {
  logo: "available",
  logo_variants: "available",
  brand_colors: "available",
  typography: "available",
  company_deck: "available",
  product_desc: "available",
  required_content: "available",
};

function draftReadResponse() {
  return {
    success: true,
    intake: {
      intakeId: INTAKE_ID,
      clientId: CLIENT_ID,
      referenceNumber: REFERENCE_NUMBER,
      status: "draft",
      outcome: "draft",
      lifecycleStatus: "draft",
      hasBuildCard: false,
      missingRequirements: [],
      uploadedAssets: [uploadedAsset],
      operatorNotes: [
        { kind: "discovery", section: "company-assets", note: "Brand guide confirmed." },
      ],
      payload: {
        client: {
          fullName: "Prompt Five Client",
          company: "Lifecycle Studio",
          email: "prompt5@example.com",
          phone: "+1 555 0105",
        },
        project: {
          projectName: "Prompt Five Website",
          industry: "service-commerce",
          projectType: "templated-website",
          businessDescription: "A service-commerce website used for Prompt 5 lifecycle coverage.",
        },
        tier: "custom",
        buildPath: "custom",
        template: {
          templateId: "apex",
          colorPreset: "original",
        },
        assets: {
          qualification: "provided",
          statuses: requiredResources,
          requestedServices: [],
          uploads: [uploadedAsset],
          deckExists: "no",
          deckSectionNotes: {},
          resourceNotes: {},
          resourceAddOnCosts: {},
        },
        scope: {
          pages: [{ name: "Home", fields: { headline: "Stable rehydrated draft" } }],
          features: [],
          coreFeatures: [
            "Core001", "Core002", "Core003", "Core004",
            "Core005", "Core006", "Core007", "Core008",
          ],
          extensions: ["EXT-001"],
          customFeatures: ["Partner directory pending owner review"],
        },
        design: { styles: [], inspirationLink: "" },
        outcome: "draft",
        missingRequirements: [],
        operatorNotes: [
          { kind: "discovery", section: "company-assets", note: "Brand guide confirmed." },
        ],
        intakeId: INTAKE_ID,
        sourceMetadata: { lastEditedStep: "outcome" },
      },
    },
  };
}

type MockOptions = {
  signedPutStatus?: number;
  confirmationStatus?: number;
  draftReadStatus?: number;
  missingDraftIdentifiers?: boolean;
};

async function installLifecycleMocks(page: Page, options: MockOptions = {}) {
  const calls = {
    draft: 0,
    submit: 0,
    uploadRequest: 0,
    signedPut: 0,
    confirm: 0,
    intakeBodies: [] as Array<Record<string, unknown>>,
  };

  await page.route("http://signed-upload.test/**", async (route) => {
    calls.signedPut += 1;
    await route.fulfill({ status: options.signedPutStatus ?? 200, body: "" });
  });

  await page.route(/^http:\/\/localhost:8443\/api\//, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (status: number, body: unknown) => route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });

    if (request.method() === "GET" && url.pathname === `/api/intakes/${INTAKE_ID}`) {
      if (options.draftReadStatus) {
        await json(options.draftReadStatus, { success: false, error: "Draft read unavailable" });
      } else {
        await json(200, draftReadResponse());
      }
      return;
    }

    if (request.method() === "POST" && url.pathname === "/api/intakes") {
      const body = request.postDataJSON() as Record<string, unknown> & { command?: string };
      calls.intakeBodies.push(body);
      if (body.command === "submit") {
        calls.submit += 1;
        await json(200, {
          success: true,
          intakeId: INTAKE_ID,
          clientId: CLIENT_ID,
          buildReferenceNumber: REFERENCE_NUMBER,
          referenceNumber: REFERENCE_NUMBER,
          status: "submitted",
          outcome: "submitted",
          preliminaryBuildCard: { intakeId: INTAKE_ID },
        });
      } else {
        calls.draft += 1;
        await json(200, options.missingDraftIdentifiers
          ? { success: true, intakeId: INTAKE_ID, status: "draft" }
          : {
              success: true,
              intakeId: INTAKE_ID,
              clientId: CLIENT_ID,
              buildReferenceNumber: REFERENCE_NUMBER,
              referenceNumber: REFERENCE_NUMBER,
              status: "draft",
              outcome: "draft",
              missingRequirements: [],
            });
      }
      return;
    }

    if (request.method() === "POST" && url.pathname === "/api/assets/upload-request") {
      calls.uploadRequest += 1;
      await json(201, {
        assetId: ASSET_ID,
        uploadUrl: SIGNED_URL,
        token: "mock-one-use-token",
        storageKey: `${INTAKE_ID}/${ASSET_ID}/brand-guide.pdf`,
        expiresIn: 900,
      });
      return;
    }

    if (request.method() === "POST" && url.pathname === `/api/assets/${ASSET_ID}/confirm-upload`) {
      calls.confirm += 1;
      if (options.confirmationStatus) {
        await json(options.confirmationStatus, { error: "Storage object could not be confirmed" });
      } else {
        await json(200, uploadedAsset);
      }
      return;
    }

    await json(404, { error: `Unhandled mock route ${request.method()} ${url.pathname}` });
  });

  return calls;
}

async function advanceToCompanyAssets(page: Page) {
  await page.goto("/");
  await page.getByTestId("wizard-next").click();
  await page.locator("#field-tier").getByText("Custom Build", { exact: true }).click();
  await page.getByTestId("wizard-next").click();

  await page.locator("#field-fullName").fill("Prompt Five Client");
  await page.locator("#field-email").fill("prompt5@example.com");
  await page.locator("#field-projectName").fill("Prompt Five Website");
  await page.locator("#field-projectType").getByRole("button", { name: /Templated Website/ }).click();
  await page.locator("#field-industry").selectOption("service-commerce");
  await page.getByTestId("wizard-next").click();
  await expect(page.getByRole("region", { name: "Company assets uploader" })).toBeVisible();
}

async function choosePdf(page: Page) {
  await page.getByLabel("Choose Company assets").setInputFiles({
    name: "brand-guide.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("faithful-pdf-bytes"),
  });
}

test.describe("Prompt 5 browser lifecycle", () => {
  test("new draft uploads, reloads, reopens, continues editing, and submits without re-upload", async ({ page }) => {
    const calls = await installLifecycleMocks(page);
    await advanceToCompanyAssets(page);
    await choosePdf(page);

    await expect(page.getByText("brand-guide.pdf")).toBeVisible();
    await expect(page.getByRole("status", { name: "" }).filter({ hasText: "Uploaded" })).toBeVisible();
    expect(calls.draft).toBe(1);
    expect(calls.uploadRequest).toBe(1);
    expect(calls.signedPut).toBe(1);
    expect(calls.confirm).toBe(1);

    await page.goto(`/?resume=${INTAKE_ID}`);
    await expect(page.getByRole("heading", { name: "Intake Saved as Draft" })).toBeVisible();
    await expect(page.getByText(REFERENCE_NUMBER, { exact: true })).toBeVisible();
    await expect(page.getByText(`${INTAKE_ID}`, { exact: true })).toBeVisible();
    await expect(page.getByText(/1 uploaded asset/)).toBeVisible();
    await expect(page.getByText(/No Build Card has been generated yet/)).toBeVisible();

    await page.getByRole("button", { name: "Continue Editing" }).click();
    await expect(page.getByRole("heading", { name: "How does this call end?" })).toBeVisible();
    await page.getByTestId("outcome-submitted").click();
    await expect(page.getByRole("heading", { name: "Intake Submitted" })).toBeVisible();
    await expect(page.getByText(REFERENCE_NUMBER, { exact: true })).toBeVisible();

    expect(calls.submit).toBe(1);
    expect(calls.uploadRequest).toBe(1);
    expect(calls.signedPut).toBe(1);
    expect(calls.confirm).toBe(1);
  });

  test("invalid file is rejected by client hints before any signed request", async ({ page }) => {
    const calls = await installLifecycleMocks(page);
    await advanceToCompanyAssets(page);
    await page.getByLabel("Choose Company assets").setInputFiles({
      name: "malware.exe",
      mimeType: "application/x-msdownload",
      buffer: Buffer.from("not-an-executable"),
    });

    await expect(page.getByRole("alert").filter({ hasText: "extension is not permitted" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    expect(calls.draft).toBe(0);
    expect(calls.uploadRequest).toBe(0);
  });

  test("signed URL failure exposes the reason and retry action", async ({ page }) => {
    const calls = await installLifecycleMocks(page, { signedPutStatus: 503 });
    await advanceToCompanyAssets(page);
    await choosePdf(page);

    await expect(page.getByRole("alert").filter({ hasText: "Signed upload failed with status 503" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    expect(calls.uploadRequest).toBe(1);
    expect(calls.signedPut).toBe(1);
    expect(calls.confirm).toBe(0);
  });

  test("confirmation failure exposes the server reason and retry action", async ({ page }) => {
    const calls = await installLifecycleMocks(page, { confirmationStatus: 409 });
    await advanceToCompanyAssets(page);
    await choosePdf(page);

    await expect(page.getByRole("alert").filter({ hasText: "Storage object could not be confirmed" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    expect(calls.uploadRequest).toBe(1);
    expect(calls.signedPut).toBe(1);
    expect(calls.confirm).toBe(1);
  });

  test("rehydration failure leaves a recoverable state without replacing the current form", async ({ page }) => {
    await installLifecycleMocks(page, { draftReadStatus: 503 });
    await page.goto(`/?resume=${INTAKE_ID}`);

    await expect(page.getByText("Draft could not be reopened", { exact: true })).toBeVisible();
    await expect(page.getByText("Draft read unavailable")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry reopen" })).toBeVisible();
    await expect(page.getByTestId("wizard-next")).toBeVisible();
  });

  test("path switching after rehydration clears incompatible data and preserves uploads on the next draft save", async ({ page }) => {
    const calls = await installLifecycleMocks(page);
    await page.goto(`/?resume=${INTAKE_ID}`);
    await expect(page.getByRole("heading", { name: "Intake Saved as Draft" })).toBeVisible();

    await page.getByRole("button", { name: "Continue Editing" }).click();
    await page.getByRole("button", { name: /Back to Review/ }).click();
    await page.getByRole("button", { name: "Edit" }).nth(2).click();
    await page.locator("#field-tier").getByRole("button", { name: /Enterprise Level/ }).click();
    await expect(page.getByText("Switch to Enterprise Level?", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Switch to Enterprise Level", exact: true }).click();

    await page.getByTestId("wizard-next").click();
    await page.locator("#field-projectType").getByRole("button", { name: /Website/ }).click();
    await page.getByTestId("wizard-next").click();
    await expect(page.getByText("brand-guide.pdf", { exact: true })).toBeVisible();
    await page.getByTestId("wizard-next").click();

    await page.locator("#field-projectVision").fill("An enterprise website rebuilt after path switching.");
    await page.locator("#field-targetUsers").fill("Procurement teams and service customers.");
    await page.getByTestId("wizard-next").click();
    await page.getByTestId("wizard-next").click();
    await page.getByTestId("wizard-next").click();
    await page.getByTestId("outcome-draft").click();
    await expect(page.getByRole("heading", { name: "Intake Saved as Draft" })).toBeVisible();

    expect(calls.draft).toBe(1);
    const saved = calls.intakeBodies.at(-1) as {
      intake: {
        tier: string;
        project: { projectType: string };
        template?: unknown;
        websiteQuestionnaire?: unknown;
        assets: { uploads: Array<{ assetId: string }> };
      };
    };
    expect(saved.intake.tier).toBe("enterprise");
    expect(saved.intake.project.projectType).toBe("website");
    expect(saved.intake.template).toBeUndefined();
    expect(saved.intake.websiteQuestionnaire).toBeUndefined();
    expect(saved.intake.assets.uploads.map((asset) => asset.assetId)).toEqual([ASSET_ID]);
    expect(calls.uploadRequest).toBe(0);
    expect(calls.signedPut).toBe(0);
  });

  test("missing draft identifiers stop the first upload before requesting a signed URL", async ({ page }) => {
    const calls = await installLifecycleMocks(page, { missingDraftIdentifiers: true });
    await advanceToCompanyAssets(page);
    await choosePdf(page);

    await expect(page.getByRole("alert").filter({ hasText: "draft could not be saved" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    expect(calls.draft).toBe(1);
    expect(calls.uploadRequest).toBe(0);
    expect(calls.signedPut).toBe(0);
  });
});
