import type { MealAnalysis } from "@/app/lib/meal";

// Canned analyses used when no ANTHROPIC_API_KEY is configured, so the whole
// app is demoable with zero setup. These are clearly flagged demo:true and the
// UI shows a banner — the model can't actually see the uploaded photo here.
const SAMPLES: MealAnalysis[] = [
  {
    is_food: true,
    dish_name: "Grilled chicken bowl with rice & veg",
    items: [
      { name: "Grilled chicken breast", estimated_portion: "~150g", calories: 248, protein_g: 46, carbs_g: 0, fat_g: 6 },
      { name: "Steamed white rice", estimated_portion: "1 cup", calories: 205, protein_g: 4, carbs_g: 45, fat_g: 0 },
      { name: "Mixed vegetables", estimated_portion: "1 cup", calories: 80, protein_g: 3, carbs_g: 16, fat_g: 1 },
    ],
    total: { calories: 533, protein_g: 53, carbs_g: 61, fat_g: 7, fiber_g: 6 },
    health_score: 78,
    healthier_tip: "Swap the white rice for brown rice or quinoa to roughly double the fiber and slow the carb release.",
    confidence: "medium",
  },
  {
    is_food: true,
    dish_name: "Cheeseburger with fries",
    items: [
      { name: "Cheeseburger", estimated_portion: "1 burger", calories: 535, protein_g: 28, carbs_g: 40, fat_g: 28 },
      { name: "French fries", estimated_portion: "medium (~115g)", calories: 365, protein_g: 4, carbs_g: 48, fat_g: 17 },
    ],
    total: { calories: 900, protein_g: 32, carbs_g: 88, fat_g: 45, fiber_g: 5 },
    health_score: 28,
    healthier_tip: "Halve the fries and add a side salad — you'll cut ~180 kcal of refined carbs and add fiber that helps you feel full.",
    confidence: "medium",
  },
  {
    is_food: true,
    dish_name: "Veg paneer thali",
    items: [
      { name: "Paneer curry", estimated_portion: "~1 cup", calories: 320, protein_g: 18, carbs_g: 12, fat_g: 22 },
      { name: "Dal", estimated_portion: "~1 cup", calories: 180, protein_g: 12, carbs_g: 27, fat_g: 3 },
      { name: "Roti", estimated_portion: "2 pieces", calories: 240, protein_g: 8, carbs_g: 46, fat_g: 4 },
      { name: "Salad", estimated_portion: "small side", calories: 35, protein_g: 2, carbs_g: 7, fat_g: 0 },
    ],
    total: { calories: 775, protein_g: 40, carbs_g: 92, fat_g: 29, fiber_g: 14 },
    health_score: 66,
    healthier_tip: "Use a lighter hand with the paneer gravy's cream/oil, or sub half the paneer for grilled tofu, to trim ~120 kcal of fat.",
    confidence: "low",
  },
];

export function demoAnalysis(): MealAnalysis {
  const pick = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
  return { ...pick, demo: true };
}
