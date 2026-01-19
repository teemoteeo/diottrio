// Alternative camera initialization using cloned streams
// This approach creates independent video elements with separate stream tracks
// which may work better on Mac Safari

async function initCameraAlternative() {
	try {
		mediaStream = await navigator.mediaDevices.getUserMedia({
			video: { width: { ideal: 1920 }, height: { ideal: 1080 } }
		});

		// Create two separate video elements with cloned streams
		const video1 = document.createElement('video');
		const video2 = document.createElement('video');

		// Clone the stream for the second video
		const clonedStream = mediaStream.clone();

		// Set up both videos
		video1.srcObject = mediaStream;
		video2.srcObject = clonedStream;

		Object.assign(video1, { autoplay: true, playsInline: true, muted: true });
		Object.assign(video2, { autoplay: true, playsInline: true, muted: true });

		// Explicitly play both
		await Promise.all([
			video1.play().catch(e => console.log('Video1 play error:', e)),
			video2.play().catch(e => console.log('Video2 play error:', e))
		]);

		// Set up the clear panel with video1
		setupPanel(panelClear, video1, true);

		// Wait for video2 to be ready for canvas rendering
		let canvasSetupDone = false;
		const setupCanvas = () => {
			if (canvasSetupDone) return;

			console.log('setupCanvas - video2 readyState:', video2.readyState, 'dimensions:', video2.videoWidth, 'x', video2.videoHeight);

			if (video2.videoWidth > 0 && video2.videoHeight > 0 && video2.readyState >= 2) {
				canvasSetupDone = true;

				const canvas = document.createElement('canvas');
				canvas.width = video2.videoWidth;
				canvas.height = video2.videoHeight;

				console.log('Canvas created:', canvas.width, 'x', canvas.height);

				setupPanel(panelCombined, canvas, true, false);

				// Start rendering with a small delay to ensure video is fully ready
				setTimeout(() => {
					console.log('Starting blur render');
					startBlurRender(video2, canvas);
				}, 200);
			} else {
				requestAnimationFrame(setupCanvas);
			}
		};

		// Listen to multiple events
		video2.addEventListener('loadedmetadata', setupCanvas);
		video2.addEventListener('loadeddata', setupCanvas);
		video2.addEventListener('playing', setupCanvas);
		video2.addEventListener('canplay', setupCanvas);

		sourceStatus.textContent = 'Source: Device Camera';
	} catch (err) {
		console.log('Camera not available, using fallback video:', err.message);
		useFallbackVideo();
	}
}

// Alternative approach #2: Using a single video with requestVideoFrameCallback
// This is the most modern approach and works best on Chromium-based browsers
async function initCameraWithFrameCallback() {
	try {
		mediaStream = await navigator.mediaDevices.getUserMedia({
			video: { width: { ideal: 1920 }, height: { ideal: 1080 } }
		});

		const video = document.createElement('video');
		video.srcObject = mediaStream;
		Object.assign(video, { autoplay: true, playsInline: true, muted: true });
		await video.play();

		setupPanel(panelClear, video, true);

		// Wait for video dimensions
		while (video.videoWidth === 0 || video.videoHeight === 0) {
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		const canvas = document.createElement('canvas');
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		setupPanel(panelCombined, canvas, true, false);

		const ctx = canvas.getContext('2d');

		// Use requestVideoFrameCallback if available (best for video rendering)
		if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
			console.log('Using requestVideoFrameCallback');

			function updateCanvas() {
				const blurPx = calculateBinocularBlur();
				ctx.filter = `blur(${blurPx}px)`;
				ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
				ctx.filter = 'none';
				video.requestVideoFrameCallback(updateCanvas);
			}

			video.requestVideoFrameCallback(updateCanvas);
		} else {
			// Fallback to requestAnimationFrame
			console.log('Using requestAnimationFrame fallback');
			startBlurRender(video, canvas);
		}

		sourceStatus.textContent = 'Source: Device Camera';
	} catch (err) {
		console.log('Camera not available, using fallback video:', err.message);
		useFallbackVideo();
	}
}
