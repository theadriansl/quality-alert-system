import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook to remember and restore scroll position for a component/section
 * @param {string} key - Unique key to identify the scroll position (e.g., 'ecr-123-section-2')
 * @param {object} options - Configuration options
 * @param {number} options.debounce - Debounce time in ms (default: 100)
 * @param {boolean} options.useSession - Use sessionStorage instead of memory (default: true)
 * @param {boolean} options.ready - If provided, only restore when ready becomes true (default: true)
 */
const useScrollMemory = (key, options = {}) => {
  const { debounce = 100, useSession = true, ready = true } = options;
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);
  const isRestoringRef = useRef(false);
  const previousKeyRef = useRef(key);

  // Save scroll position for a specific key
  const savePositionForKey = useCallback((targetKey, position) => {
    if (useSession) {
      sessionStorage.setItem(`scroll-${targetKey}`, position.toString());
    }
  }, [useSession]);

  // Get stored scroll position
  const getStoredPosition = useCallback(() => {
    if (useSession) {
      const stored = sessionStorage.getItem(`scroll-${key}`);
      return stored ? parseInt(stored, 10) : 0;
    }
    return 0;
  }, [key, useSession]);

  // Save scroll position
  const savePosition = useCallback((position) => {
    savePositionForKey(key, position);
  }, [key, savePositionForKey]);

  // Handle scroll event with debounce
  const handleScroll = useCallback((e) => {
    if (isRestoringRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const scrollTop = e.target.scrollTop || window.scrollY;
      console.log('[ScrollMemory] Saving scroll position:', scrollTop, 'for key:', key);
      savePosition(scrollTop);
    }, debounce);
  }, [debounce, savePosition, key]);

  // Save position of previous key before switching
  useEffect(() => {
    if (previousKeyRef.current !== key && containerRef.current) {
      const currentScroll = containerRef.current.scrollTop;
      savePositionForKey(previousKeyRef.current, currentScroll);
    }
    previousKeyRef.current = key;
  }, [key, savePositionForKey]);

  // Restore scroll position when ready (e.g., after loading completes)
  useEffect(() => {
    if (!ready) return;

    const savedPosition = getStoredPosition();
    if (savedPosition === 0) return;

    isRestoringRef.current = true;

    // Restore after a short delay to ensure DOM is updated
    const restoreTimeout = setTimeout(() => {
      window.scrollTo(0, savedPosition);
      setTimeout(() => { isRestoringRef.current = false; }, 150);
    }, 200);

    return () => clearTimeout(restoreTimeout);
  }, [key, ready, getStoredPosition]);

  // Attach scroll listener - listen on window for page-level scroll
  useEffect(() => {
    const attachTimeout = setTimeout(() => {
      const scrollHandler = () => {
        if (isRestoringRef.current) return;
        const scrollTop = window.scrollY;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          if (useSession) {
            sessionStorage.setItem(`scroll-${key}`, scrollTop.toString());
          }
        }, debounce);
      };

      window.addEventListener('scroll', scrollHandler, { passive: true });
      containerRef._cleanup = () => window.removeEventListener('scroll', scrollHandler);
    }, 200);

    return () => {
      clearTimeout(attachTimeout);
      if (containerRef._cleanup) containerRef._cleanup();
    };
  }, [key, debounce, useSession]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Clear stored position for this key
  const clearPosition = useCallback(() => {
    if (useSession) {
      sessionStorage.removeItem(`scroll-${key}`);
    }
  }, [key, useSession]);

  return {
    containerRef,
    clearPosition
  };
};

export default useScrollMemory;
