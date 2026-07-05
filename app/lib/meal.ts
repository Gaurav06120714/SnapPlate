// Shared shape for a meal analysis, plus the JSON Schema we hand to Claude's
// structured-output mode so the model is forced to return exactly this shape.

export type MealItem = {
  name: string;
  estimated_portion: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type MealTotals = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

export type MealAnalysis = {
  is_food: boolean;
  dish_name: string;
  items: MealItem[];
  total: MealTotals;
  health_score: number; // 0-100
  healthier_tip: string;
  confidence: "low" | "medium" | "high";
  demo?: boolean; // true when returned by the no-API-key demo mode
};

// A logged meal = an analysis plus when it was eaten. Stored in localStorage.
export type LoggedMeal = MealAnalysis & {
  id: string;
  loggedAt: string; // ISO timestamp
};

// JSON Schema for structured outputs. Note the API's constraints: every object
// needs additionalProperties:false + a required array, and numeric/length
// constraints (minimum/maximum) are NOT supported — so health_score range is
// enforced in the prompt, not the schema.
export const MEAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    is_food: {
      type: "boolean",
      description: "True only if the image actually shows food or a drink.",
    },
    dish_name: {
      type: "string",
      description: "Short name for the meal as a whole, e.g. 'Chicken biryani with raita'.",
    },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          estimated_portion: {
            type: "string",
            description: "Human-readable portion estimate, e.g. '1 cup', '~150g', '2 pieces'.",
          },
          calories: { type: "number" },
          protein_g: { type: "number" },
          carbs_g: { type: "number" },
          fat_g: { type: "number" },
        },
        required: ["name", "estimated_portion", "calories", "protein_g", "carbs_g", "fat_g"],
      },
    },
    total: {
      type: "object",
      additionalProperties: false,
      properties: {
        calories: { type: "number" },
        protein_g: { type: "number" },
        carbs_g: { type: "number" },
        fat_g: { type: "number" },
        fiber_g: { type: "number" },
      },
      required: ["calories", "protein_g", "carbs_g", "fat_g", "fiber_g"],
    },
    health_score: {
      type: "integer",
      description: "Overall nutritional quality from 0 (poor) to 100 (excellent).",
    },
    healthier_tip: {
      type: "string",
      description: "One specific, actionable suggestion to make this exact meal healthier.",
    },
    confidence: {
      type: "string",
      enum: ["low", "medium", "high"],
      description: "How confident the estimate is, given image clarity and portion ambiguity.",
    },
  },
  required: [
    "is_food",
    "dish_name",
    "items",
    "total",
    "health_score",
    "healthier_tip",
    "confidence",
  ],
} as const;
