"""EfficientNet transfer-learning model for food classification.

Backbone is selected via config.BACKBONE (EfficientNetB0 or EfficientNetB3).
Rescaling/preprocessing is handled inside EfficientNet, so the data pipeline
feeds raw 0-255 float images.
"""
import tensorflow as tf

import config

_BACKBONES = {
    "EfficientNetB0": tf.keras.applications.EfficientNetB0,
    "EfficientNetB3": tf.keras.applications.EfficientNetB3,
}


def _loss():
    # Label smoothing needs one-hot targets, so we use CategoricalCrossentropy.
    return tf.keras.losses.CategoricalCrossentropy(
        label_smoothing=config.LABEL_SMOOTHING)


def _metrics():
    return [
        tf.keras.metrics.CategoricalAccuracy(name="accuracy"),
        tf.keras.metrics.TopKCategoricalAccuracy(k=5, name="top5"),
    ]


def build_model(num_classes):
    """EfficientNet backbone (ImageNet) + a new classifier head."""
    inputs = tf.keras.Input(shape=(config.IMG_SIZE, config.IMG_SIZE, 3))

    backbone_fn = _BACKBONES[config.BACKBONE]
    backbone = backbone_fn(
        include_top=False,
        weights="imagenet",
        input_tensor=inputs,
        pooling="avg",
    )
    backbone.trainable = False  # phase 1: freeze

    x = tf.keras.layers.Dropout(config.DROPOUT)(backbone.output)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax", name="predictions")(x)

    model = tf.keras.Model(inputs, outputs, name=f"snapplate_{config.BACKBONE}")
    return model, backbone


def compile_head(model):
    model.compile(
        optimizer=tf.keras.optimizers.Adam(config.HEAD_LR),
        loss=_loss(),
        metrics=_metrics(),
    )


def compile_finetune(model, backbone):
    """Unfreeze the top FINETUNE_FRACTION of the backbone and recompile (low LR)."""
    backbone.trainable = True
    cutoff = int(len(backbone.layers) * (1 - config.FINETUNE_FRACTION))
    for layer in backbone.layers[:cutoff]:
        layer.trainable = False
    # Keep all BatchNorm layers frozen during fine-tuning (stabilises training).
    for layer in backbone.layers:
        if isinstance(layer, tf.keras.layers.BatchNormalization):
            layer.trainable = False
    trainable = sum(1 for l in backbone.layers if l.trainable)
    print(f"Fine-tuning: {trainable}/{len(backbone.layers)} backbone layers trainable")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(config.FINETUNE_LR),
        loss=_loss(),
        metrics=_metrics(),
    )
