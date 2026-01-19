# Mac Camera Black Screen Debugging

## Current Status

I've added extensive debugging to help identify exactly where the issue is occurring.

## What I Changed

1. **Simplified to single video element** - Using the same video for both panels instead of two separate video elements
2. **Added explicit play() call** - Don't rely on autoplay for camera streams
3. **Prevented multiple setup calls** - Added `canvasSetupDone` flag to ensure canvas is only created once
4. **Added extensive logging** - Console logs at every step of the process
5. **Added visual tests** - Red square test and manual video frame draw

## Testing Instructions

1. Open `diottrio.html` in your browser
2. Grant camera permission
3. Open the browser Console (Right-click → Inspect → Console tab)
4. Look for the log messages

## What the Logs Tell Us

### If you see these logs, that part is working:

| Log Message | Means |
|-------------|-------|
| `setupCanvas called, readyState: X, dimensions: W x H` | Setup function is running |
| `Canvas created with dimensions: W x H` | Canvas creation succeeded |
| `Canvas appended to DOM` | Canvas is in the page |
| `Red square drawn` | Canvas can be drawn to (you should see a red square briefly) |
| `Successfully drew video frame to canvas` | Video can be drawn to canvas |
| `Blur rendering started` | Render loop started |
| `Render loop 0 - readyState: X` | Animation loop is running |
| `Frame 0 - video ready: X` | Blur function is being called |

### Common Failure Patterns:

**Pattern 1: Canvas never created**
- See `setupCanvas called` but never `Canvas created`
- Problem: Video dimensions not available
- Solution: Need different event timing

**Pattern 2: Canvas created but black**
- See `Canvas created` and `Canvas appended`
- Don't see red square
- Problem: Canvas not rendering or not visible
- Solution: Check CSS or DOM insertion

**Pattern 3: Red square shows but video doesn't**
- See red square briefly, but then black
- See `Failed to draw video` error
- Problem: Can't draw from video element
- Solution: Need cloned stream or different approach

**Pattern 4: Everything logs but still black**
- See all logs including successful frame draws
- Problem: Render loop or timing issue
- Solution: Try alternative render method

## Alternative Solutions Ready

I've prepared two alternative implementations in `alternative_camera_init.js`:

1. **Cloned Stream Approach** - Creates independent streams for each video element
2. **requestVideoFrameCallback Approach** - Uses modern API for better video synchronization

We can swap to these if needed based on what the logs show.

## Next Steps

Once you test and share the console logs, I can immediately implement the appropriate fix.
