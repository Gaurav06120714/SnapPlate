"""Quick sanity test: predict on random held-out test images and show
predicted vs actual labels + running accuracy.

    source ../.venv/bin/activate
    python test_samples.py            # 20 random test images
    python test_samples.py 50         # 50 images
"""
import random
import sys

from PIL import Image

import config
import predict


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 20

    lines = (config.META_DIR / "test.txt").read_text().split()
    random.seed()
    sample = random.sample(lines, n)

    correct = 0
    print(f"\nTesting {n} random held-out images:\n" + "-" * 60)
    for entry in sample:
        true_cls = entry.split("/")[0]
        img_path = config.IMAGES_DIR / f"{entry}.jpg"
        preds = predict.classify(Image.open(img_path), top_k=1)
        pred = preds[0]
        ok = pred["class"] == true_cls
        correct += ok
        mark = "✅" if ok else "❌"
        print(f"{mark} actual: {true_cls:<24} predicted: {pred['class']:<24} ({pred['confidence']*100:.0f}%)")

    print("-" * 60)
    print(f"Accuracy on this sample: {correct}/{n} = {correct/n*100:.1f}%")


if __name__ == "__main__":
    main()
