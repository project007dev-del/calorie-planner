// Portion ideas use saved targets and the selected day's food + supplements.
// Each result is an alternative next portion, never an automatically logged meal.
import { dayIntake, scale, add } from './calc.js';
import { findFood } from './foods.js';

const MACROS = ['protein', 'carbs', 'fat'];
const KEYS = ['kcal', ...MACROS];
// Familiar everyday foods, with practical upper portions. Prefer cooked weight
// where available. Oats use dry weight; fruit uses edible raw weight.
const CHOICES = [
  ['chicken_breast', 250], ['tilapia', 250], ['tuna_canned_water', 200],
  ['tofu_firm', 250], ['egg_white', 250], ['greek_yogurt', 250], ['munggo', 250],
  ['egg_whole', 150], ['white_rice', 300], ['brown_rice', 300],
  ['kamote', 300], ['wholewheat_bread', 100], ['oats', 80, 'raw'],
  ['banana', 200], ['saba', 200], ['peanuts', 40], ['peanut_butter', 32],
];
const PLANT_FOODS = new Set(['tofu_firm', 'munggo', 'white_rice', 'brown_rice', 'kamote', 'wholewheat_bread', 'oats', 'banana', 'saba', 'peanuts', 'peanut_butter']);

export function foodRecommendations(state, date) {
  const targets = Object.fromEntries(KEYS.map((key) => [key, Number(state.targets?.[key])]));
  const total = dayIntake(state.days?.[date], state.supplements).total;
  if (KEYS.some((key) => !Number.isFinite(targets[key]) || targets[key] < 0 || !Number.isFinite(total[key]) || total[key] < 0) || targets.kcal <= 0) {
    return { status: 'invalid', suggestions: [], reason: 'Review and save valid daily targets to see portion ideas.' };
  }
  const remaining = Object.fromEntries(KEYS.map((key) => [key, Math.max(0, targets[key] - total[key])]));
  const base = { total, remaining, suggestions: [] };
  if (remaining.kcal < 10) return { ...base, status: 'reached' };
  const focus = remaining.protein >= 5 ? 'protein' : remaining.carbs >= 5 ? 'carbs' : remaining.fat >= 3 ? 'fat' : 'kcal';
  const plant = state.profile?.dietStyle === 'plant';
  const suggestions = CHOICES.flatMap(([id, maxGrams, preferredState], order) => {
    if (plant && !PLANT_FOODS.has(id)) return [];
    const food = findFood(state, id);
    const preparation = preferredState || (food?.cooked ? 'cooked' : 'raw');
    const per100 = food?.[preparation];
    if (!per100 || KEYS.some((key) => !Number.isFinite(per100[key]) || per100[key] < 0) || !(per100.kcal > 0) || !(per100[focus] > 0)) return [];
    if (focus === 'protein' && per100.protein < 5) return [];
    if (focus === 'carbs' && per100.carbs < 10) return [];
    if (focus === 'fat' && per100.fat < 10) return [];
    const energyLimit = Math.floor((remaining.kcal * 100 / per100.kcal + 1e-8) / 5) * 5;
    const ideal = Math.round((remaining[focus] * 100 / per100[focus]) / 5) * 5;
    const grams = Math.min(maxGrams, energyLimit, Math.max(5, ideal));
    if (grams < 5) return [];
    const nutrients = scale(per100, grams);
    if (nutrients.kcal < 10) return [];
    const after = add(total, nutrients);
    const remainingAfter = Object.fromEntries(KEYS.map((key) => [key, Math.max(0, targets[key] - after[key])]));
    const over = Object.fromEntries(MACROS.map((key) => [key, Math.max(0, after[key] - targets[key])]));
    // Close the main gap, reward useful secondary nutrients and penalize
    // overshooting other macros. Calories are always bounded by what's left.
    let score = Math.min(1, nutrients[focus] / remaining[focus]) * 3;
    for (const key of MACROS) {
      if (targets[key] <= 0) continue;
      if (key !== focus) score += Math.min(remaining[key], nutrients[key]) / targets[key] * 0.3;
      score -= Math.max(0, nutrients[key] - remaining[key]) / targets[key] * 2;
    }
    score -= nutrients.kcal / remaining.kcal * 0.05;
    return [{ foodId: id, name: food.name, state: preparation, grams, nutrients, remainingAfter, over, focus, score, order }];
  }).sort((a, b) => b.score - a.score || a.order - b.order).slice(0, 3);
  return { ...base, status: suggestions.length ? 'available' : 'no-match', focus, suggestions };
}
