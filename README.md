# SnapPlate 🍽️

> **Snap a meal — know what's in it.**

An **AI-Based Dietary Assessment** system. SnapPlate takes a photo of a meal and returns the food it contains together with an estimated nutritional breakdown — calories, protein, carbohydrate, fat, and fibre — using a **deep-learning image-classification model** that we train ourselves (transfer learning on a food-image dataset). No external LLM API is used for the analysis; the intelligence is our own trained neural network.

> Derived from the NGIT/KMEC Project School "PS-1" project list, item #10 — *AI-Based Dietary Assessment Using Multimodal Large Language Models* — reworked into a self-contained computer-vision project built on an Artificial Neural Network (transfer learning) instead of a hosted LLM.

---

## Table of Contents

- [What It Does](#what-it-does)
- [Honest Scope: What ML Can and Can't Do Here](#honest-scope-what-ml-can-and-cant-do-here)
- [How It Works (Pipeline)](#how-it-works-pipeline)
- [Model](#model)
- [Dataset](#dataset)
- [Nutrition Estimation](#nutrition-estimation)
- [Technology Stack](#technology-stack)
- [Planned Project Structure](#planned-project-structure)
- [Setup & Training](#setup--training)
- [Limitations](#limitations)
- [Roadmap](#roadmap)
- [License](#license)

---

## What It Does

1. The user uploads or captures a photo of a meal.
2. A **Convolutional Neural Network (CNN)**, trained via **transfer learning**, classifies the food item in the image.
3. The predicted food is mapped to a **nutrition table** (per-100g calories and macros).
4. A **portion** is applied (standard serving size, or a user-selected small / medium / large / grams value).
5. SnapPlate reports the estimated **calories, protein, carbohydrate, fat, and fibre** for that meal.

The output is real, defensible nutrition numbers produced by a model we build and train — not a black-box API call.

---

## Honest Scope: What ML Can and Can't Do Here

Being clear up front, because it shapes the whole design:

- ✅ **Recognising the food** from a photo is exactly what a CNN is good at — this is the core AI task and it works well with transfer learning.
- ✅ **Nutrition per 100 g** is a reliable lookup once the food is known.
- ⚠️ **Estimating exact quantity (grams) from a single 2-D photo is an open research problem.** A normal RGB image has no depth/scale, so the model cannot accurately *weigh* the food. Google's Nutrition5k needed depth cameras for this.

**Our approach:** the neural network answers *"what food is this?"* (the hard AI part), and portion size comes from a **serving-size selector** with sensible defaults. True camera-based volume/mass estimation is treated as a stretch goal (see [Roadmap](#roadmap)). This keeps the numbers honest instead of inventing a precision the model doesn't have.

---

## How It Works (Pipeline)

```
photo ──▶ preprocess (resize 224×224, normalise)
                     │
                     ▼
        CNN classifier  (EfficientNetB0, transfer learning)
                     │  "what food is this?"  → e.g. "pizza" (top-k with confidence)
                     ▼
        nutrition table lookup  (per-100g calories + macros)
                     │
                     ▼
        × portion  (standard serving OR user picks small/med/large/grams)
                     │
                     ▼
        result:  calories · protein · carbs · fat · fibre
```

---

## Model

- **Architecture:** EfficientNetB0 backbone (pretrained on ImageNet) + a new classification head.
- **Why transfer learning:** training a good image model from scratch needs huge data and compute; fine-tuning a pretrained backbone reaches high accuracy on a laptop/Colab GPU in a short time. It also connects directly to the ANN fundamentals (layers, activations, backprop) from the course notes, applied to a real convolutional network.
- **Two-phase training:**
  1. Freeze the backbone, train only the new head.
  2. Unfreeze the top blocks and fine-tune with a very low learning rate.
- **Output:** a softmax over the food classes; we take the top prediction (and top-k for the UI).

---

## Dataset

- **Primary:** [Food-101](https://data.vision.ee.ethz.ch/cvl/datasets_extra/food-101/) — 101 food categories, 101,000 images. The standard benchmark for food classification and ideal for transfer learning.
- **Alternative:** an Indian-food image dataset (e.g. Kaggle "Indian Food Images") if the target users mainly eat Indian meals — the pipeline stays the same, only the classes and nutrition table change.

Images are resized to 224×224 and augmented (random flip, rotation, zoom, contrast) during training to improve generalisation.

---

## Nutrition Estimation

Each food class maps to a row in a **nutrition table** holding per-100 g values: calories (kcal), protein (g), carbohydrate (g), fat (g), and fibre (g), plus a typical serving size in grams. Final numbers are:

```
nutrient = per_100g_value × (portion_grams / 100)
```

Values are drawn from public food-composition references (e.g. USDA FoodData Central; IFCT for Indian foods) and are **approximate estimates**, not clinical measurements.

---

## Technology Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Language | Python 3.10+ | Standard ML tooling. |
| Framework | TensorFlow / Keras | EfficientNet, training, saving. |
| Model | EfficientNetB0 (transfer learning) | Pretrained on ImageNet. |
| Data | Food-101 | 101 classes; `tensorflow-datasets` can fetch it. |
| Numerics | NumPy, pandas | Nutrition table + preprocessing. |
| Eval | scikit-learn, matplotlib | Confusion matrix, training curves. |
| Demo | Streamlit | Upload a photo → food + nutrition. |
| Training | Google Colab (free GPU) | No local GPU required. |

---

## Planned Project Structure

```
snapplate-ml/
  data/
    nutrition_table.csv     # per-100g nutrition + serving size for each class
  src/
    config.py               # paths, image size, hyperparameters
    data.py                 # dataset loading + augmentation
    model.py                # EfficientNetB0 transfer-learning model
    train.py                # two-phase training; saves model + class index
    nutrition.py            # class → nutrition lookup + portion maths
    predict.py              # load model, classify an image, compute nutrition
  app/
    streamlit_app.py        # demo: upload image → prediction + nutrition
  models/                   # saved model + class_index.json (after training)
  requirements.txt
  README.md
```

> This structure is the plan for the ML implementation. It is documented here; the code lives in the `snapplate-ml` project.

---

## Setup & Training

**Prerequisites:** Python 3.10+ and pip. A GPU (or Google Colab) is strongly recommended for training.

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Train (downloads Food-101 on first run; use Colab for a free GPU)
python src/train.py

# 3. Run the demo app on the trained model
streamlit run app/streamlit_app.py
```

Training saves the model and the class index into `models/`, which the demo app and `predict.py` load for inference.

---

## Limitations

- Nutritional figures are AI-generated estimates and **not medical, clinical, or dietary advice.**
- The classifier recognises **one dominant food per image**; multi-item plates need object detection (see Roadmap).
- **Portion/quantity is not measured from the image** — it comes from serving-size defaults or user input.
- Accuracy depends on image clarity and how well the food matches a trained class; unfamiliar foods will be misclassified.
- Nutrition values are approximate reference figures, not exact for every recipe.

---

## Roadmap

- **Multi-item detection** — replace single-label classification with object detection (e.g. YOLOv8) to find every food on a plate.
- **Portion/volume estimation** — use a reference object or depth (Nutrition5k-style) to estimate real grams.
- **Indian-food model** — retrain on an Indian-cuisine dataset with a matching nutrition table.
- **Confidence + "not food" handling** — reject low-confidence and non-food images instead of guessing.
- **Mobile / web deployment** — export to TensorFlow Lite for on-device inference.

---

## License

© 2026 Gaurav. All rights reserved.
