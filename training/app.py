"""SnapPlate demo — Streamlit app.

Upload a food photo -> the trained EfficientNetB3 model identifies the dish ->
nutrition (calories/protein/carbs/fat/fibre) scaled by portion size.

    source ../.venv/bin/activate
    pip install streamlit          # if not already installed
    streamlit run app.py
"""
import streamlit as st
from PIL import Image

import predict

st.set_page_config(page_title="SnapPlate", page_icon="🍽️", layout="centered")

st.title("🍽️ SnapPlate")
st.caption("Snap a meal — know what's in it. (EfficientNetB3 · 84% top-1 on Food-101)")

uploaded = st.file_uploader("Upload a food photo", type=["jpg", "jpeg", "png", "webp"])

if uploaded:
    image = Image.open(uploaded)
    st.image(image, caption="Your meal", use_container_width=True)

    with st.spinner("Analysing…"):
        preds = predict.classify(image, top_k=5)

    top = preds[0]
    st.subheader(f"🍴 {top['name']}")
    st.progress(min(top["confidence"], 1.0),
                text=f"Confidence: {top['confidence']*100:.1f}%")

    # Portion selector, defaulting to a typical serving for this dish.
    default_g = predict.default_serving(top["class"])
    grams = st.slider("Portion size (grams)", 30, 800, default_g, step=10)

    nut = predict.nutrition_for(top["class"], grams)
    if nut:
        st.markdown(f"### Nutrition for ~{grams} g")
        c1, c2, c3 = st.columns(3)
        c1.metric("Calories", f"{nut['calories']} kcal")
        c2.metric("Protein", f"{nut['protein_g']} g")
        c3.metric("Carbs", f"{nut['carbs_g']} g")
        c4, c5, _ = st.columns(3)
        c4.metric("Fat", f"{nut['fat_g']} g")
        c5.metric("Fibre", f"{nut['fiber_g']} g")

    st.divider()
    st.markdown("**Not this? Other likely matches:**")
    for p in preds[1:]:
        st.write(f"- {p['name']} — {p['confidence']*100:.1f}%")

    st.caption("Estimates are AI-generated and approximate — not medical or dietary advice.")
else:
    st.info("Upload a photo of a meal to get started. "
            "Works best on the 101 Food-101 categories the model was trained on.")
