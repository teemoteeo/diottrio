'use strict';

// Configuration
const FALLBACK_VIDEO_URL = './14903546_3840_2160_25fps.mp4';
const DOMINANT_WEIGHT = 0.65;
const BLUR_BASE = 1.4;
const BLUR_EXPONENT = 1.1;

// DOM references
const panelClear = document.getElementById('panel-clear');
const panelCombined = document.getElementById('panel-combined');
const diopterLeftSlider = document.getElementById('diopter-left-slider');
const diopterRightSlider = document.getElementById('diopter-right-slider');
const diopterLeftDisplay = document.getElementById('diopter-left-display');
const diopterRightDisplay = document.getElementById('diopter-right-display');
const dominantLeftBtn = document.getElementById('dominant-left');
const dominantRightBtn = document.getElementById('dominant-right');
const sourceStatus = document.getElementById('source-status');

let mediaStream = null;
let leftDiopters = 0;
let rightDiopters = 0;
let isDominantLeft = true;
let animationFrameId = null;

function calculateBlur(diopters) {
	return diopters === 0 ? 0 : BLUR_BASE * Math.pow(diopters, BLUR_EXPONENT);
}

function calculateBinocularBlur() {
	const dominantDiopters = isDominantLeft ? leftDiopters : rightDiopters;
	const nonDominantDiopters = isDominantLeft ? rightDiopters : leftDiopters;
	const weightedDiopters = dominantDiopters * DOMINANT_WEIGHT + nonDominantDiopters * (1 - DOMINANT_WEIGHT);
	return calculateBlur(weightedDiopters);
}

function updateBinocularVision() {
	// The render loop will pick up the new blur values automatically
}

function updateEyeDisplay(display, diopters) {
	display.textContent = diopters > 0 ? `-${diopters.toFixed(2)}` : '0.00';
}

function createVideoElement(src, isStream) {
	const video = document.createElement('video');
	Object.assign(video, { autoplay: true, playsInline: true, muted: true, loop: true });
	if (isStream) {
		video.srcObject = src;
		video.play().catch(e => {});
	} else {
		video.src = src;
		video.play().catch(e => {});
	}
	return video;
}

function makeHiddenVideo(video) {
	Object.assign(video.style, { position: 'absolute', opacity: '0', pointerEvents: 'none' });
}

function applySimpleBlur(video, canvas, blurAmount) {
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		return;
	}

	ctx.filter = `blur(${blurAmount}px)`;
	ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
	ctx.filter = 'none';
}

function setupPanel(panel, content, isCamera, keepHiddenVideo = false) {
	// Remove loading state
	const loading = panel.querySelector('.loading-state');
	if (loading) loading.remove();

	// Replace existing content but keep hidden video if requested
	const existingCanvas = panel.querySelector('canvas');
	if (existingCanvas) existingCanvas.remove();

	if (!keepHiddenVideo) {
		const existingVideo = panel.querySelector('video');
		if (existingVideo) {
			existingVideo.pause();
			existingVideo.srcObject = null;
			existingVideo.src = '';
			existingVideo.remove();
		}
	}

	panel.insertBefore(content, panel.firstChild);

	// Update or create source indicator
	let sourceIndicator = panel.querySelector('.source-indicator');
	if (!sourceIndicator) {
		sourceIndicator = document.createElement('span');
		sourceIndicator.className = 'source-indicator';
		panel.appendChild(sourceIndicator);
	}
	sourceIndicator.className = `source-indicator ${isCamera ? 'camera' : 'fallback'}`;
	sourceIndicator.textContent = isCamera ? '● Live' : '● Video';
}

function startBlurRender(video, canvas) {
	function render() {
		if (video.readyState >= video.HAVE_CURRENT_DATA) {
			const blurPx = calculateBinocularBlur();
			applySimpleBlur(video, canvas, blurPx);
		}
		animationFrameId = requestAnimationFrame(render);
	}
	render();
}

async function initCamera() {
	try {
		mediaStream = await navigator.mediaDevices.getUserMedia({
			video: { width: { ideal: 1920 }, height: { ideal: 1080 } }
		});

		const video1 = createVideoElement(mediaStream, true);

		setupPanel(panelClear, video1, true);

		// Wait for video to have valid dimensions before creating canvas
		let canvasSetupDone = false;
		const setupCanvas = () => {
			if (canvasSetupDone) return;

			if (video1.videoWidth > 0 && video1.videoHeight > 0) {
				canvasSetupDone = true;
				const canvas = document.createElement('canvas');
				canvas.width = video1.videoWidth;
				canvas.height = video1.videoHeight;
				canvas.style.display = 'block';
				setupPanel(panelCombined, canvas, true, false);

				startBlurRender(video1, canvas);
			} else {
				requestAnimationFrame(setupCanvas);
			}
		};

		video1.addEventListener('loadedmetadata', setupCanvas);
		video1.addEventListener('loadeddata', setupCanvas);
		video1.addEventListener('playing', setupCanvas);

		sourceStatus.textContent = 'Source: Device Camera';
	} catch (err) {
		useFallbackVideo();
	}
}

function handleVideoError(panel, panelName) {
	panel.innerHTML = `<div class="loading-state">Video failed to load</div>`;
}

function useFallbackVideo() {
	const video1 = createVideoElement(FALLBACK_VIDEO_URL, false);
	const video2 = createVideoElement(FALLBACK_VIDEO_URL, false);

	video1.onloadeddata = () => setupPanel(panelClear, video1, false);
	video1.onerror = () => handleVideoError(panelClear, 'Clear');

	makeHiddenVideo(video2);
	panelCombined.appendChild(video2);

	video2.onloadeddata = () => {
		const canvas = document.createElement('canvas');
		canvas.width = video2.videoWidth;
		canvas.height = video2.videoHeight;
		setupPanel(panelCombined, canvas, false, true);
		startBlurRender(video2, canvas);
	};
	video2.onerror = () => handleVideoError(panelCombined, 'Combined');

	sourceStatus.textContent = 'Source: Sample Video';
}

function setDominantEye(isLeft) {
	isDominantLeft = isLeft;
	dominantLeftBtn.classList.toggle('active', isLeft);
	dominantRightBtn.classList.toggle('active', !isLeft);
	updateBinocularVision();
}

function init() {
	updateEyeDisplay(diopterLeftDisplay, 0);
	updateEyeDisplay(diopterRightDisplay, 0);

	diopterLeftSlider.addEventListener('input', (e) => {
		leftDiopters = parseFloat(e.target.value);
		updateEyeDisplay(diopterLeftDisplay, leftDiopters);
	});

	diopterRightSlider.addEventListener('input', (e) => {
		rightDiopters = parseFloat(e.target.value);
		updateEyeDisplay(diopterRightDisplay, rightDiopters);
	});

	dominantLeftBtn.addEventListener('click', () => setDominantEye(true));
	dominantRightBtn.addEventListener('click', () => setDominantEye(false));

	navigator.mediaDevices?.getUserMedia ? initCamera() : useFallbackVideo();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
	if (animationFrameId) {
		cancelAnimationFrame(animationFrameId);
	}
	if (mediaStream) {
		mediaStream.getTracks().forEach(track => track.stop());
	}
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}
