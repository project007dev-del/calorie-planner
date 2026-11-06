// Built-in food database. Values are per 100 g of edible food (approximate).
// "raw" = not cooked / as bought (dry for rice & oats). "cooked" = cooked weight.
// Cooked values for the plan's foods come straight from the plan's food table;
// raw values and extra foods are typical USDA / FNRI-style figures.
// Brand labels are more accurate – add your own foods in Food → My Foods.

export const CATEGORIES = [
  { id: 'protein', name: 'Protein foods' },
  { id: 'carbs', name: 'Rice, grains & starches' },
  { id: 'fruit', name: 'Fruit' },
  { id: 'veg', name: 'Vegetables' },
  { id: 'fats', name: 'Fats, oils & nuts' },
  { id: 'dairy', name: 'Dairy & drinks' },
  { id: 'other', name: 'Other' },
];
export const categoryName = (id) => (CATEGORIES.find((c) => c.id === id) || CATEGORIES.at(-1)).name;

const n = (kcal, protein, carbs, fat) => ({ kcal, protein, carbs, fat });

export const BUILTIN_FOODS = [
  // Protein foods
  { id: 'chicken_breast', name: 'Chicken breast (skinless)', category: 'protein', raw: n(120, 22.5, 0, 2.6), cooked: n(165, 31.0, 0, 3.6) },
  { id: 'chicken_thigh', name: 'Chicken thigh (skinless)', category: 'protein', raw: n(121, 19.7, 0, 4.1), cooked: n(179, 24.8, 0, 8.2) },
  { id: 'pork_liver', name: 'Pork liver', category: 'protein', raw: n(134, 21.4, 2.5, 3.7), cooked: n(165, 26.0, 3.8, 4.4), note: 'Very high in vitamin A – keep it occasional, not daily (you also take a multivitamin).' },
  { id: 'pork_tenderloin', name: 'Pork tenderloin (lean)', category: 'protein', raw: n(120, 21.0, 0, 3.5), cooked: n(143, 26.2, 0, 3.5) },
  { id: 'beef_ground_90', name: 'Ground beef 90% lean', category: 'protein', raw: n(176, 20.0, 0, 10.0), cooked: n(217, 26.1, 0, 11.8) },
  { id: 'tilapia', name: 'Tilapia', category: 'protein', raw: n(96, 20.1, 0, 1.7), cooked: n(128, 26.2, 0, 2.7) },
  { id: 'bangus', name: 'Bangus / milkfish', category: 'protein', raw: n(148, 20.5, 0, 6.7), cooked: n(190, 26.3, 0, 8.6) },
  { id: 'tuna_canned_water', name: 'Tuna, canned in water (drained)', category: 'protein', cooked: n(116, 25.5, 0, 0.8), labels: { cooked: 'Canned' } },
  { id: 'egg_whole', name: 'Whole egg', category: 'protein', raw: n(143, 12.6, 0.7, 9.5), cooked: n(155, 12.6, 1.1, 10.6), note: '1 large egg ≈ 50 g without shell.' },
  { id: 'egg_white', name: 'Egg white', category: 'protein', raw: n(52, 10.9, 0.7, 0.2), cooked: n(52, 10.9, 0.7, 0.2) },
  { id: 'tofu_firm', name: 'Firm tofu', category: 'protein', raw: n(144, 17.3, 2.8, 8.7), cooked: n(144, 17.3, 2.8, 8.7), labels: { raw: 'As packaged', cooked: 'Cooked (no oil)' }, note: 'Tofu is already cooked; log frying oil separately.' },

  // Rice, grains & starches
  { id: 'brown_rice', name: 'Brown rice', category: 'carbs', raw: n(367, 7.5, 76.2, 3.2), cooked: n(123, 2.7, 25.6, 1.0), labels: { raw: 'Raw (dry)' } },
  { id: 'white_rice', name: 'White rice', category: 'carbs', raw: n(365, 7.1, 80.0, 0.7), cooked: n(130, 2.7, 28.2, 0.3), labels: { raw: 'Raw (dry)' } },
  { id: 'oats', name: 'Oats', category: 'carbs', raw: n(389, 16.9, 66.3, 6.9), cooked: n(71, 2.5, 12.0, 1.5), labels: { raw: 'Dry', cooked: 'Cooked with water' } },
  { id: 'kamote', name: 'Kamote / sweet potato', category: 'carbs', raw: n(86, 1.6, 20.1, 0.1), cooked: n(76, 1.4, 17.7, 0.1) },
  { id: 'potato', name: 'Potato', category: 'carbs', raw: n(77, 2.0, 17.5, 0.1), cooked: n(87, 1.9, 20.1, 0.1) },
  { id: 'wholewheat_bread', name: 'Whole-wheat bread', category: 'carbs', raw: n(252, 12.4, 42.7, 3.5), labels: { raw: 'As bought' } },
  { id: 'pandesal', name: 'Pandesal (approx.)', category: 'carbs', raw: n(290, 8.6, 53.0, 4.4), labels: { raw: 'As bought' }, note: 'Bakery recipes vary a lot – 1 piece is often 25–40 g.' },

  // Fruit
  { id: 'banana', name: 'Banana', category: 'fruit', raw: n(89, 1.1, 22.8, 0.3), labels: { raw: 'Raw (peeled)' } },
  { id: 'apple', name: 'Apple', category: 'fruit', raw: n(52, 0.3, 13.8, 0.2) },
  { id: 'mango', name: 'Mango, ripe', category: 'fruit', raw: n(60, 0.8, 15.0, 0.4) },
  { id: 'papaya', name: 'Papaya', category: 'fruit', raw: n(43, 0.5, 10.8, 0.3) },

  // Vegetables
  { id: 'mixed_veg', name: 'Mixed vegetables (plan average)', category: 'veg', raw: n(27.6, 1.68, 5.92, 0.2), cooked: n(27.2, 1.54, 5.62, 0.2), note: 'Average of broccoli, cabbage, carrot, kangkong and sayote.' },
  { id: 'broccoli', name: 'Broccoli', category: 'veg', raw: n(34, 2.8, 6.6, 0.4), cooked: n(35, 2.4, 7.2, 0.4) },
  { id: 'cabbage', name: 'Cabbage', category: 'veg', raw: n(25, 1.3, 5.8, 0.1), cooked: n(23, 1.3, 5.5, 0.1) },
  { id: 'carrot', name: 'Carrot', category: 'veg', raw: n(41, 0.9, 9.6, 0.2), cooked: n(35, 0.8, 8.2, 0.2) },
  { id: 'kangkong', name: 'Kangkong', category: 'veg', raw: n(19, 2.6, 3.1, 0.2), cooked: n(19, 2.6, 2.1, 0.2) },
  { id: 'sayote', name: 'Sayote / chayote', category: 'veg', raw: n(19, 0.8, 4.5, 0.1), cooked: n(24, 0.6, 5.1, 0.1) },
  { id: 'pechay', name: 'Pechay / bok choy', category: 'veg', raw: n(13, 1.5, 2.2, 0.2), cooked: n(12, 1.6, 1.8, 0.2) },
  { id: 'sitaw', name: 'Sitaw / string beans', category: 'veg', raw: n(47, 2.8, 8.4, 0.4), cooked: n(47, 2.5, 9.2, 0.1) },
  { id: 'eggplant', name: 'Eggplant / talong', category: 'veg', raw: n(25, 1.0, 5.9, 0.2), cooked: n(35, 0.8, 8.7, 0.2) },
  { id: 'tomato', name: 'Tomato', category: 'veg', raw: n(18, 0.9, 3.9, 0.2) },
  { id: 'cucumber', name: 'Cucumber', category: 'veg', raw: n(15, 0.7, 3.6, 0.1) },

  // Fats, oils & nuts
  { id: 'peanuts', name: 'Peanuts', category: 'fats', raw: n(567, 25.8, 16.1, 49.2), cooked: n(587, 24.4, 21.3, 49.7), labels: { cooked: 'Roasted' } },
  { id: 'peanut_butter', name: 'Peanut butter', category: 'fats', raw: n(588, 25.0, 20.0, 50.0), labels: { raw: 'As bought' } },
  { id: 'oil', name: 'Cooking oil (olive / canola)', category: 'fats', raw: n(884, 0, 0, 100), labels: { raw: 'As is' }, note: '1 tsp ≈ 5 g, 1 tbsp ≈ 14 g.' },

  // Dairy & drinks
  { id: 'milk_whole', name: 'Milk, whole', category: 'dairy', raw: n(61, 3.2, 4.8, 3.3), labels: { raw: 'As is' }, note: '1 cup ≈ 244 g.' },
  { id: 'milk_lowfat', name: 'Milk, low-fat (1%)', category: 'dairy', raw: n(42, 3.4, 5.0, 1.0), labels: { raw: 'As is' } },
  { id: 'greek_yogurt', name: 'Greek yogurt, plain non-fat', category: 'dairy', raw: n(59, 10.2, 3.6, 0.4), labels: { raw: 'As is' } },
];

export const STATES = ['raw', 'cooked'];

/** Turn a stored custom food into the same shape as a built-in. */
export function customToFood(c) {
  return {
    id: c.id,
    name: c.name,
    category: c.category || 'other',
    custom: true,
    raw: c.state === 'raw' ? c.per100 : null,
    cooked: c.state === 'cooked' ? c.per100 : null,
    serving: c.serving || null,
    note: c.note || '',
  };
}

export function allFoods(state) {
  return [...(state?.customFoods || []).map(customToFood), ...BUILTIN_FOODS];
}
export const findFood = (state, id) => allFoods(state).find((f) => f.id === id) || null;
export const statesOf = (food) => STATES.filter((s) => food && food[s]);
export function stateLabel(food, st) {
  return food?.labels?.[st] || (st === 'raw' ? 'Raw' : 'Cooked');
}
export const badge = (st) => (st === 'raw' ? 'RAW' : 'COOKED');
