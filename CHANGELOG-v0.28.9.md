# IntakeFlow Changelog

## [0.28.9] - 2026-02-11

### Added
- **Delete Connections Feature**: Hover over any connection line to see delete button
  - Connection turns red on hover with thicker line (3px vs 2px)
  - Red circular delete button (×) appears at connection midpoint
  - Wide 20px invisible hit area for easy clicking
  - Confirmation dialog before deletion
  - Smooth 0.2s transitions between states

### Technical Changes
- Added `hoveredEdgeId` state to track hovered connections
- Implemented invisible wide stroke path for better click detection
- Added hover state styling with color/width transitions
- Connection deletion removes edge from state without affecting nodes

---

## [0.28.8] - 2026-02-11

### Added
- **Connection Preview Line**: Visual feedback while creating connections
  - Orange dashed line follows mouse cursor while connecting
  - Shows exactly where connection will go before completing
  - Disappears on connection completion or cancellation
  - Smooth bezier curve matching normal connections

### Technical Changes
- Added `connectionPreviewMouse` state to track mouse position
- Updated `handleCanvasMouseMove` to track mouse during connection mode
- Created `connectionPreviewLine` component with dashed stroke
- Preview cleared on connection complete, cancel, or self-connection attempt

---

## [0.28.7] - 2026-02-11

### Changed
- **COMPLETE REDESIGN**: Switched from HTML5 drag-and-drop to mouse events for node movement
  - HTML5 drag-and-drop unreliable for repositioning absolute-positioned elements
  - Mouse events (mousedown/mousemove/mouseup) now handle node dragging
  - Palette-to-canvas still uses HTML5 drag (works perfectly for that use case)

### Added
- `isDraggingNode` state flag
- `dragOffset` state to track grab point on node
- Mouse event handlers: `handleNodeMouseDown`
- Updated `handleCanvasMouseMove` to handle node dragging
- Updated `handleCanvasMouseUp` to end node dragging

### Removed
- `draggable="true"` from node containers
- `onDragStart` handler from nodes
- `onDragOver` handler from node containers

### Technical Changes
- Node cursor changes: `grab` when idle, `grabbing` when dragging
- Transitions disabled during drag for smooth movement
- Position calculated accounting for zoom, pan, and grab offset
- `e.stopPropagation()` on node mousedown prevents canvas pan

---

## [0.28.6] - 2026-02-11

### Changed
- Removed `e.stopPropagation()` from `handleDragStart`
  - Was preventing browser from activating native drag system
  - Event must bubble for HTML5 drag to work

### Removed
- `onDragOver` handler from node container (caused circular reference)
- `draggable: false` from delete button (unnecessary)

---

## [0.28.5] - 2026-02-11

### Changed
- Wrapped all text content in container with `pointerEvents: 'none'`
- Added explicit `pointerEvents: 'auto'` to interactive elements
- Attempt to fix node dragging by preventing text from blocking drag

---

## [0.28.4] - 2026-02-11

### Added
- `onMouseDown: (e) => e.stopPropagation()` to child elements
  - Delete button
  - Input handle
  - Branch output handles
  - Regular output handle
- `pointerEvents: 'none'` to text elements

### Changed
- Attempt to fix node dragging by preventing child elements from blocking

---

## [0.28.3] - 2026-02-11

### Changed
- Simplified drop condition in `handleDrop` (line 78)
- Now checks only `draggedNode` state instead of both `draggedNode` AND `nodeDragId`
- React state more reliable than dataTransfer across browser events

### Added
- Debug logging in drop handler

---

## [0.28.2] - 2026-02-11

### Added
- `nodeDragId` to dataTransfer in `handleDragStart`
- Additional logging for debugging drag operations

---

## [0.28.0] - 2026-02-11

### Added
- Initial implementation of drag-and-drop from palette to canvas
- Nodes can be dropped onto canvas but cannot be repositioned (this issue resolved in v0.28.7)

---

## [0.27.2] - 2026-02-05

### Fixed
- Node deduplication on save and load
- Orphaned code cleanup

---

## [0.27.1] - 2026-02-05

### Fixed
- Debug logging for save/load data loss issues

---

## [0.27.0] - 2026-02-05

### Added
- Smart grid-based positioning system
- 300px grid with spiral search for empty spots
- Prevents node overlaps in complex flows

### Changed
- Replaced simple vertical stacking with intelligent positioning

---

## Earlier Versions

See `IntakeFlow_Project_Memory_v0.28.9.md` for complete version history from v0.12.0 through v0.26.12, including:
- Unified Message/Question nodes (v0.23.0)
- Branch multi-output system (v0.21.0)
- Frontend chat widget (v0.24.0)
- Visibility controls (v0.25.0-v0.26.1)
- Branch evaluation fixes (v0.26.2-v0.26.5)
- Action config save fixes (v0.26.6-v0.26.10)

---

## Visual Canvas Status (v0.28.9)

✅ **COMPLETE** - All features implemented:
- Drag-and-drop from palette
- Move nodes on canvas (mouse events)
- Pan and zoom canvas
- Create connections (click-based)
- Connection preview line (orange dashed)
- Delete connections (hover + click)
- Delete nodes (hover button)
- Edit node configurations (double-click)
- Save/load flows with data integrity

**Next Priority**: Action node execution (capture_lead, redirect)
