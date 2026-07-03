# SnapPlate — Team Work Split

**Project:** AI-Based Dietary Assessment Using Multimodal LLMs (PS-1 Project #10)
**Goal:** Photo of a meal → detect food → estimate calories, protein, carbs, fat & fibre using a self-trained ML model (transfer learning).

## Team

| Member | Role |
|--------|------|
| **Gaurav** | Project lead / owner |
| **Veeresham** | Collaborator |

---

## Gaurav

| # | Task | Description | Status |
|---|------|-------------|--------|
| 1 | Project setup & repo | Create repo, folder structure, requirements, README | ☐ |
| 2 | Dataset collection | Download & organize Food-101 (101 classes, 101k images) | ☐ |
| 3 | Data preprocessing | Resize to 224×224, normalise, train/val/test split, augmentation | ☐ |
| 4 | Model architecture | EfficientNetB0 backbone + classifier head (transfer learning) | ☐ |
| 5 | Model training | Two-phase training (freeze head → fine-tune), save model | ☐ |
| 6 | Documentation | Maintain README, training notes, results write-up | ☐ |

---

## Veeresham

| # | Task | Description | Status |
|---|------|-------------|--------|
| 1 | Base papers research | Collect & summarise base papers (Nutrition5k, Food-101, DietAI24, CalorieLLaVA) | ☐ |
| 2 | Nutrition table | Build per-100g nutrition table (calories, protein, carbs, fat, fibre) for all classes | ☐ |
| 3 | Portion logic | Serving-size selector + portion → nutrition maths | ☐ |
| 4 | Model evaluation | Accuracy, confusion matrix, classification report, training curves | ☐ |
| 5 | Demo app | Streamlit app: upload photo → food + nutrition output | ☐ |
| 6 | Testing | Test predictions on real food photos, log bugs, edge cases | ☐ |

---

## Shared / Together

| # | Task | Description | Status |
|---|------|-------------|--------|
| 1 | Dataset finalisation | Decide Food-101 vs Indian-food dataset | ☐ |
| 2 | Integration | Connect model → nutrition table → demo app | ☐ |
| 3 | Final report & PPT | Combine results, prepare submission & presentation | ☐ |
| 4 | Review | Cross-check each other's work before submission | ☐ |

---

_Legend: ☐ = not started · ☑ = done. Update the Status column as tasks progress._
