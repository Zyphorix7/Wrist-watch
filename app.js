/**
 * Scroll-Linked Image Sequence Canvas Engine
 * High-performance, Retina-crisp frame scrubbing inspired by Apple product presentations.
 * Clean, distraction-free fullscreen mode for mobile and tablets.
 */

class ScrollCanvasSequence {
  constructor() {
    // DOM Elements
    this.canvas = document.getElementById('sequence-canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false, desynchronized: true });
    this.scrollTrack = document.getElementById('scroll-track');
    
    // Preloader Elements
    this.loader = document.getElementById('loader');
    this.loaderPercent = document.getElementById('loader-percent');
    this.loaderStatus = document.getElementById('loader-status');
    this.loaderBarFill = document.getElementById('loader-bar-fill');
    this.spinnerProgress = document.getElementById('spinner-progress');

    // HUD Elements
    this.hudFrameNum = document.getElementById('hud-frame-num');
    this.hudScrollPct = document.getElementById('hud-scroll-pct');
    this.hudTimeVal = document.getElementById('hud-time-val');
    this.hudFpsVal = document.getElementById('hud-fps-val');
    this.scrubContainer = document.getElementById('scrub-container');
    this.scrubFill = document.getElementById('scrub-fill');
    this.scrubThumb = document.getElementById('scrub-thumb');

    // Control Buttons
    this.btnFit = document.getElementById('btn-fit');
    this.fitLabel = document.getElementById('fit-label');
    this.btnSmooth = document.getElementById('btn-smooth');
    this.smoothLabel = document.getElementById('smooth-label');
    this.btnAutoplay = document.getElementById('btn-autoplay');
    this.autoplayLabel = document.getElementById('autoplay-label');
    this.btnCustomMedia = document.getElementById('btn-custom-media');
    this.btnExport = document.getElementById('btn-export');

    // Modals
    this.mediaModal = document.getElementById('media-modal');
    this.modalClose = document.getElementById('modal-close');
    this.dropZone = document.getElementById('drop-zone');
    this.fileInput = document.getElementById('file-input');
    this.samplingSelect = document.getElementById('sampling-density');
    this.btnReloadDefault = document.getElementById('btn-reload-default');

    this.exportModal = document.getElementById('export-modal');
    this.exportModalClose = document.getElementById('export-modal-close');
    this.exportPreviewCanvas = document.getElementById('export-preview-canvas');
    this.exportFrameIndex = document.getElementById('export-frame-index');
    this.btnExportCurrent = document.getElementById('btn-export-current');
    this.btnExportAll = document.getElementById('btn-export-all');

    // State - Default to 'cover' for complete fullscreen immersion
    this.frames = []; // Array of ImageBitmap or HTMLCanvasElement
    this.frameCount = 150;
    this.currentVideoSrc = 'assets/watch-exploded.mp4';
    this.videoDuration = 8.04;
    
    this.targetFrame = 0;
    this.displayedFrame = 0;
    this.lastDrawnIndex = -1;

    this.fitMode = 'cover'; // 'cover' (fullscreen bleed) | 'contain' (letterbox)
    this.isSmooth = true;
    this.lerpFactor = 0.16;
    
    this.isPlaying = false;
    this.autoplaySpeed = 0.6; // Speed multiplier for auto playback
    this.isScrubbing = false;

    // Performance metrics
    this.lastFrameTime = performance.now();
    this.fpsCount = 0;
    this.fpsTimer = performance.now();

    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.setupScrubberEvents();
    this.setupTrackLengthButtons();
    this.resizeCanvas();

    // Start decoding the initial watch video sequence
    await this.loadVideoSequence(this.currentVideoSrc, this.frameCount);

    // Kick off animation loop
    this.renderLoop();
  }

  /**
   * Hardware-accelerated client-side video frame extractor
   * Samples discrete timestamps across the video into ImageBitmaps
   */
  async loadVideoSequence(videoUrl, targetFrameCount) {
    document.body.classList.add('loading-state');
    this.loader.classList.remove('hidden');
    this.updateLoader(0, 'Initializing video stream...');
    this.frames = [];

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';

      video.onerror = (err) => {
        this.updateLoader(0, 'Error loading video file. Verify file exists.');
        reject(err);
      };

      video.onloadedmetadata = async () => {
        this.videoDuration = video.duration || 8.04;
        const total = targetFrameCount;
        const duration = this.videoDuration;
        const offscreen = document.createElement('canvas');
        offscreen.width = video.videoWidth || 640;
        offscreen.height = video.videoHeight || 360;
        const offCtx = offscreen.getContext('2d');

        this.updateLoader(5, `Extracting ${total} frames from video...`);

        // Seek frame by frame
        for (let i = 0; i < total; i++) {
          const targetTime = Math.min(duration - 0.03, (i / (total - 1)) * duration);
          
          await this.seekVideoTo(video, targetTime);

          // Render into high-performance ImageBitmap or Canvas
          let frameImage;
          try {
            if ('createImageBitmap' in window) {
              frameImage = await createImageBitmap(video);
            } else {
              offCtx.drawImage(video, 0, 0);
              const clone = document.createElement('canvas');
              clone.width = offscreen.width;
              clone.height = offscreen.height;
              clone.getContext('2d').drawImage(offscreen, 0, 0);
              frameImage = clone;
            }
          } catch (e) {
            offCtx.drawImage(video, 0, 0);
            const clone = document.createElement('canvas');
            clone.width = offscreen.width;
            clone.height = offscreen.height;
            clone.getContext('2d').drawImage(offscreen, 0, 0);
            frameImage = clone;
          }

          this.frames.push(frameImage);

          const percent = Math.round(((i + 1) / total) * 100);
          this.updateLoader(percent, `Cached frame ${i + 1} of ${total} (${percent}%)`);
        }

        // Complete extraction
        this.updateLoader(100, 'Sequence ready. Fullscreen 60fps scrolling active.');
        setTimeout(() => {
          this.loader.classList.add('hidden');
          document.body.classList.remove('loading-state');
          this.drawFrame(0);
          resolve();
        }, 400);
      };
    });
  }

  /**
   * Promise wrapper to seek video to exact timestamp
   */
  seekVideoTo(video, time) {
    return new Promise((resolve) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      video.addEventListener('seeked', onSeeked);
      video.currentTime = time;
    });
  }

  /**
   * Update preloader UI
   */
  updateLoader(percent, statusText) {
    if (this.loaderPercent) this.loaderPercent.textContent = `${percent}%`;
    if (this.loaderStatus) this.loaderStatus.textContent = statusText;
    if (this.loaderBarFill) this.loaderBarFill.style.width = `${percent}%`;
    if (this.spinnerProgress) {
      const circ = 125.6; // 2 * PI * 20
      this.spinnerProgress.style.strokeDashoffset = circ - (circ * percent) / 100;
    }
  }

  /**
   * Handle responsive Canvas sizing and Retina DPR scaling
   */
  resizeCanvas() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    // Force redraw on resize
    this.lastDrawnIndex = -1;
    this.drawFrame(Math.round(this.displayedFrame));
  }

  /**
   * Draw specific frame index onto the canvas with Contain/Cover aspect ratio
   */
  drawFrame(index) {
    if (!this.frames || this.frames.length === 0) return;
    const safeIndex = Math.max(0, Math.min(this.frames.length - 1, index));
    const frame = this.frames[safeIndex];
    if (!frame) return;

    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;
    const frameW = frame.width;
    const frameH = frame.height;

    let scale;
    if (this.fitMode === 'cover') {
      scale = Math.max(canvasW / frameW, canvasH / frameH);
    } else {
      scale = Math.min(canvasW / frameW, canvasH / frameH);
    }

    const drawW = frameW * scale;
    const drawH = frameH * scale;
    const x = (canvasW - drawW) / 2;
    const y = (canvasH - drawH) / 2;

    // Clear and draw
    this.ctx.fillStyle = '#0b0c10';
    this.ctx.fillRect(0, 0, canvasW, canvasH);
    this.ctx.drawImage(frame, x, y, drawW, drawH);

    this.lastDrawnIndex = safeIndex;
  }

  /**
   * Core requestAnimationFrame animation and smooth-lerp loop
   */
  renderLoop() {
    const now = performance.now();
    this.fpsCount++;
    if (now - this.fpsTimer >= 1000) {
      if (this.hudFpsVal) this.hudFpsVal.textContent = String(this.fpsCount);
      this.fpsCount = 0;
      this.fpsTimer = now;
    }

    if (this.isPlaying) {
      // Auto-preview playback
      const maxScroll = this.scrollTrack.offsetHeight - window.innerHeight;
      const step = (window.innerHeight * this.autoplaySpeed * (now - this.lastFrameTime)) / 1000;
      let newScroll = window.scrollY + step;
      if (newScroll >= maxScroll) {
        newScroll = 0; // Loop back
      }
      window.scrollTo(0, newScroll);
    }

    // Measure scroll progress
    const scrollY = window.scrollY;
    const maxScroll = Math.max(1, this.scrollTrack.offsetHeight - window.innerHeight);
    const scrollFraction = Math.max(0, Math.min(1, scrollY / maxScroll));

    if (this.frames.length > 0) {
      this.targetFrame = scrollFraction * (this.frames.length - 1);

      if (this.isSmooth) {
        // Interpolate smoothly towards target
        const diff = this.targetFrame - this.displayedFrame;
        if (Math.abs(diff) < 0.005) {
          this.displayedFrame = this.targetFrame;
        } else {
          this.displayedFrame += diff * this.lerpFactor;
        }
      } else {
        this.displayedFrame = this.targetFrame;
      }

      const drawIndex = Math.round(this.displayedFrame);
      if (drawIndex !== this.lastDrawnIndex) {
        this.drawFrame(drawIndex);
      }

      // Update HUD
      this.updateHUD(scrollFraction, drawIndex);
    }

    this.lastFrameTime = now;
    requestAnimationFrame(() => this.renderLoop());
  }

  /**
   * Update bottom HUD indicators & progress scrubber
   */
  updateHUD(scrollFraction, frameIndex) {
    const total = this.frames.length || this.frameCount;
    const pct = (scrollFraction * 100).toFixed(1);
    
    if (this.hudFrameNum) {
      this.hudFrameNum.textContent = `${String(frameIndex + 1).padStart(3, '0')} / ${String(total).padStart(3, '0')}`;
    }
    if (this.hudScrollPct) {
      this.hudScrollPct.textContent = `${pct}%`;
    }
    if (this.hudTimeVal) {
      const currentTime = (scrollFraction * this.videoDuration).toFixed(2);
      this.hudTimeVal.textContent = `${currentTime}s`;
    }

    if (!this.isScrubbing) {
      const scrubPercent = (scrollFraction * 100);
      if (this.scrubFill) this.scrubFill.style.width = `${scrubPercent}%`;
      if (this.scrubThumb) this.scrubThumb.style.left = `${scrubPercent}%`;
    }
  }

  /**
   * Setup interactive scrubber track for mouse & touch dragging
   */
  setupScrubberEvents() {
    const handleScrub = (e) => {
      const rect = this.scrubContainer.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

      if (this.scrubFill) this.scrubFill.style.width = `${ratio * 100}%`;
      if (this.scrubThumb) this.scrubThumb.style.left = `${ratio * 100}%`;

      const maxScroll = this.scrollTrack.offsetHeight - window.innerHeight;
      window.scrollTo(0, ratio * maxScroll);
    };

    const onPointerDown = (e) => {
      this.isScrubbing = true;
      if (this.isPlaying) this.toggleAutoplay(false);
      handleScrub(e);

      const onPointerMove = (moveEvent) => {
        if (this.isScrubbing) {
          handleScrub(moveEvent);
        }
      };

      const onPointerUp = () => {
        this.isScrubbing = false;
        window.removeEventListener('mousemove', onPointerMove);
        window.removeEventListener('mouseup', onPointerUp);
        window.removeEventListener('touchmove', onPointerMove);
        window.removeEventListener('touchend', onPointerUp);
      };

      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);
      window.addEventListener('touchmove', onPointerMove, { passive: true });
      window.addEventListener('touchend', onPointerUp);
    };

    this.scrubContainer.addEventListener('mousedown', onPointerDown);
    this.scrubContainer.addEventListener('touchstart', onPointerDown, { passive: true });
  }

  /**
   * Setup buttons to adjust scroll length (e.g. 300vh, 500vh, 800vh)
   */
  setupTrackLengthButtons() {
    const buttons = document.querySelectorAll('.track-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const height = btn.dataset.height;
        this.scrollTrack.style.setProperty('--track-height', `${height}vh`);
      });
    });
  }

  /**
   * General UI Event Listeners and shortcuts
   */
  setupEventListeners() {
    window.addEventListener('resize', () => this.resizeCanvas());

    // Fit button (cover vs contain)
    this.btnFit.addEventListener('click', () => {
      this.fitMode = this.fitMode === 'cover' ? 'contain' : 'cover';
      this.fitLabel.textContent = this.fitMode === 'cover' ? 'Cover' : 'Contain';
      this.drawFrame(Math.round(this.displayedFrame));
    });

    // Smoothing toggle
    this.btnSmooth.addEventListener('click', () => {
      this.isSmooth = !this.isSmooth;
      this.btnSmooth.classList.toggle('active', this.isSmooth);
      this.smoothLabel.textContent = this.isSmooth ? 'Lerp: On' : 'Lerp: Off';
    });

    // Autoplay toggle
    this.btnAutoplay.addEventListener('click', () => this.toggleAutoplay());

    // Media Modal
    this.btnCustomMedia.addEventListener('click', () => this.mediaModal.showModal());
    this.modalClose.addEventListener('click', () => this.mediaModal.close());
    this.mediaModal.addEventListener('click', (e) => {
      if (e.target === this.mediaModal) this.mediaModal.close();
    });

    // File Drag & Drop
    this.dropZone.addEventListener('click', () => this.fileInput.click());
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('drag-over');
    });
    this.dropZone.addEventListener('dragleave', () => this.dropZone.classList.remove('drag-over'));
    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) {
        this.handleUserFiles(e.dataTransfer.files);
      }
    });
    this.fileInput.addEventListener('change', () => {
      if (this.fileInput.files.length) {
        this.handleUserFiles(this.fileInput.files);
      }
    });

    // Reset to default watch video
    this.btnReloadDefault.addEventListener('click', () => {
      this.mediaModal.close();
      this.currentVideoSrc = 'assets/watch-exploded.mp4';
      this.frameCount = parseInt(this.samplingSelect.value, 10) || 150;
      this.loadVideoSequence(this.currentVideoSrc, this.frameCount);
    });

    // Export Modal
    this.btnExport.addEventListener('click', () => this.openExportModal());
    this.exportModalClose.addEventListener('click', () => this.exportModal.close());
    this.exportModal.addEventListener('click', (e) => {
      if (e.target === this.exportModal) this.exportModal.close();
    });

    this.btnExportCurrent.addEventListener('click', () => this.exportCurrentFrame());
    this.btnExportAll.addEventListener('click', () => this.batchExportFrames());

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        this.toggleAutoplay();
      } else if (e.code === 'ArrowDown' || e.code === 'ArrowRight' || e.key === 'j') {
        e.preventDefault();
        this.stepFrame(1);
      } else if (e.code === 'ArrowUp' || e.code === 'ArrowLeft' || e.key === 'k') {
        e.preventDefault();
        this.stepFrame(-1);
      } else if (e.key === 'f' || e.key === 'F') {
        this.btnFit.click();
      } else if (e.key === 's' || e.key === 'S') {
        this.btnSmooth.click();
      }
    });
  }

  /**
   * Toggle auto-playback mode
   */
  toggleAutoplay(forceState) {
    this.isPlaying = forceState !== undefined ? forceState : !this.isPlaying;
    this.btnAutoplay.classList.toggle('active', this.isPlaying);
    this.autoplayLabel.textContent = this.isPlaying ? 'Pause' : 'Play';
  }

  /**
   * Step single frame forward/backward
   */
  stepFrame(delta) {
    const maxScroll = this.scrollTrack.offsetHeight - window.innerHeight;
    const frameStep = maxScroll / Math.max(1, this.frames.length - 1);
    window.scrollBy({ top: delta * frameStep, behavior: 'instant' });
  }

  /**
   * Handle user uploaded custom files (video or sequential images)
   */
  async handleUserFiles(fileList) {
    this.mediaModal.close();
    const files = Array.from(fileList);

    // If a video file was selected
    const videoFile = files.find((f) => f.type.startsWith('video/'));
    if (videoFile) {
      const objectUrl = URL.createObjectURL(videoFile);
      this.currentVideoSrc = objectUrl;
      const count = parseInt(this.samplingSelect.value, 10) || 150;
      await this.loadVideoSequence(objectUrl, count);
      return;
    }

    // If multiple image files were selected
    const imageFiles = files
      .filter((f) => f.type.startsWith('image/'))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    if (imageFiles.length > 0) {
      document.body.classList.add('loading-state');
      this.loader.classList.remove('hidden');
      this.frames = [];
      const total = imageFiles.length;

      for (let i = 0; i < total; i++) {
        const file = imageFiles[i];
        const bmp = await createImageBitmap(file);
        this.frames.push(bmp);
        const pct = Math.round(((i + 1) / total) * 100);
        this.updateLoader(pct, `Loaded image ${i + 1} of ${total}`);
      }

      this.updateLoader(100, 'All image frames loaded!');
      setTimeout(() => {
        this.loader.classList.add('hidden');
        document.body.classList.remove('loading-state');
        this.drawFrame(0);
      }, 400);
    }
  }

  /**
   * Open export frames dialog and render preview
   */
  openExportModal() {
    const curIdx = Math.round(this.displayedFrame);
    const frame = this.frames[curIdx];
    if (frame) {
      this.exportPreviewCanvas.width = frame.width;
      this.exportPreviewCanvas.height = frame.height;
      const pCtx = this.exportPreviewCanvas.getContext('2d');
      pCtx.drawImage(frame, 0, 0);
      this.exportFrameIndex.textContent = `Frame #${String(curIdx + 1).padStart(3, '0')} / ${this.frames.length}`;
    }
    this.exportModal.showModal();
  }

  /**
   * Export currently viewed frame as PNG download
   */
  exportCurrentFrame() {
    const curIdx = Math.round(this.displayedFrame);
    const frame = this.frames[curIdx];
    if (!frame) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = frame.width;
    exportCanvas.height = frame.height;
    exportCanvas.getContext('2d').drawImage(frame, 0, 0);

    exportCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `frame_${String(curIdx + 1).padStart(4, '0')}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  /**
   * Batch download extracted sequence frames
   */
  async batchExportFrames() {
    alert(`Exporting ${this.frames.length} frames. Your browser will download the key milestone frames.`);
    const step = Math.max(1, Math.floor(this.frames.length / 10)); // Download 10 representative milestones
    for (let i = 0; i < this.frames.length; i += step) {
      const frame = this.frames[i];
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = frame.width;
      exportCanvas.height = frame.height;
      exportCanvas.getContext('2d').drawImage(frame, 0, 0);

      exportCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sequence_frame_${String(i + 1).padStart(4, '0')}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');

      await new Promise((r) => setTimeout(r, 200));
    }
  }
}

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new ScrollCanvasSequence();
});
