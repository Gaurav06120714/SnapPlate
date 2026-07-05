# SnapPlate 🍽️

> **Snap a meal — know what's in it.**

An **AI-Based Dietary Assessment** system. SnapPlate takes a photo of a meal and returns the food it contains together with an estimated nutritional breakdown — calories, protein, carbohydrate, fat, and fibre — using a **deep-learning image-classification model** that we train ourselves (transfer learning on a food-image dataset). No external LLM API is used for the analysis; the intelligence is our own trained neural network.

> Derived from the NGIT/KMEC Project School "PS-1" project list, item #10 — *AI-Based Dietary Assessment Using Multimodal Large Language Models* — reworked into a self-contained computer-vision project built on an Artificial Neural Network (transfer learning) instead of a hosted LLM.

---

## Table of Contents

- [What It Does](#what-it-does)
- [Results](#results)
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

## Results

The model was trained on **Food-101** (101 food classes, 101,000 images) using two-phase transfer learning on an Apple M2 Pro GPU (Metal). Two runs were done:

| Run | Backbone | Input | Test Top-1 | Test Top-5 |
|-----|----------|-------|-----------|-----------|
| #1 | EfficientNetB0 | 224px | 74.65% | — |
| **#2 (final)** | **EfficientNetB3** | **300px** | **84.13%** | **96.80%** |

**Top-5 accuracy of 96.8%** means the correct food is among the model's five best guesses ~97% of the time — which is what powers the "not this? other likely matches" suggestions in the demo. Misclassifications happen between genuinely similar foods (e.g. steak vs. filet mignon, donuts vs. pancakes), and the model reports *low confidence* exactly when it is wrong, indicating it is well-calibrated.

Evaluated on the held-out test split of 25,250 images the model never saw during training.

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

- **Architecture:** EfficientNet**B3** backbone (pretrained on ImageNet) + a new classification head. (An EfficientNetB0 baseline was also trained.)
- **Why transfer learning:** training a good image model from scratch needs huge data and compute; fine-tuning a pretrained backbone reaches high accuracy on a laptop GPU in a short time. It also connects directly to the ANN fundamentals (layers, activations, backprop) from the course notes, applied to a real convolutional network.
- **Two-phase training:**
  1. Freeze the backbone, train only the new head.
  2. Unfreeze the top ~50% of the backbone and fine-tune with a very low learning rate.
- **Training tricks:** label smoothing (0.1), on-the-fly augmentation, `ReduceLROnPlateau`, and `EarlyStopping` on validation accuracy.
- **Output:** a softmax over the 101 food classes; we take the top prediction (and top-5 for the "other likely matches" UI).

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
| Model | EfficientNetB3 (transfer learning) | Pretrained on ImageNet. |
| Data | Food-101 | 101 classes, 101k images. |
| Numerics | NumPy, pandas | Nutrition table + preprocessing. |
| Eval | scikit-learn, matplotlib | Confusion matrix, training curves. |
| Demo | Streamlit | Upload a photo → food + nutrition. |
| Training | Apple M2 Pro (Metal GPU) | Trained locally via `tensorflow-metal`. |

---

## Project Structure

```
SnapPlate/
  training/
    config.py             # paths, image size, hyperparameters
    data.py               # Food-101 pipeline + augmentation
    model.py              # EfficientNet transfer-learning model
    train.py              # two-phase training; saves model + class index
    evaluate.py           # test-set evaluation (top-1 / top-5)
    test_samples.py       # sanity test on random held-out images
    predict.py            # load model, classify an image, compute nutrition
    app.py                # Streamlit demo: upload image → prediction + nutrition
    verify_gpu.py         # confirm the Metal GPU is available
    nutrition_table.csv   # per-100g nutrition + serving size for 101 classes
    outputs/              # class_index.json, eval/history JSON (model .keras is git-ignored)
    README.md
  Datapreprocessing.py    # data-preprocessing helper
  README.md               # this file
  Team_work.md            # task split (Gaurav / Veeresham)
```

> The trained model files (`*.keras`) and the Food-101 dataset are **not** in the repo — they exceed GitHub's 100 MB limit and are kept locally. Run `training/train.py` to reproduce the model.

---

## Setup & Training

**Prerequisites:** Python 3.11 and pip. A GPU is strongly recommended for training (this project trained on an Apple M2 Pro via `tensorflow-metal`).

```bash
# 1. Create a virtual environment and install dependencies
python3.11 -m venv .venv
source .venv/bin/activate
pip install "tensorflow>=2.16,<2.17" tensorflow-metal numpy pandas pillow scikit-learn matplotlib streamlit

# 2. (Optional) confirm the GPU is visible
python training/verify_gpu.py

# 3. Train (expects Food-101 at SnapPlate-Dataset/food-101/)
cd training && python train.py

# 4. Evaluate the trained model on the test set
python evaluate.py

# 5. Run the demo app
python -m streamlit run app.py
```

Training saves the model and class index into `training/outputs/`, which the demo app and `predict.py` load for inference. Use `python -m streamlit` (not bare `streamlit`) so it runs inside the venv that has TensorFlow.

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
