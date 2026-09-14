/**
 * InvasionTerritoryPreview.js
 * Reusable objective-preview renderer for Vanilla JS builds.
 * The production integration is embedded in game.js so this module is optional.
 */
export function createInvasionTerritoryPreview({ mount, onConfirm }) {
  if (!mount) throw new Error('mount element is required');

  function render(model) {
    if (!model) {
      mount.innerHTML = '';
      mount.hidden = true;
      return;
    }
    mount.hidden = false;
    mount.innerHTML = `
      <section class="invasion-objective-preview" aria-live="polite">
        <header>
          <small>SELECTED OBJECTIVE</small>
          <h3>${model.name}</h3>
        </header>
        <dl>
          <div><dt>위치</dt><dd>${model.location}</dd></div>
          <div><dt>지배 세력</dt><dd>${model.ownerName}</dd></div>
          <div><dt>예상 난이도</dt><dd>${model.difficulty}</dd></div>
          <div><dt>예상 보상</dt><dd>${model.reward}</dd></div>
        </dl>
        <button type="button" data-objective-confirm>이 영토를 침략 목표로 확정</button>
      </section>`;
  }

  mount.addEventListener('click', (event) => {
    if (event.target.closest('[data-objective-confirm]')) onConfirm?.();
  });

  return { render, clear: () => render(null) };
}
