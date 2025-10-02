// Performance optimization utilities

/**
 * Debounce function for delaying expensive operations
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: number | undefined;

  return function (...args: Parameters<T>) {
    const later = () => {
      timeout = undefined;
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for limiting the rate of function calls
 */
export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Request idle callback with fallback for older browsers
 */
export function requestIdleCallback(callback: () => void): void {
  if ("requestIdleCallback" in globalThis) {
    globalThis.requestIdleCallback(callback);
  } else {
    setTimeout(callback, 1);
  }
}

/**
 * Lazy load a component when it becomes visible
 */
export function lazyLoadWhenVisible(
  element: HTMLElement,
  callback: () => void,
  options?: IntersectionObserverInit,
): void {
  if ("IntersectionObserver" in globalThis) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback();
          observer.unobserve(element);
        }
      });
    }, options);

    observer.observe(element);
  } else {
    // Fallback for older browsers
    callback();
  }
}
