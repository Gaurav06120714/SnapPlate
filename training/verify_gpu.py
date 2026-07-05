"""Quick check that TensorFlow sees the Apple Silicon (Metal) GPU."""
import tensorflow as tf

print("TensorFlow version:", tf.__version__)
gpus = tf.config.list_physical_devices("GPU")
print("GPUs:", gpus)

if gpus:
    # Tiny matmul to confirm the Metal device actually runs ops.
    with tf.device("/GPU:0"):
        a = tf.random.normal((1000, 1000))
        b = tf.random.normal((1000, 1000))
        c = tf.matmul(a, b)
    print("Matmul on GPU OK, result shape:", c.shape)
    print("\n✅ Metal GPU is available — training will be accelerated.")
else:
    print("\n⚠️  No GPU detected — TensorFlow will run on CPU (much slower).")
