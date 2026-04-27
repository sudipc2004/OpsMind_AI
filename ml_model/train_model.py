from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
import pickle

logs = [
    "CPU usage high",
    "Disk error",
    "System normal",
    "All services running fine"
]

labels = [1, 1, 0, 0]

vectorizer = CountVectorizer()
X = vectorizer.fit_transform(logs)

model = MultinomialNB()
model.fit(X, labels)

pickle.dump(model, open("model.pkl", "wb"))
pickle.dump(vectorizer, open("vectorizer.pkl", "wb"))

print("Model trained!")