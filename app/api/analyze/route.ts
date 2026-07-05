import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { MEAL_SCHEMA, type MealAnalysis } from "@/app/lib/meal";
import { demoAnalysis } from "@/app/lib/demo";

export const runtime = "nodejs";
export const maxDuration = 60;

const SUPPORTED_MEDIA = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const SYSTEM_PROMPT = `You are a registered-dietitian-grade food vision analyst for an app called SnapPlate.
Given a single photo of a meal, identify each distinct food/drink item, estimate its portion,
and estimate calories and macros (protein, carbs, fat) per item plus a meal total including fiber.

Rules:
- Estimate realistically from visual portion cues (plate size, utensils, common serving sizes).
- health_score is 0-100: factor in vegetable/fiber content, whole vs refined carbs, added sugar,
  fried/processed content, and protein quality. A fried fast-food meal scores low; a balanced
  veg-forward plate scores high.
- healthier_tip must be specific to THIS meal and actionable (e.g. "Swap the white rice for
  brown rice and add a side of greens to roughly double the fiber"), not generic advice.
- Set confidence to "low" when the image is blurry, the food is ambiguous, or portions are hard to judge.
- If the image is not food/drink, set is_food=false, dish_name="Not a meal", empty items, all totals 0,
  health_score 0, and put a short explanation in healthier_tip.`;

export async function POST(req: NextRequest) {
  // No key configured → demo mode. The app stays fully usable without any
  // setup; results are clearly flagged as demo data in the response + UI.
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(demoAnalysis());
  }

  let body: { imageBase64?: string; mediaType?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { imageBase64, mediaType, note } = body;
  if (!imageBase64 || !mediaType) {
    return NextResponse.json(
      { error: "Missing image data." },
      { status: 400 },
    );
  }
  if (!SUPPORTED_MEDIA.has(mediaType)) {
    return NextResponse.json(
      { error: `Unsupported image type: ${mediaType}. Use JPEG, PNG, WebP, or GIF.` },
      { status: 400 },
    );
  }

  const userText = note?.trim()
    ? `Analyze this meal. Extra context from the user: "${note.trim()}"`
    : "Analyze this meal.";

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      output_config: {
        format: { type: "json_schema", schema: MEAL_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType as "image/jpeg", data: imageBase64 },
            },
            { type: "text", text: userText },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "The model declined to analyze this image." },
        { status: 422 },
      );
    }

    // With output_config.format the first text block is guaranteed valid JSON
    // matching MEAL_SCHEMA.
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No analysis returned." },
        { status: 502 },
      );
    }

    const analysis = JSON.parse(textBlock.text) as MealAnalysis;
    return NextResponse.json(analysis);
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude API error (${err.status}): ${err.message}` },
        { status: 502 },
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
