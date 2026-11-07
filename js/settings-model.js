// Validate a whole settings section before changing any saved values.
const numberValue = (value) => {
  const text = String(value ?? '').trim().replace(',', '.');
  return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) && Number.isFinite(Number(text)) ? Number(text) : null;
};
const PROFILE_RANGES = {
  age: [10, 100, 'Age'], heightCm: [100, 250, 'Height'],
  startWeightKg: [25, 400, 'Starting weight'], goalWeightKg: [25, 400, 'Goal weight'],
  startWaistCm: [30, 300, 'Starting waist', true], waistGoalCm: [30, 300, 'Waist goal', true],
  strengthDays: [0, 7, 'Lifting days per week'], cardioMinutes: [0, 1260, 'Weekly jog minutes'],
};
const TARGET_RANGES = { kcal: [1000, 10000, 'Calories'], protein: [0, 500, 'Protein'], carbs: [0, 1500, 'Carbs'], fat: [0, 500, 'Fat'] };
const BURN_RANGES = {
  baseKcal: [500, 10000, 'Everyday burn'], kcalPerKg: [1000, 20000, 'kcal per kg'],
  strengthMet: [1, 15, 'Lifting MET'], strengthMinutes: [5, 240, 'Lifting session length'], jogMet: [1, 25, 'Jog MET'],
};

export function parseSettings(section, values) {
  const ranges = section === 'profile' ? PROFILE_RANGES : section === 'targets' ? TARGET_RANGES : section === 'burn' ? BURN_RANGES : null;
  if (!ranges) throw new Error('Unknown settings section');
  const result = {};
  for (const [key, [min, max, label, optional]] of Object.entries(ranges)) {
    if (optional && String(values[key] ?? '').trim() === '') { result[key] = null; continue; }
    const n = numberValue(values[key]);
    if (n === null || n < min || n > max) throw new Error(`${label}: enter a number from ${min} to ${max}`);
    if ((key === 'age' || key === 'strengthDays') && !Number.isInteger(n)) throw new Error(`${label}: use a whole number`);
    result[key] = n;
  }
  if (section === 'profile') {
    const choices = {
      sex: ['male', 'female'], activityLevel: ['sedentary', 'light', 'active', 'physical'],
      goalMode: ['auto', 'lose', 'maintain', 'gain'], dietStyle: ['auto', 'balanced', 'protein', 'plant'],
      bulkIntensity: ['light', 'heavy'],
      nutritionContext: ['general', 'special'],
    };
    for (const [key, allowed] of Object.entries(choices)) {
      const value = key === 'bulkIntensity' ? values[key] ?? 'light' : values[key];
      if (!allowed.includes(value)) throw new Error(`Choose a valid ${key === 'sex' ? 'sex' : 'profile option'}`);
      result[key] = value;
    }
  }
  return result;
}
