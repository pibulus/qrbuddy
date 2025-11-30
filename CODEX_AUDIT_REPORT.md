# Codex Code Audit Report
**Date**: 2025-11-29
**Commits Audited**: b999178..2d1a438 (5 commits)
**Files Changed**: 45 files, +1727/-428 lines

---

## 🔴 Critical Issues

### 1. Missing useEffect Dependencies (BucketQR.tsx:166)
**Severity**: HIGH - Causes incorrect QR rendering

```typescript
// ❌ BAD: Only depends on isEmpty
useEffect(() => {
  // ... creates QR code with bucketUrl and style
}, [isEmpty]);

// ✅ SHOULD BE:
useEffect(() => {
  // ... creates QR code with bucketUrl and style
}, [isEmpty, bucketUrl, style]);
```

**Impact**: If `bucketUrl` or `style` changes, the QR code won't regenerate. User sees stale QR that points to wrong URL.

**Fix Required**: Add `bucketUrl` and `style` to dependency array.

---

## 🟡 Medium Issues

### 2. Code Duplication: handleKeypadPress Function
**Severity**: MEDIUM - Maintenance burden

**Duplicated in**:
- `islands/BucketQR.tsx` (lines 251-279)
- `islands/ExtrasModal.tsx` (lines 117-149)

**Issue**: Same keypad logic implemented twice with slight variations. The ExtrasModal version has better "back" button logic.

**Recommendation**: Extract to shared util:
```typescript
// utils/keypad.ts
export function useKeypad(initialDigits = 4) {
  const [digits, setDigits] = useState(Array(initialDigits).fill(""));

  const handlePress = (value: string) => { /* ... */ };
  const reset = () => setDigits(Array(initialDigits).fill(""));

  return { digits, handlePress, reset, value: digits.join("") };
}
```

### 3. Verbose Style Conditionals (BucketQR.tsx:469-502)
**Severity**: LOW - Code smell, not a bug

33 lines of repeated style conditional logic:
```typescript
className={`
  ${style === "sunset" ? "bg-gradient-to-br from-orange-50 to-pink-50" : ""}
  ${style === "ocean" ? "bg-gradient-to-br from-blue-50 to-cyan-50" : ""}
  // ... 30 more lines
`}
```

**Recommendation**: Extract to style lookup object:
```typescript
const BUCKET_STYLE_CLASSES = {
  sunset: "bg-gradient-to-br from-orange-50 to-pink-50",
  ocean: "bg-gradient-to-br from-blue-50 to-cyan-50",
  // ...
};
const styleClass = BUCKET_STYLE_CLASSES[style] || "bg-white";
```

---

## ✅ Security Review

### Authentication
- ✅ Uses `getAuthHeaders()` for all API calls (lines 186, 306 in BucketQR)
- ✅ Passwords sent in POST body, not URL (BucketQR.tsx:309-320)
- ✅ Owner tokens properly stored/retrieved from token-vault

### Input Validation
- ✅ PIN validation enforces 4 digits (ExtrasModal.tsx:154)
- ✅ File validation uses existing `validateFile()` util
- ✅ Proper error states and user feedback

### XSS/Injection
- ✅ No `dangerouslySetInnerHTML` usage
- ✅ User input properly escaped in JSX
- ✅ No eval() or Function() constructors

**Verdict**: No security vulnerabilities found.

---

## ✅ Memory Leak Review

### Event Listeners
- ✅ No addEventListener without cleanup
- ✅ useEffect cleanup properly implemented (ExtrasModal.tsx:90-99)

### Blob URLs
- ✅ `URL.revokeObjectURL()` called after file download (BucketQR.tsx:336)

### Timeouts/Intervals
- ✅ No long-lived intervals
- ✅ All timeouts are UI-only (progress simulation)

**Verdict**: No memory leaks detected.

---

## ✅ Code Quality

### Good Patterns Found
1. **Proper error handling**: Try/catch with detailed logging
2. **Haptic feedback**: Consistent UX with haptics.light/medium/success/error
3. **Toast notifications**: Using custom events instead of alert()
4. **Loading states**: Proper isUploading/isDownloading/isCreating flags
5. **Accessibility**: Proper button disabled states

### File-Level Summary

**BucketQR.tsx** (+344 lines)
- ✅ Clean state management
- ✅ Proper password handling (keypad + manual toggle)
- ✅ Good UX (preview hiding for password-protected)
- ❌ Missing useEffect dependencies (CRITICAL)
- ⚠️ Duplicated keypad logic
- ⚠️ Verbose style conditionals

**ExtrasModal.tsx** (+607 lines)
- ✅ Excellent confirmation flow (prevents accidental locker creation)
- ✅ Clean PIN validation
- ✅ Proper state reset on modal close
- ⚠️ Duplicated keypad logic

**useBucketCreator.ts** (+39 lines)
- ✅ Uses shared `apiRequest` helper
- ✅ Proper error handling with ApiError
- ✅ Security logging without exposing sensitive data

**useFileUpload.ts** (+15 lines)
- ✅ Better success message (no "self-destruct" for unlimited)
- ✅ Clean logic

---

## 📋 Recommendations

### Must Fix Before Deploy
1. **Fix BucketQR useEffect dependencies** (5 min fix)
   - Add `bucketUrl` and `style` to line 166 dependency array

### Should Fix Soon
2. **Extract keypad logic to shared util** (30 min)
   - Reduces duplication, easier to maintain
3. **Simplify style conditionals** (15 min)
   - Use lookup objects instead of 30+ line ternaries

### Nice to Have
4. **Add unit tests for keypad logic** (1 hour)
   - Complex state management, good candidate for testing

---

## 📊 Overall Assessment

**Code Quality**: 8/10
**Security**: 10/10
**Memory Safety**: 10/10
**Maintainability**: 7/10 (duplication hurts)

**Verdict**: ✅ **APPROVE WITH MINOR FIXES**

The code is well-structured, secure, and has no memory leaks. The critical useEffect bug must be fixed before deployment, but everything else is solid. The keypad duplication is annoying but not blocking.

Codex did good work on the UX flow - the PIN confirmation pattern is excellent and prevents accidental locker creation. The toggle between keypad/manual password is thoughtful for backwards compatibility.

---

## 🔧 Quick Fixes

### Fix #1: BucketQR useEffect (CRITICAL)
```typescript
// File: islands/BucketQR.tsx, Line 166
useEffect(() => {
  if (!canvasRef.current) return;
  // ... existing code ...
}, [isEmpty, bucketUrl, style]); // ← ADD THESE TWO
```

### Fix #2: Extract Keypad (RECOMMENDED)
```typescript
// Create: utils/use-keypad.ts
export function useKeypad(digitCount = 4) {
  const [digits, setDigits] = useState<string[]>(Array(digitCount).fill(""));

  const handlePress = (value: string) => {
    if (value === "clear") {
      setDigits(Array(digitCount).fill(""));
      return;
    }
    if (value === "back") {
      const next = [...digits];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i] !== "") {
          next[i] = "";
          setDigits(next);
          break;
        }
      }
      return;
    }
    if (digits.every((d) => d !== "")) return;

    const next = [...digits];
    const firstEmpty = next.findIndex((d) => d === "");
    if (firstEmpty !== -1) {
      next[firstEmpty] = value;
      setDigits(next);
    }
  };

  const reset = () => setDigits(Array(digitCount).fill(""));
  const value = digits.join("");

  return { digits, handlePress, reset, value };
}
```

Then in both BucketQR and ExtrasModal:
```typescript
const { digits: pinDigits, handlePress: handleKeypadPress, reset: resetPinDigits, value: pinValue } = useKeypad(4);
```
