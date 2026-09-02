'use client';

import { useEffect } from 'react';

export default function ExtensionSanitizer() {
  useEffect(() => {
    try {
      const clean = (el: Element | null) => {
        if (el && el.removeAttribute) el.removeAttribute('bis_skin_checked');
      };
      document.querySelectorAll('[bis_skin_checked]').forEach(clean);
      const observer = new MutationObserver(mutations => {
        for (let i = 0; i < mutations.length; i++) {
          const m = mutations[i];
          if (m.attributeName === 'bis_skin_checked') clean(m.target as Element);
        }
      });
      observer.observe(document.documentElement, {
        attributes: true,
        subtree: true,
        attributeFilter: ['bis_skin_checked'],
      });
      return () => observer.disconnect();
    } catch {}
  }, []);

  return null;
}
