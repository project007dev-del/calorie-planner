// General adult starting points, calculated locally. Sources and assumptions
// are visible in Settings and documented in docs/nutrition-sources.md.
import { bmrMifflin, suggestBaseKcal, currentWeight } from './calc.js';
import { profileComplete } from './plan.js';
import { num } from './util.js';
import { parseSettings } from './settings-model.js';

export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Mostly sitting', factor: 1.2 },
  { id: 'light', label: 'Some walking / light daily movement', factor: 1.4 },
  { id: 'active', label: 'On my feet much of the day', factor: 1.6 },
  { id: 'physical', label: 'Physically demanding work', factor: 1.8 },
];
export const DIET_STYLES = [
  { id: 'auto', label: 'Recommend from my profile' },
  { id: 'balanced', label: 'Balanced Filipino diet (Pinggang Pinoy)' },
  { id: 'protein', label: 'Higher protein for strength training' },
  { id: 'plant', label: 'Plant-forward Filipino diet' },
];
export const BULK_INTENSITIES = [
  { id: 'light', label: 'Light bulk', percent: 5, maxKcal: 200 },
  { id: 'heavy', label: 'Heavy bulk', percent: 10, maxKcal: 400 },
];

export function dailyRecommendation(state, date) {
  const p = state.profile;
  if (!profileComplete(p)) return { available: false, reason: 'Save your age, sex, height, starting weight and goal weight in Profile to see a recommendation.' };
  try { parseSettings('profile', p); parseSettings('burn', state.burn); }
  catch { return { available: false, reason: 'Review and save valid profile and burn settings before using automatic targets.' }; }
  if (num(p.age) < 18 || p.nutritionContext === 'special') return { available: false, reason: 'Automatic targets are for generally healthy adults. For under-18s, pregnancy, breastfeeding or a condition affecting diet, use targets from a registered nutritionist-dietitian.' };
  const weight = currentWeight(state, date);
  const heightM = num(p.heightCm) / 100;
  const bmi = weight / heightM ** 2;
  const goalBmi = num(p.goalWeightKg) / heightM ** 2;
  if (bmi < 18.5 || goalBmi < 18.5 || bmi >= 40) return { available: false, reason: 'Your current or goal weight needs individual nutrition guidance. Keep logging, and set targets with a registered nutritionist-dietitian.' };
  const base = num(state.burn.baseKcal);
  if (!(base > 0)) return { available: false, reason: 'Save an everyday calorie burn above zero before calculating targets.' };
  const strengthDays = Math.min(7, Math.max(0, num(p.strengthDays ?? 5)));
  const cardioMinutes = Math.min(1260, Math.max(0, num(p.cardioMinutes ?? 30)));
  const strengthExtra = Math.max(0, num(state.burn.strengthMet) - 1) * weight * num(state.burn.strengthMinutes) / 60;
  const cardioExtra = Math.max(0, num(state.burn.jogMet) - 1) * weight * cardioMinutes / 60;
  const maintenance = Math.round(base + (strengthDays * strengthExtra + cardioExtra) / 7);
  if (maintenance > 6000) return { available: false, reason: 'These burn settings imply more than 6,000 kcal/day. Review everyday burn, session length and MET values, or use targets set with a nutrition professional.' };
  const goal = ['lose', 'maintain', 'gain'].includes(p.goalMode) ? p.goalMode
    : num(p.goalWeightKg) < weight - 0.5 ? 'lose' : num(p.goalWeightKg) > weight + 0.5 ? 'gain' : 'maintain';
  // Conservative app defaults, not a diet prescribed by the source agencies.
  const bulk = goal === 'gain' ? BULK_INTENSITIES.find((x) => x.id === (p.bulkIntensity || 'light')) : null;
  const adjustment = goal === 'lose' ? -Math.min(300, maintenance * 0.10)
    : bulk ? Math.min(bulk.maxKcal, maintenance * bulk.percent / 100) : 0;
  const minimum = p.sex === 'female' ? 1200 : 1500;
  const kcal = Math.max(minimum, Math.round((maintenance + adjustment) / 10) * 10);
  const automaticStyle = p.dietStyle === 'auto';
  const styleId = automaticStyle ? (strengthDays >= 2 && goal !== 'maintain' ? 'protein' : 'balanced') : p.dietStyle;
  const style = DIET_STYLES.find((x) => x.id === styleId) || DIET_STYLES.find((x) => x.id === 'balanced');
  const exercising = strengthDays > 0 || cardioMinutes > 0;
  const proteinPerKg = style.id === 'protein' ? 1.8 : exercising ? 1.6 : 1.0;
  const requestedProtein = Math.round(weight * proteinPerKg);
  const protein = Math.min(requestedProtein, Math.floor(kcal * 0.30 / 4));
  const fat = Math.round(kcal * 0.30 / 9);
  const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
  const meals = style.id === 'plant'
    ? ['Try munggo or tokwa with rice, cooked togue and pechay; add fruit.', 'Rotate beans, tofu, nuts and seeds. Include fortified milk or a suitable alternative.']
    : ['Pair fish, chicken, eggs or tokwa with a measured rice portion and plenty of vegetables.', 'Try tinola with sayote, grilled bangus with kangkong, or munggo with kalabasa; add fruit.'];
  return {
    available: true, goal, bulk, adjustment, style, automaticStyle, weight, bmi, maintenance, base,
    bmr: Math.round(bmrMifflin({ ...p, weightKg: weight })),
    suggestedBase: suggestBaseKcal(p, weight), strengthDays, cardioMinutes,
    proteinPerKg, proteinCapped: protein < requestedProtein, floorApplied: kcal > Math.round((maintenance + adjustment) / 10) * 10,
    targets: { kcal, protein, carbs, fat }, meals,
    pace: (kcal - maintenance) * 7 / (num(state.burn.kcalPerKg) || 7700),
  };
}
