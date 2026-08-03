Make a targeted update to the existing M-THRYVE AI Software Project Intake.

IMPORTANT:

- Do not redesign the application.
- Do not change the existing visual style.
- Do not change the color system, typography, spacing, cards, buttons, header, progress indicator, animations, or overall layout.
- Do not rewrite unrelated copy.
- Do not remove the current intake steps.
- Preserve the existing client-information screen and all currently working interactions.
- Add only the tier-selection change and the conditional content described below.

PLACEMENT

Insert one new step immediately after “Client Information” and before “Business & Project” and “Industry.”

The revised beginning is:

1. Welcome
2. Client Information
3. Choose Your Build Tier — NEW
4. Continue to tier-specific content
5. Preserve the existing review and submission experience

Match the new screen exactly to the existing UI:

- Same dark M-THRYVE background
- Same card style
- Same teal accent
- Same typography
- Same content width
- Same Back and Continue buttons
- Same progress-header treatment
- Same transitions

NEW SCREEN — CHOOSE YOUR BUILD TIER

Heading:

Choose your build approach

Supporting text:

Select the level of customization that best matches your project, timeline, and budget.

Add three clear selection cards.

1. TEMPLATE / DRAG-AND-DROP

Label:

Most Affordable

Description:

Choose an existing M-THRYVE template and replace its predefined content.

Rules:

- Select from a gallery of pre-made templates, similar to choosing a Canva template.
- Replace text, images, logo, contact details, products, and approved content fields.
- Choose from approved color presets where supported.
- No custom layouts.
- No custom pages.
- No custom features.
- No custom workflows.
- No structural customization.

After selection, show template-specific content:

- Template category
- Template gallery
- Desktop/mobile preview
- Included pages
- Included features
- Content and asset upload
- Approved color presets
- Preferred launch date
- Budget confirmation

Do not show the existing Project Vision or custom-feature steps for this tier.

If customization is requested, show:

“Custom changes are not available in the Template tier. Choose Custom Made for limited modifications.”

2. CUSTOM MADE

Label:

Limited Customization

Description:

Choose an existing M-THRYVE template and request limited visual, content, layout, or predefined feature changes.

Rules:

- A template remains the project foundation.
- Client selects a base template.
- Branding and content can be changed.
- Limited layout modifications are allowed.
- Approved sections may be reordered, hidden, or added.
- A limited selection of predefined features and integrations may be added.
- Full redesign and custom architecture are not included.

After selection, preserve the relevant existing intake screens but add:

- Base-template selection
- Requested template modifications
- Optional predefined features
- Limited integration options
- Branding changes

Keep Project Vision, but change its purpose to:

“Describe how you want the selected template modified for your business.”

If a request exceeds this tier, show:

“This request may require an Enterprise build and will be reviewed by the owner.”

3. ENTERPRISE / BUILT FROM SCRATCH

Label:

Fully Custom

Description:

A fully custom software product designed and engineered from the ground up.

Rules:

- No template is required.
- Project Vision is mandatory.
- Custom pages, features, workflows, integrations, roles, data, security, and architecture are allowed.
- This tier supports complex and scalable systems.

For this tier, preserve the existing Business & Project, Project Vision, Features, Design Preferences, Budget & Timeline, and Review steps.

Make the Project Vision field required.

Add only the necessary Enterprise fields:

- Target users
- User roles
- Business workflows
- Integrations
- Existing systems
- Data and security requirements
- Scalability requirements

CONDITIONAL BEHAVIOR

After the client selects a tier:

- Keep the existing UI styling and layout.
- Show only questions relevant to that tier.
- Update the progress-step count dynamically.
- Preserve Client Information.
- Update the preliminary budget and timeline context.
- Do not silently delete tier-specific answers.

If the client changes tiers after entering information:

- Show a confirmation dialog.
- Explain which answers will no longer apply.
- Preserve all shared answers.
- Clear only answers that are incompatible with the newly selected tier.

ADD A SMALL “COMPARE TIERS” ACTION

Show a compact comparison modal using the existing modal/card style:

Template / Drag-and-Drop:
- Pre-made template
- Content replacement only
- No customization
- Fastest delivery
- Lowest cost

Custom Made:
- Template foundation
- Limited modifications
- Predefined add-ons
- Moderate delivery time
- Mid-range cost

Enterprise:
- Built from scratch
- Fully custom
- Advanced features and integrations
- Longest delivery time
- Highest investment

FINAL REQUIREMENT

Do not change the existing final submission flow in this revision.

All existing paths should still end at the current Review and Build Card experience.

Only insert:

- Tier-selection step
- Template selection where required
- Tier-specific conditional questions
- Tier comparison
- Tier-change warning

Everything else in the current UI should remain visually and structurally unchanged.