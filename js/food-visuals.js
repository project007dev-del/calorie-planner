// One tiny shared SVG sheet; food illustrations never change nutrition data.
const GROUPS = {
  chicken: ['chicken_breast', 'chicken_thigh'], meat: ['pork_liver', 'pork_tenderloin', 'beef_ground_90'],
  fish: ['tilapia', 'bangus', 'tuna_canned_water', 'galunggong', 'tinapa', 'sardines_tomato'],
  egg: ['egg_whole', 'egg_white'], tofu: ['tofu_firm'], rice: ['brown_rice', 'white_rice'], oats: ['oats'],
  potato: ['kamote', 'potato', 'cassava'], bread: ['wholewheat_bread', 'pandesal'], banana: ['banana', 'saba', 'banana_cue'],
  apple: ['apple'], mango: ['mango'], papaya: ['papaya'], pineapple: ['pineapple'],
  broccoli: ['broccoli', 'mixed_veg'], carrot: ['carrot'], leaf: ['cabbage', 'kangkong', 'pechay', 'malunggay', 'togue'],
  cucumber: ['cucumber', 'sayote', 'ampalaya', 'okra'], beans: ['munggo', 'sitaw'], eggplant: ['eggplant'], tomato: ['tomato'],
  peanuts: ['peanuts', 'peanut_butter'], oil: ['oil'], milk: ['milk_whole', 'milk_lowfat'], yogurt: ['greek_yogurt'], pumpkin: ['kalabasa'], snack: ['turon'],
};
const BY_ID = new Map(Object.entries(GROUPS).flatMap(([icon, ids]) => ids.map((id) => [id, icon])));
const BY_CATEGORY = new Map(Object.entries({ protein: 'plate', carbs: 'rice', fruit: 'apple', veg: 'leaf', fats: 'oil', dairy: 'milk', dishes: 'plate' }));
export const foodVisualKind = (food = {}) => BY_ID.get(food?.foodId || food?.id) || BY_CATEGORY.get(food?.category) || 'plate';

export function foodVisual(food, size = 'md') {
  const scale = ['sm', 'md', 'lg', 'table'].includes(size) ? size : 'md';
  return `<span class="food-visual food-visual-${scale}" aria-hidden="true"><svg viewBox="0 0 64 64" focusable="false" stroke="#675846" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><use href="icons/foods.svg#${foodVisualKind(food)}"></use></svg></span>`;
}
