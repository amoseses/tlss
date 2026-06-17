/**
 * README: Implementation Priority & Next Steps
 */

# Givit MVP Cleanup & Polish - Implementation Guide

## 📋 What's Included

This branch (`feat/cleanup-implementation`) contains **starter code templates** for all major cleanup tasks.

### ✅ Implemented (Ready to Use)

- **Product Reviews Schema & Components** (`artifacts/product-reviews/`)
  - Database schema with ratings, moderation, and helpful votes
  - Review card, form, and section components
  - Integration points marked for API calls

- **Gift Board Enhancements** (`artifacts/gift-boards/`)
  - Pinterest-style masonry gallery component
  - Gift board card with like and share buttons
  - Schema for boards, items, images, and likes

- **Spreadsheet Importer (Admin)** (`artifacts/admin/spreadsheet-importer/`)
  - CSV/Excel upload form with drag-drop
  - Schema for tracking import jobs and items
  - Admin review UI for extracted products
  - Worker integration points (TODO: implement background worker)

- **Multi-Admin Support** (`artifacts/admin-permissions/`)
  - Admin users table with role-based access (Owner, Admin, Editor)
  - Audit logging for compliance
  - Admin management UI with invite flow

- **Header Refactor** (`artifacts/ui-polish/components/Header.tsx`)
  - Full-width Amazon-style search bar
  - Auto Pilot button removed
  - Browse button removed
  - Responsive mobile menu
  - High-contrast design

- **Concierge Widget Cleanup** (`artifacts/ui-polish/components/ConciergeWidget.tsx`)
  - Consolidated 3 main flows: Find Gift, AutoGift, Create Board
  - Floating button with clean interface
  - Message history with typing indicator

- **UI Polish Theme** (`artifacts/ui-polish/`)
  - Tailwind config with reduced border radius (6px primary)
  - 8-point spacing grid
  - Deep violet + mint color palette
  - Micro-interaction animations
  - Theme constants for easy reference

- **AI System Prompt** (`artifacts/llm-system-prompt/givit-ai-prompt.md`)
  - Production-ready Givit AI persona
  - Intent detection framework
  - Conversation memory guidelines
  - Tone and style guidelines
  - Analytics hooks

- **Landing Page Copy** (`artifacts/ui-polish/copy/landing-page-copy.ts`)
  - Removed tacky taglines
  - Clear value props
  - Trust/testimonial structure

- **Utility Components** (`artifacts/ui-polish/components/PolishLayout.tsx`)
  - CleanCard, PolishSection, ButtonGroup, InfoBox, PolishGrid
  - Use as templates for refactoring existing pages

- **AutoGift Explainer Modal** (`artifacts/ui-polish/components/AutoGiftExplainerModal.tsx`)
  - Step-by-step walkthrough of how AutoGift works
  - Expandable details for each step
  - Clear CTA buttons

### 🚧 TODO - Requires Integration

1. **AI LLM Improvements**
   - Update system prompt (provided in `givit-ai-prompt.md`)
   - Implement intent detection in chat
   - Add conversation memory persistence
   - Build/integrate data scraper for ~200 new product links
   - Implement session context storage

2. **Backend/Database**
   - Run migrations for new schemas (reviews, boards, imports, admin roles)
   - Create API endpoints for all CRUD operations
   - Implement background worker for spreadsheet import (URL scraping)
   - Add audit logging middleware

3. **Page Updates**
   - Replace header component on all pages
   - Update landing page with new copy and AutoGift explainer
   - Refactor product detail pages to include review section
   - Implement Gift Board gallery on home/dedicated page
   - Add admin dashboard with new panels

4. **Feature Completion**
   - Concierge button needs routing to correct flows
   - AutoGift button rename: "Conquer" → "AutoGift"
   - "Try AI" button visibility improvements
   - Logo + favicon creation
   - Image compression pipeline setup

5. **Testing & QA**
   - Test responsive design on all breakpoints
   - Verify accessibility (WCAG AA)
   - Load testing for new database operations
   - Cross-browser testing

---

## 🚀 Next Steps

1. **Review & Customize**
   - Go through each component and adapt to your existing codebase
   - Update colors, spacing, or typography as needed
   - Check for any missing integrations

2. **Set Up Migrations**
   ```bash
   # Generate Drizzle migrations for new schemas
   pnpm drizzle-kit generate
   pnpm drizzle-kit migrate
   ```

3. **Create API Routes**
   - Product reviews: `/api/products/:id/reviews`, `/api/reviews/:id/helpful`
   - Gift boards: `/api/boards`, `/api/boards/:id/items`, `/api/boards/:id/like`
   - Admin: `/api/admin/users`, `/api/admin/imports`

4. **Test Components Locally**
   - Import components into your pages
   - Connect to real data
   - Verify styling and interactions

5. **Deploy**
   - Create a PR from `feat/cleanup-implementation` to `main`
   - Run full test suite
   - Deploy to staging first
   - Then production

---

## 📁 File Structure

```
artifacts/
├── product-reviews/
│   ├── schema.ts
│   └── components/
│       ├── ProductReviewCard.tsx
│       ├── ProductReviewForm.tsx
│       └── ProductReviewSection.tsx
├── gift-boards/
│   ├── schema.ts
│   └── components/
│       ├── GiftBoardCard.tsx
│       └── GiftBoardGallery.tsx
├── admin/
│   └── spreadsheet-importer/
│       ├── schema.ts
│       └── components/
│           ├── SpreadsheetUploadForm.tsx
│           └── ImportJobStatus.tsx
├── admin-permissions/
│   ├── schema.ts
│   └── components/
│       └── AdminManagementPanel.tsx
├── llm-system-prompt/
│   └── givit-ai-prompt.md
├── ui-polish/
│   ├── tailwind-theme.config.ts
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── ConciergeWidget.tsx
│   │   ├── TypingIndicator.tsx
│   │   ├── AIGiftButton.tsx
│   │   ├── AutoGiftExplainerModal.tsx
│   │   └── PolishLayout.tsx
│   ├── constants/
│   │   └── theme.ts
│   ├── copy/
│   │   └── landing-page-copy.ts
│   ├── POLISH_CHECKLIST.ts
│   └── CONCIERGE_CLEANUP_GUIDE.ts
└── components/
    └── TypingIndicator.tsx
```

---

## 🎨 Design System

**Colors:**
- Primary: `#7c3aed` (deep violet)
- Accent: `#22c55e` (mint green)
- Border Radius: `6px` (reduced from 12px+)
- Spacing: 8-point grid (4, 8, 12, 16, 24, 32px)

**Typography:**
- Headings: Bold, 18-36px
- Body: Regular, 14-16px
- Small text: 12px

**Shadows:**
- Subtle: `0 1px 2px rgba(0,0,0,0.05)`
- Base: `0 4px 6px rgba(0,0,0,0.1)`
- Large: `0 20px 25px rgba(0,0,0,0.1)`

---

## ❓ Questions?

Refer to the inline code comments or the checklists:
- `artifacts/ui-polish/POLISH_CHECKLIST.ts`
- `artifacts/ui-polish/CONCIERGE_CLEANUP_GUIDE.ts`
