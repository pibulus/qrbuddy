# QRBuddy UX/UI Review Guide

## 🎯 Review Focus Areas

This document guides a UX/UI agent through the key interactive elements and
animations in QRBuddy that need polish and refinement.

---

## 🎨 Design System Context

**QRBuddy Aesthetic**: Soft Brutal / Pastel Punk

- Chunky 4px black borders with custom shadow classes
- Warm cream backgrounds (#FFF8E8)
- Playful spring animations (squish, rotate, pop)
- Purple/pink accent colors for dynamic features
- High contrast text (near-black on cream)

---

## 🔍 Priority Review Areas

### 1. **Logo Uploader Modal** (`islands/LogoUploader.tsx`)

**Current State:**

- Drag-drop interface with file validation
- Shows preview after upload
- Remove button for clearing logo
- Modal backdrop with blur effect

**Review Focus:**

- Modal enter/exit animations (currently basic)
- Drag-over visual feedback (active state clarity)
- File preview transition smoothness
- Remove button hover state and feedback
- Spacing/padding consistency with design system
- Mobile responsive behavior

**Key Classes to Examine:**

```tsx
// Modal container
"fixed inset-0 bg-black/40 backdrop-blur-sm z-50";

// Modal content card
"bg-cream p-8 rounded-xl border-4 border-near-black shadow-brutal max-w-md w-full m-4";

// Drag-drop zone
"border-2 border-dashed border-gray-400 rounded-lg p-8 text-center";
```

**Suggested Improvements to Consider:**

- Add slide-up + fade-in animation for modal entrance
- Pulsing border on drag-over state
- Spring animation when preview appears
- Gentle hover lift on remove button

---

### 2. **Edit QR Modal** (`routes/q.tsx` with `islands/EditQRForm.tsx`)

**Current State:**

- Shows current destination URL with edit capability
- Scan limits dropdown (1/5/10/100/unlimited)
- Expiry date picker
- Save/Cancel buttons

**Review Focus:**

- Input field focus states and transitions
- Dropdown animation and visual hierarchy
- Date picker integration and styling
- Button states (hover, active, disabled)
- Form validation feedback
- Modal entrance animation consistency with logo uploader
- Spacing between form elements

**Key Components:**

```tsx
// Edit button (opens modal)
islands/EditQRForm.tsx - button with edit icon

// Modal structure
routes/q.tsx - modal overlay + content card

// Form inputs
- Text input for destination URL
- Select dropdown for scan limits
- Date input for expiry
```

**Suggested Improvements to Consider:**

- Unified modal animation system
- Input field focus rings with brand colors
- Smooth dropdown expand/collapse
- Save button feedback (loading state, success confirmation)
- Clearer visual hierarchy between sections

---

### 3. **About Modal** (Not yet implemented?)

**Status:** Need to locate or confirm if this exists

- Check for about/info modal in islands/
- May need to be created

**If Exists, Review:**

- Content layout and readability
- Animation consistency with other modals
- Close button placement and interaction
- Information hierarchy

---

### 4. **Main QR Code Hover Effects** (`islands/QRCanvas.tsx`)

**Current State:**

- QR code rendered on canvas element
- Download and Copy buttons nearby
- Shuffle button for random styles

**Review Focus:**

- QR code hover state (currently none?)
- Hover effects on surrounding action buttons
- Download button visual feedback
- Copy button interaction states
- Pointer cursor on interactive elements

**Suggested Improvements to Consider:**

- Subtle scale or glow on QR hover
- Button hover: gentle lift with shadow change
- Active/pressed states for buttons
- Success states (checkmark, color change)
- Loading states if generation is slow

---

### 5. **Download & Share Buttons** (`islands/ActionButtons.tsx`)

**Current Location:** Likely in ActionButtons island or integrated into QRCanvas

**Review Focus:**

- Button sizing and touch targets (mobile)
- Icon alignment and spacing
- Hover states and transitions
- Active/pressed feedback
- Success confirmation after action
- Loading states if applicable

**Current Button Patterns:**

```tsx
// Check islands/ActionButtons.tsx for:
- Download trigger button
- Copy to clipboard button
- Share functionality (if exists)
```

**Suggested Improvements to Consider:**

- Consistent hover lift animation (~2-4px)
- Shadow transition on hover
- Scale down on click (squish effect)
- Success state: brief checkmark or color flash
- Disabled states with clear visual indication

---

## 📱 Cross-Cutting Concerns

### Animation Consistency

- **Modal Entrances**: Should all use same timing/easing
- **Button Interactions**: Unified hover/active states
- **Transitions**: 200-300ms for most interactions, 400ms for modals

### Mobile Responsiveness

- Touch targets minimum 44x44px
- Modal sizing on small screens
- Spacing adjustments for mobile
- Gesture feedback (tap states)

### Accessibility

- Focus visible styles for keyboard navigation
- ARIA labels on icon-only buttons
- Modal focus trapping
- Color contrast ratios (WCAG AA minimum)

---

## 🎬 Animation Timing Reference

**Current Animations in Use:**

```tsx
// From existing codebase
- squish: scale(0.95) on active buttons
- rotate-shuffle: 360deg rotation for shuffle button
- pop: scale(1.05) for success states
```

**Suggested Timing:**

- **Fast**: 150ms - button hover states
- **Medium**: 250ms - input focus, dropdown expand
- **Slow**: 400ms - modal enter/exit
- **Spring**: Use cubic-bezier(0.34, 1.56, 0.64, 1) for playful bounce

---

## 🔧 Files to Review

**Islands (Interactive Components):**

1. `islands/LogoUploader.tsx` - Logo upload modal ⭐ HIGH PRIORITY
2. `islands/EditQRForm.tsx` - Edit QR form component ⭐ HIGH PRIORITY
3. `islands/QRCanvas.tsx` - Main QR display + hover effects ⭐ HIGH PRIORITY
4. `islands/ActionButtons.tsx` - Download/share buttons ⭐ HIGH PRIORITY
5. `islands/ShuffleButton.tsx` - Shuffle animation reference (GOOD EXAMPLE)

**Routes (Modal Containers):**

1. `routes/q.tsx` - Edit modal layout
2. `routes/index.tsx` - Main page with QR hover area

**Styles:**

1. `static/styles.css` - Custom animations and shadows
2. `tailwind.config.ts` - Design tokens and theme

---

## ✅ Success Criteria

After UX/UI review and improvements:

- [ ] All modals have smooth, consistent enter/exit animations
- [ ] Hover states are clear and delightful across all interactive elements
- [ ] Mobile touch targets are appropriately sized
- [ ] Focus states are visible for keyboard navigation
- [ ] Button interactions have satisfying feedback (visual + timing)
- [ ] QR code hover creates sense of interactivity
- [ ] Design system consistency maintained throughout
- [ ] No jarring transitions or abrupt state changes
- [ ] Animations feel "springy" and on-brand

---

## 🎯 Agent Instructions

1. **Audit Phase**: Review each priority area listed above, noting specific
   issues
2. **Design Phase**: Propose specific improvements with code examples
3. **Implementation Phase**: Apply changes with attention to:
   - Maintaining design system consistency
   - Cross-browser compatibility
   - Mobile responsiveness
   - Performance (avoid jank, keep animations smooth)
4. **Testing Phase**: Verify all interactions feel smooth and intentional

**Key Principle**: Every interaction should feel "juicy" - satisfying,
responsive, and delightful. Think Nintendo-level polish.

---

_Generated for UX/UI polish pass - QRBuddy v1.0_
