from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import io


# ==========================================
# CREATE FASTAPI APPLICATION
# ==========================================

app = FastAPI(
    title="AI Sentiment Analyzer API",
    description="AI-powered sentiment analysis using NLP and Machine Learning",
    version="1.0.0"
)


# ==========================================
# CORS CONFIGURATION
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# LOAD TRAINED AI MODEL
# ==========================================

model = joblib.load("sentiment_model.pkl")


# ==========================================
# REQUEST MODEL
# ==========================================

class TextRequest(BaseModel):
    text: str


# ==========================================
# HOME API
# ==========================================

@app.get("/")
def home():
    return {
        "message": "AI Sentiment Analyzer API is running!",
        "model": "TF-IDF + Logistic Regression"
    }


# ==========================================
# SENTIMENT PREDICTION API
# ==========================================

@app.post("/predict")
def predict_sentiment(request: TextRequest):

    text = request.text.strip()

    if not text:
        return {
            "error": "Please provide some text."
        }

    # AI prediction
    prediction = model.predict([text])[0]

    # Prediction probabilities
    probabilities = model.predict_proba([text])[0]

    classes = model.classes_

    # Highest probability
    confidence = max(probabilities) * 100

    probability_data = {
        classes[i]: round(float(probabilities[i]) * 100, 2)
        for i in range(len(classes))
    }

    return {
        "text": text,
        "sentiment": prediction,
        "confidence": round(confidence, 2),
        "probabilities": probability_data
    }


# ==========================================
# CSV BULK SENTIMENT ANALYSIS API
# ==========================================

@app.post("/predict-csv")
async def predict_csv(file: UploadFile = File(...)):

    # Check file type
    if not file.filename.lower().endswith(".csv"):
        return {
            "error": "Please upload a CSV file."
        }

    try:
        # Read uploaded CSV
        contents = await file.read()

        df = pd.read_csv(io.BytesIO(contents))

        # Check that CSV has data
        if df.empty:
            return {
                "error": "The uploaded CSV file is empty."
            }

        # Find text column
        possible_columns = [
            "text",
            "Text",
            "TEXT",
            "review",
            "Review",
            "comment",
            "Comment",
            "message",
            "Message"
        ]

        text_column = None

        for column in possible_columns:
            if column in df.columns:
                text_column = column
                break

        # If no standard text column exists
        if text_column is None:
            return {
                "error": "CSV must contain a text column such as 'text', 'review', 'comment', or 'message'."
            }

        # Remove empty values
        df[text_column] = df[text_column].fillna("").astype(str)

        results = []

        for text in df[text_column]:

            clean_text = text.strip()

            if not clean_text:
                results.append({
                    "text": "",
                    "sentiment": "unknown",
                    "confidence": 0
                })
                continue

            prediction = model.predict([clean_text])[0]

            probabilities = model.predict_proba([clean_text])[0]

            confidence = max(probabilities) * 100

            results.append({
                "text": clean_text,
                "sentiment": prediction,
                "confidence": round(float(confidence), 2)
            })

        # Calculate summary
        valid_results = [
            item for item in results
            if item["sentiment"] != "unknown"
        ]

        positive_count = sum(
            1 for item in valid_results
            if item["sentiment"] == "positive"
        )

        neutral_count = sum(
            1 for item in valid_results
            if item["sentiment"] == "neutral"
        )

        negative_count = sum(
            1 for item in valid_results
            if item["sentiment"] == "negative"
        )

        total = len(valid_results)

        return {
            "filename": file.filename,
            "total_rows": len(df),
            "analyzed_rows": total,
            "summary": {
                "positive": positive_count,
                "neutral": neutral_count,
                "negative": negative_count
            },
            "results": results
        }

    except Exception as error:

        return {
            "error": f"Could not process CSV file: {str(error)}"
        }