
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import io
from pathlib import Path

# ==========================================
# CREATE FASTAPI APPLICATION
# ==========================================

app = FastAPI(
    title="AI Sentiment Analyzer API",
    description="AI-powered sentiment analysis for reviews and social media text",
    version="2.0.0"
)

# ==========================================
# CORS CONFIGURATION
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://ai-sentiment-analyzer-1-wont.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# LOAD COMBINED MODEL
# ==========================================

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "sentiment_model_combined.pkl"

model = joblib.load(MODEL_PATH)

# ==========================================
# REQUEST MODEL
# ==========================================

class TextRequest(BaseModel):
    text: str

# ==========================================
# SHARED PREDICTION FUNCTION
# ==========================================

def analyze_text(text: str) -> dict:
    clean_text = text.strip()

    if not clean_text:
        raise ValueError("Please provide some text.")

    prediction = str(model.predict([clean_text])[0])
    probabilities = model.predict_proba([clean_text])[0]
    classes = model.classes_

    probability_data = {
        str(classes[i]): round(float(probabilities[i]) * 100, 2)
        for i in range(len(classes))
    }

    confidence = max(probabilities) * 100

    return {
        "text": clean_text,
        "sentiment": prediction,
        "confidence": round(float(confidence), 2),
        "probabilities": probability_data,
    }

# ==========================================
# HOME API
# ==========================================

@app.get("/")
def home():
    return {
        "message": "AI Sentiment Analyzer API is running!",
        "model": "TF-IDF + Logistic Regression",
        "model_file": MODEL_PATH.name,
        "classes": [str(label) for label in model.classes_],
    }

# ==========================================
# SINGLE TEXT PREDICTION
# ==========================================

@app.post("/predict")
def predict_sentiment(request: TextRequest):
    try:
        return analyze_text(request.text)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

# ==========================================
# CSV BULK SENTIMENT ANALYSIS
# ==========================================

@app.post("/predict-csv")
async def predict_csv(file: UploadFile = File(...)):

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a CSV file."
        )

    try:
        contents = await file.read()

        if not contents:
            raise HTTPException(
                status_code=400,
                detail="The uploaded CSV file is empty."
            )

        df = pd.read_csv(io.BytesIO(contents))

        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="The uploaded CSV file has no data rows."
            )

        # Match common text column names, ignoring case and spaces.
        possible_columns = {
            "text", "review", "comment", "message"
        }

        text_column = next(
            (
                column for column in df.columns
                if str(column).strip().lower() in possible_columns
            ),
            None
        )

        if text_column is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "CSV must contain a text column such as "
                    "'text', 'review', 'comment', or 'message'."
                )
            )

        results = []

        for value in df[text_column]:
            text = "" if pd.isna(value) else str(value).strip()

            if not text:
                results.append({
                    "text": "",
                    "sentiment": "unknown",
                    "confidence": 0,
                    "probabilities": {},
                })
                continue

            results.append(analyze_text(text))

        valid_results = [
            item for item in results
            if item["sentiment"] != "unknown"
        ]

        summary = {
            sentiment: sum(
                1 for item in valid_results
                if item["sentiment"] == sentiment
            )
            for sentiment in ("positive", "neutral", "negative")
        }

        return {
            "filename": file.filename,
            "total_rows": len(df),
            "analyzed_rows": len(valid_results),
            "summary": summary,
            "results": results,
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not process the CSV. Check that it is a valid CSV file."
        )
    finally:
        await file.close()