import { esc } from './util.js';

const groups = {
  chest: ['bench_press', 'incline_db_press', 'pushup_chest_press'],
  shoulders: ['db_shoulder_press', 'lateral_raise', 'face_pull'],
  back: ['lat_pulldown', 'seated_row', 'one_arm_db_row', 'back_extension'],
  arms: ['triceps_pushdown', 'biceps_curl', 'arms_superset'],
  legs: ['squat', 'rdl', 'leg_press', 'leg_curl', 'calf_raise', 'hip_thrust', 'bulgarian_split_squat', 'leg_extension', 'lunge_leg_press'],
  core: ['plank', 'dead_bug'],
};
export const muscleFocus = (id) => Object.entries(groups).find(([, ids]) => ids.includes(id))?.[0] || 'full body';
export function workoutIcon(type) {
  const path = type === 'strength' ? '<path d="m6 6 12 12M4 8l4-4m-6 2 4-4m10 18 4-4m-2 6 4-4"/>'
    : type === 'cardio' ? '<circle cx="16" cy="4" r="2"/><path d="m5 10 5-2 4 4 5 1M10 8l2 7-5 6m5-6 5 6"/>'
      : '<path d="M19 14A8 8 0 0 1 10 4a8 8 0 1 0 9 10Z"/>';
  return `<svg viewBox="0 0 24 24" class="workout-icon" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

/** A muscle-focus illustration, not an exercise form demonstration. */
export function muscleVisual(id, name = '') {
  const group = muscleFocus(id);
  return `<svg class="muscle-visual focus-${group.replace(' ', '-')}" viewBox="0 0 86 118" role="img" aria-label="${esc(name ? `${name}: ` : '')}${esc(group)} muscle focus">
    <g class="body-base"><circle cx="43" cy="13" r="9"/><path d="M28 28 43 24 58 28 55 61 49 69 50 109 40 109 38 75 36 109 26 109 30 65Z"/><path d="m27 29-8 4-8 35 8 3 10-29m29-13 8 4 8 35-8 3-10-29"/></g>
    <g class="muscle muscle-chest"><path d="m30 31 11-2v13l-12-2Zm14-2 11 2 1 9-12 2Z"/></g>
    <g class="muscle muscle-shoulders"><path d="m27 28-8 6-1 10 10-4 3-10m25-2 9 6 2 10-11-4-3-10"/></g>
    <g class="muscle muscle-back"><path d="m31 43 11 2 11-2-3 15-8 6-9-6Z"/></g>
    <g class="muscle muscle-arms"><path d="m17 45 9-3-6 19-7-2m47-17 9 3 4 14-7 2Z"/></g>
    <g class="muscle muscle-core"><path d="M35 44h14v19H35Z"/></g>
    <g class="muscle muscle-legs"><path d="m31 69 9 1-4 35h-7Zm11 1 7-1-1 36h-7Z"/></g>
  </svg>`;
}

export function weeklyVisual(days, { draft = false, currentWeekday = null } = {}) {
  return `<div class="routine-week" aria-label="${draft ? 'Draft' : 'Saved'} weekly workout schedule">${days.map((d) => `<div class="routine-day ${d.type}${d.weekday === currentWeekday ? ' current' : ''}">
    <span class="routine-weekday">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.weekday]}</span>
    <span class="routine-icon">${workoutIcon(d.type)}</span><b>${esc(d.title)}</b><span class="tiny">${d.type === 'rest' ? 'Recover' : `${d.minutes ?? (d.type === 'strength' ? 60 : 30)} min`}</span>
  </div>`).join('')}</div>`;
}
