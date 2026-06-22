import { useEffect, useCallback } from 'react';

export function useKeyboardShortcuts({ onNext, onPrev, onEdit, onNew, onSearch, onView }) {
  const handleKeyDown = useCallback((e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'j':
        onNext?.();
        break;
      case 'k':
        onPrev?.();
        break;
      case 'e':
        onEdit?.();
        break;
      case 'n':
        onNew?.();
        break;
      case '/':
        e.preventDefault();
        onSearch?.();
        break;
      case 'enter':
        onView?.();
        break;
      case 'v':
        onView?.();
        break;
    }
  }, [onNext, onPrev, onEdit, onNew, onSearch, onView]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}