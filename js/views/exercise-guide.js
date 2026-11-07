import { allExercises, TRAINING_NOTES } from '../plan.js';
import { esc } from '../util.js';
import { EXERCISE_GUIDES } from '../exercise-guides.js';
import { openSheet } from '../ui.js';

const library = allExercises();

export function exercisePreview(exercise, compact = false) {
  const guide = EXERCISE_GUIDES[exercise.id];
  if (!guide) return '';
  return `<button class="exercise-demo${compact ? ' compact' : ''}" type="button" data-exercise-guide="${esc(exercise.id)}" data-guide-targets="${esc(JSON.stringify([exercise.setsMin, exercise.setsMax, exercise.repsMin, exercise.repsMax]))}" aria-label="View ${esc(exercise.name)} movement guide">
    <img src="${guide.image}" alt="${esc(guide.description)}" loading="lazy" width="978" height="386">
    <span>View movement <span aria-hidden="true">↗</span></span>
  </button>`;
}

export function wireExerciseGuides(root, exercises = library) {
  root.querySelectorAll('[data-exercise-guide]').forEach((button) => button.addEventListener('click', () => {
    const exercise = exercises.find((e) => e.id === button.dataset.exerciseGuide) || library.find((e) => e.id === button.dataset.exerciseGuide);
    if (exercise) {
      const [setsMin, setsMax, repsMin, repsMax] = JSON.parse(button.dataset.guideTargets);
      openExerciseGuide({ ...exercise, setsMin, setsMax, repsMin, repsMax });
    }
  }));
}

export function openExerciseGuide(exercise) {
  const guide = EXERCISE_GUIDES[exercise.id];
  if (!guide) return;
  const sets = exercise.setsMin === exercise.setsMax ? exercise.setsMax : `${exercise.setsMin}–${exercise.setsMax}`;
  const cues = exercise.tip.split(/(?<=[.!?])\s+/).filter(Boolean);
  openSheet({
    title: exercise.name,
    body: `<div class="movement-guide">
      <div class="row wrap"><span class="badge neutral">${sets} × ${exercise.repsMin}–${exercise.repsMax}${exercise.unit === 's' ? ' sec' : ' reps'}${exercise.perSide ? ` / ${esc(exercise.perSide)}` : ''}</span><span class="badge neutral">Rest ${esc(exercise.rest)}</span></div>
      ${guide.extraImage ? `<h3>1. Biceps curl</h3><img class="movement-diagram" src="${guide.extraImage}" alt="Biceps curl: start and finish positions" width="978" height="386"><h3>2. Overhead triceps extension</h3>` : ''}
      <img class="movement-diagram" src="${guide.image}" alt="${esc(guide.description)}" width="978" height="386">
      <p class="diagram-key">${exercise.id === 'plank' ? 'Hold the illustrated position.' : '① Start · ② Finish · Orange arrows show movement.'}</p>
      ${guide.note ? `<p class="small">${esc(guide.note)}</p>` : ''}
      <h3>How to do it</h3><ol class="movement-cues">${cues.map((cue) => `<li>${esc(cue)}</li>`).join('')}</ol>
      ${exercise.swap ? `<p class="small muted">Alternative: ${esc(exercise.swap)}</p>` : ''}
      <details class="guidance"><summary>Warm-up &amp; effort</summary><p class="small">${esc(TRAINING_NOTES.warmup)}</p><p class="small">${esc(TRAINING_NOTES.effort)}</p></details>
    </div>`,
    onMount(dialog) { dialog.classList.add('movement-sheet'); },
  });
}
