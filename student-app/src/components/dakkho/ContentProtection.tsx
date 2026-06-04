'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useServerConfigStore, useContentProtectionStore } from '@/lib/store';
import { CustomContextMenu } from './CustomContextMenu';

interface ContentProtectionProps {
  children: React.ReactNode;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
}

export function ContentProtection({ children }: ContentProtectionProps) {
  const serverConfig = useServerConfigStore((s) => s.config);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0 });

  // Derive protection settings from server config (admin-controlled)
  const protection = serverConfig?.contentProtection || {
    enabled: true, noCopy: true, noRightClick: true,
    noScreenshot: true, noPrint: true, customContextMenu: true,
    watermark: false, dragProtection: true,
  };

  const printStyleRef = useRef<HTMLStyleElement | null>(null);

  // --- 1. Print Blocking (CSS + window.print override + Ctrl+P) ---
  useEffect(() => {
    if (protection.enabled && protection.noPrint) {
      const style = document.createElement('style');
      style.textContent = `
        @media print {
          body * { display: none !important; }
          body::after {
            content: 'Content is protected. Printing is not allowed.';
            display: block !important;
            font-size: 24px;
            text-align: center;
            padding: 50px;
            color: #ef4444;
          }
        }
      `;
      document.head.appendChild(style);
      printStyleRef.current = style;

      const originalPrint = window.print;
      (window as Record<string, unknown>).print = () => {};

      return () => {
        if (printStyleRef.current) {
          document.head.removeChild(printStyleRef.current);
          printStyleRef.current = null;
        }
        window.print = originalPrint;
      };
    }
  }, [protection.enabled, protection.noPrint]);

  // --- 2. Copy/Paste Prevention ---
  useEffect(() => {
    if (!protection.enabled || !protection.noCopy) return;

    const handleCopy = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const handleCut = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const handleSelectStart = (e: Event) => {
      // Allow select in input/textarea for user input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      e.preventDefault();
    };

    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('cut', handleCut, true);
    document.addEventListener('selectstart', handleSelectStart, true);

    return () => {
      document.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('cut', handleCut, true);
      document.removeEventListener('selectstart', handleSelectStart, true);
    };
  }, [protection.enabled, protection.noCopy]);

  // --- 3. Right-Click Prevention + Custom Context Menu ---
  useEffect(() => {
    if (!protection.enabled) return;
    if (!protection.noRightClick && !protection.customContextMenu) return;

    const handleContextMenu = (e: MouseEvent) => {
      // Allow context menu in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      e.preventDefault();

      if (protection.customContextMenu) {
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
      }
    };

    document.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [protection.enabled, protection.noRightClick, protection.customContextMenu]);

  // --- 4. Screenshot Prevention (PrintScreen + Ctrl+Shift+S) ---
  useEffect(() => {
    if (!protection.enabled || !protection.noScreenshot) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        // Clear clipboard to prevent paste of screenshot
        navigator.clipboard?.writeText('').catch(() => {});
      }
      // Block Ctrl+Shift+S (Chrome screenshot)
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
      }
      // Block Ctrl+Shift+I (DevTools - partial)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
      }
      // Block F12
      if (e.key === 'F12') {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // After PrintScreen key up, clear clipboard again
      if (e.key === 'PrintScreen') {
        navigator.clipboard?.writeText('').catch(() => {});
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [protection.enabled, protection.noScreenshot]);

  // --- 5. Drag Protection ---
  useEffect(() => {
    if (!protection.enabled || !protection.dragProtection) return;

    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      // Allow drag in inputs
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      e.preventDefault();
    };

    document.addEventListener('dragstart', handleDragStart, true);

    return () => {
      document.removeEventListener('dragstart', handleDragStart, true);
    };
  }, [protection.enabled, protection.dragProtection]);

  // --- 6. Watermark ---
  useEffect(() => {
    if (!protection.enabled || !protection.watermark) return;

    const existing = document.getElementById('dakkho-watermark');
    if (existing) return;

    const watermark = document.createElement('div');
    watermark.id = 'dakkho-watermark';
    watermark.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
      opacity: 0.03;
      background-image: repeating-linear-gradient(
        -45deg,
        transparent,
        transparent 100px,
        rgba(0,0,0,0.1) 100px,
        rgba(0,0,0,0.1) 101px
      ),
      repeating-linear-gradient(
        45deg,
        transparent,
        transparent 100px,
        rgba(0,0,0,0.1) 100px,
        rgba(0,0,0,0.1) 101px
      );
      background-size: 142px 142px;
    `;

    // Add text watermark overlay
    const textLayer = document.createElement('div');
    textLayer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-wrap: wrap;
      align-content: flex-start;
      gap: 120px;
      padding: 40px;
      transform: rotate(-25deg);
      transform-origin: top left;
    `;

    // Create watermark text elements
    for (let i = 0; i < 30; i++) {
      const span = document.createElement('span');
      span.textContent = 'DAKKHO';
      span.style.cssText = `
        font-size: 18px;
        font-weight: bold;
        color: rgba(0,0,0,0.5);
        white-space: nowrap;
        user-select: none;
        margin-right: 80px;
      `;
      textLayer.appendChild(span);
    }

    watermark.appendChild(textLayer);
    document.body.appendChild(watermark);

    return () => {
      const el = document.getElementById('dakkho-watermark');
      if (el) el.remove();
    };
  }, [protection.enabled, protection.watermark]);

  // --- 7. Keyboard shortcut prevention (Ctrl+P, Ctrl+C, Ctrl+U) ---
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!protection.enabled) return;

      const ctrl = e.ctrlKey || e.metaKey;

      // Block Ctrl+P (print)
      if (protection.noPrint && e.key === 'p' && ctrl) {
        e.preventDefault();
      }

      // Block Ctrl+C (copy) - except in input/textarea
      if (protection.noCopy && e.key === 'c' && ctrl) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }

      // Block Ctrl+U (view source)
      if (e.key === 'u' && ctrl) {
        e.preventDefault();
      }
    },
    [protection.enabled, protection.noPrint, protection.noCopy]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // --- 8. Add user-select CSS class when noCopy is enabled ---
  useEffect(() => {
    if (protection.enabled && protection.noCopy) {
      document.body.classList.add('dakkho-no-select');
    } else {
      document.body.classList.remove('dakkho-no-select');
    }
    return () => {
      document.body.classList.remove('dakkho-no-select');
    };
  }, [protection.enabled, protection.noCopy]);

  return (
    <div className="dakkho-protected-content">
      {children}
      {protection.customContextMenu && (
        <CustomContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu({ visible: false, x: 0, y: 0 })}
        />
      )}
    </div>
  );
}
