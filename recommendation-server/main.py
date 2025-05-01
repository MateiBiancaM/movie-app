from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import pandas as pd
import numpy as np
import nltk
from nltk.stem.porter import PorterStemmer
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from fastapi.middleware.cors import CORSMiddleware

nltk.download("punkt")
ps = PorterStemmer()

app = FastAPI()

# CORS-acces din frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Funcție de stemming
def stem(text):
    return " ".join([ps.stem(word) for word in text.split()])

class Movie(BaseModel):
    id: int
    title: str
    tags: str
    poster_path: str
    release_date: str
    vote_average: float
    type: str 

class RecommendRequest(BaseModel):
    favorites: List[Movie]
    discover: List[Movie]

@app.get("/")
def root():
    return {"message": "Success!"}

@app.post("/recommend")
def recommend(request: RecommendRequest):
    discover_df = pd.DataFrame([movie.dict() for movie in request.discover])
    discover_df["tags"] = discover_df["tags"].apply(stem)

    # vectorizare
    cv = CountVectorizer(max_features=5000, stop_words='english')
    vectorizer_fitted = cv.fit(discover_df["tags"])
    discover_vectors = vectorizer_fitted.transform(discover_df["tags"]).toarray()

    exclude_ids = {(movie.id, movie.type) for movie in request.favorites}

    # recomandari generale
    favorites_df = pd.DataFrame([movie.dict() for movie in request.favorites])
    favorites_df["tags"] = favorites_df["tags"].apply(stem)
    favorite_vectors = vectorizer_fitted.transform(favorites_df["tags"]).toarray()
    user_profile = np.mean(favorite_vectors, axis=0).reshape(1, -1)

    similarity_general = cosine_similarity(user_profile, discover_vectors).flatten()

    scored_general = [
        (i, similarity_general[i])
        for i in range(len(similarity_general))
        if (discover_df.iloc[i]["id"], discover_df.iloc[i]["type"]) not in exclude_ids
    ]

    general_top_indices = [i for i, _ in sorted(scored_general, key=lambda x: x[1], reverse=True)]

    general_recommendations = []
    seen_keys = set()
    for i in general_top_indices:
        movie = discover_df.iloc[i].to_dict()
        key = (movie["id"], movie.get("type", "movie"))
        if key not in seen_keys:
            general_recommendations.append(movie)
            seen_keys.add(key)
        if len(general_recommendations) >= 20:
            break

    # recomandari individuale
    individual_recommendations = []
    used_individual_ids = set()

    for favorite in request.favorites:
        fav_tags_stemmed = stem(favorite.tags)
        fav_vector = vectorizer_fitted.transform([fav_tags_stemmed]).toarray()

        similarity_scores = cosine_similarity(fav_vector, discover_vectors).flatten()

        scored_individual = [
            (i, similarity_scores[i])
            for i in range(len(similarity_scores))
            if (
                (discover_df.iloc[i]["id"], discover_df.iloc[i]["type"]) not in exclude_ids
                and (discover_df.iloc[i]["id"], discover_df.iloc[i]["type"]) not in used_individual_ids
            )
        ]

        seen_individual = set()
        top_indices = []
        for i, _ in sorted(scored_individual, key=lambda x: x[1], reverse=True):
            movie = discover_df.iloc[i]
            key = (movie["id"], movie["type"])
            if key not in seen_individual:
                top_indices.append(i)
                seen_individual.add(key)
                used_individual_ids.add(key)
            if len(top_indices) == 5:
                break

        suggestions = [discover_df.iloc[i].to_dict() for i in top_indices]

        individual_recommendations.append({
            "based_on": favorite.title,
            "suggestions": suggestions
        })

    return {
        "general": general_recommendations,
        "individual": individual_recommendations
    }
