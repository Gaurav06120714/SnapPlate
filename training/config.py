"""Training configuration for the SnapPlate food classifier (Apple Silicon / Metal).

Run #1 baseline: EfficientNetB0 @224 -> 74.65% top-1.
Run #2 (this config): EfficientNetB3 @300 + label smoothing + deeper fine-tune,
targeting ~85% top-1 / ~95% top-5.
"""
from pathlib import Path

# --- Paths ---------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATASET_DIR = PROJECT_ROOT / "SnapPlate-Dataset" / "food-101"
IMAGES_DIR = DATASET_DIR / "images"
META_DIR = DATASET_DIR / "meta"
OUTPUT_DIR = Path(__file__).resolve().parent / "outputs"

# --- Backbone ------------------------------------------------------------
# Supported: "EfficientNetB0" (224), "EfficientNetB3" (300).
BACKBONE = "EfficientNetB3"

# Separate output files per backbone so Run #2 doesn't overwrite Run #1.
_TAG = BACKBONE.replace("EfficientNet", "").lower()   # e.g. "b3"
MODEL_PATH = OUTPUT_DIR / f"snapplate_{_TAG}.keras"
CLASS_INDEX_PATH = OUTPUT_DIR / "class_index.json"
HISTORY_PATH = OUTPUT_DIR / f"history_{_TAG}.json"

# --- Image / batch -------------------------------------------------------
# B3 wants 300px. If you hit a Metal out-of-memory error, drop IMG_SIZE to 224
# and/or BATCH_SIZE to 8 — accuracy dips a little but it will fit in 16 GB.
IMG_SIZE = 300
BATCH_SIZE = 16
SEED = 42
VAL_SPLIT = 0.15

# --- Training ------------------------------------------------------------
HEAD_EPOCHS = 6           # backbone frozen, train the new head
FINETUNE_EPOCHS = 15      # unfreeze + fine-tune (EarlyStopping usually ends it sooner)
HEAD_LR = 1e-3
FINETUNE_LR = 1e-5
FINETUNE_FRACTION = 0.5   # unfreeze the top 50% of backbone layers
DROPOUT = 0.3
LABEL_SMOOTHING = 0.1
EARLY_STOP_PATIENCE = 4   # stop if val_accuracy doesn't improve for N epochs

# Set to an int (e.g. 10) to prototype on a subset of classes, or None for all 101.
NUM_CLASSES_LIMIT = None
