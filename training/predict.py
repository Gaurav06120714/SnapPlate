"""Inference + nutrition estimation for SnapPlate.

Loads the trained model, classifies a food image, and maps the prediction to
nutrition values scaled by portion size.
"""
import json

import numpy as np
import pandas as pd
from PIL import Image
import tensorflow as tf

import config

_model = None
_classes = None
_nutrition = None

NUTRITION_CSV = config.OUTPUT_DIR.parent / "nutrition_table.csv"


def _load():
    """Lazy-load the model, class index, and nutrition table once."""
    global _model, _classes, _nutrition
    if _model is None:
        _model = tf.keras.models.load_model(config.MODEL_PATH)
        with open(config.CLASS_INDEX_PATH) as f:
            idx = json.load(f)                       # {"0": "apple_pie", ...}
        _classes = [idx[str(i)] for i in range(len(idx))]
        _nutrition = pd.read_csv(NUTRITION_CSV).set_index("class")
    return _model, _classes, _nutrition


def preprocess(pil_image):
    img = pil_image.convert("RGB").resize((config.IMG_SIZE, config.IMG_SIZE))
    arr = np.asarray(img, dtype="float32")           # raw 0-255; EfficientNet rescales
    return np.expand_dims(arr, 0)


def classify(pil_image, top_k=5):
    """Return the top-k predictions as [{class, name, confidence}]."""
    model, classes, nutrition = _load()
    probs = model.predict(preprocess(pil_image), verbose=0)[0]
    top = probs.argsort()[::-1][:top_k]
    results = []
    for i in top:
        cls = classes[i]
        name = nutrition.loc[cls, "name"] if cls in nutrition.index else cls
        results.append({"class": cls, "name": str(name), "confidence": float(probs[i])})
    return results


def default_serving(cls):
    _, _, nutrition = _load()
    return int(nutrition.loc[cls, "serving_g"]) if cls in nutrition.index else 200


def nutrition_for(cls, portion_g):
    """Scale per-100g nutrition to the given portion in grams."""
    _, _, nutrition = _load()
    if cls not in nutrition.index:
        return None
    row = nutrition.loc[cls]
    scale = portion_g / 100.0
    return {
        "calories": round(row["calories"] * scale),
        "protein_g": round(row["protein_g"] * scale, 1),
        "carbs_g": round(row["carbs_g"] * scale, 1),
        "fat_g": round(row["fat_g"] * scale, 1),
        "fiber_g": round(row["fiber_g"] * scale, 1),
    }


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python predict.py <image_path>")
        raise SystemExit(1)
    img = Image.open(sys.argv[1])
    preds = classify(img)
    top = preds[0]
    grams = default_serving(top["class"])
    print(f"\nPrediction: {top['name']} ({top['confidence']*100:.1f}%)")
    print(f"Nutrition for ~{grams}g serving:")
    for k, v in nutrition_for(top["class"], grams).items():
        print(f"  {k}: {v}")
    print("\nTop 5:")
    for p in preds:
        print(f"  {p['name']:<28} {p['confidence']*100:5.1f}%")
