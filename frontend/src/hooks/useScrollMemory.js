import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook to remember and restore scroll position for a component/section
 * @param {string} key - Unique key to identify the scroll position (e.g., 'ecr-123-section-2')
 * @param {object} options - Configuration options
 * @param {number} options.debounce - Debounce time in ms (default: 100)
 * @param {boolean} options.useSession - Use sessionStorage instead of memory (default: true)
 */
const useScrollMemory = (key, options = {}) => {
  const { debounce = 100, useSession = true } = options;
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);
  const isRestoringRef = useRef(false);

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
    if (useSession) {
      sessionStorage.setItem(`scroll-${key}`, position.toString());
    }
  }, [key, useSession]);

  // Handle scroll event with debounce
  const handleScroll = useCallback((e) => {
    if (isRestoringRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const scrollTop = e.target.scrollTop || window.scrollY;
      savePosition(scrollTop);
    }, debounce);
  }, [debounce, savePosition]);

  // Restore scroll position on mount
  useEffect(() => {
    const savedPosition = getStoredPosition();

    if (savedPosition > 0) {
      isRestoringRef.current = true;

      // Small delay to ensure content is rendered
      const restoreTimeout = setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = savedPosition;
        } else {
          window.scrollTo(0, savedPosition);
        }

        // Allow saving again after restore
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 100);
      }, 50);

      return () => clearTimeout(restoreTimeout);
    }
  }, [key, getStoredPosition]);

  // Attach scroll listener
  useEffect(() => {
    const container = containerRef.current;

    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    } else {
      // Use window scroll if no container ref
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

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
