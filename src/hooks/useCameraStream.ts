import { useState, useEffect, useRef } from 'react';

export const useCameraStream = (shouldRequest: boolean) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!shouldRequest) return;

    const requestCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        streamRef.current = mediaStream;
        setStream(mediaStream);
        setError(null);
      } catch (err) {
        console.error('Camera access error:', err);
        setError(err instanceof Error ? err.message : 'Camera access denied');
        setStream(null);
      }
    };

    requestCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        setStream(null);
      }
    };
  }, [shouldRequest]);

  return { stream, error };
};