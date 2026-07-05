"""Evaluate a saved SnapPlate model on the Food-101 test split.

Use this to recover the final test top-1 / top-5 numbers if training was
interrupted after the best-model checkpoint was written (train.py saves the
best model every improving epoch via ModelCheckpoint).

    source ../.venv/bin/activate
    python evaluate.py
"""
import json

import tensorflow as tf

import config
import data


def main():
    print("Loading model:", config.MODEL_PATH)
    model = tf.keras.models.load_model(config.MODEL_PATH)

    _, _, test_ds, classes = data.build_datasets()

    print("\n=== Test evaluation ===")
    results = model.evaluate(test_ds, return_dict=True)
    test_acc = results.get("accuracy")
    test_top5 = results.get("top5")
    print(f"Test top-1 accuracy: {test_acc:.4f}")
    print(f"Test top-5 accuracy: {test_top5:.4f}")

    out = config.OUTPUT_DIR / f"eval_{config._TAG}.json"
    with open(out, "w") as f:
        json.dump({
            "backbone": config.BACKBONE,
            "img_size": config.IMG_SIZE,
            "test_accuracy": float(test_acc),
            "test_top5_accuracy": float(test_top5),
        }, f, indent=2)
    print("Saved ->", out)


if __name__ == "__main__":
    main()
