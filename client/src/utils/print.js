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

  // 6. Define cleanup handler
  const cleanup = () => {
    document.body.classList.remove('printing-active');
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

  // 8. Trigger printing with a minor timeout to allow DOM changes to settle
  setTimeout(() => {
    window.print();
  }, 50);
};
