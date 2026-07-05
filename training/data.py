"""Food-101 data pipeline built from the local dataset's meta/ split files.

Food-101 layout:
    images/<class>/<id>.jpg
    meta/train.txt   -> "<class>/<id>" per line
    meta/test.txt    -> "<class>/<id>" per line
    meta/classes.txt -> one class name per line
"""
import tensorflow as tf

import config


def load_classes():
    """Return the (optionally limited) sorted list of class names."""
    classes = (config.META_DIR / "classes.txt").read_text().split()
    classes = sorted(classes)
    if config.NUM_CLASSES_LIMIT:
        classes = classes[: config.NUM_CLASSES_LIMIT]
    return classes


def _read_split(split_file, class_to_idx):
    """Read a meta split file into (filepath, label) lists, filtered to kept classes."""
    paths, labels = [], []
    for line in (config.META_DIR / split_file).read_text().split():
        cls = line.split("/")[0]
        if cls not in class_to_idx:
            continue
        paths.append(str(config.IMAGES_DIR / f"{line}.jpg"))
        labels.append(class_to_idx[cls])
    return paths, labels


def _decode(path, label):
    img = tf.io.read_file(path)
    img = tf.image.decode_jpeg(img, channels=3)
    img = tf.image.resize(img, [config.IMG_SIZE, config.IMG_SIZE])
    return img, label  # EfficientNet does its own rescaling inside the model


_AUG = tf.keras.Sequential([
    tf.keras.layers.RandomFlip("horizontal"),
    tf.keras.layers.RandomRotation(0.1),
    tf.keras.layers.RandomZoom(0.1),
    tf.keras.layers.RandomContrast(0.1),
], name="augment")


def _make_ds(paths, labels, num_classes, training):
    ds = tf.data.Dataset.from_tensor_slices((paths, labels))
    if training:
        ds = ds.shuffle(len(paths), seed=config.SEED, reshuffle_each_iteration=True)
    ds = ds.map(_decode, num_parallel_calls=tf.data.AUTOTUNE)
    ds = ds.batch(config.BATCH_SIZE)
    if training:
        ds = ds.map(lambda x, y: (_AUG(x, training=True), y),
                    num_parallel_calls=tf.data.AUTOTUNE)
    # One-hot labels for CategoricalCrossentropy + label smoothing.
    ds = ds.map(lambda x, y: (x, tf.one_hot(y, num_classes)),
                num_parallel_calls=tf.data.AUTOTUNE)
    return ds.prefetch(tf.data.AUTOTUNE)


def build_datasets():
    """Return (train_ds, val_ds, test_ds, classes)."""
    classes = load_classes()
    class_to_idx = {c: i for i, c in enumerate(classes)}

    train_paths, train_labels = _read_split("train.txt", class_to_idx)
    test_paths, test_labels = _read_split("test.txt", class_to_idx)

    # Carve a validation split out of the training data.
    n_val = int(len(train_paths) * config.VAL_SPLIT)
    rng = tf.random.Generator.from_seed(config.SEED)
    perm = tf.random.shuffle(tf.range(len(train_paths)), seed=config.SEED).numpy()
    val_idx, tr_idx = set(perm[:n_val]), perm[n_val:]

    tr_p = [train_paths[i] for i in tr_idx]
    tr_l = [train_labels[i] for i in tr_idx]
    va_p = [train_paths[i] for i in perm[:n_val]]
    va_l = [train_labels[i] for i in perm[:n_val]]

    n_classes = len(classes)
    train_ds = _make_ds(tr_p, tr_l, n_classes, training=True)
    val_ds = _make_ds(va_p, va_l, n_classes, training=False)
    test_ds = _make_ds(test_paths, test_labels, n_classes, training=False)

    print(f"Classes: {len(classes)} | train: {len(tr_p)} | val: {len(va_p)} | test: {len(test_paths)}")
    return train_ds, val_ds, test_ds, classes
