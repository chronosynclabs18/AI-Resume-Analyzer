# Implementation Plan - AI Powered Hiring and Skill Gap Analysis (Python Backend)

This plan integrates a **Python backend** (Flask) to perform authentic Machine Learning and NLP processing using `scikit-learn`, `pandas`, and `numpy`. The frontend will be a premium web interface that uploads resumes and job descriptions to the Python server, visualizes the step-by-step pipeline outputs, and displays the skill gaps.

## User Review Required

> [!IMPORTANT]
> To support the Python backend, the system requires Python 3.x and the installation of libraries: `flask`, `flask-cors`, `scikit-learn`, `pandas`, `numpy`.
>
> The backend will:
> 1. Initialize and train a Logistic Regression, Decision Tree, and Random Forest classifier on a small curated dataset of resumes and job descriptions.
> 2. Expose an `/analyze` REST API endpoint.
> 3. Perform text preprocessing, TF-IDF feature extraction, and cosine similarity calculations using Scikit-Learn.
> 4. Classify the uploaded resume against the job description and return results from all three models.
> 5. Identify matching and missing skills and generate recommendations.

Please verify if you have Python installed and if you would like me to set up a virtual environment (`venv`) and install the required dependencies automatically.

## Proposed Features & UX

1. **Frontend Dashboard**:
   - Sleek dark theme with side navigation: **Project Overview**, **Resume Analyzer**, and **Skill Gap Dashboard**.
   - Input panels: file upload (PDF/TXT) and job description selector (or custom text paste).
   - Dynamic API loading state showing pipeline phases: "Pre-processing Text...", "Calculating TF-IDF...", "Running Classifiers...", "Analyzing Gaps...".
   - Rich visualization: Model prediction confidence bar charts, cosine similarity gauge, and matching/missing skills lists.
2. **Python Backend (`app.py`)**:
   - Built with **Flask** and **Flask-CORS** to enable communications.
   - Text NLP processing engine (lowercasing, tokenization, stop-words removal).
   - `TfidfVectorizer` to extract feature vectors.
   - Real Scikit-Learn models trained on-the-fly or with a preset dataset to classify candidate suitability (Highly Suitable, Moderately Suitable, Not Suitable).
   - Detailed JSON response containing raw preprocessing logs, similarity matrices, classification probabilities, and skill gap lists.

---

## Proposed Changes

### Backend
#### [NEW] [app.py](file:///c:/Users/A/ankith/app.py)
Flask API server containing:
- Preprocessing helper functions.
- Scikit-learn model definitions, training code, and prediction logic.
- Cosine similarity matching.
- Skill database and gap identification engine.
- Course/project recommendation system.

#### [NEW] [requirements.txt](file:///c:/Users/A/ankith/requirements.txt)
Python package specifications: `flask`, `flask-cors`, `scikit-learn`, `pandas`, `numpy`.

### Frontend
#### [NEW] [index.html](file:///c:/Users/A/ankith/index.html)
Dashboard interface designed with navigation, input forms, dynamic pipeline stages, and visual charts.

#### [NEW] [styles.css](file:///c:/Users/A/ankith/styles.css)
CSS styles using a modern dark sci-fi color palette, flex layouts, and custom chart designs.

#### [NEW] [app.js](file:///c:/Users/A/ankith/app.js)
Frontend controller that handles:
- PDF text reading via PDF.js.
- API requests to the Python backend (`http://127.0.0.1:5000/analyze`).
- Rendering the NLP tokens, model probabilities, and skill gap suggestions dynamically.

---

## Verification Plan

### Automated/Manual Verification
- Set up a virtual environment and run `pip install -r requirements.txt`.
- Start the backend server: `python app.py`.
- Open `index.html` via double-click or a local server.
- Test with preset resumes or uploaded PDFs.
- Verify backend console logs show TF-IDF fitting and model classification outputs.
- Verify frontend visual graphs correctly render backend JSON predictions.
