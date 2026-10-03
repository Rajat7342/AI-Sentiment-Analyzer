
import joblib
from datasets import load_dataset, concatenate_datasets
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, f1_score, classification_report

LABELS = ["negative", "neutral", "positive"]

print("Loading TweetEval...")
tweets = load_dataset("cardiffnlp/tweet_eval", "sentiment")

print("Loading Rotten Tomatoes reviews...")
reviews = load_dataset("cornell-movie-review-data/rotten_tomatoes")

# TweetEval: 0=negative, 1=neutral, 2=positive
tweet_train = tweets["train"].map(
    lambda row: {"sentiment": LABELS[row["label"]]}
)
tweet_val = tweets["validation"].map(
    lambda row: {"sentiment": LABELS[row["label"]]}
)
tweet_test = tweets["test"].map(
    lambda row: {"sentiment": LABELS[row["label"]]}
)

# Rotten Tomatoes: 0=negative, 1=positive
# No neutral reviews in this dataset.
def map_review(row):
    return {"sentiment": "positive" if row["label"] == 1 else "negative"}
tweet_train = tweet_train.remove_columns(["label"])
tweet_val = tweet_val.remove_columns(["label"])
tweet_test = tweet_test.remove_columns(["label"])
review_train = reviews["train"].map(map_review)
review_val = reviews["validation"].map(map_review)
review_test = reviews["test"].map(map_review)

# Combine training sets only with training sets, etc.
train_data = concatenate_datasets([tweet_train, review_train])
val_data = concatenate_datasets([tweet_val, review_val])
test_data = concatenate_datasets([tweet_test, review_test])

X_train = train_data["text"]
y_train = train_data["sentiment"]

X_val = val_data["text"]
y_val = val_data["sentiment"]

X_test = test_data["text"]
y_test = test_data["sentiment"]

print("\nDataset sizes")
print("Train:", len(X_train))
print("Validation:", len(X_val))
print("Test:", len(X_test))

def make_model(classifier):
    return Pipeline([
        (
            "tfidf",
            TfidfVectorizer(
                lowercase=True,
                ngram_range=(1, 2),
                max_features=200000,
                sublinear_tf=True,
                min_df=2
            )
        ),
        ("classifier", classifier)
    ])

candidates = {
    "Logistic Regression": LogisticRegression(
        C=2.0,
        max_iter=2000,
        class_weight="balanced",
        random_state=42
    ),
    "Linear SVM": LinearSVC(
        C=1.0,
        class_weight="balanced",
        random_state=42
    )
}

results = []

for name, classifier in candidates.items():
    print(f"\nTraining {name}...")
    model = make_model(classifier)
    model.fit(X_train, y_train)

    val_predictions = model.predict(X_val)
    val_accuracy = accuracy_score(y_val, val_predictions)
    val_f1 = f1_score(
        y_val, val_predictions,
        labels=LABELS, average="macro"
    )

    print(f"Validation accuracy: {val_accuracy:.4f}")
    print(f"Validation macro F1: {val_f1:.4f}")

    results.append((val_f1, val_accuracy, name, model))

# Select using validation macro F1, not test performance.
results.sort(key=lambda item: (item[0], item[1]), reverse=True)
best_f1, best_accuracy, best_name, best_model = results[0]

print(f"\nSelected model: {best_name}")
print(f"Validation accuracy: {best_accuracy:.4f}")
print(f"Validation macro F1: {best_f1:.4f}")

# Evaluate the selected model once on the held-out combined test set.
test_predictions = best_model.predict(X_test)

print("\nCombined test results")
print("Test accuracy:", round(accuracy_score(y_test, test_predictions), 4))
print("Test macro F1:", round(
    f1_score(y_test, test_predictions, labels=LABELS, average="macro"), 4
))
print(classification_report(
    y_test, test_predictions, labels=LABELS, zero_division=0
))

# Save separately; do not overwrite the current live model.
joblib.dump(best_model, "sentiment_model_combined.pkl")

print("\nSaved: sentiment_model_combined.pkl")
print("Existing sentiment_model.pkl was not changed.")