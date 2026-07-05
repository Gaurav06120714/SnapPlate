# SnapPlate — Model Training

Transfer-learning food classifier trained on the local Food-101 dataset, with
Apple Silicon (Metal) GPU acceleration.

## Results

| Run | Backbone | Input | Test Top-1 | Test Top-5 |
|-----|----------|-------|-----------|-----------|
| #1 | EfficientNetB0 | 224px | 74.65% | — |
| **#2 (final)** | **EfficientNetB3** | **300px** | **84.13%** | **96.80%** |

Evaluated on the 25,250-image Food-101 test split. The final config in `config.py`
reproduces Run #2.

## Environment

A Python 3.11 virtual environment lives at the project root (`../.venv`) with
TensorFlow + `tensorflow-metal` installed.

```bash
# from the training/ folder
source ../.venv/bin/activate
```

## Files

| File | Purpose |
|------|---------|
| `config.py` | Paths + hyperparameters (image size, epochs, learning rates). |
| `data.py` | Food-101 data pipeline from `SnapPlate-Dataset/food-101/meta`. |
| `model.py` | EfficientNetB0 backbone + classifier head. |
| `train.py` | Two-phase training (head → fine-tune), saves model + class index. |
| `verify_gpu.py` | Confirms TensorFlow sees the Metal GPU. |
| `outputs/` | Trained `.keras` model, `class_index.json`, `history.json` (created on run). |

## Run

```bash
source ../.venv/bin/activate

# 1. Confirm the GPU is visible
python verify_gpu.py

# 2. (Optional) prototype fast: edit config.py -> NUM_CLASSES_LIMIT = 10

# 3. Train
python train.py
```

## Notes

- Training all 101 classes on an M2 Pro takes a while; set `NUM_CLASSES_LIMIT`
  in `config.py` to a small number first to verify the whole pipeline end-to-end.
- The dataset is expected at `../SnapPlate-Dataset/food-101/` (already in place).
- Outputs are written to `training/outputs/` and are git-ignored.
