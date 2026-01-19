# Astigmatism Implementation Plan

## Overview

Astigmatism causes directional blur - light focuses at different distances depending on orientation. In prescriptions:
- **Sphere (SPH)**: Overall myopia/hyperopia (-10.00 to +10.00 D) - ALREADY IMPLEMENTED
- **Cylinder (CYL)**: Astigmatism strength (0 to -6.00 D typically, -4.00 D max common)
- **Axis**: Orientation of astigmatism (0° to 180°)

## UI Changes Needed

### For Each Eye (Left & Right):

```javascript
Current:
- Sphere slider: 0 to -10 D

Add:
- Cylinder slider: 0 to -4 D (steps of 0.25)
- Axis slider: 0° to 180° (steps of 5° or 10°)
```

### Layout Options:

**Option A: Expanded Eye Controls**
```
Left Eye (OS)                    Right Eye (OD)
├─ Sphere: -3.50 D              ├─ Sphere: -3.00 D
├─ Cylinder: -1.50 D            ├─ Cylinder: -2.00 D
└─ Axis: 90°                    └─ Axis: 180°
```

**Option B: Collapsible Sections**
```
Left Eye: -3.50 D (CYL -1.50 @ 90°)  [expand]
Right Eye: -3.00 D (CYL -2.00 @ 180°) [expand]
```

**Recommendation**: Option A for simplicity and immediate visual feedback.

## Rendering Approaches

### Approach 1: Directional Blur with Canvas Filter (EASIEST)

**Pros:**
- Simple implementation
- Good performance
- Works with existing codebase

**Cons:**
- Limited control over blur quality
- May not perfectly represent real astigmatism
- CSS filters don't support true directional blur

**Implementation:**
```javascript
function applyAstigmatismBlur(ctx, video, canvas, sphere, cylinder, axis) {
    // Convert axis to radians
    const axisRad = (axis * Math.PI) / 180;

    // Calculate blur amounts
    const sphereBlur = calculateBlur(sphere);
    const cylinderBlur = calculateBlur(Math.abs(cylinder));

    // Rotate canvas context
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(axisRad);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Apply blur (would need custom implementation for directional)
    // CSS filter only supports uniform blur, so this is simplified
    ctx.filter = `blur(${sphereBlur + cylinderBlur}px)`;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    ctx.restore();
}
```

**Issue**: CSS `blur()` filter is uniform, not directional. Need better approach.

---

### Approach 2: Two-Pass Gaussian Blur (RECOMMENDED)

**Pros:**
- True directional blur
- Good performance (GPU-accelerated)
- Accurate representation

**Cons:**
- More complex implementation
- Requires two rendering passes

**Implementation Strategy:**
1. Render video to temporary canvas
2. Apply horizontal blur with strength based on axis
3. Apply vertical blur with strength perpendicular to axis
4. Combine with rotation for axis orientation

**Pseudo-code:**
```javascript
function applyDirectionalBlur(video, canvas, sphere, cylinder, axis) {
    const ctx = canvas.getContext('2d');

    // Create temporary canvases
    const tempCanvas1 = document.createElement('canvas');
    const tempCanvas2 = document.createElement('canvas');
    tempCanvas1.width = tempCanvas2.width = canvas.width;
    tempCanvas1.height = tempCanvas2.height = canvas.height;

    const tempCtx1 = tempCanvas1.getContext('2d');
    const tempCtx2 = tempCanvas2.getContext('2d');

    // Calculate blur amounts
    const sphereBlur = calculateBlur(sphere);
    const cylinderBlur = calculateBlur(Math.abs(cylinder));

    // Calculate directional blur components
    const axisRad = (axis * Math.PI) / 180;
    const blurX = sphereBlur + cylinderBlur * Math.abs(Math.cos(axisRad));
    const blurY = sphereBlur + cylinderBlur * Math.abs(Math.sin(axisRad));

    // Pass 1: Horizontal blur
    tempCtx1.filter = `blur(${blurX}px)`;
    tempCtx1.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Pass 2: Vertical blur (can't directly control in CSS, need workaround)
    tempCtx2.filter = `blur(${blurY}px)`;
    tempCtx2.drawImage(tempCanvas1, 0, 0);

    // Final: Draw to main canvas
    ctx.drawImage(tempCanvas2, 0, 0);
}
```

**Issue**: CSS filters still can't do true horizontal/vertical only blur.

---

### Approach 3: Stack Blur Library (GOOD COMPROMISE)

**Pros:**
- True directional blur capability
- Fast JavaScript implementation
- Well-tested library

**Cons:**
- External dependency (~4KB)
- Slightly slower than CSS filters
- CPU-based (not GPU)

**Library**: StackBlur.js (https://github.com/flozz/StackBlur)

**Implementation:**
```javascript
// Include StackBlur library
// <script src="https://cdnjs.cloudflare.com/ajax/libs/stackblur-canvas/2.2.0/stackblur.min.js"></script>

function applyAstigmatismBlur(video, canvas, sphere, cylinder, axis) {
    const ctx = canvas.getContext('2d');

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Calculate blur amounts
    const sphereBlur = calculateBlur(sphere);
    const cylinderBlur = calculateBlur(Math.abs(cylinder));

    // Apply directional blur using rotation
    const axisRad = (axis * Math.PI) / 180;

    // For now, use StackBlur for uniform blur
    // Can be extended for directional blur with rotation
    const totalBlur = sphereBlur + (cylinderBlur * 0.5); // Simplified
    StackBlur.canvasRGB(canvas, 0, 0, canvas.width, canvas.height, totalBlur);
}
```

---

### Approach 4: WebGL Shader (MOST ACCURATE, COMPLEX)

**Pros:**
- Most accurate representation
- Best performance (GPU)
- Full control over blur

**Cons:**
- Complex implementation
- Requires WebGL knowledge
- May not work on older devices

**Implementation**: Would require custom GLSL shaders with directional Gaussian blur.

---

## Recommended Implementation

### Phase 1: Basic Astigmatism (Quick Win)
Use **Approach 1** with a simplified directional model:
- Add UI controls for cylinder and axis
- Calculate effective blur as weighted combination
- Use existing blur function with enhanced calculation:

```javascript
function calculateAstigmatismBlur(sphere, cylinder, axis) {
    const sphereBlur = calculateBlur(sphere);
    const cylinderBlur = calculateBlur(Math.abs(cylinder));

    // Simplified: average blur increased by cylinder strength
    // Not perfectly accurate but visually reasonable
    return sphereBlur + (cylinderBlur * 0.5);
}
```

### Phase 2: Directional Blur (If needed)
Implement **Approach 2 or 3** for true directional blur.

---

## UI/UX Considerations

### Cylinder Slider
```
Range: 0.00 to -4.00 D
Step: 0.25 D
Default: 0.00
Display: "CYL: -1.50 D"
```

### Axis Slider
```
Range: 0° to 180°
Step: 10°
Default: 90°
Display: "AXIS: 90°"
Note: Only active when cylinder != 0
```

### Visual Indicators
- Disable axis slider when cylinder = 0
- Show prescription summary: "-3.50 -1.50 × 90"
- Add tooltip explaining axis orientation

---

## Testing Plan

1. **Test cases:**
   - Pure myopia (no cylinder): Current behavior
   - Horizontal astigmatism (axis 180°)
   - Vertical astigmatism (axis 90°)
   - Oblique astigmatism (axis 45°, 135°)
   - High cylinder (-3.00 D)

2. **Validation:**
   - Compare with real prescription glasses if available
   - Test on various devices (Mac, Windows, mobile)
   - Verify performance (should maintain 60fps)

---

## Code Changes Needed

### 1. Add variables (line ~470):
```javascript
let leftCylinder = 0;
let leftAxis = 90;
let rightCylinder = 0;
let rightAxis = 90;
```

### 2. Update HTML (eye controls section):
Add cylinder and axis sliders for each eye

### 3. Modify blur calculation (line ~480):
Replace `calculateBinocularBlur()` with astigmatism-aware version

### 4. Update display functions:
Show cylinder and axis values

---

## Estimated Complexity

- **Phase 1 (Basic)**: ~2-3 hours
  - UI: 30 min
  - Logic: 1 hour
  - Testing: 1 hour

- **Phase 2 (Directional)**: ~4-6 hours
  - Research/planning: 1 hour
  - Implementation: 2-3 hours
  - Testing/refinement: 2 hours

---

## Next Steps

1. Fix Mac camera issue (current priority)
2. Implement Phase 1 basic astigmatism
3. Test with real prescriptions
4. If needed, upgrade to Phase 2 directional blur

---

## References

- Astigmatism explanation: https://en.wikipedia.org/wiki/Astigmatism
- StackBlur library: https://github.com/flozz/StackBlur
- WebGL blur shaders: https://webglfundamentals.org/webgl/lessons/webgl-image-processing.html
