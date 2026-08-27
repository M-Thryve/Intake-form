import { useMemo, useState, type ChangeEvent, type ReactNode } from "react"
import { Icon, type IconName } from "../components/icons/Icons"

type PortalView = "overview" | "projects" | "settings"
type ProjectTab = "summary" | "build-card" | "assets" | "agreement"

type Asset = {
  id: string
  name: string
  meta: string
  status: "accepted" | "pending scan" | "required"
}

type Project = {
  id: string
  reference: string
  name: string
  type: string
  status: string
  statusTone: "teal" | "amber" | "slate"
  submitted: string
  updated: string
  progress: number
  description: string
  next: string
  assets: Asset[]
  /** Change 5: client payment gate. "due" = Build Card issued, payment pending; "settled" = paid, full Build Card unlocked. */
  paymentStatus?: "due" | "settled"
}

const PROJECTS: Project[] = [
  {
    id: "northstar",
    reference: "MTH-2608-NS04",
    name: "Northstar membership platform",
    type: "Web app · Custom build",
    status: "Proposal ready",
    statusTone: "teal",
    submitted: "08 Aug 2026",
    updated: "Today, 9:42 AM",
    progress: 68,
    description:
      "A calm, member-first space for Northstar to bring programs, payments, and community into one place.",
    next: "Review your proposal",
    paymentStatus: "due",
    assets: [
      { id: "logo", name: "Northstar logo pack", meta: "PNG · 2.4 MB", status: "accepted" },
      { id: "brand", name: "Brand guidelines", meta: "PDF · 6.8 MB", status: "accepted" },
      { id: "programs", name: "Program photography", meta: "Required · 3–6 images", status: "required" },
      { id: "copy", name: "Member testimonials", meta: "Optional · document or PDF", status: "pending scan" },
    ],
  },
  {
    id: "fieldnotes",
    reference: "MTH-2604-FN18",
    name: "Fieldnotes studio",
    type: "Marketing site · Template",
    status: "In build",
    statusTone: "teal",
    submitted: "21 Apr 2026",
    updated: "05 Aug 2026",
    progress: 84,
    description: "A warm portfolio and booking experience for an independent creative studio.",
    next: "See project progress",
    assets: [
      { id: "fieldnotes-logo", name: "Fieldnotes logo", meta: "SVG · 820 KB", status: "accepted" },
    ],
  },
  {
    id: "harbor", 
    reference: "MTH-2603-HB07",
    name: "Harbor & Co.",
    type: "E-commerce · Custom build",
    status: "Information needed",
    statusTone: "amber",
    submitted: "03 Mar 2026",
    updated: "28 Jul 2026",
    progress: 42,
    description: "A considered online shop for a small-batch home goods collection.",
    next: "Add requested details",
    assets: [
      { id: "harbor-catalog", name: "Product catalog", meta: "Required · spreadsheet or PDF", status: "required" },
      { id: "harbor-logo", name: "Harbor & Co. logo", meta: "PNG · 1.1 MB", status: "accepted" },
    ],
  },
]

const NAV_ITEMS: { id: PortalView; label: string; glyph: IconName }[] = [
  { id: "overview", label: "Overview", glyph: "globe" },
  { id: "projects", label: "Projects", glyph: "projects" },
  { id: "settings", label: "Preferences", glyph: "settings" },
]

const TIMELINE = [
  { label: "Project submitted", date: "08 Aug 2026", detail: "Your project details are safely with our team.", done: true },
  { label: "Proposal ready", date: "Today", detail: "Review the scope, preliminary range, and delivery plan.", done: true, current: true },
  { label: "Agreement", date: "Up next", detail: "Your agreement will appear here when it is ready.", done: false },
  { label: "Build begins", date: "After agreement", detail: "We will keep you posted as your project moves forward.", done: false },
]

function Glyph({ children }: { children: ReactNode }) {
  const icon = children === "✉" ? "mail" : children as IconName
  return <span className="portal-glyph" aria-hidden="true"><Icon name={icon} size={18} /></span>
}

function StatusPill({ status, tone }: { status: string; tone: Project["statusTone"] }) {
  return <span className={`portal-status portal-status-${tone}`}><span className="portal-status-dot" />{status}</span>
}

function PortalLogo() {
  return (
    <div className="portal-logo" aria-label="M-Thryve client portal">
      <span className="portal-logo-mark"><span /><span /><span /></span>
      <span><strong>M-THRYVE</strong><small>CLIENT PORTAL</small></span>
    </div>
  )
}

function AuthScreen({ onEnter }: { onEnter: () => void }) {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [expired, setExpired] = useState(false)

  if (expired) {
    return (
      <main className="portal-auth-shell">
        <div className="portal-auth-card">
          <PortalLogo />
          <div className="portal-auth-icon portal-auth-icon-warm"><Icon name="refresh" size={24} /></div>
          <p className="portal-eyebrow">LINK EXPIRED</p>
          <h1>Your sign-in link has expired.</h1>
          <p className="portal-auth-copy">For your security, links work for a limited time. Request a new one and we’ll get you back in.</p>
          <button className="portal-button portal-button-primary portal-button-wide" onClick={() => setExpired(false)}>Request a new link</button>
        </div>
      </main>
    )
  }

  return (
    <main className="portal-auth-shell">
      <div className="portal-auth-card">
        <PortalLogo />
          <div className="portal-auth-icon"><Icon name="external" size={24} /></div>
        <p className="portal-eyebrow">WELCOME BACK</p>
        <h1>Pick up where you left off.</h1>
        <p className="portal-auth-copy">Enter the email you used for your project. We’ll send a secure sign-in link — no password to remember.</p>
        {sent ? (
          <div className="portal-sent-message" role="status">
            <span className="portal-sent-check"><Icon name="check" size={18} strokeWidth={2.2} /></span>
            <div><strong>Check your inbox</strong><span>We sent a sign-in link to {email}.</span></div>
          </div>
        ) : (
          <form onSubmit={(event) => { event.preventDefault(); setSent(true) }}>
            <label className="portal-field-label" htmlFor="portal-email">Email address</label>
            <input id="portal-email" className="portal-input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" />
            <button className="portal-button portal-button-primary portal-button-wide" type="submit">Email me a sign-in link <Icon name="arrow-right" size={14} /></button>
          </form>
        )}
        <button className="portal-text-button" onClick={() => setExpired(true)}>Having trouble with your link?</button>
        <p className="portal-auth-footnote">Secure access for clients of M-Thryve. Your projects are private to you.</p>
        {sent && <button className="portal-demo-link" onClick={onEnter}>Continue to demo portal <Icon name="arrow-right" size={13} /></button>}
      </div>
    </main>
  )
}

function EmptyProjects({ onStart }: { onStart: () => void }) {
  return (
    <div className="portal-empty-state">
      <div className="portal-empty-mark"><Icon name="plus" size={26} /></div>
      <p className="portal-eyebrow">YOUR PROJECTS</p>
      <h2>Your first project starts here.</h2>
      <p>Once you’ve shared your idea with us, it will appear here with clear next steps and a simple progress view.</p>
      <button className="portal-button portal-button-secondary" onClick={onStart}>Start an intake <Icon name="arrow-right" size={14} /></button>
    </div>
  )
}

function Overview({ project, onOpenProject, onOpenNamedProject }: { project: Project; onOpenProject: () => void; onOpenNamedProject: (id: string) => void }) {
  const outstanding = project.assets.filter((asset) => asset.status === "required")
  return (
    <>
      <section className="portal-welcome-row">
        <div><p className="portal-eyebrow">MONDAY, 10 AUGUST 2026</p><h1>Good morning, Alex.</h1><p className="portal-welcome-copy">Here’s the latest on your project journey.</p></div>
        <button className="portal-button portal-button-quiet"><span className="portal-button-glyph"><Icon name="help" size={15} /></span> Need a hand?</button>
      </section>

      <section className="portal-stat-grid" aria-label="Project summary">
        <div className="portal-stat-card"><span className="portal-stat-label">ACTIVE PROJECT</span><strong>{project.name}</strong><button className="portal-stat-link" onClick={onOpenProject}>View project <Icon name="external" size={13} /></button></div>
        <div className="portal-stat-card"><span className="portal-stat-label">CURRENT STAGE</span><strong><span className="portal-stat-live" />{project.status}</strong><span className="portal-stat-muted">Updated {project.updated}</span></div>
        <div className="portal-stat-card"><span className="portal-stat-label">NEXT MILESTONE</span><strong>{project.next}</strong><span className="portal-stat-muted">Your action keeps things moving</span></div>
      </section>

      <section className="portal-section-heading"><div><p className="portal-eyebrow">IN FOCUS</p><h2>Northstar membership platform</h2></div><button className="portal-link-button" onClick={onOpenProject}>Open project workspace <Icon name="arrow-right" size={13} /></button></section>

      <section className="portal-featured-card">
        <div className="portal-featured-top"><div><span className="portal-reference">{project.reference}</span><h2>{project.name}</h2><p>{project.type}</p></div><StatusPill status={project.status} tone={project.statusTone} /></div>
        <div className="portal-progress-row"><div><span>PROJECT PROGRESS</span><strong>{project.progress}%</strong></div><div className="portal-progress-track"><span style={{ width: `${project.progress}%` }} /></div><p>We’re shaping the final scope before work begins.</p></div>
        <div className="portal-featured-bottom"><span>Submitted {project.submitted}</span><button className="portal-button portal-button-primary" onClick={onOpenProject}>View project <Icon name="arrow-right" size={14} /></button></div>
      </section>

      <section className="portal-lower-grid">
        <div className="portal-panel portal-timeline-panel"><div className="portal-panel-heading"><div><p className="portal-eyebrow">YOUR JOURNEY</p><h2>Project timeline</h2></div><span className="portal-panel-count">2 of 4</span></div><div className="portal-timeline">{TIMELINE.map((item) => <div className={`portal-timeline-item ${item.done ? "is-done" : ""} ${item.current ? "is-current" : ""}`} key={item.label}><div className="portal-timeline-marker">{item.done && <Icon name="check" size={13} strokeWidth={2.2} />}</div><div className="portal-timeline-copy"><div><strong>{item.label}</strong><span>{item.date}</span></div><p>{item.detail}</p></div></div>)}</div></div>
        <div className="portal-panel portal-next-panel"><div className="portal-panel-heading"><div><p className="portal-eyebrow">KEEP THINGS MOVING</p><h2>Next steps</h2></div><Icon name="spark" size={18} /></div><div className="portal-task-list"><button className="portal-task portal-task-active" onClick={onOpenProject}><span className="portal-task-icon"><Icon name="upload" size={18} /></span><span><strong>Share remaining assets</strong><small>{outstanding.length} item{outstanding.length === 1 ? "" : "s"} still needed</small></span><span className="portal-task-arrow"><Icon name="arrow-right" size={14} /></span></button><button className="portal-task" onClick={onOpenProject}><span className="portal-task-icon portal-task-icon-soft"><Icon name="document" size={18} /></span><span><strong>Review your proposal</strong><small>Everything in one clear summary</small></span><span className="portal-task-arrow"><Icon name="arrow-right" size={14} /></span></button><div className="portal-trust-note"><Icon name="spark" size={15} /><p>We’ll always tell you what’s happening next — no guesswork, no jargon.</p></div></div></div>
      </section>

      <section className="portal-recent-heading"><div><p className="portal-eyebrow">ALL PROJECTS</p><h2>Project history</h2></div><button className="portal-link-button" onClick={onOpenProject}>See all projects <Icon name="arrow-right" size={13} /></button></section>
      <div className="portal-project-mini-grid">{PROJECTS.slice(1).map((item) => <button className="portal-project-mini" key={item.id} onClick={() => onOpenNamedProject(item.id)}><div><span className="portal-reference">{item.reference}</span><h3>{item.name}</h3><p>{item.type}</p></div><div><StatusPill status={item.status} tone={item.statusTone} /><span className="portal-mini-arrow"><Icon name="external" size={14} /></span></div></button>)}</div>
    </>
  )
}

function Projects({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  return <><section className="portal-welcome-row"><div><p className="portal-eyebrow">YOUR WORKSPACE</p><h1>All projects</h1><p className="portal-welcome-copy">A clear view of everything we’re building together.</p></div><button className="portal-button portal-button-secondary"><Icon name="plus" size={14} /> New project</button></section><div className="portal-project-grid">{PROJECTS.map((project) => <button className="portal-project-card" key={project.id} onClick={() => onOpenProject(project.id)}><div className="portal-project-card-top"><span className="portal-reference">{project.reference}</span><span className="portal-card-arrow"><Icon name="external" size={14} /></span></div><h2>{project.name}</h2><p>{project.description}</p><div className="portal-project-card-meta"><span>{project.type}</span><StatusPill status={project.status} tone={project.statusTone} /></div><div className="portal-mini-progress"><span style={{ width: `${project.progress}%` }} /></div><div className="portal-project-card-foot"><span>{project.progress}% complete</span><span>Updated {project.updated}</span></div></button>)}</div></>
}

function Settings() {
  const [preferences, setPreferences] = useState({ progress: true, assets: true, updates: true })
  const toggle = (key: keyof typeof preferences) => setPreferences((current) => ({ ...current, [key]: !current[key] }))
  return <><section className="portal-welcome-row"><div><p className="portal-eyebrow">YOUR ACCOUNT</p><h1>Preferences</h1><p className="portal-welcome-copy">Choose how you’d like to hear from us.</p></div></section><div className="portal-settings-grid"><section className="portal-panel portal-settings-card"><div className="portal-panel-heading"><div><p className="portal-eyebrow">EMAIL UPDATES</p><h2>Keep me in the loop</h2></div><Glyph>✉</Glyph></div><p className="portal-settings-intro">We only send useful updates about your projects. You can change these choices at any time.</p>{([{ key: "progress", title: "Project progress", detail: "A note when your project moves to a new stage." }, { key: "assets", title: "Asset reminders", detail: "A gentle reminder when we’re waiting for a file." }, { key: "updates", title: "Product updates", detail: "Occasional news from the M-Thryve team." }] as const).map((item) => <div className="portal-toggle-row" key={item.key}><div><strong>{item.title}</strong><span>{item.detail}</span></div><button className={`portal-toggle ${preferences[item.key] ? "is-on" : ""}`} aria-label={`Toggle ${item.title}`} aria-pressed={preferences[item.key]} onClick={() => toggle(item.key)}><span /></button></div>)}</section><section className="portal-panel portal-profile-card"><p className="portal-eyebrow">PROFILE</p><div className="portal-avatar">AR</div><h2>Alex Rivera</h2><p>alex@northstar.co</p><span className="portal-profile-company">Northstar</span><button className="portal-button portal-button-quiet">Contact support</button></section></div></>
}

function BuildCard({ project }: { project: Project }) {
  const [unlocked, setUnlocked] = useState(project.paymentStatus === "settled")

  // Change 5: the Build Card is issued to the client, but the full detail is
  // locked behind payment. "due" shows a preview + pay-to-unlock CTA; the real
  // unlock is driven by the server `commercial_stage` / payments state.
  if (!unlocked) {
    return (
      <div className="portal-build-card">
        <div className="portal-build-card-heading">
          <div>
            <span className="portal-reference">PRELIMINARY BUILD CARD · V1</span>
            <h2>A focused first release</h2>
            <p>{project.description}</p>
          </div>
          <span className="portal-approved-badge"><Icon name="check" size={14} strokeWidth={2.2} /> Ready to review</span>
        </div>
        <div className="portal-notice">
          <Icon name="info" size={16} />
          <p><strong>Payment required to unlock the full Build Card.</strong> Your Build Card has been issued for review. Pay the preliminary price to reveal the complete scope, pricing, and timeline.</p>
        </div>
        <div className="portal-build-metrics">
          <div><span>PRELIMINARY RANGE</span><strong>₱480k – ₱620k</strong><small>Subject to final agreement</small></div>
          <div><span>PRELIMINARY TIMELINE</span><strong>10 – 14 weeks</strong><small>Subject to final agreement</small></div>
          <div><span>FIRST RELEASE</span><strong>Member web app</strong><small>Responsive across devices</small></div>
        </div>
        <button className="portal-button portal-button-primary" onClick={() => setUnlocked(true)}>
          Pay ₱480k – ₱620k to unlock the full Build Card
        </button>
      </div>
    )
  }

  return <div className="portal-build-card"><div className="portal-build-card-heading"><div><span className="portal-reference">PRELIMINARY BUILD CARD · V1</span><h2>A focused first release</h2><p>{project.description}</p></div><span className="portal-approved-badge"><Icon name="check" size={14} strokeWidth={2.2} /> Ready to review</span></div><div className="portal-notice"><Icon name="info" size={16} /><p><strong>Preliminary — subject to final agreement.</strong> This view is an early planning range to help you make an informed decision.</p></div><div className="portal-build-metrics"><div><span>PRELIMINARY RANGE</span><strong>₱480k – ₱620k</strong><small>Subject to final agreement</small></div><div><span>PRELIMINARY TIMELINE</span><strong>10 – 14 weeks</strong><small>Subject to final agreement</small></div><div><span>FIRST RELEASE</span><strong>Member web app</strong><small>Responsive across devices</small></div></div><div className="portal-feature-list"><div><span>Included in the first release</span><strong>Core member experience</strong></div>{["Member onboarding and profiles", "Program discovery and saved items", "Account dashboard and updates", "Secure payments and receipts"].map((item) => <div className="portal-feature-row" key={item}><span className="portal-feature-check"><Icon name="check" size={14} strokeWidth={2.2} /></span>{item}<span className="portal-feature-priority">REQUIRED</span></div>)}</div></div>
}

function AssetsPanel({ project, onUpload }: { project: Project; onUpload: (file: File) => void }) {
  const [dragging, setDragging] = useState(false)
  const requiredCount = project.assets.filter((asset) => asset.status === "required").length
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) onUpload(file) }
  return <div className="portal-assets-panel"><div className="portal-detail-heading"><div><p className="portal-eyebrow">ASSET COMPLETION</p><h2>Bring your project to life.</h2><p>Share the remaining files our team needs. Every upload is checked before it’s added to your project.</p></div><div className="portal-asset-score"><strong>{project.assets.length - requiredCount}/{project.assets.length}</strong><span>ready</span></div></div><label className={`portal-upload-zone ${dragging ? "is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file) onUpload(file) }}><input type="file" onChange={handleFile} accept="image/png,image/jpeg,application/pdf,image/svg+xml" /><span className="portal-upload-icon"><Icon name="upload" size={22} /></span><strong>Drop a file here, or <em>browse</em></strong><small>PNG, JPG, SVG, or PDF · up to 25 MB</small></label><div className="portal-asset-list">{project.assets.map((asset) => <div className="portal-asset-row" key={asset.id}><div className="portal-file-icon"><Icon name="document" size={17} /></div><div className="portal-asset-copy"><strong>{asset.name}</strong><span>{asset.meta}</span></div><span className={`portal-asset-status portal-asset-status-${asset.status.replace(" ", "-")}`}>{asset.status === "accepted" ? <><Icon name="check" size={13} strokeWidth={2.2} /> Accepted</> : asset.status === "pending scan" ? <><Icon name="refresh" size={13} /> Pending scan</> : "Required"}</span><button className="portal-asset-more" aria-label={`More options for ${asset.name}`}><Icon name="more" size={16} /></button></div>)}</div><div className="portal-asset-footnote"><Icon name="info" size={14} /> Files are private to your project and scanned for safety before review.</div></div>
}

function AgreementPanel() {
  return <div className="portal-agreement-panel"><div className="portal-agreement-illustration"><Icon name="document" size={28} /></div><p className="portal-eyebrow">AGREEMENT</p><h2>Your project agreement will appear here.</h2><p>Once the final scope is ready, you’ll be able to review the details in one calm, readable place. We’ll let you know when it’s ready.</p><div className="portal-agreement-seam"><Icon name="spark" size={16} /><div><strong>Nothing to sign just yet</strong><small>This space is reserved for your final agreement.</small></div></div></div>
}

function ProjectDetail({ project, onBack }: { project: Project; onBack: () => void }) {
  const [tab, setTab] = useState<ProjectTab>("summary")
  const [projectState, setProjectState] = useState(project)
  const upload = (file: File) => setProjectState((current) => ({ ...current, assets: [...current.assets, { id: `upload-${Date.now()}`, name: file.name, meta: `${file.type.split("/")[1]?.toUpperCase() || "FILE"} · ${(file.size / 1024 / 1024).toFixed(1)} MB`, status: "pending scan" }] }))
  const tabs: { id: ProjectTab; label: string }[] = [{ id: "summary", label: "Summary" }, { id: "build-card", label: "Build Card" }, { id: "assets", label: "Your assets" }, { id: "agreement", label: "Agreement" }]
  return (
    <>
      <button className="portal-back-button" onClick={onBack}>
        <Icon name="arrow-left" size={15} />
        <span>Back to overview</span>
      </button>
      <section className="portal-detail-top">
        <div>
          <span className="portal-reference">{projectState.reference} · {projectState.type}</span>
          <h1>{projectState.name}</h1>
          <p>{projectState.description}</p>
        </div>
        <StatusPill status={projectState.status} tone={projectState.statusTone} />
      </section>
      <nav className="portal-detail-tabs" aria-label="Project sections">
        {tabs.map((item) => (
          <button className={tab === item.id ? "is-active" : ""} key={item.id} aria-current={tab === item.id ? "page" : undefined} onClick={() => setTab(item.id)}>
            {item.label}
            {item.id === "assets" && projectState.assets.some((asset) => asset.status === "required") && <span className="portal-tab-dot" />}
          </button>
        ))}
      </nav>
      {tab === "summary" && (
        <div className="portal-detail-grid">
          <div className="portal-panel portal-summary-panel">
            <div className="portal-panel-heading"><div><p className="portal-eyebrow">PROJECT BRIEF</p><h2>What we’re making</h2></div></div>
            <p className="portal-summary-copy">{projectState.description} The first release is designed to give members an easy way to find what matters, stay connected, and keep their progress moving.</p>
            <div className="portal-scope-block">
              <span className="portal-eyebrow">PRIORITIES</span>
              <div className="portal-chip-row"><span>Member experience</span><span>Simple navigation</span><span>Responsive design</span><span>Secure payments</span></div>
            </div>
            <div className="portal-summary-details"><div><span>PROJECT TYPE</span><strong>Custom web app</strong></div><div><span>SUBMITTED</span><strong>{projectState.submitted}</strong></div><div><span>LAST UPDATED</span><strong>{projectState.updated}</strong></div></div>
          </div>
          <div className="portal-panel portal-mini-timeline">
            <div className="portal-panel-heading"><div><p className="portal-eyebrow">WHAT’S NEXT</p><h2>Your timeline</h2></div></div>
            {TIMELINE.map((item) => (
              <div className={`portal-mini-timeline-row ${item.done ? "is-done" : ""}`} key={item.label}>
                <span className="portal-mini-marker">{item.done && <Icon name="check" size={13} strokeWidth={2.2} />}</span>
                <div><strong>{item.label}</strong><span>{item.date}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === "build-card" && <BuildCard project={projectState} />}
      {tab === "assets" && <AssetsPanel project={projectState} onUpload={upload} />}
      {tab === "agreement" && <AgreementPanel />}
    </>
  )
}

export default function ClientPortal() {
  const [authenticated, setAuthenticated] = useState(true)
  const [view, setView] = useState<PortalView>("overview")
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const activeProject = useMemo(() => PROJECTS.find((project) => project.id === (selectedProject || "northstar")) || PROJECTS[0], [selectedProject])

  if (!authenticated) return <AuthScreen onEnter={() => setAuthenticated(true)} />

  const openProject = (id = "northstar") => { setSelectedProject(id); setView("overview"); setMobileNavOpen(false) }
  const selectView = (nextView: PortalView) => { setView(nextView); setSelectedProject(null); setMobileNavOpen(false) }
  const content = selectedProject ? <ProjectDetail project={activeProject} onBack={() => setSelectedProject(null)} /> : view === "overview" ? <Overview project={PROJECTS[0]} onOpenProject={() => openProject()} onOpenNamedProject={openProject} /> : view === "projects" ? <Projects onOpenProject={openProject} /> : <Settings />

  return (
    <div className="portal-app-shell">
      <aside className="portal-sidebar">
        <PortalLogo />
        <div className="portal-sidebar-label">YOUR SPACE</div>
        <nav className="portal-sidebar-nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <button className={view === item.id && !selectedProject ? "is-active" : ""} key={item.id} aria-current={view === item.id && !selectedProject ? "page" : undefined} onClick={() => selectView(item.id)}>
              <Glyph>{item.glyph}</Glyph>
              {item.label}
              {item.id === "projects" && <span className="portal-nav-count">3</span>}
            </button>
          ))}
        </nav>
        <div className="portal-sidebar-bottom">
          <div className="portal-sidebar-help">
            <Icon name="spark" size={18} />
            <strong>Need a hand?</strong>
            <p>We’re here when you need us.</p>
            <button>Contact support <Icon name="arrow-right" size={13} /></button>
          </div>
          <button className="portal-account-button" onClick={() => setAuthenticated(false)}>
            <span className="portal-avatar portal-avatar-small">AR</span>
            <span><strong>Alex Rivera</strong><small>Northstar</small></span>
            <span className="portal-account-more"><Icon name="more" size={16} /></span>
          </button>
        </div>
      </aside>
      <main className="portal-main">
        <header className="portal-mobile-header">
          <button className="portal-mobile-menu" aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)}>
            <Icon name={mobileNavOpen ? "close" : "menu"} size={20} />
          </button>
          <PortalLogo />
          <button className="portal-avatar portal-avatar-small" aria-label="Sign out" onClick={() => setAuthenticated(false)}>AR</button>
        </header>
        {mobileNavOpen && (
          <nav className="portal-mobile-nav" aria-label="Mobile navigation">
            {NAV_ITEMS.map((item) => (
              <button className={view === item.id && !selectedProject ? "is-active" : ""} key={item.id} aria-current={view === item.id && !selectedProject ? "page" : undefined} onClick={() => selectView(item.id)}>
                <Glyph>{item.glyph}</Glyph>
                {item.label}
              </button>
            ))}
          </nav>
        )}
        <div className="portal-content">{content}</div>
        <footer className="portal-footer">
          <span>© 2026 M-Thryve</span>
          <span>Built with care for your next chapter <b><Icon name="spark" size={12} /></b></span>
          <button>Privacy</button>
        </footer>
      </main>
    </div>
  )
}
