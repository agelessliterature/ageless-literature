'use client';

import { useEffect } from 'react';

export function FontAwesomeLoader() {
  useEffect(() => {
    // Only load once
    if (typeof window !== 'undefined' && !window.document.getElementById('fontawesome-kit')) {
      // Set FontAwesome config before loading the kit
      (window as any).FontAwesomeConfig = {
        autoReplaceSvg: 'nest',
        observeMutations: true,
        searchPseudoElements: true,
      };

      // Load FontAwesome kit
      const script = document.createElement('script');
      script.id = 'fontawesome-kit';
      script.src = 'https://kit.fontawesome.com/02ac40efc4.js';
      script.crossOrigin = 'anonymous';

      // After script loads, manually trigger icon replacement for existing DOM
      script.onload = () => {
        // Wait a bit for FontAwesome to initialize
        setTimeout(() => {
          if ((window as any).FontAwesome) {
            // Force FontAwesome to scan and replace all existing icons
            (window as any).FontAwesome.dom.i2svg();
          }
        }, 100);
      };

      document.head.appendChild(script);
    } else if ((window as any).FontAwesome) {
      // Script already loaded, just trigger replacement
      (window as any).FontAwesome.dom.i2svg();
    }
  }, []);

  return null;
}
