// Movement panels extracted from the supplied plan. Assets are bundled offline.
import { allExercises } from './plan.js';

const notes = {
  squat: 'The illustration shows the goblet-squat option.',
  pushup_chest_press: 'The illustration shows push-ups. Elevating your hands on a bench makes them easier.',
  lunge_leg_press: 'The illustration shows lunges; the leg-press guide is also available in the exercise library.',
  plank: 'Hold the illustrated position with a straight line from head to heels. End the set when you lose that position.',
  arms_superset: 'First perform biceps curls, then overhead triceps extensions (shown below). Rest after the pair.',
};
export const EXERCISE_GUIDES = Object.fromEntries(allExercises().map((e) => [e.id, {
  image: `assets/exercises/${e.id}.png`,
  description: e.id === 'plank' ? 'Plank hold position' : `${e.name}: start and finish positions with movement direction`,
  note: notes[e.id] || '',
  ...(e.id === 'arms_superset' ? { extraImage: 'assets/exercises/biceps_curl.png' } : {}),
}]));
