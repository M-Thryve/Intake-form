# PROMPT_3_COMPLETION_REPORT

## Status: COMPLETE

All Prompt 3 deliverables implemented, type-checked, tested, and built.

---

## Files Changed

### Frontend

| File | Change |
|------|--------|
| `src/App.tsx` | Added `CORE_FEATURES, EXTENSIONS, FEATURE_CATEGORIES` imports; added `extensionCategoryFilter` state; removed `FEATURE_CHIPS` and `FEATURE_PRIORITY_OPTIONS` constants; added Factory Core Features panel to `template-select` step (both ai-assisted and templated-website paths); replaced `pages-features` chip/priority UI with extension catalog (category dropdown + extension cards + custom requests); rewrote `review` step (core features block, AI-Assisted questionnaire in 7 groups, extensions by code+name, custom requests as unconfirmed); updated build card scope display (core features + extensions + custom requests); updated `complexity` to use `selectedExtensions` |
| `src/api/intake.ts` | Added `customFeatures: formData.customFeatures ?? []` to `scope` in `toSubmissionPayload` |
| `src/types/intake.ts` | Added `customFeatures?: string[]` to `IntakeScopePayload` scope block |
| `src/data/features.ts` | No changes — was already complete |
| `src/data/questionnaire.ts` | No changes — was already complete |

### Server

| File | Change |
|------|--------|
| `server/src/lib/features.ts` | Added `CORE_FEATURE_NAMES` and `EXTENSION_NAMES` maps for build card name resolution |
| `server/src/lib/validation.ts` | Added `customFeatures: z.array(z.string()).default([])` to both `scopeSubmitSchema` and `scopeDraftSchema` |
| `server/src/routes/intakes.ts` | Imported `CORE_FEATURE_CODE_LIST`, `CORE_FEATURE_NAMES`, `EXTENSION_CODES`, `EXTENSION_NAMES`, `V3_CUSTOM_PROJECT_TYPES`; added server-side core feature injection (always overrides client with canonical Core001–Core008); added `intake_scope_items` persistence (core_feature, extension, custom_request rows, idempotent upsert); added `intake_website_questionnaire` persistence for ai-assisted-website; added `scope` block to `preliminaryBuildCard` in submit response; added `customFeatures` to `coerceDraftForPersistence` |

### Tests

| File | Change |
|------|--------|
| `src/__tests__/phase5b-inline-validation.test.tsx` | Removed click on `Authentication` chip (no longer in UI) — extensions are optional, no click needed |
| `src/__tests__/inline-validation.integration.test.tsx` | Replaced `#field-features` chip test with extension catalog assertion (category dropdown present, `Contact Forms` card present, no required-feature warning) |
| `server/src/__tests__/lifecycle.test.ts` | Added `upsert: mockUpsert` to `fromMock` return value |
| `server/src/__tests__/e2e-intake-lifecycle.test.ts` | Added `upsert: vi.fn().mockResolvedValue(...)` to `appSupabase.from` mock |

---

## Command Results

```
npm run type-check      → clean (0 errors)
npm --prefix server run build → clean (0 errors)
npm test                → 16 test files, 158 tests passed
npm --prefix server test → 24 test files, 325 tests passed
npm run build           → dist built in 2.69s
```

---

## Acceptance Criteria Coverage

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Both Custom Build types display all 8 core features | ✓ Factory Core Features panel at top of `template-select` for both project types |
| 2 | All 13 categories in dropdown, empty categories show required message | ✓ `extensionCategoryFilter` state + empty-state UI |
| 3 | Extension selection optional, category filter ephemeral | ✓ `Continue` always enabled, `extensionCategoryFilter` is local UI state |
| 4 | EXT-001..EXT-011 accepted; unknown codes rejected on submit | ✓ Server `EXTENSION_CODES` validation (existing in validation.ts, unchanged) |
| 5 | Server injects Core001–Core008 regardless of client payload | ✓ `CORE_FEATURE_CODE_LIST` upserted server-side unconditionally for custom builds |
| 6 | Scope persistence writes rows idempotently | ✓ `upsert` with `onConflict: "intake_id,item_kind,item_code"` |
| 7 | Questionnaire persisted to `intake_website_questionnaire` for AI-Assisted | ✓ Conditional on `projectType === "ai-assisted-website"` |
| 8 | AI-Assisted review renders answers in 7 canonical groups | ✓ `QUESTIONNAIRE_GROUP_ORDER` loop in review step |
| 9 | Templated review never shows questionnaire; AI-Assisted never shows template fields | ✓ `projectType === 'templated-website'` guard on questionnaire block; template fields only shown for `templated-website` |
| 10 | Review and Build Card list core features + extensions without priority/cost | ✓ Code+name only, no priority or cost fields anywhere |
| 11 | No Build Card for draft or discarded outcomes | ✓ `preliminaryBuildCard` only in `isSubmitted` branch |
| 12 | Legacy records with priorities remain readable | ✓ `fromLegacyPayload` and `intake_features.priority` column untouched |

---

## Invariants Preserved

- Prompt 1/2 invariants: Custom Build permits only `templated-website` and `ai-assisted-website`; seven canonical industries; AI-Assisted payloads omit template block; Templated payloads omit `websiteQuestionnaire`; path-switch clearing works.
- `fromLegacyPayload` compatibility mapper untouched.
- `featurePriorities` field remains in `FormData` type (deprecated marker) for legacy reads — removed from all active UI flows.
- Prompt 4 (draft navigation, lifecycle outbox) and Prompt 5 (asset uploads, draft rehydration) not implemented.
