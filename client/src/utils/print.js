/**
 * High-performance native printing utility.
 * Clones the target DOM element, appends it to the body,
 * triggers native print, and cleans up afterwards.
 *
 * @param {HTMLElement} element - The DOM element to print.
 */
export const printElement = (element, onAfterPrint) => {
  if (!element) {
    console.warn('printElement: No element provided to print');
    return;
  }

  // 1. Clone the target element
  const clone = element.cloneNode(true);

  // 2. Preserve form values (inputs, textareas, selects) that cloneNode doesn't copy automatically
  const originalInputs = element.querySelectorAll('input, select, textarea');
  const clonedInputs = clone.querySelectorAll('input, select, textarea');
  originalInputs.forEach((input, index) => {
    if (clonedInputs[index]) {
      if (input.type === 'checkbox' || input.type === 'radio') {
        clonedInputs[index].checked = input.checked;
      } else {
        clonedInputs[index].value = input.value;
      }
    }
  });

  // 3. Mark the clone for target styling
  clone.classList.add('print-clone');

  // 4. Append the clone to the document body
  document.body.appendChild(clone);

  // 5. Activate the printing state on body
  document.body.classList.add('printing-active');

  // 5.1 Adjust viewport dynamically for mobile/tablet print scaling in desktop mode
  const viewportMeta = document.querySelector('meta[name="viewport"]');
  const originalViewportContent = viewportMeta ? viewportMeta.getAttribute('content') : null;

  const isMobileOrTablet = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (viewportMeta) {
    // Check if printing a narrow receipt or a full-size declaration sheet
    const isReceipt = element.classList.contains('print-receipt') || element.querySelector('.print-receipt');
    const targetWidth = isReceipt ? '380' : '800';
    if (isMobileOrTablet) {
      // On mobile/tablet, avoid setting initial-scale, maximum-scale, or user-scalable limits that cause viewport scaling/height lock in iOS
      viewportMeta.setAttribute('content', `width=${targetWidth}`);
    } else {
      viewportMeta.setAttribute('content', `width=${targetWidth}, initial-scale=1.0, maximum-scale=1.0, user-scalable=0`);
    }
  }

  // 6. Define cleanup handler
  const cleanup = () => {
    document.body.classList.remove('printing-active');

    // Restore original viewport settings
    if (viewportMeta && originalViewportContent) {
      viewportMeta.setAttribute('content', originalViewportContent);
    }

    if (clone.parentNode) {
      clone.parentNode.removeChild(clone);
    }
    window.removeEventListener('afterprint', cleanup);
    if (typeof onAfterPrint === 'function') {
      onAfterPrint();
    }
  };

  // 7. Register cleanup for after-print event
  window.addEventListener('afterprint', cleanup);

  // 8. Trigger printing with a minor timeout to allow DOM changes and viewport update to settle
  const printDelay = isMobileOrTablet ? 500 : 150;
  setTimeout(() => {
    window.print();
  }, printDelay);
};
