import { useState, useRef, useEffect, useCallback } from 'react';

export function useMenuToggle() {
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    let bound = false;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      const id = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        bound = true;
      }, 0);
      return () => {
        clearTimeout(id);
        if (bound) document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    return () => {};
  }, [menuOpen]);

  const toggle = useCallback((e) => {
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }
    setMenuOpen((v) => !v);
  }, []);

  const close = useCallback(() => setMenuOpen(false), []);

  return { menuOpen, setMenuOpen, toggle, close, containerRef };
}
