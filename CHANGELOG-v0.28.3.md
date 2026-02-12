# IntakeFlow v0.28.3 - Bug Fix Release

**Date:** February 5, 2026  
**Type:** Bug Fix  
**Status:** Fixed drag-and-drop node movement issue

---

## 🐛 Bug Fixed

### Node Movement Stuck After Drop

**Problem:**
- Nodes could be dragged from the palette and dropped onto the canvas ✅
- BUT once on the canvas, nodes became "stuck" and couldn't be moved ❌
- Drag would start but drop would do nothing

**Root Cause:**
In `flow-builder-react.js` line 78, the node movement detection had an overly strict condition:

```javascript
// OLD (v0.28.2) - TOO STRICT
if (draggedNode && nodeDragId && nodeDragId !== '') {
    // Update position...
}
```

This condition required BOTH:
1. `draggedNode` state to be set (from handleDragStart)
2. `nodeDragId` from dataTransfer to be truthy AND non-empty

**The Issue:** The `nodeDragId` check was redundant and sometimes failed due to:
- React re-render timing during drag
- dataTransfer data not persisting reliably across events
- Browser inconsistencies with dataTransfer.getData()

**Solution:**
Simplified the condition to only check `draggedNode` state:

```javascript
// NEW (v0.28.3) - SIMPLIFIED & RELIABLE
if (draggedNode) {
    // Update position...
}
```

This works because:
- `draggedNode` state is set by `handleDragStart` when a node drag begins
- It's a reliable React state that persists throughout the drag operation
- The palette drop already checks for `paletteNodeType` FIRST, so there's no conflict

---

## 📝 Changes

### Modified Files
1. **`assets/js/flow-builder-react.js`**
   - Line 78: Simplified node movement condition
   - Lines 79-81: Added debug logging
   - Lines 98-101: Enhanced debug output
   - Updated version to v0.28.3

2. **`intakeflow.php`**
   - Updated plugin version to 0.28.3
   - Updated INTAKEFLOW_VERSION constant

---

## ✅ Testing Checklist

After this fix, verify:

- [x] Drag node from palette → drops at mouse position ✅
- [x] Drag existing node on canvas → moves to new position ✅
- [x] Double-click node → opens editor ✅
- [x] Connect nodes → connections work ✅
- [x] Save/load flow → positions preserved ✅

---

## 🔍 Technical Details

### Event Flow (Working)

**Palette Drop:**
1. User drags palette button
2. `dragstart` on button → sets `dataTransfer['intakeflow/node-type']`
3. Drop on canvas → React `handleDrop` fires
4. Check: `paletteNodeType && !nodeDragId` ✅
5. Call `addNodeAtPosition()` → creates node

**Node Movement:**
1. User drags existing node
2. `handleDragStart` on node → sets `draggedNode` state + `dataTransfer['intakeflow/node-drag']`
3. Drop on canvas → React `handleDrop` fires
4. Check: `paletteNodeType && !nodeDragId` ❌ (fails, continues)
5. Check: `draggedNode` ✅ (NEW - simplified condition)
6. Update node position in React state

### Why This Fix Works

The key insight: **The `draggedNode` state is sufficient** to distinguish between:
- **Palette drops** - No `draggedNode` state set
- **Node movements** - `draggedNode` state exists

We don't need the redundant `nodeDragId` check because:
1. Palette drops return early (line 73) before reaching the node movement check
2. Only node drags set the `draggedNode` state
3. React state is more reliable than dataTransfer across browser events

---

## 📊 Impact

**Before (v0.28.2):**
- ❌ Nodes stuck after initial drop
- 😞 Frustrating UX - users couldn't position nodes
- 🐛 Major workflow blocker

**After (v0.28.3):**
- ✅ Full drag-and-drop functionality
- 😊 Smooth node positioning
- 🎯 Ready for production use

---

## 🚀 Deployment

To update:
1. Replace `/assets/js/flow-builder-react.js` with fixed version
2. Replace `intakeflow.php` with updated version numbers
3. Clear browser cache / hard refresh (Ctrl+Shift+R)
4. Test drag-and-drop in Flow Builder

---

## 📚 Related

- Original implementation: v0.28.0 (drag-and-drop from palette)
- Previous fix attempt: v0.28.2 (added node-drag data)
- This fix: v0.28.3 (simplified condition)

---

**Status:** ✅ FIXED and tested
**Next:** Continue with action node execution (capture_lead, redirect)
