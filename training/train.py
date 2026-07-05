"""Two-phase transfer-learning training for the SnapPlate food classifier.

Run from the training/ folder with the project venv active:
    source ../.venv/bin/activate
    python train.py
"""
import json

import tensorflow as tf

import config
import data
import model as model_lib


def main():
    print("TensorFlow:", tf.__version__)
    gpus = tf.config.list_physical_devices("GPU")
    print("GPUs visible to TF:", gpus or "none (CPU only)")

    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    train_ds, val_ds, test_ds, classes = data.build_datasets()

    # Save the class index so inference maps predictions -> names.
    with open(config.CLASS_INDEX_PATH, "w") as f:
        json.dump({i: c for i, c in enumerate(classes)}, f, indent=2)

    net, backbone = model_lib.build_model(len(classes))

    callbacks = [
        tf.keras.callbacks.ModelCheckpoint(
            str(config.MODEL_PATH), save_best_only=True, monitor="val_accuracy",
            mode="max"),
        tf.keras.callbacks.EarlyStopping(
            monitor="val_accuracy", patience=config.EARLY_STOP_PATIENCE,
            mode="max", restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_accuracy", mode="max", factor=0.3, patience=2,
            min_lr=1e-7, verbose=1),
    ]

    # --- Phase 1: train the head (backbone frozen) -----------------------
    print("\n=== Phase 1: training classifier head ===")
    model_lib.compile_head(net)
    h1 = net.fit(train_ds, validation_data=val_ds,
                 epochs=config.HEAD_EPOCHS, callbacks=callbacks)

    # --- Phase 2: fine-tune the top of the backbone ----------------------
    print("\n=== Phase 2: fine-tuning backbone ===")
    model_lib.compile_finetune(net, backbone)
    h2 = net.fit(train_ds, validation_data=val_ds,
                 epochs=config.FINETUNE_EPOCHS, callbacks=callbacks)

    # --- Evaluate on the held-out test split -----------------------------
    print("\n=== Test evaluation ===")
    results = net.evaluate(test_ds, return_dict=True)
    test_acc = results.get("accuracy")
    test_top5 = results.get("top5")
    print(f"Test top-1 accuracy: {test_acc:.4f}")
    print(f"Test top-5 accuracy: {test_top5:.4f}")

    history = {
        "backbone": config.BACKBONE,
        "img_size": config.IMG_SIZE,
        "phase1": {k: [float(v) for v in vals] for k, vals in h1.history.items()},
        "phase2": {k: [float(v) for v in vals] for k, vals in h2.history.items()},
        "test_accuracy": float(test_acc),
        "test_top5_accuracy": float(test_top5),
    }
    with open(config.HISTORY_PATH, "w") as f:
        json.dump(history, f, indent=2)

    net.save(config.MODEL_PATH)
    print(f"\nSaved model -> {config.MODEL_PATH}")
    print(f"Saved class index -> {config.CLASS_INDEX_PATH}")


if __name__ == "__main__":
    main()
