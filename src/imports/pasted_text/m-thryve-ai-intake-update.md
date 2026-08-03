Update the existing M-THRYVE “AI Software Project Intake” Figma Make prototype.

IMPORTANT PRESERVATION RULE

Do not redesign, replace, or recreate the entire interface.

Preserve the current:

- M-THRYVE branding
- Typography
- Color system
- Gradients
- Cards
- Borders
- Shadows
- Spacing
- Progress indicator
- Navigation
- Responsive layout
- M-THRYVE AI Concierge
- Company Assets Questionnaire
- Build-tier cards
- Template gallery
- Template previews
- Payment visual style
- Preliminary receipt
- Submitted Build Card
- Referral-voucher system

Only make the workflow and content corrections described below.

CORE WORKFLOW

The corrected flow should be:

1. Who Are We Building For?
2. Company Assets Questionnaire
3. Choose Your Build Approach
4. Choose Your Starting Point
5. Add Content & Assets
6. Custom/Enterprise Requirements, when applicable
7. Review Your Project
8. Choose Payment Plan
9. Final Confirmation
10. Submitted Build Card

The Build Reference Number must still be generated only after successful submission.

STEP 1 — WHO ARE WE BUILDING FOR?

Keep this screen’s current visual design. The first step is already strong and should not be redesigned.

Continue collecting:

- Client name
- Email
- Phone number
- Company name
- Project name
- Project type/platform
- Industry
- Business description
- Existing color scheme or preferred brand colors

PROJECT TYPE / PLATFORM

This first step must be the single authoritative location for selecting the project’s platform/type.

Use the project’s existing platform options, such as:

- Website
- Mobile App
- Website and Mobile App
- Other configured project type

Save this answer in the persistent intake state.

Do not ask the client to choose the same platform again later.

INDUSTRY

Save the selected industry in persistent intake state.

Examples:

- Entertainment
- Real Estate
- Healthcare
- Education
- E-commerce
- Hospitality
- Professional Services
- Technology
- Finance
- Nonprofit
- Other

The selected industry must control which templates are displayed later.

Do not show:

- Build Reference Number
- Referral Voucher Code
- Payment-plan information

STEP 2 — COMPANY ASSETS QUESTIONNAIRE

Keep the existing questionnaire and conditional behavior.

Continue supporting:

- Assets already provided
- Assets available but not yet provided
- Assets incomplete
- No assets available

Keep the asset checklist and paid asset-development services.

Do not redesign this step.

STEP 3 — CHOOSE YOUR BUILD APPROACH

Keep the three existing build approaches:

1. Drag & Drop
2. Custom Made
3. Enterprise

DRAG & DROP

Clearly explain:

“Choose an existing M-THRYVE template and replace only its approved content and assets. The template’s structure, features, pages, and functionality cannot be modified.”

Drag & Drop permits the client to change only:

- Logo
- Images
- Written content
- Contact information
- Company information
- Provided color scheme, where supported by the selected template
- Other predefined content placeholders

Drag & Drop does not permit:

- Adding features
- Removing features
- Adding pages
- Removing pages
- Changing workflows
- Changing integrations
- Rearranging the template structure
- Customizing components
- Changing the template’s functionality
- Requesting custom design work

Do not display editable Features or Requirements sections for Drag & Drop.

Do not display a Design Preferences step for Drag & Drop.

The template must be presented as locked except for its approved content and asset placeholders.

CUSTOM MADE

Keep template-based starting points with limited customization.

Custom Made may include:

- Limited feature adjustments
- Limited page changes
- Limited layout modifications
- Design preferences
- Additional requirements
- Selected integrations
- Content and asset changes

Clearly flag any request that exceeds the Custom Made limits and recommend Enterprise.

ENTERPRISE

Keep the fully custom build option.

Enterprise may include:

- Custom vision
- Custom pages
- Custom features
- Custom workflows
- Custom design preferences
- Custom integrations
- User roles
- Data requirements
- Security requirements
- Full project requirements

STEP 4 — CHOOSE YOUR STARTING POINT

This screen must use the industry selected in Step 1.

INDUSTRY FILTERING

Automatically filter and sort all starting points/templates according to the selected industry.

Example:

If the client selected:

“Entertainment”

then show only:

- Entertainment templates
- Media templates
- Events templates
- Streaming templates
- Artist/performer templates
- Production-company templates
- Other templates explicitly tagged as compatible with Entertainment

Do not show unrelated industries such as:

- Real Estate
- Healthcare
- Finance
- Restaurant
- Construction

Display a small contextual label:

“Showing starting points for: Entertainment”

Use the actual selected industry dynamically.

Do not require the client to select the industry again.

If there are no exact matches:

1. Show templates tagged as compatible with the selected industry.
2. Clearly label them “Recommended alternative.”
3. Never mix unrelated templates into the main results without explanation.

Provide a small “Change industry” action that returns to Step 1 without deleting the client’s other answers.

TEMPLATE METADATA

Each starting-point card should show:

- Template name
- Industry
- Short description
- Corresponding configured price
- Supported platform
- Included fixed pages
- Included fixed functionality
- Preview action
- Select action

For Drag & Drop, do not show feature-customization controls.

CHOOSE YOUR PLATFORM — REMOVE DUPLICATION

Remove the later “Choose Your Platform” selection screen or section containing:

- Website
- Mobile App
- Website and Mobile App

The client already selected their project type/platform in Step 1.

Do not ask for the same selection twice.

Instead, display the existing selection as read-only context:

“Selected Platform: [Platform chosen in Step 1]”

Provide an Edit action that returns to Step 1 if the client needs to change it.

Do not present platform choices again inside:

- Starting Point
- Template Selection
- Content & Assets
- Project Review
- Payment

PREVIEW RESOLUTION SELECTOR

Remove “Custom Sizes” and “All Sizes” as optional paid add-ons.

They are not project add-ons and must not affect:

- Price
- Scope
- Timeline
- Receipt
- Payment total

Replace them with a viewport/resolution dropdown positioned beside the preview’s Desktop and/or Mobile controls.

Label:

“Preview Size”

This dropdown changes only the simulated preview resolution.

Use common device presets.

Desktop/web presets:

- Desktop — 1920 × 1080
- Desktop — 1440 × 900
- Laptop — 1366 × 768
- Tablet Landscape — 1180 × 820
- iPad Portrait — 1024 × 1366
- Tablet Portrait — 768 × 1024
- Mobile — 430 × 932
- Mobile — 390 × 844
- Mobile — 360 × 800

Do not display every preset when it is irrelevant.

For a Website:

- Desktop
- Laptop
- Tablet
- Mobile responsive previews

For a Mobile App:

- Common mobile-phone sizes
- Supported tablet sizes where applicable

For Website and Mobile App:

- First choose Desktop/Web or Mobile App preview
- Then choose a resolution appropriate to that preview type

The resolution selector must:

- Resize the visible preview frame
- Preserve the correct aspect ratio
- Display the active dimensions
- Never change project pricing
- Never add a receipt line item
- Never modify the selected platform
- Never imply that responsiveness itself is a paid add-on

Use a realistic cellphone frame for mobile preview and a realistic tablet frame for iPad/tablet preview.

PREVIEW NAVIGATION

Keep the looping template-page navigation:

- Next on the final page returns to the first page
- Back on the first page returns to the final page
- Arrows remain available
- Show the current page number

Example:

“Home — 1 of 4”

STEP 5 — CONTENT & ASSETS

DRAG & DROP CONTENT

For Drag & Drop, show only the content and asset fields already supported by the selected template.

Allow:

- Logo upload
- Image uploads
- Headlines
- Paragraphs
- Contact details
- Company details
- Button labels
- Button links, where the template already contains a button
- Product/service content for existing template sections
- Page-specific notes
- Existing predefined color scheme controls, where supported

Do not show:

- Add feature
- Remove feature
- Add page
- Remove page
- Custom requirement
- New integration
- Custom workflow
- Rearrange layout
- Change template structure

Add a visible notice:

“This Drag & Drop template has fixed pages, features, layout, and functionality. You may replace its predefined content and assets, but you cannot add or remove features.”

Maintain page-specific content:

- Home content belongs to Home
- About content belongs to About
- Services content belongs to Services
- Contact content belongs to Contact

CUSTOM MADE AND ENTERPRISE REQUIREMENTS

Show Features, Requirements, and Design Preferences only when the client selected:

- Custom Made
- Enterprise

Custom Made feature options must remain within the configured customization limits.

Enterprise may use full requirements discovery.

FEATURE PRIORITIES

For Custom Made and Enterprise only, support:

- Required
- Nice to have
- Future phase
- Need help deciding

Show:

- Description
- Complexity
- Price impact
- Timeline impact
- Tier availability

DESIGN PREFERENCES

Remove the standalone Design Preferences step for Drag & Drop.

The initial color scheme was already collected in Step 1, so do not ask Drag & Drop clients to choose it again.

For Drag & Drop:

- Reuse the color scheme from Step 1
- Apply it to the preview when the template supports color replacement
- Keep all supported color changes free
- Do not show custom design controls

For Custom Made and Enterprise:

- Keep Design Preferences
- Allow additional visual direction
- Allow reference uploads
- Allow typography preferences
- Allow layout preferences
- Allow design inspiration
- Allow accessibility preferences
- Allow custom color refinement

Do not repeat the Step 1 color question unnecessarily. Display its saved answer and allow refinement only for Custom Made or Enterprise.

STEP 7 — REVIEW YOUR PROJECT

Correct the project summary terminology.

Replace “Build Approach” where it is incorrectly being used to display Website, Mobile App, or Website and Mobile App.

Use:

“Platform”

The Platform row should display the project type selected in Step 1:

- Website
- Mobile App
- Website and Mobile App
- Other configured platform

Use a separate row for:

“Build Approach”

Its value should be:

- Drag & Drop
- Custom Made
- Enterprise

Do not combine platform and build approach.

Correct review structure:

Project:

- Client
- Company
- Project name
- Industry
- Platform

Build:

- Build approach
- Selected starting point/template
- Selected industry category
- Content and asset readiness
- Pages
- Fixed template functionality or custom features
- Integrations, when applicable
- Design preferences, only for Custom Made or Enterprise

Estimate:

- Base price
- Template price
- Asset services
- Customization
- Feature/integration costs
- Preliminary total
- Preliminary timeline

Do not show “Website + App” as an extra add-on if it is already the platform selected in Step 1.

Do not include preview resolutions in the receipt or project scope.

Do not show a Build Reference Number before submission.

STEP 8 — PAYMENT PLAN

Restore all of the previous payment-plan choices.

Payment-plan cards should include:

1. One-Time Payment
2. Monthly Payment
3. Quarterly Payment
4. Biannual Payment
5. Annual Payment

Use “Biannual” to mean billing every six months. If necessary for clarity, display:

“Biannual — Every 6 Months”

Do not remove any configured payment plan.

Each payment plan must have its own configured maintenance fee.

Do not invent monetary values.

ONE-TIME PAYMENT

Show:

- Complete one-time project payment
- Voucher discount
- Final preliminary one-time total
- Three months of standard maintenance included free
- Optional continued maintenance after the free period

Label:

“3 Months of Maintenance Included — Free”

MONTHLY PAYMENT

Show:

- Monthly project installment
- Monthly maintenance fee
- Combined monthly amount
- Number of configured installments
- Billing frequency

Maintenance is mandatory and cannot be removed.

QUARTERLY PAYMENT

Show:

- Quarterly project installment
- Quarterly maintenance fee
- Combined quarterly amount
- Number of configured installments
- Billing frequency: every three months

Maintenance is mandatory and cannot be removed.

BIANNUAL PAYMENT

Show:

- Biannual project installment
- Biannual maintenance fee
- Combined six-month amount
- Number of configured installments
- Billing frequency: every six months

Maintenance is mandatory and cannot be removed.

ANNUAL PAYMENT

Show:

- Annual project payment
- Annual maintenance fee
- Combined annual amount
- Billing frequency: every twelve months
- Annual maintenance coverage

Maintenance is mandatory and cannot be removed.

MAINTENANCE-FEE DIFFERENCES

Every payment plan must display a different configured maintenance amount based on its billing period.

The UI must distinguish:

- Project installment
- Maintenance fee
- Combined payment
- Billing frequency
- Maintenance coverage period

Do not simply reuse one maintenance fee for every plan.

Do not claim that one plan is cheaper overall unless configured business data confirms it.

MAINTENANCE INFORMATION

Keep:

“What does maintenance cover?”

Configured standard coverage may include:

- Routine updates
- Security patches
- Monitoring
- Error monitoring
- Backups
- Basic support
- Compatibility maintenance
- Deployment monitoring
- Recovery assistance
- Maintenance reporting

Explain that it does not automatically include:

- Major new features
- Major redesigns
- New integrations
- Large migrations
- Third-party subscriptions
- Work outside the approved maintenance scope

PREFERRED BILLING DATE — REMOVE

Remove the Preferred Billing Date field completely.

Do not ask the client to select:

- First billing date
- Preferred billing date
- Preferred charge date
- Next billing date

Billing dates will be finalized by M-THRYVE after owner review and approval.

Instead, display:

“Billing schedule: Confirmed after owner approval”

and:

“Your final billing dates will be included in the approved agreement.”

REFERRAL VOUCHER

Keep the Referral Voucher Code field on the Payment Plan screen.

Allow the client to enter a voucher and redeem its configured percentage discount.

Include:

- Voucher input
- Apply Voucher button
- Checking state
- Valid state
- Invalid state
- Expired state
- Already used state
- Discount percentage
- Discount amount
- Updated preliminary total

Do not hard-code a percentage unless configured.

Do not expose the referrer’s personal information.

PAYMENT RECEIPT

For the selected plan, show:

- Project subtotal
- Add-ons
- Asset-development services
- Voucher discount
- Project installment
- Maintenance fee
- Combined payment amount
- Billing frequency
- Preliminary total
- “Billing dates confirmed after owner approval”

FINAL CONFIRMATION

Keep the existing preliminary receipt and final confirmation design.

Remove all previous confirmation checkboxes.

Keep only these two required checkboxes, using this exact wording:

“I understand that the preliminary Build Card is subject to M-THRYVE owner review and final approval.”

“I understand that submitting this intake does not automatically start development or trigger any payment.”

Do not add other required checkboxes.

Both checkboxes must be selected before enabling:

“Submit Intake for Analysis”

Do not show a Build Reference Number before submission succeeds.

SUBMITTED BUILD CARD

After successful submission:

- Generate the Build Reference Number
- Generate the preliminary Build Card
- Generate the client’s personal referral voucher
- Show “Waiting for Owner Review”

The Build Card should show:

- Build Reference Number
- Project name
- Industry
- Platform
- Build approach
- Selected template
- Asset status
- Fixed template content or custom requirements
- Payment-plan preference
- Maintenance plan
- Voucher discount
- Preliminary total
- Preliminary timeline
- Submission date
- Waiting for Owner Review

For Drag & Drop, describe the scope as:

“Fixed template configuration with client-provided content and assets.”

Do not list customizable features for Drag & Drop.

AI CONCIERGE UPDATES

Keep the floating M-THRYVE AI Concierge.

Update its page-specific FAQs to reflect the corrected workflow.

Starting Point FAQs:

- Why am I only seeing templates for my industry?
- How do I change my industry?
- Can I use a template from another industry?
- What can I change in a Drag & Drop template?
- Can I preview different screen sizes?

Preview FAQs:

- Does preview size affect the price?
- Is mobile responsiveness an add-on?
- Can I preview this on an iPad?
- Can I add or remove template features?
- What can I replace in this template?

Payment FAQs:

- What payment plans are available?
- What is the difference between monthly, quarterly, biannual, and annual?
- Why does each plan have a different maintenance fee?
- When will my billing dates be confirmed?
- How does the voucher discount work?
- Will submitting charge me immediately?

For the preview-size answer, explain:

“Preview Size only changes the simulated screen resolution. It does not change your platform, project scope, or price.”

CONDITIONAL FLOW RULES

If Build Approach = Drag & Drop:

- Show industry-filtered templates
- Show fixed template preview
- Show resolution dropdown
- Show content and asset replacement
- Hide Features
- Hide Requirements
- Hide custom integrations
- Hide Design Preferences
- Hide page-add/remove controls

If Build Approach = Custom Made:

- Show industry-filtered templates
- Show resolution dropdown
- Show content and assets
- Show limited features
- Show limited requirements
- Show Design Preferences
- Enforce customization limits

If Build Approach = Enterprise:

- Starting-point templates may be optional inspiration
- Require project vision
- Show full requirements
- Show full feature selection
- Show integrations
- Show Design Preferences
- Show custom scope analysis

PROTOTYPE INTERACTIONS TO IMPLEMENT

Demonstrate:

1. Selecting a project type/platform in Step 1
2. Selecting Entertainment as the industry
3. Showing only Entertainment-compatible starting points
4. Returning to Step 1 to change industry
5. Automatically updating templates after the industry changes
6. Preserving the platform without asking for it again
7. Selecting Drag & Drop
8. Hiding Features and Requirements for Drag & Drop
9. Hiding Design Preferences for Drag & Drop
10. Locking template structure and functionality
11. Editing only logo, images, and content
12. Opening the Preview Size dropdown
13. Previewing desktop, laptop, iPad, tablet, and mobile sizes
14. Confirming preview size does not change price
15. Selecting Custom Made and showing limited requirements/design
16. Selecting Enterprise and showing full requirements/design
17. Showing Platform and Build Approach as separate review fields
18. Selecting One-Time Payment
19. Selecting Monthly Payment
20. Selecting Quarterly Payment
21. Selecting Biannual Payment
22. Selecting Annual Payment
23. Updating the maintenance fee for each plan
24. Applying a referral voucher
25. Removing Preferred Billing Date
26. Showing billing dates as pending owner approval
27. Requiring only the two final confirmation checkboxes
28. Generating the Build Reference Number only after submission
29. Displaying the submitted Build Card
30. Displaying Waiting for Owner Review

FINAL BUSINESS BOUNDARY

The intake ends at:

Submitted
→ Build Reference Number generated
→ Preliminary Build Card generated
→ Personal referral voucher generated
→ Waiting for Owner Review

Only the Factory Console may:

- Approve
- Reject
- Cancel
- Set final pricing
- Set the final timeline
- Confirm billing dates
- Confirm final maintenance fees
- Freeze the specification
- Start the build
- Trigger automation