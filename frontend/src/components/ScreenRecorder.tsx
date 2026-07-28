import React, { useState, useRef, useCallback, useEffect } from 'react';

/**
 * ScreenRecorder — records the entire browser viewport as WebM video.
 * Positioned absolutely at top-left of the page.
 * Uses getDisplayMedia for any screen sharing, but for "record this page"
 * we use a hidden <video> approach: we actually want screen recording.
 *
 * Best approach for "record this entire app":
 * - Use navigator.mediaDevices.getDisplayMedia() with preferCurrentTab
 *   This captures the browser tab directly — most reliable.
 * - Fall back to regular getDisplayMedia if preferCurrentTab unsupported.
 */
export const ScreenRecorder: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  const handleToggleRecord = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setIsRecording(false);
      return;
    }

    setErrorMsg(null);

    try {
      let stream: MediaStream;

      try {
        // Try preferCurrentTab (supported in Chrome 94+)
        stream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: {
            preferCurrentTab: true,
            cursor: 'always',
          },
          audio: false,
        } as any);
      } catch {
        // Fallback: regular screen sharing
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' } as any,
          audio: false,
        });
      }

      streamRef.current = stream;

      // Listen for user stopping via browser UI
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        setIsRecording(false);
        cleanup();
      });

      // Build recorder
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `钢坯堆积录屏_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        chunksRef.current = [];
        cleanup();
      };

      recorder.start(1000); // 1s chunks
      setIsRecording(true);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // User cancelled the share dialog — ignore
        return;
      }
      setErrorMsg(err?.message || '录制失败');
      console.error('Screen recording failed:', err);
    }
  }, [isRecording, cleanup]);

  return (
    <div className="screen-recorder">
      <button
        className={`recorder-btn ${isRecording ? 'recording' : ''}`}
        onClick={handleToggleRecord}
        title={isRecording ? '停止录制' : '录制全屏操作'}
      >
        {isRecording ? (
          <>
            <span className="record-dot" />
            停止录制
          </>
        ) : (
          <>
            🎥 录制
          </>
        )}
      </button>
      {isRecording && <span className="recorder-badge">REC</span>}
      {errorMsg && (
        <span className="recorder-error" title={errorMsg}>
          ⚠️
        </span>
      )}
    </div>
  );
};
