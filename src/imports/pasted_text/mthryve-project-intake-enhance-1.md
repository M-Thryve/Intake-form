MTHRYVE AI Software Project Intake — Frontend Enhancement Version

IMPORTANT
This is a targeted enhancement of the existing MTHRYVE AI Software Project Intake.
DO NOT redesign the application.
Preserve the existing:
Premium enterprise SaaS aesthetic
Dark theme
Overall layout
Visual hierarchy
Design system
Typography
Card styles
Buttons
Progress header
Navigation
Sticky progress indicator
Animations
Template gallery
Conditional tier flows
Review page
Project Receipt
AI Build Card
Existing interactions
Overall onboarding experience

This should feel like a natural evolution of the existing product—not a new application.
Maintain the current MTHRYVE design language:
Background: #0B0F14
Cards: #111827
Borders: #2A3441
Accent: #39D6C7
Typography:
Inter
JetBrains Mono (reference IDs, labels)
Spacious layouts
Rounded enterprise cards
Clean UI
No gradients
No glassmorphism
Minimal visual noise

The overall experience should remain comparable to enterprise SaaS products such as Stripe, Linear, Vercel, Notion, Framer, and Retool.

OVERALL EXPERIENCE
The intake should no longer feel like filling out a long form.
Instead, it should feel like the client is collaborating with an intelligent AI Software Consultant that guides them through planning their software project from discovery to payment.
The experience should be:
Conversational
Human
Intelligent
Reassuring
Low-friction
Premium
Enterprise-grade
Confidence inspiring
Every screen should explain why information is being requested and how it benefits the client.
Avoid robotic wording.
Avoid survey-like experiences.

UPDATED ONBOARDING FLOW
Update the intake flow to:
Welcome
Client & Project Details
Choose Build Tier
Brand & Business Assets Qualification
Brand & Business Assets
Project Requirements (Conditional)
Features & Requirements
Review & Project Receipt
Payment
Final Submission
AI Build Card
Preserve dynamic progress indicators depending on the selected tier.

CLIENT & PROJECT DETAILS
Preserve the existing client information page while refining labels and helper text.
Fields:
Full Name
Company Name
Business Email
Contact Number
Project Name
Keep the generated Build Reference Number.

Referral Voucher Code
Add a new field directly below or beside the Build Reference Number.
Label:
Referral Voucher Code (Optional)
Helper text:
Completed MTHRYVE clients receive a referral voucher they can share with other businesses. When a referral becomes a successful project, both parties may receive exclusive rewards, discounts, or future service credits.
Include a subtle gift/referral icon.
Keep the field visually optional.

BUILD TIER
Preserve the three-card tier selection.
Launch Builder (Drag & Drop)
Custom Made
Enterprise
Do not restore the removed Compare Tiers feature.
Each card should continue displaying:
Short description
Price range
Delivery estimate
Customization summary

LAUNCH BUILDER (DRAG & DROP)
Update the platform selector.
Standard package options:
Website
Mobile App
Website + Mobile App
Move:
Custom Sizes
All Sizes
into the Add-ons section.
Display them as optional upgrades with concise descriptions explaining when they are appropriate.
Preserve the existing template gallery and conditional behavior.

BRAND & BUSINESS ASSETS QUALIFICATION
Before displaying the upload questionnaire, introduce a short qualification step.
Question:
Are your company branding materials and business assets already available?
Supporting text:
This helps us determine what information we need from you now and how we can best prepare your project. You can always provide additional assets later if needed.
Display four premium selection cards.

Option 1
Yes, everything was already shared during our discovery meeting
Behavior:
Skip duplicate uploads.
Display confirmation:
Great! We've already received your branding assets. We'll use those materials throughout your project.
Continue to the next section.
Allow optional uploads later.

Option 2
Yes, but I haven't uploaded them yet
Behavior:
Display the complete Brand & Business Assets page.

Option 3
I have some assets, but they're incomplete
Behavior:
Display a Company Asset Checklist.
Each asset can be marked as:
Available
Missing
Not Applicable
Will Provide Later
Upload fields appear only for Available assets.
Show helper text:
No problem. Our team can continue reviewing your project while you gather the remaining materials.
Available for:
Custom Made
Enterprise

Option 4
No, I don't have branding materials yet
Display an informational panel explaining that branding assets improve project quality.
Recommend optional branding services:
Logo Design
Brand Identity
Company Profile
Marketing Assets
Content Assistance
Use reassuring copy.
Example:
Don't worry if your business is still getting started. Many successful projects begin with only an idea. Our team can help you build your branding alongside your software.
Allow the client to continue with:
Custom Made
Enterprise
without blocking the intake.

BRAND & BUSINESS ASSETS
Replace the simple upload section with a structured Brand & Business Assets page.
Organize uploads into clean cards.
Assets include:
Company Logo
Brand Guidelines
Company Profile / Company Deck
Existing Website
Social Media Links
Marketing Materials
Images
Videos
Product Photos
Brand Icons
Fonts
Other Supporting Assets
Each upload card includes:
Icon
Title
Helper description
Drag-and-drop upload
Browse button
Supported file types
Upload status
Organize uploads into logical categories to reduce cognitive load.

PROJECT REQUIREMENTS
Maintain existing conditional behavior.

Launch Builder
Focus on:
Selected template
Platform
Branding
Uploaded assets
Launch timeline

Custom Made
Keep template-first workflow.
Project Vision becomes:
Describe how you would like us to customize your selected template for your business.
Allow:
Branding requests
Layout adjustments
Approved integrations
Predefined features
Warn when requests exceed package limitations.

Enterprise
Preserve existing enterprise discovery.
Project Vision remains required.
Include:
Target Users
User Roles
Business Workflows
Integrations
Existing Systems
Data & Security
Scalability

FEATURES & REQUIREMENTS
Preserve the existing feature chips.
Improve helper text.
Explain that selected features help the AI prepare a more accurate Build Card.
Avoid unnecessary technical jargon.

REVIEW & PROJECT RECEIPT
Preserve the existing receipt.
Continue displaying:
Selected package
Platform
Pricing
Delivery estimate
Selected color style
Subtotal
Total
Color styles remain included at no additional cost.
Do not modify pricing behavior.

PAYMENT
Insert a dedicated Payment step before Submission.
Maintain the current design language.

Payment Plans
Provide selectable cards for:
One-Time Payment
Monthly
Quarterly
Bi-Annually
Annually
Each option briefly explains the billing method.

Maintenance Plan Logic
When Monthly, Quarterly, Bi-Annually, or Annually is selected:
Automatically include Maintenance.
Display a premium informational card.
Explain that maintenance includes:
System maintenance
Security updates
Performance optimization
Bug fixes
Scheduled backups
Monitoring
Technical support
Infrastructure maintenance
Minor feature improvements
Display:
Recurring payment amount
Billing frequency
Next billing date
Preferred first billing date
Estimated renewal schedule

One-Time Payment
Maintenance becomes optional.
Allow:
Subscribe to Maintenance
Decline Maintenance
If declined:
Require confirmation.
Checkbox:
I understand that without an ongoing maintenance plan, future updates, monitoring, bug fixes, security improvements, technical support, and enhancements may require separate service requests and additional fees.
Prevent continuing until acknowledged.

FINAL SUBMISSION
Preserve the current submission flow.
Continue using:
Submit Intake for Analysis →
Do not modify Build Card generation.

AI BUILD CARD
Preserve the existing Build Card.
Continue displaying:
Preliminary Build Card
Waiting for Owner Review
Estimated complexity
Recommended tech stack
Timeline
Budget
Recommended team
Reference number

AI CONCIERGE AVATAR (DESIGN EXPLORATION ONLY)
Do NOT implement functionality.
Design a premium AI Concierge avatar that appears throughout the landing page and intake experience.
The avatar should represent an experienced software consultant—not a robot.
Characteristics:
Professional
Modern
Trustworthy
Friendly
Intelligent
Confident
Premium
Avoid:
Cartoon styles
Sci-fi robots
Overly futuristic aesthetics
Prefer a clean semi-illustrated digital assistant aligned with the MTHRYVE brand.
The avatar may appear:
Welcome screen
Section introductions
Helpful guidance
Payment explanations
Upload guidance
Submission confirmation
Use subtle speech bubbles, for example:
"Let's build the right solution for your business."
"These assets help us better understand your brand."
"The more information you provide, the more accurate your AI Build Card becomes."
"Need help? I'll guide you through every step."
The avatar should complement the onboarding experience without becoming distracting.

MICRO-INTERACTIONS
Maintain subtle enterprise-grade animations.
Animate:
Card selections
Upload progress
Payment selection
Billing updates
Progress transitions
AI Concierge appearance
Helper messages
Avoid flashy animations.
Everything should feel smooth and understated.

CONTENT REFINEMENT & HUMANIZATION
Review every screen in the intake and refine all written content to create a more natural, human, and professional experience.
Rewrite:
Page titles
Headings
Labels
Helper text
Instructions
Descriptions
Tooltips
Empty states
Upload guidance
Validation messages
Success messages
Payment explanations
Confirmation dialogs
AI Concierge messages
The tone should feel like an experienced software consultant personally guiding a client—not an AI filling out a questionnaire.
Use language that is:
Conversational but professional
Friendly without being overly casual
Confident without sounding sales-driven
Clear and concise
Easy for non-technical business owners to understand
Reassuring throughout the onboarding journey
Every section should clearly answer three questions for the client:
Why are we asking for this information?
How does it help us build a better solution for your business?
What happens after you complete this step?
Avoid:
Robotic or AI-generated phrasing
Repetitive wording
Long blocks of text
Technical jargon without explanation
Generic placeholder copy

Maintain a consistent enterprise SaaS voice that reflects MTHRYVE as a trusted software consultancy. The overall onboarding experience should feel collaborative, intelligent, and welcoming—giving clients confidence that they are working with a knowledgeable partner who understands their business goals and is guiding them toward the right software solution.





