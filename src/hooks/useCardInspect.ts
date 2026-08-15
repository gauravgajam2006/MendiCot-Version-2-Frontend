import { useCallback, useEffect, useRef, useState } from 'react';

export type CardInspectTarget = {
  imageUrl: string;
  label?: string;
  face: 'front' | 'back';
};

export interface InspectHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
  onClickCapture: (e: React.MouseEvent) => void;
}

export const HOLD_DURATION_MS = 450;
export const MOVEMENT_THRESHOLD_PX = 12;

export function useCardInspect() {
  const [inspectedTarget, setInspectedTarget] = useState<CardInspectTarget | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const targetElementRef = useRef<HTMLElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const isHoldTriggeredRef = useRef(false);
  const suppressNextClickRef = useRef(false);
  const capturedElementRef = useRef<HTMLElement | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const closeInspect = useCallback(() => {
    clearTimer();
    if (capturedElementRef.current && pointerIdRef.current !== null) {
      try {
        capturedElementRef.current.releasePointerCapture(pointerIdRef.current);
      } catch {
        // Safe no-op if pointer capture was already lost/released
      }
      capturedElementRef.current = null;
    }
    isHoldTriggeredRef.current = false;
    suppressNextClickRef.current = false;
    startPosRef.current = null;
    targetElementRef.current = null;
    pointerIdRef.current = null;
    setInspectedTarget(null);
  }, [clearTimer]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const getInspectHandlers = useCallback(
    (target: CardInspectTarget | null): InspectHandlers | undefined => {
      if (!target) return undefined;

      const onPointerDown = (e: React.PointerEvent) => {
        // Only accept primary pointer interaction (left mouse click, primary touch, or pen)
        if (e.button !== 0) return;

        clearTimer();

        startPosRef.current = { x: e.clientX, y: e.clientY };
        targetElementRef.current = e.currentTarget as HTMLElement;
        pointerIdRef.current = e.pointerId;
        isHoldTriggeredRef.current = false;
        suppressNextClickRef.current = false;

        timerRef.current = setTimeout(() => {
          isHoldTriggeredRef.current = true;
          suppressNextClickRef.current = true;
          setInspectedTarget(target);

          // Pointer capture: ONLY after stationary 450ms hold completes
          if (targetElementRef.current && pointerIdRef.current !== null) {
            try {
              targetElementRef.current.setPointerCapture(pointerIdRef.current);
              capturedElementRef.current = targetElementRef.current;
            } catch {
              // Ignore if element is not in DOM or cannot capture pointer
            }
          }
        }, HOLD_DURATION_MS);
      };

      const onPointerMove = (e: React.PointerEvent) => {
        if (timerRef.current && !isHoldTriggeredRef.current && startPosRef.current) {
          const dx = e.clientX - startPosRef.current.x;
          const dy = e.clientY - startPosRef.current.y;
          if (dx * dx + dy * dy > MOVEMENT_THRESHOLD_PX * MOVEMENT_THRESHOLD_PX) {
            clearTimer();
            startPosRef.current = null;
          }
        }
      };

      const onPointerUp = () => {
        clearTimer();

        if (capturedElementRef.current && pointerIdRef.current !== null) {
          try {
            capturedElementRef.current.releasePointerCapture(pointerIdRef.current);
          } catch {
            // Safe no-op
          }
          capturedElementRef.current = null;
        }

        if (isHoldTriggeredRef.current) {
          isHoldTriggeredRef.current = false;
          setInspectedTarget(null);
          // Keep suppressNextClickRef.current true and targetElementRef.current intact
          // so onClickCapture suppresses the trailing click on this exact target
        } else {
          suppressNextClickRef.current = false;
          targetElementRef.current = null;
        }

        startPosRef.current = null;
        pointerIdRef.current = null;
      };

      const onPointerCancel = () => {
        clearTimer();

        if (capturedElementRef.current && pointerIdRef.current !== null) {
          try {
            capturedElementRef.current.releasePointerCapture(pointerIdRef.current);
          } catch {
            // Safe no-op
          }
          capturedElementRef.current = null;
        }

        if (isHoldTriggeredRef.current) {
          isHoldTriggeredRef.current = false;
          setInspectedTarget(null);
        }

        suppressNextClickRef.current = false;
        startPosRef.current = null;
        targetElementRef.current = null;
        pointerIdRef.current = null;
      };

      const onClickCapture = (e: React.MouseEvent) => {
        if (suppressNextClickRef.current && targetElementRef.current === e.currentTarget) {
          e.stopPropagation();
          e.preventDefault();
          suppressNextClickRef.current = false;
          targetElementRef.current = null;
        }
      };

      return {
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel,
        onClickCapture,
      };
    },
    [clearTimer],
  );

  return {
    inspectedTarget,
    getInspectHandlers,
    closeInspect,
  };
}
