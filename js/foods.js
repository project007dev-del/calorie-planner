// Built-in food database. Values are per 100 g of edible food (approximate).
// "raw" = not cooked / as bought (dry for rice & oats). "cooked" = cooked weight.
// Cooked values for the plan's foods come straight from the plan's food table;
// raw values and extra foods are typical USDA / FNRI-style figures.
// Brand labels are more accurate – add your own foods in Food → My Foods.
// New Filipino entries below use linked PhilFCT reports, not recipe guesses.

export const CATEGORIES = [
  { id: 'protein', name: 'Protein foods' },
  { id: 'carbs', name: 'Rice, grains & starches' },
  { id: 'fruit', name: 'Fruit' },
  { id: 'veg', name: 'Vegetables' },
  { id: 'fats', name: 'Fats, oils & nuts' },
  { id: 'dairy', name: 'Dairy & drinks' },
  { id: 'dishes', name: 'Filipino snacks' },
  { id: 'other', name: 'Other' },
];
export const categoryName = (id) => (CATEGORIES.find((c) => c.id === id) || CATEGORIES.at(-1)).name;

const n = (kcal, protein, carbs, fat) => ({ kcal, protein, carbs, fat });
const fnri = (report, code) => ({ title: `DOST-FNRI PhilFCT · ${code}`, url: `https://i.fnri.dost.gov.ph/fct/library/report/${report}` });

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
  { id: 'egg_whole', name: 'Whole egg', category: 'protein', raw: n(143, 12.6, 0.7, 9.5), cooked: n(155, 12.6, 1.1, 10.6), note: '1 large egg ≈ 50 g without shell.', units: [{ one: 'egg', many: 'eggs', g: 50 }] },
  { id: 'egg_white', name: 'Egg white', category: 'protein', raw: n(52, 10.9, 0.7, 0.2), cooked: n(52, 10.9, 0.7, 0.2), units: [{ one: 'egg white', many: 'egg whites', g: 33 }] },
  { id: 'tofu_firm', name: 'Firm tofu', category: 'protein', raw: n(144, 17.3, 2.8, 8.7), cooked: n(144, 17.3, 2.8, 8.7), labels: { raw: 'As packaged', cooked: 'Cooked (no oil)' }, note: 'Tofu is already cooked; log frying oil separately.' },

  // Rice, grains & starches
  { id: 'brown_rice', name: 'Brown rice', category: 'carbs', raw: n(367, 7.5, 76.2, 3.2), cooked: n(123, 2.7, 25.6, 1.0), labels: { raw: 'Raw (dry)' }, units: [{ one: 'cup', many: 'cups', g: 195, state: 'cooked' }, { one: 'cup', many: 'cups', g: 185, state: 'raw' }] },
  { id: 'white_rice', name: 'White rice', category: 'carbs', raw: n(365, 7.1, 80.0, 0.7), cooked: n(130, 2.7, 28.2, 0.3), labels: { raw: 'Raw (dry)' }, units: [{ one: 'cup', many: 'cups', g: 158, state: 'cooked' }, { one: 'cup', many: 'cups', g: 185, state: 'raw' }] },
  { id: 'oats', name: 'Oats', category: 'carbs', raw: n(389, 16.9, 66.3, 6.9), cooked: n(71, 2.5, 12.0, 1.5), labels: { raw: 'Dry', cooked: 'Cooked with water' }, units: [{ one: '× ½ cup', many: '× ½ cup', g: 40, state: 'raw' }, { one: 'cup', many: 'cups', g: 234, state: 'cooked' }] },
  { id: 'kamote', name: 'Kamote / sweet potato', category: 'carbs', raw: n(86, 1.6, 20.1, 0.1), cooked: n(76, 1.4, 17.7, 0.1) },
  { id: 'potato', name: 'Potato', category: 'carbs', raw: n(77, 2.0, 17.5, 0.1), cooked: n(87, 1.9, 20.1, 0.1) },
  { id: 'wholewheat_bread', name: 'Whole-wheat bread', category: 'carbs', raw: n(252, 12.4, 42.7, 3.5), labels: { raw: 'As bought' }, units: [{ one: 'slice', many: 'slices', g: 32 }] },
  { id: 'pandesal', name: 'Pandesal (approx.)', category: 'carbs', raw: n(290, 8.6, 53.0, 4.4), labels: { raw: 'As bought' }, note: 'Bakery recipes vary a lot – 1 piece is often 25–40 g.', units: [{ one: 'piece', many: 'pieces', g: 30 }] },

  // Fruit
  { id: 'banana', name: 'Banana', category: 'fruit', raw: n(89, 1.1, 22.8, 0.3), labels: { raw: 'Raw (peeled)' }, units: [{ one: 'medium banana', many: 'medium bananas', g: 118 }] },
  { id: 'apple', name: 'Apple', category: 'fruit', raw: n(52, 0.3, 13.8, 0.2), units: [{ one: 'medium apple', many: 'medium apples', g: 182 }] },
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
  { id: 'peanuts', name: 'Peanuts', category: 'fats', raw: n(567, 25.8, 16.1, 49.2), cooked: n(587, 24.4, 21.3, 49.7), labels: { cooked: 'Roasted' }, units: [{ one: 'handful', many: 'handfuls', g: 28 }] },
  { id: 'peanut_butter', name: 'Peanut butter', category: 'fats', raw: n(588, 25.0, 20.0, 50.0), labels: { raw: 'As bought' }, units: [{ one: 'tbsp', many: 'tbsp', g: 16 }] },
  { id: 'oil', name: 'Cooking oil (olive / canola)', category: 'fats', raw: n(884, 0, 0, 100), labels: { raw: 'As is' }, note: '1 tsp ≈ 5 g, 1 tbsp ≈ 14 g.', units: [{ one: 'tsp', many: 'tsp', g: 5 }, { one: 'tbsp', many: 'tbsp', g: 14 }] },

  // Dairy & drinks
  { id: 'milk_whole', name: 'Milk, whole', category: 'dairy', raw: n(61, 3.2, 4.8, 3.3), labels: { raw: 'As is' }, note: '1 cup ≈ 244 g.', units: [{ one: 'cup', many: 'cups', g: 244 }] },
  { id: 'milk_lowfat', name: 'Milk, low-fat (1%)', category: 'dairy', raw: n(42, 3.4, 5.0, 1.0), labels: { raw: 'As is' }, units: [{ one: 'cup', many: 'cups', g: 244 }] },
  { id: 'greek_yogurt', name: 'Greek yogurt, plain non-fat', category: 'dairy', raw: n(59, 10.2, 3.6, 0.4), labels: { raw: 'As is' } },

  // Philippine Food Composition Table, release 1 December 2019.
  // Each state is a separate measured reference. Weigh only edible portions.
  { id: 'togue', name: 'Togue / mung bean sprouts', aliases: ['toge', 'bean sprout', 'monggo sprouts'], category: 'veg', filipino: true,
    raw: n(64, 5.7, 10, 0.1), cooked: n(54, 4.8, 7, 0.7), labels: { cooked: 'Boiled (no oil)' },
    sources: { raw: fnri(3410, 'D131'), cooked: fnri(3411, 'D132') },
    note: 'Log raw grams before cooking or boiled grams after cooking. For ginisang togue, log oil, meat and sauce separately.' },
  { id: 'munggo', name: 'Munggo / monggo, green beans (boiled)', aliases: ['mung beans', 'balatong', 'mongo'], category: 'protein', filipino: true,
    cooked: n(155, 11, 27.1, 0.3), labels: { cooked: 'Boiled beans (no oil)' }, sources: { cooked: fnri(3238, 'C028') },
    note: 'Plain boiled green mung beans, not the full ginisang munggo dish. Log oil, pork, coconut milk and other ingredients separately.' },
  { id: 'ampalaya', name: 'Ampalaya / bitter melon', aliases: ['bitter gourd'], category: 'veg', filipino: true,
    raw: n(23, 1, 4.2, 0.2), cooked: n(19, 0.4, 3.8, 0.2), labels: { cooked: 'Boiled (no oil)' },
    sources: { raw: fnri(3297, 'D018'), cooked: fnri(3298, 'D019') }, note: 'Edible flesh only. For ginisang ampalaya, log eggs and oil separately.' },
  { id: 'kalabasa', name: 'Kalabasa / squash', aliases: ['pumpkin'], category: 'veg', filipino: true,
    raw: n(68, 1.2, 15.3, 0.2), cooked: n(47, 0.4, 10.8, 0.2), labels: { cooked: 'Boiled (no oil)' },
    sources: { raw: fnri(3504, 'D225'), cooked: fnri(3505, 'D226') }, note: 'Weigh edible flesh without skin or seeds. Coconut milk and oil are not included.' },
  { id: 'okra', name: 'Okra / ladyfinger', category: 'veg', filipino: true,
    raw: n(34, 1.8, 5.9, 0.3), sources: { raw: fnri(3418, 'D139') }, note: 'Raw edible weight before cooking. Log oil and sauce separately.' },
  { id: 'malunggay', name: 'Malunggay / moringa leaves', aliases: ['drumstick tree leaves'], category: 'veg', filipino: true,
    raw: n(108, 9.7, 12.7, 2), cooked: n(63, 3.1, 10.6, 0.9), labels: { cooked: 'Boiled leaves' },
    sources: { raw: fnri(3373, 'D094'), cooked: fnri(3374, 'D095') }, note: 'Leaves only, without stems. Values are for fresh or boiled leaves, not dried powder.' },
  { id: 'cassava', name: 'Kamoteng kahoy / cassava (boiled)', aliases: ['balinghoy', 'balinghoy nilaga'], category: 'carbs', filipino: true,
    cooked: n(111, 0.4, 27.1, 0.1), labels: { cooked: 'Boiled, plain' },
    sources: { cooked: { title: 'DOST-FNRI PhilFCT · Cassava, boiled', url: 'https://i.fnri.dost.gov.ph/fct/library/food_content/B' } },
    note: 'Cooked edible flesh only. Added sugar, butter and coconut are not included.' },
  { id: 'pineapple', name: 'Pinya / pineapple (fresh)', category: 'fruit', filipino: true,
    raw: n(55, 0.4, 13, 0.2), sources: { raw: fnri(3655, 'E073') }, note: 'Edible flesh without peel; not canned pineapple or juice.' },
  { id: 'saba', name: 'Saging saba / saba banana', category: 'fruit', filipino: true,
    raw: n(110, 1.1, 25.5, 0.4), cooked: n(159, 1.2, 38.6, 0), labels: { raw: 'Raw (peeled)', cooked: 'Boiled (peeled)' },
    sources: { raw: { title: 'DOST-FNRI PhilFCT · E014', url: 'https://i.fnri.dost.gov.ph/fct/library/food_content/E' }, cooked: fnri(3597, 'E015') },
    note: 'Weigh without peel. Use the separate turon or banana cue entry for those preparations.' },
  { id: 'galunggong', name: 'Galunggong / round scad', category: 'protein', filipino: true,
    raw: n(100, 20.4, 0, 2.1), sources: { raw: fnri(4085, 'G105') }, note: 'Raw edible flesh only, without head and bones. Cooking oil is not included.' },
  { id: 'tinapa', name: 'Tinapa / smoked galunggong', category: 'protein', filipino: true,
    cooked: n(158, 31.6, 0, 3.5), labels: { cooked: 'Smoked, edible flesh' }, sources: { cooked: fnri(4188, 'G208') },
    note: 'Smoked round scad, without bones. Often salty; added frying oil is not included.' },
  { id: 'sardines_tomato', name: 'Sardinas / sardines in tomato sauce', aliases: ['sardines canned', 'sardinas de lata'], category: 'protein', filipino: true,
    cooked: n(88, 9.7, 2.7, 4.3), labels: { cooked: 'Canned, with sauce' }, sources: { cooked: fnri(4183, 'G203') },
    note: 'Reference includes the sauce. Brands vary; use the can label to create your own food for a closer match.' },
  { id: 'turon', name: 'Turon / fried banana spring roll', category: 'dishes', filipino: true,
    cooked: n(259, 2.4, 48, 6.4), labels: { cooked: 'Prepared, fried' },
    sources: { cooked: { title: 'DOST-FNRI PhilFCT · E102', url: 'https://i.fnri.dost.gov.ph/fct/library/food_content/E' } },
    note: 'Recipe average includes wrapper, sugar and frying oil. Weigh the whole edible roll; bakery recipes vary.' },
  { id: 'banana_cue', name: 'Banana cue / fried saba with sugar', aliases: ['bananacue', 'banana q'], category: 'dishes', filipino: true,
    cooked: n(183, 2, 37.8, 2.6), labels: { cooked: 'Prepared, fried' },
    sources: { cooked: { title: 'DOST-FNRI PhilFCT · E101', url: 'https://i.fnri.dost.gov.ph/fct/library/food_content/E' } },
    note: 'Recipe average includes sugar and oil. Weigh edible banana without the stick; preparation varies.' },
];

const LOCAL_ALIASES = {
  white_rice: ['kanin', 'bigas'], brown_rice: ['kanin brown'], chicken_breast: ['manok dibdib'],
  chicken_thigh: ['manok hita'], egg_whole: ['itlog'], egg_white: ['puti ng itlog'], tofu_firm: ['tokwa'],
  pork_liver: ['atay baboy'], pork_tenderloin: ['baboy'], banana: ['saging'], mango: ['mangga'],
  cabbage: ['repolyo'], carrot: ['karot'], eggplant: ['talong'], tomato: ['kamatis'], cucumber: ['pipino'],
  peanuts: ['mani'], milk_whole: ['gatas'], oil: ['mantika'],
};
const searchText = (value) => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function searchFoods(state, query = '', filter = 'all') {
  const words = searchText(query).trim().split(/\s+/).filter(Boolean);
  return allFoods(state).filter((food) => {
    if (filter === 'filipino' && !food.filipino && !LOCAL_ALIASES[food.id] && !['pandesal', 'kamote', 'bangus', 'tilapia', 'kangkong', 'pechay', 'sayote', 'sitaw', 'papaya'].includes(food.id)) return false;
    if (!['all', 'filipino'].includes(filter) && food.category !== filter) return false;
    const text = searchText([food.name, categoryName(food.category), ...(food.aliases || []), ...(LOCAL_ALIASES[food.id] || [])].join(' '));
    return words.every((word) => text.includes(word));
  });
}

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
    units: c.serving?.grams > 0 ? [{ one: 'serving', many: 'servings', g: c.serving.grams }] : [],
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

/** Portion shortcuts for a food in the chosen state, e.g. "2 eggs · 100 g". */
export function portionChips(food, st) {
  const units = (food?.units || []).filter((u) => !u.state || u.state === st).slice(0, 2);
  return units.flatMap((u) => [1, 2, 3].map((n) => ({ grams: Math.round(u.g * n * 10) / 10, label: `${n} ${n === 1 ? u.one : u.many}` })));
}
