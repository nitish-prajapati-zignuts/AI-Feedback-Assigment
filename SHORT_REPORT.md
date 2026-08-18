# Engineering & AI Integration Report

This report summarizes the engineering processes, AI tooling utilization, architecture audits, and quality assurance strategies applied during the development of the AI Customer Feedback & Insights Tracker.

---

## 🤖 AI Tools Used & Application

1. **Claude (Thinking Mode)** & **Gemini (Flash & Medium)**
   - Used for full-stack feature generation, database schema design, and layout optimization.
   - Refactored complex components (such as the Kanban board and responsive table layouts).
   - Designed database tables and migration statements for Drizzle ORM.

---

## 💬 Important Prompts & Directives
- **Self-Hosted TinyMCE CDN**:
  > *"When loading TinyMCE from public Tiny Cloud CDN without a registered key, the cloud validation server blocks the editor. To prevent this, load the editor via a self-hosted CDN setup (cdnjs) by configuring the `tinymceScriptSrc` parameter."*
- **Layout Width Adjustments**:
  > *"Increase the dialog width to implement rich text editor. Rearrange all the components which use minimal scroll options."*
- **Database Rules**:
  > *"Use a soft delete boolean flag (`is_deleted` / `isDeleted`) for all deletion options (feedback records, action items, internal notes)."*

---

## ❌ Where AI-Generated Advice/Code Was Incorrect
- **API Key Cloud Validation**:
  - *Incorrect Advice*: Early suggestions recommended standard `@tinymce/tinymce-react` components without changing the script source, which consistently triggered blockages and 404 validation errors on production.
  - *Correction*: Manually forced the wrapper to load the self-hosted editor core (`v6.8.2`) using `tinymceScriptSrc` pointing directly to Cloudflare's cdnjs CDN, which completely bypassed API key validation.
- **Select Component Type Checking**:
  - *Incorrect Code*: The AI generated select input event handlers in the filters block using direct state setters (`onValueChange={setCategoryFilter}`).
  - *Correction*: TypeScript compilation failed because the handler expects values compatible with `string | null`. Added fallback clauses to default to `"All"` (e.g., `onValueChange={(v) => setCategoryFilter(v ?? "All")}`).

---

## 🛠️ Manual Changes & Independent Engineering Decisions
- **Optimized Column Width Ratios (3:2)**:
  - Inside the Action Item dialogs, the description editor was cramped while fields like Status/Priority had excessive blank space. Redistributed columns to a 3:2 layout (`md:grid-cols-5`) so that the rich-text editor occupies 60% of the horizontal space.
- **Cascaded Soft-Deletes**:
  - Independently implemented soft-delete cascades in the backend controller (`deleteFeedback`). When a feedback entry is marked as deleted, it automatically marks all associated action items and internal notes as deleted in a single transaction.
- **Horizontal Metadata Layout**:
  - Replaced the high-density 2x3 metadata grid on the Feedback details page with a horizontal, wrap-safe layout (`flex-wrap gap-x-8`) to prevent layout clipping and minimize vertical scrolling.

---

## 🧪 Output Validation & Verification
- **Build Checks**:
  - Continuously executed `npx tsc --noEmit` on the frontend workspace to verify strict type safety.
  - Performed complete Next.js production builds (`npm run build`) to ensure that all page dynamic pre-renders and server-side routes compile with zero warnings or errors.
- **Database Schema Validation**:
  - Run Drizzle migrations via `npm run db:migrate` and checked database table structures inside PostgreSQL on Neon to ensure schema fields map to Drizzle metadata correctly.

---

## 🛡️ Identified Security, Quality, & Architecture Concerns

### Security Concerns
- **Secure Notes Creator Tracking**:
  - *Identified*: Client-side notes forms could falsify the author parameter (sending any name in `createdBy`).
  - *Mitigation*: The backend note controller ignores any client-supplied `createdBy` field and resolves the author securely using the user database profile associated with the validated JWT cookie session.

### Quality & Architecture Concerns
- **Truncated HTML Renderings**:
  - Displaying TinyMCE's HTML output inside small table cells or Kanban cards can break layouts if complex elements (like headers or tables) are present. Applied Tailwind `.prose` line-clamp styling to format the output as a preview.
- **Neon HTTP Connection Limits**:
  - Serverless Neon HTTP connections can quickly scale out under heavy traffic. Ensured database pools use singletons where possible.
