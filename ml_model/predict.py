import pickle
import sys
import os

# Get current file directory
base_path = os.path.dirname(__file__)

# Correct paths
model_path = os.path.join(base_path, "model.pkl")
vectorizer_path = os.path.join(base_path, "vectorizer.pkl")

try:
    model = pickle.load(open(model_path, "rb"))
    vectorizer = pickle.load(open(vectorizer_path, "rb"))

    log = sys.argv[1]

    data = vectorizer.transform([log])
    prediction = model.predict(data)

    if prediction[0] == 1:
        print("Anomaly Detected")
    else:
        print("Normal")

except Exception as e:
    print("ERROR:", e)