Update the existing “M-THRYVE AI Software Project Intake” Figma Make prototype.

CRITICAL INSTRUCTION

Do not redesign or replace the existing application.

Preserve the current:

- M-THRYVE visual identity
- Page structure
- Typography
- Colors and gradients
- Cards
- Borders
- Shadows
- Spacing
- Progress indicators
- Responsive behavior
- Tier-selection experience
- Template gallery
- Template previews
- Review screen
- Build Card style
- Existing intake questions unless specifically changed below

Implement the following changes inside the existing UI context.

Do not create an entirely different interface.

BUSINESS WORKFLOW

The discovery appointment only determines whether M-THRYVE and the prospective client want to proceed to the private intake phase.

Detailed project requirements are completed inside this intake.

The workflow is:

Discovery appointment
→ Owner authorizes private intake
→ Client completes the intake
→ Client chooses a build tier
→ Client chooses a template or defines an Enterprise vision
→ Client provides company assets and page-specific content
→ Client chooses a payment plan
→ Client submits the intake
→ System creates the Build Reference Number
→ System generates a preliminary Build Card
→ System generates the client’s personal referral voucher code
→ Factory Console owner reviews the intake
→ Owner approves, requests changes, or cancels
→ Build automation may begin only after owner approval and required agreements

The client-facing intake must never include controls to:

- Approve the project
- Reject the project
- Cancel the project
- Freeze the specification
- Start the build
- Trigger automation

Those actions belong exclusively inside the Factory Console.

CORRECTED INTAKE FLOW

Use this progress sequence:

1. Intro
2. Client & Project Details
3. Company Assets Questionnaire
4. Choose Build Approach
5. Template Selection or Enterprise Vision
6. Pages, Features & Content
7. Design Preferences
8. Project Review
9. Payment Plan
10. Final Confirmation
11. Submitted Build Card

IMPORTANT REFERENCE AND VOUCHER RULES

Do not show a Build Reference Number anywhere before successful submission.

Remove the Build Reference Number from:

- Client & Project Details
- Project Review before submission
- Payment page before submission
- Any previous intake slide
- Any header or sidebar before submission

The Build Reference Number must be generated only after the complete intake is successfully submitted.

Move the incoming Referral Voucher Code field to the Payment Plan page only.

After submission, generate a separate personal referral voucher code for the client. The incoming voucher and generated referral voucher are two different concepts.

M-THRYVE AI CONCIERGE

Add a persistent floating AI assistant called:

“M-THRYVE AI Concierge”

VISUAL DESIGN

Create a friendly blue robotic assistant inspired by the attached reference image:

- Cute compact blue robot
- Rounded head and body
- Dark digital face
- Simple glowing eyes or friendly expression
- Cyan or turquoise technology accents
- Soft blue gradient shell
- Small floating or standing character
- Modern, friendly and approachable
- Professional enough for a software-development company
- Do not copy a copyrighted mascot exactly
- Create an original M-THRYVE robot character inspired only by the general friendly blue AI-bot concept

The collapsed state should appear as a floating circular chat bubble with the robot partially visible.

Place it at the bottom-right of every screen.

Do not cover:

- Navigation buttons
- Form inputs
- Payment totals
- Required acknowledgements
- Mobile browser controls

COLLAPSED STATE

Display:

- Robot icon
- Small chat indicator
- Optional unread/help badge
- Tooltip: “Ask the M-THRYVE AI Concierge”

EXPANDED CHAT PANEL

When clicked, open a compact chat panel containing:

Header:
“M-THRYVE AI Concierge”

Subtext:
“Help for this step”

Include:

- Robot avatar
- Close/minimize control
- Short contextual welcome message
- Preset FAQ chips
- Chat response area
- Optional “Ask another question” input
- “Contact M-THRYVE” escalation link

The Concierge must understand which intake page the client is currently viewing.

Every page must have its own preset FAQ questions.

FAQ answers should explain the intake but must never:

- Promise approval
- Present an estimate as final
- Change the client’s form without confirmation
- Provide legal or financial guarantees
- Claim that development has started
- Expose internal Factory Console information

The bot may recommend a selection, but it must not automatically select paid options.

PAGE-SPECIFIC FAQ PRESETS

Intro FAQs:

- What is this intake for?
- Has my project already been approved?
- How long does this form take?
- Can I save and continue later?
- What happens after I submit?

Client & Project Details FAQs:

- What should I use as my project name?
- What if I do not have a company yet?
- Which project type should I select?
- Why do you need my industry?
- Can I update my contact information later?

Company Assets FAQs:

- What are company assets?
- Which files do I need?
- What if I do not have a logo?
- Can M-THRYVE create my company deck?
- Why is Drag & Drop unavailable without assets?

Build Approach FAQs:

- What is Drag & Drop?
- What is Custom Made?
- What is Enterprise?
- Which tier is right for me?
- Can I change tiers later?

Template FAQs:

- Can I customize this template?
- Why are some options unavailable?
- Are colors free?
- What is included in the template price?
- What is the difference between Website and Mobile App?

Pages and Features FAQs:

- What counts as a required feature?
- What does “Future phase” mean?
- What if I need help deciding?
- Can I request a feature outside my tier?
- How do integrations affect pricing?

Design FAQs:

- Do colors cost extra?
- Can I upload my brand guide?
- Can I preview mobile and desktop?
- Can I change the design later?
- What files should I upload?

Review FAQs:

- Is this the final quotation?
- Can I edit my answers?
- How is the timeline calculated?
- Why is a price still pending?
- What happens before payment?

Payment FAQs:

- Which payment plan should I choose?
- What does maintenance cover?
- How does the voucher discount work?
- When will my first payment happen?
- Will I be charged immediately?
- Is the payment amount final?
- What is included in free maintenance?

Final Confirmation FAQs:

- What am I confirming?
- Will submission start the build?
- Can M-THRYVE request changes?
- When is the final price confirmed?
- When do I receive my Build Reference Number?

Submitted Build Card FAQs:

- What does “Waiting for Owner Review” mean?
- Where is my Build Reference Number?
- How does my referral voucher work?
- When can I share my voucher?
- When does development begin?
- How will I receive updates?

The Concierge panel should update its FAQ chips immediately when the client moves to another screen.

SCREEN 1 — INTRO

Keep the existing introductory design.

Title:

“Let’s Build Your Software”

Authorization label:

“Private intake authorized by M-THRYVE”

Supporting text:

“This private intake helps us understand your project, calculate a preliminary price and timeline, and prepare your Build Card for owner review.”

Do not use:

- “No commitment required”
- “Here is what we agreed during discovery”
- “Your project is approved”
- “Your build will automatically begin”

Primary button:

“Start Project Intake”

Show the collapsed AI Concierge in the bottom-right corner.

SCREEN 2 — CLIENT & PROJECT DETAILS

Keep the existing “Who are we building for?” layout.

Include:

- Client full name
- Email address
- Phone number
- Company or organization name
- Project name
- Project type
- Industry
- Brief business description

Do not show:

- Build Reference Number
- Referral Voucher Code
- Payment fields
- Final project price

The project name belongs on this screen.

The Build Reference Number does not exist yet.

SCREEN 3 — COMPANY ASSETS QUESTIONNAIRE

Title:

“Let’s Check Your Company Assets”

Supporting text:

“Your build may require brand files, written content, images, and company information. Tell us what is already available so we can guide you to the right build option.”

Primary question:

“Are your company deck and complete brand materials already available?”

OPTION 1

“Yes — already provided during discovery”

Behavior:

- Do not require duplicate uploads
- Mark applicable files as previously provided
- Allow access to all build tiers
- Let the client replace outdated files later

OPTION 2

“Yes — available, but not yet provided”

Behavior:

- Allow access to all tiers
- Require applicable uploads later
- Show the asset checklist
- Clearly mark files that must be provided

OPTION 3

“Yes — but some materials are incomplete”

Behavior:

- Display the Company Asset Checklist
- Recommend Custom Made or Enterprise
- Offer paid assistance for missing assets
- Disable Drag & Drop if its required assets are missing

OPTION 4

“No — we need help creating them”

Behavior:

- Explain that template builds require prepared content and brand materials
- Recommend Custom Made or Enterprise
- Disable Drag & Drop until its required assets are available
- Offer paid asset-development services

COMPANY ASSET CHECKLIST

Include:

- Logo
- Logo source/vector file
- Brand colors
- Brand fonts
- Brand guide
- Company profile/deck
- Business description
- Product/service descriptions
- Website or app copy
- Team information
- Contact information
- Photographs
- Product images
- Testimonials
- Legal/policy content
- Social links
- Existing website/app materials
- Other supporting files

Each item supports:

- Available
- Missing
- Not applicable
- To be provided later

PAID ASSET SERVICES

Offer configurable add-ons such as:

- Logo creation
- Brand identity package
- Company profile/deck creation
- Copywriting
- Content organization
- Image sourcing
- Custom illustration
- Photography coordination
- Product-content preparation

Each add-on shows:

- Service name
- Description
- Configured price
- Additional preparation time
- Add control

Do not fabricate prices.

SCREEN 4 — CHOOSE BUILD APPROACH

Keep the existing three tier cards.

Do not include “Compare All Tiers” in the intake.

DRAG & DROP

Description:

“Choose a ready-made M-THRYVE template with fixed structure and content areas. Add your prepared brand assets and content without layout or feature customization.”

Rules:

- Lowest-cost tier
- Fixed templates
- No structural customization
- No custom features
- Complete assets required
- Colors remain free
- Corresponding template price is displayed

Base format options:

- Website
- Mobile App
- Website and Mobile App

Optional paid add-ons only:

- Custom Sizes
- All Sizes

Custom Sizes and All Sizes must never appear as free base-size choices.

CUSTOM MADE

Description:

“Start with an M-THRYVE template and make limited approved changes to its content, branding, colors, and selected components while preserving its core structure.”

Rules:

- Template-based
- Limited customization
- Configured price
- Limited feature adjustments
- Larger changes recommend Enterprise

ENTERPRISE

Description:

“A fully custom product designed and built from scratch around your vision, workflows, users, integrations, and business requirements.”

Rules:

- Built from scratch
- Client vision required
- Custom architecture
- Custom workflows
- Custom pages
- Custom features
- Custom integrations
- Requires detailed owner review

Each tier card shows:

- Starting or configured price
- Preliminary timeline
- Included scope
- Customization limits
- Required assets
- Recommended-for label

SCREEN 5A — TEMPLATE SELECTION

Use for Drag & Drop and Custom Made.

Keep the existing template gallery.

Each template has a corresponding configured price.

Display the selected format:

- Website
- Mobile App
- Website and Mobile App

For Drag & Drop, separately display optional:

- Custom Sizes
- All Sizes

COLOR SELECTION

Place color options below the format selector.

All colors are free.

Remove:

- Color surcharges
- Premium color fees
- “Included” promotional text

Changing a color must immediately update the preview:

- Background
- Buttons
- Links
- Accents
- Highlights
- Decorative elements

PREVIEW BEHAVIOR

Desktop preview:

- Realistic desktop dimensions

Mobile preview:

- Standard cellphone proportions
- Do not shrink a desktop layout into a small rectangle

Website and Mobile App:

- Provide desktop/mobile toggle

PAGE PREVIEW

Show exact previews for template pages such as:

- Home
- About
- Services
- Contact

Use looping Back and Next arrows.

Behavior:

- Next on the final page returns to Home
- Back on Home returns to the final page
- Arrows never become disabled

Display page position:

“1 of 4”

PAGE-SPECIFIC CONTENT

Below the preview:

“Content & Asset Notes — [Current Page Name]”

Content and uploads must change based on the previewed page.

Home example:

- Required logo
- Hero image
- Headline
- Supporting text
- Button text
- Button destination
- Featured products/services
- Homepage images
- Homepage notes

About example:

- Company story
- Mission
- Vision
- Team information
- Team images
- Founder image
- Timeline
- About-page notes

Keep every page’s content and assets separate unless the client deliberately reuses an uploaded asset.

SCREEN 5B — ENTERPRISE VISION

Show instead of template selection for Enterprise.

Require:

- Product vision
- Problem being solved
- Target users
- User roles
- Pages/screens
- Workflows
- Features
- Integrations
- Existing systems
- Data requirements
- Privacy/security requirements
- Design inspiration
- Competitors/comparable products
- Expected usage
- Success criteria
- Uploaded references
- Content and assets
- Other requirements

SCREEN 6 — PAGES, FEATURES & CONTENT

For every feature, support:

- Required
- Nice to have
- Future phase
- Need help deciding

Show:

- Feature description
- Complexity
- Tier availability
- Price impact
- Timeline impact

Drag & Drop:

- Fixed template features only
- No custom-feature selection
- Unavailable requests recommend Custom Made or Enterprise

Custom Made:

- Limited approved feature adjustments
- Flag requests exceeding tier limits

Enterprise:

- Full feature and workflow definition

Keep sections for:

- Pages/screens
- Integrations
- Existing systems
- Content
- Assets
- Brand files
- Data/privacy
- User roles
- Success criteria

Remove:

- Preferred budget range
- Preferred launch date

SCREEN 7 — DESIGN PREFERENCES

Preserve the current design-preference interface.

Ensure:

- Colors remain free
- Preview changes immediately
- Mobile preview uses cellphone dimensions
- Desktop preview remains desktop-sized
- Website/mobile toggle works
- No color-related additional fee

SCREEN 8 — PROJECT REVIEW

Show:

- Client
- Company
- Project name
- Asset readiness
- Selected tier
- Selected template or Enterprise vision
- Format
- Size add-ons
- Colors
- Pages
- Features
- Integrations
- Asset-development services
- Uploaded assets
- Base price
- Add-ons
- Preliminary total
- Preliminary completion time

Do not show:

- Build Reference Number
- Referral Voucher Code
- Generated referral voucher
- Approval status

Each section has an Edit action.

Primary button:

“Continue to Payment”

SCREEN 9 — PAYMENT PLAN

Title:

“Choose Your Payment Plan”

Supporting text:

“Choose your preferred payment arrangement. Pricing, billing dates, maintenance coverage, and the final agreement remain subject to M-THRYVE owner review.”

PAYMENT OPTIONS

Provide three payment-plan cards:

1. One-Time Payment
2. Monthly Payment
3. Annual Payment

Do not invent payment values. Use configured pricing and payment rules.

PAYMENT-AMOUNT HIERARCHY

The displayed charge per billing event should follow the configured business logic:

- Monthly payment displays the lowest recurring charge per billing cycle
- Annual payment displays a higher single recurring charge because it covers an annual period
- One-time payment displays the complete project-payment amount

Do not describe annual as more expensive overall unless configured data confirms that. Clearly distinguish:

- Payment amount per billing event
- Billing frequency
- Total project-payment obligation
- Maintenance charge
- Maintenance coverage period

ONE-TIME PAYMENT

Show:

- Project subtotal
- Add-ons
- Voucher discount
- One-time project total
- Proposed payment date
- Three months of maintenance included free

Required label:

“3 Months of Maintenance Included — Free”

Explain:

“Your one-time payment includes three months of standard maintenance beginning from the approved launch or handover date.”

Show the included free-maintenance value as:

“₱0 for the first 3 months”

or the project’s configured currency.

After the free three-month period, allow the client to choose:

- End maintenance after the included period
- Continue with monthly maintenance
- Continue with annual maintenance

Do not automatically charge after the free period without a separately confirmed continuing plan.

If the client chooses to stop maintenance after three months, require:

“I understand that after the complimentary three-month maintenance period ends, ongoing monitoring, routine updates, backups, support, compatibility maintenance, and non-warranty changes will not be included unless I purchase another maintenance plan.”

MONTHLY PAYMENT

Show:

- Monthly project-payment amount
- Required monthly maintenance fee
- Combined monthly amount
- First billing date
- Billing frequency
- Number of configured installments
- Expected final project installment
- Maintenance continuation terms

The maintenance plan is mandatory for monthly payment.

It cannot be removed.

Label:

“Monthly Maintenance — Required”

The monthly maintenance charge must be lower than the annual maintenance charge displayed as one annual billing event.

ANNUAL PAYMENT

Show:

- Annual payment amount
- Required annual maintenance fee
- Combined annual amount
- First annual billing date
- Next annual billing date
- Annual coverage period
- Renewal terms

The maintenance plan is mandatory for annual payment.

It cannot be removed.

Label:

“Annual Maintenance — Required”

The annual maintenance amount appears higher than the monthly maintenance amount because it covers the configured annual period.

If annual maintenance has a lower effective monthly cost, show:

“Effective monthly equivalent”

but do not invent a discount.

MAINTENANCE COVERAGE

Add an expandable information card:

“What does maintenance cover?”

Standard configured coverage may include:

- Routine dependency updates
- Security patches
- Availability monitoring
- Error monitoring
- Scheduled backups
- Basic technical support
- Compatibility adjustments
- Deployment monitoring
- Recovery assistance
- Maintenance reporting

Explain that maintenance does not automatically include:

- Major new features
- Major redesigns
- New integrations
- Large content migrations
- Third-party subscription charges
- Work outside the approved maintenance scope
- Damage caused by unauthorized external changes

Include:

“Exact maintenance coverage will be defined in the final approved agreement.”

FIRST BILLING DATE

Allow the client to select the first eligible billing date.

Display:

- Selected first billing date
- Payment amount
- Maintenance amount
- Combined billing amount
- Billing frequency
- Next expected billing date

Do not allow a date before the configured eligible start date.

INCOMING REFERRAL VOUCHER

Place the Referral Voucher Code field on this Payment page only.

Label:

“Referral Voucher Code”

Placeholder:

“Enter your voucher code”

Supporting text:

“Received a referral voucher from an M-THRYVE client? Enter it here to redeem the verified percentage discount available for your build purchase.”

Add:

“Apply Voucher”

Voucher states:

- Empty
- Checking
- Valid
- Invalid
- Expired
- Already redeemed
- Not yet eligible
- Successfully applied

When valid, show:

“Voucher applied: [configured percentage]% discount”

Show the discount as a separate receipt line item.

Never assume the discount is always 5%. Use the percentage attached to the verified voucher.

Do not apply unverified vouchers.

Do not expose the referrer’s personal information.

PAYMENT ACKNOWLEDGEMENTS

Require:

- I reviewed my selected payment plan.
- I understand that this payment arrangement is preliminary and subject to owner approval.
- I understand the applicable maintenance conditions.
- I understand that submission does not immediately charge my payment method.
- I understand that billing begins only under the final approved agreement.

Use a secure payment-provider placeholder.

Do not collect full card or bank information directly in this prototype.

Primary button:

“Review Final Summary”

SCREEN 10 — FINAL CONFIRMATION

Keep the existing “Almost There” design.

Title:

“Almost There”

Show:

“Preliminary Project Receipt”

Receipt items:

- Selected tier
- Selected template
- Base format
- Size add-ons
- Base price
- Template price
- Customization charges
- Feature add-ons
- Integration add-ons
- Asset-development services
- Other add-ons
- Voucher code
- Voucher percentage
- Voucher discount
- Project subtotal
- Maintenance plan
- Included free maintenance
- Maintenance fee
- Taxes/applicable fees
- Preliminary total
- Payment frequency
- First billing date
- Recurring amount
- Next billing date
- Preliminary completion time
- Additional preparation time

Do not show a Build Reference Number yet.

Required notice:

“This receipt, payment arrangement, timeline, and Build Card are preliminary and subject to M-THRYVE owner review and final approval. Submission does not automatically start development or authorize an immediate charge.”

Also show:

“Payment will only be requested or processed according to the final approved agreement and billing schedule.”

Required checkboxes:

- I confirm my project information is accurate.
- I reviewed the preliminary receipt.
- I reviewed my selected payment arrangement.
- I understand the maintenance coverage and limitations.
- I understand the Build Card is subject to owner approval.
- I understand submission does not automatically start development.

Final button:

“Submit Intake for Analysis”

While submitting, show:

“Creating your secure Build Reference and preliminary Build Card…”

Generate the Build Reference Number only after submission succeeds.

SCREEN 11 — SUBMITTED BUILD CARD

After successful submission, show:

“Intake Submitted”

Status badge:

“Waiting for Owner Review”

Supporting text:

“Your preliminary Build Card has been created and sent to M-THRYVE for owner review.”

GENERATED BUILD REFERENCE

This is the first point where the Build Reference Number appears.

Display it prominently:

“Build Reference Number”

Include:

- Generated reference
- Copy button
- Explanation

Supporting text:

“Use this reference when contacting M-THRYVE about your project.”

Do not allow editing.

PRELIMINARY BUILD CARD

Show:

- Build Reference Number
- Project name
- Client/company
- Selected tier
- Selected template or Enterprise vision
- Format
- Pages
- Features
- Integrations
- Asset status
- Selected add-ons
- Applied incoming voucher discount
- Preliminary total
- Payment-plan preference
- Maintenance coverage
- First billing date
- Preliminary timeline
- Submission date
- Waiting for Owner Review status

Required notice:

“Preliminary Build Card — subject to M-THRYVE owner review and final approval.”

GENERATED CLIENT REFERRAL VOUCHER

Create a dedicated card:

“Your M-THRYVE Referral Voucher”

Generate a unique referral voucher code after successful submission.

This generated code belongs to the client and is different from any voucher they used on their own payment.

Display:

- Generated referral voucher code
- Copy Code button
- Share button
- Referral benefit
- Eligibility status
- Referral count
- Discount-earned status

Example supporting text:

“Share this voucher with someone who wants to build with M-THRYVE. When an eligible referral successfully completes the required referral conditions, you can earn a configured percentage discount toward your qualifying build payment.”

Do not hard-code 5% unless 5% is the configured referral reward.

Use:

“Earn up to [configured percentage]% off”

or:

“Referral reward: [configured percentage]%”

Clearly explain:

- Sharing a code does not immediately create a discount
- Referral eligibility must be verified
- The referred customer must satisfy the configured qualification conditions
- A voucher cannot be self-redeemed
- A voucher cannot be reused beyond configured limits
- Discount eligibility remains subject to M-THRYVE terms
- The code must not expose the client’s identity

Referral states:

- New
- Shared
- Referral pending
- Referral verified
- Reward earned
- Reward applied
- Expired
- Maximum uses reached

SHARE OPTIONS

Prototype share actions:

- Copy voucher code
- Copy referral message
- Email
- Messenger/share placeholder
- Copy referral link

Suggested share message:

“I’m building with M-THRYVE. Use my referral voucher [CODE] when selecting your payment plan to receive the eligible referral benefit.”

Do not automatically send anything from the prototype.

WHAT HAPPENS NEXT

Display:

1. M-THRYVE reviews the intake.
2. The preliminary Build Card is evaluated.
3. M-THRYVE may request clarification or revisions.
4. Final scope, price, timeline, maintenance, and payment terms are prepared.
5. The owner approves or declines the project in the Factory Console.
6. Billing and development begin only under the final approved agreement.

Do not show:

- Approved
- Payment completed
- Build started
- Automation triggered

unless a future Factory Console status explicitly provides those states.

CALCULATION RULES

Maintain one persistent intake state.

Recalculate the preliminary receipt when the client changes:

- Tier
- Template
- Format
- Size add-ons
- Features
- Integrations
- Asset-development services
- Payment plan
- Maintenance plan
- First billing date
- Incoming referral voucher

Never invent a price, fee, percentage, or timeline.

Use configured data.

If unavailable, show:

- “Price pending configuration”
- “Discount pending verification”
- “Timeline pending analysis”

Do not present placeholders as final amounts.

REFERRAL DATA MODEL

Keep two clearly separate voucher concepts:

1. Incoming Referral Voucher
   - Entered on the Payment page
   - Belongs to another eligible referrer
   - May discount this client’s purchase
   - Must be verified before application

2. Generated Client Referral Voucher
   - Created after successful intake submission
   - Appears on the submitted Build Card
   - Can be shared with future clients
   - May earn the current client a future configured discount after qualification

Never display either voucher on Client & Project Details.

AI CONCIERGE RESPONSIVE BEHAVIOR

Desktop:

- Floating bottom-right
- Expanded panel approximately 340–400 px wide
- Does not overlap primary actions
- May be minimized

Mobile:

- Small floating robot bubble
- Expanded panel appears as a bottom sheet or nearly full-width card
- Keep close control visible
- Do not obscure Back or Continue buttons
- Keep FAQ chips touch-friendly
- Maintain safe-area spacing

AI CONCIERGE STATES

Include:

- Idle
- Greeting
- FAQ list
- Answer displayed
- Thinking
- Could not answer
- Escalate to M-THRYVE
- Minimized
- Unread/help indicator

Use friendly concise responses.

The AI Concierge should explain information but should never override client choices or select paid add-ons automatically.

ACCESSIBILITY

- Keyboard-accessible Concierge
- Accessible name for the robot button
- Visible focus states
- Proper labels
- Strong contrast
- Do not rely on color alone
- Clear required-field errors
- Clearly explained disabled tiers
- Accessible payment-plan cards
- Accessible voucher status
- Accessible maintenance acknowledgements
- Mobile touch targets of appropriate size

PROTOTYPE INTERACTIONS

Demonstrate:

1. Opening and closing the AI Concierge
2. FAQ presets changing per screen
3. Selecting a FAQ and showing its response
4. Escalating an unanswered question
5. Selecting each company-assets answer
6. Showing asset-service offers
7. Disabling Drag & Drop when assets are missing
8. Selecting each tier
9. Selecting Website, Mobile App, or both
10. Adding Custom Sizes or All Sizes
11. Changing colors and updating the preview
12. Looping through template pages
13. Changing page-specific content
14. Selecting One-Time Payment
15. Showing free three-month maintenance
16. Selecting Monthly Payment
17. Automatically including monthly maintenance
18. Selecting Annual Payment
19. Automatically including annual maintenance
20. Selecting the first billing date
21. Entering a valid incoming voucher
22. Applying its configured percentage discount
23. Showing invalid and expired voucher states
24. Reviewing the final preliminary receipt
25. Submitting the intake
26. Generating the Build Reference Number only after submission
27. Generating the client’s referral voucher
28. Copying the generated referral code
29. Displaying “Waiting for Owner Review”

FINAL BOUNDARY

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
- Freeze the specification
- Confirm final billing terms
- Start the build
- Trigger automation