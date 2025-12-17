import { useEffect, useRef, useState, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { createPortal } from 'react-dom';
import { api } from '../../../convex/_generated/api';

// Custom YouTube player with completely custom controls overlay
// YouTube controls are hidden, we build our own UI
export default function VideoPlayer({ video, kidProfileId, onClose }) {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const watchIdRef = useRef(null);
  const watchStartTimeRef = useRef(null);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);

  // Watch history mutations
  const recordWatch = useMutation(api.watchHistory.recordWatch);
  const updateWatchDuration = useMutation(api.watchHistory.updateWatchDuration);

  // Format time as M:SS
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Save watch duration
  const saveWatchDuration = useCallback(async () => {
    if (watchIdRef.current && watchStartTimeRef.current) {
      const watchDurationSeconds = Math.round((Date.now() - watchStartTimeRef.current) / 1000);
      try {
        await updateWatchDuration({
          watchId: watchIdRef.current,
          watchDurationSeconds,
        });
      } catch (err) {
        console.error('Failed to update watch duration:', err);
      }
    }
  }, [updateWatchDuration]);

  // Auto-hide controls after 3 seconds
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  // Initialize YouTube player
  useEffect(() => {
    // Create container outside React's DOM
    const container = document.createElement('div');
    container.id = 'yt-player-portal';
    container.style.cssText = 'position:fixed;inset:0;z-index:9998;background:black;display:flex;align-items:center;justify-content:center;';
    document.body.appendChild(container);
    containerRef.current = container;

    const playerDiv = document.createElement('div');
    playerDiv.id = 'yt-player-inner';
    playerDiv.style.cssText = 'width:100%;height:100%;';
    container.appendChild(playerDiv);

    // Add CSS to hide YouTube's title overlay and branding
    const style = document.createElement('style');
    style.id = 'yt-player-hide-styles';
    style.textContent = `
      #yt-player-portal iframe {
        pointer-events: none;
      }
      .ytp-chrome-top,
      .ytp-show-cards-title,
      .ytp-title,
      .ytp-title-text,
      .ytp-watermark,
      .ytp-youtube-button,
      .ytp-gradient-top,
      .ytp-ce-element,
      .ytp-pause-overlay,
      .ytp-scroll-min {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
      }
    `;
    document.head.appendChild(style);

    const initPlayer = () => {
      playerRef.current = new window.YT.Player('yt-player-inner', {
        videoId: video.videoId,
        playerVars: {
          autoplay: 1,
          controls: 0, // Hide YouTube controls completely
          disablekb: 1, // Disable keyboard (we handle it)
          fs: 0,
          iv_load_policy: 3, // Hide annotations
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          playsinline: 1,
          // Don't set origin - let YouTube handle it automatically
        },
        events: {
          onReady: async (event) => {
            setIsReady(true);
            setIsPlaying(true);
            setDuration(event.target.getDuration());
            watchStartTimeRef.current = Date.now();

            // Start progress tracking
            progressIntervalRef.current = setInterval(() => {
              if (playerRef.current?.getCurrentTime) {
                setCurrentTime(playerRef.current.getCurrentTime());
              }
            }, 500);

            // Record watch
            if (kidProfileId) {
              try {
                const watchId = await recordWatch({
                  kidProfileId,
                  videoId: video.videoId,
                  title: video.title,
                  thumbnailUrl: video.thumbnailUrl,
                  channelTitle: video.channelTitle,
                });
                watchIdRef.current = watchId;
              } catch (err) {
                console.error('Failed to record watch:', err);
              }
            }
          },
          onStateChange: (event) => {
            const state = event.data;
            if (state === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setHasEnded(false);
            } else if (state === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            } else if (state === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              setHasEnded(true);
              saveWatchDuration();
            }
          },
          onError: (event) => {
            console.error('YouTube player error:', event.data);
            // Error codes: 2 = invalid param, 5 = HTML5 error, 100 = not found, 101/150 = embed not allowed
          },
        },
      });
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy(); } catch (e) { /* ignore */ }
      }
      container.remove();
      // Clean up the style element
      const styleEl = document.getElementById('yt-player-hide-styles');
      if (styleEl) styleEl.remove();
    };
  }, [video.videoId, kidProfileId, recordWatch, saveWatchDuration]);

  // Control handlers
  const togglePlayPause = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
    resetControlsTimeout();
  };

  const handleSeek = (e) => {
    if (!playerRef.current?.seekTo) return;
    try {
      const dur = playerRef.current.getDuration?.() || duration;
      if (!dur) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newTime = Math.min(percent * dur, dur - 1);
      // Use false to prefer buffered content, true would force server request
      playerRef.current.seekTo(newTime, false);
      setCurrentTime(newTime);
      resetControlsTimeout();
    } catch (err) {
      console.error('Seek error:', err);
    }
  };


  const skipForward = () => {
    if (!playerRef.current?.getCurrentTime || !playerRef.current?.seekTo) return;
    try {
      const current = playerRef.current.getCurrentTime() || 0;
      const dur = playerRef.current.getDuration() || duration;
      const newTime = Math.min(current + 10, dur - 1);
      // Don't flash overlay - just seek smoothly
      playerRef.current.seekTo(newTime, false);
      setCurrentTime(newTime);
      resetControlsTimeout();
    } catch (err) {
      console.error('Skip forward error:', err);
    }
  };

  const skipBackward = () => {
    if (!playerRef.current?.getCurrentTime || !playerRef.current?.seekTo) return;
    try {
      const current = playerRef.current.getCurrentTime() || 0;
      const newTime = Math.max(current - 10, 0);
      // Don't flash overlay - just seek smoothly
      playerRef.current.seekTo(newTime, false);
      setCurrentTime(newTime);
      resetControlsTimeout();
    } catch (err) {
      console.error('Skip backward error:', err);
    }
  };

  const handleClose = async () => {
    if (playerRef.current?.pauseVideo) {
      try { playerRef.current.pauseVideo(); } catch (e) { /* ignore */ }
    }
    await saveWatchDuration();
    onClose();
  };

  const handleReplay = () => {
    setHasEnded(false);
    if (playerRef.current) {
      playerRef.current.seekTo(0);
      playerRef.current.playVideo();
    }
    resetControlsTimeout();
  };

  const handleOverlayClick = () => {
    if (hasEnded) return;
    togglePlayPause();
  };

  const handleOverlayMove = () => {
    resetControlsTimeout();
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return createPortal(
    <div
      className="fixed inset-0"
      style={{ zIndex: 9999 }}
      onMouseMove={handleOverlayMove}
      onTouchStart={handleOverlayMove}
    >
      {/* Click overlay for play/pause */}
      <div
        className="absolute inset-0 cursor-pointer"
        style={{ zIndex: 10000 }}
        onClick={handleOverlayClick}
      />

      {/* Close button - always visible */}
      <button
        onClick={(e) => { e.stopPropagation(); handleClose(); }}
        className="absolute top-4 left-4 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition shadow-lg"
        style={{ zIndex: 10002, minWidth: '48px', minHeight: '48px' }}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Video title - top */}
      <div
        className={`absolute top-4 left-20 right-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        style={{ zIndex: 10001 }}
      >
        <h2 className="text-white font-semibold text-lg line-clamp-1" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{video.title}</h2>
        <p className="text-gray-300 text-sm" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{video.channelTitle}</p>
      </div>

      {/* Center play/pause indicator */}
      {showControls && !hasEnded && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 10001 }}
        >
          <div className="flex items-center gap-8">
            {/* Skip backward */}
            <button
              onClick={(e) => { e.stopPropagation(); skipBackward(); }}
              className="bg-black/50 hover:bg-black/70 text-white p-4 rounded-full transition pointer-events-auto"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs font-bold">10</span>
            </button>

            {/* Play/Pause */}
            <button
              onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
              className="bg-black/50 hover:bg-black/70 text-white p-6 rounded-full transition pointer-events-auto"
            >
              {isPlaying ? (
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Skip forward */}
            <button
              onClick={(e) => { e.stopPropagation(); skipForward(); }}
              className="bg-black/50 hover:bg-black/70 text-white p-4 rounded-full transition pointer-events-auto"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
              </svg>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs font-bold">10</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom progress bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        style={{ zIndex: 10001 }}
      >
        {/* Time display */}
        <div className="flex items-center justify-between text-white text-sm mb-2 px-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Progress bar */}
        <div
          className="h-2 bg-white/30 rounded-full cursor-pointer relative"
          onClick={(e) => { e.stopPropagation(); handleSeek(e); }}
        >
          <div
            className="h-full bg-red-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg"
            style={{ left: `calc(${progress}% - 8px)` }}
          />
        </div>
      </div>

      {/* End screen */}
      {hasEnded && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/95"
          style={{ zIndex: 10003 }}
        >
          {video.thumbnailUrl && (
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="w-48 h-auto rounded-xl mb-4 opacity-70"
              referrerPolicy="no-referrer"
            />
          )}
          <p className="text-white text-xl font-semibold mb-1 text-center px-4">{video.title}</p>
          <p className="text-gray-400 mb-6">{video.channelTitle}</p>
          <div className="flex gap-4">
            <button
              onClick={handleReplay}
              className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-6 py-3 rounded-full font-semibold transition flex items-center gap-2 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Watch Again
            </button>
            <button
              onClick={handleClose}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-full font-semibold transition shadow-lg"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {!isReady && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black"
          style={{ zIndex: 10003 }}
        >
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
        </div>
      )}
    </div>,
    document.body
  );
}
