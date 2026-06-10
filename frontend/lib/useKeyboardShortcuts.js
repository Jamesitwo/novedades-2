import { useEffect, useCallback } from 'react';

export function useKeyboardShortcuts({ onNext, onPrev, onEdit, onNew, onSearch }) {
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
    }
  }, [onNext, onPrev, onEdit, onNew, onSearch]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}