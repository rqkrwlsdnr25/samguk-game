/*
 * InvasionModal.js — reusable Vanilla JS component shell.
 * The live 삼국쟁패 integration is already included in the patched game.js.
 * This file mirrors the public mounting pattern for projects that prefer src/components.
 */
export function createInvasionModal({ mount = document.body, onLaunch, getState }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'samguk-invasion-modal';
  dialog.innerHTML = '<div class="samguk-invasion-modal__root"></div>';
  mount.appendChild(dialog);
  const root = dialog.querySelector('.samguk-invasion-modal__root');
  function render(view) {
    root.innerHTML = typeof view === 'string' ? view : '';
  }
  function open(view) { render(view); if (!dialog.open) dialog.showModal(); }
  function close() { if (dialog.open) dialog.close(); }
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog || event.target.closest('[data-invasion-close]')) close();
    const launch = event.target.closest('[data-invasion-launch]');
    if (launch && typeof onLaunch === 'function') onLaunch(getState?.());
  });
  return { dialog, root, render, open, close };
}
