import pandas as pd
import joblib

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline


# ==========================================
# TRAINING DATA
# ==========================================

positive_texts = [
    "I absolutely love this product",
    "This product is amazing",
    "Excellent quality and great service",
    "I am very happy with my purchase",
    "The experience was wonderful",
    "This is fantastic",
    "I really like this product",
    "The product works perfectly",
    "Amazing experience",
    "Great product and excellent quality",
    "I am extremely satisfied",
    "The service was excellent",
    "I would definitely recommend this",
    "This app is awesome",
    "Everything works perfectly",
    "Very good experience",
    "I am impressed with the quality",
    "The product exceeded my expectations",
    "Absolutely fantastic service",
    "I love the design",
    "The quality is excellent",
    "Very useful and easy to use",
    "The customer service was great",
    "I am happy with the results",
    "This was a great purchase",
    "I love this app and it works perfectly",
    "I really enjoyed using this product",
    "This is one of the best products I have used",
    "The product is good",
    "The service was great",
]

negative_texts = [
    "I hate this product",
    "Very poor quality",
    "The service was terrible",
    "I am disappointed with this purchase",
    "Worst experience ever",
    "This product is useless",
    "I really dislike this product",
    "The product does not work",
    "Terrible experience",
    "Very bad product",
    "I am extremely disappointed",
    "The service was horrible",
    "I would not recommend this",
    "This app is terrible",
    "Everything is broken",
    "Very poor experience",
    "The quality is disappointing",
    "The product failed completely",
    "Absolutely horrible service",
    "I hate the design",
    "The quality is terrible",
    "Very difficult to use",
    "The customer service was awful",
    "I regret buying this",
    "This was a terrible purchase",
    "I hate this app and it keeps crashing",
    "I was very disappointed by the service",
    "This is one of the worst products I have used",
    "The product is bad",
    "The service was awful",
]

neutral_texts = [
    "It is okay",
    "Nothing special about this product",
    "The experience was average",
    "Product is neither good nor bad",
    "It was fine",
    "Average service",
    "The product is okay",
    "The quality is average",
    "The service was normal",
    "I have no strong opinion",
    "It works as expected",
    "The experience was normal",
    "Nothing unusual about this",
    "The product is acceptable",
    "It is a standard product",
    "The service was satisfactory",
    "The product meets basic requirements",
    "It is neither impressive nor disappointing",
    "The experience was ordinary",
    "The quality is reasonable",
    "The app is okay and does what it says",
    "The product is average and nothing special",
    "The experience was neither good nor bad",
    "The service was okay and acceptable",
    "This product is just average",
    "The product is fine",
    "The service is average",
    "It is a normal product",
    "Nothing unusual happened",
    "The experience was acceptable",
]


# ==========================================
# CREATE DATAFRAME SAFELY
# ==========================================

texts = (
    positive_texts
    + negative_texts
    + neutral_texts
)

sentiments = (
    ["positive"] * len(positive_texts)
    + ["negative"] * len(negative_texts)
    + ["neutral"] * len(neutral_texts)
)

df = pd.DataFrame({
    "text": texts,
    "sentiment": sentiments
})


# ==========================================
# VERIFY DATA
# ==========================================

print("====================================")
print("Dataset Information")
print("====================================")

print("Total samples:", len(df))
print("\nSentiment distribution:")
print(df["sentiment"].value_counts())

print("\nChecking dataset...")

if len(texts) != len(sentiments):
    raise ValueError("Text and sentiment counts do not match.")

print("Dataset check: PASSED")


# ==========================================
# AI MODEL
# ==========================================

model = Pipeline([
    (
        "tfidf",
        TfidfVectorizer(
            lowercase=True,
            stop_words="english",
            ngram_range=(1, 2),
            sublinear_tf=True
        )
    ),
    (
        "classifier",
        LogisticRegression(
            max_iter=2000,
            C=2.0
        )
    )
])


# ==========================================
# TRAIN
# ==========================================

print("\nTraining AI model...")

model.fit(
    df["text"],
    df["sentiment"]
)


# ==========================================
# SAVE MODEL
# ==========================================

joblib.dump(
    model,
    "sentiment_model.pkl"
)


print("\n====================================")
print("AI Sentiment Model trained successfully!")
print("====================================")
print("Model: TF-IDF + Logistic Regression")
print("Training samples:", len(df))
print("Model saved as: sentiment_model.pkl")