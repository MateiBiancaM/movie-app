from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import pandas as pd
import numpy as np
import nltk
from nltk.stem.porter import PorterStemmer
from sklearn.metrics.pairwise import cosine_similarity
from fastapi.middleware.cors import CORSMiddleware
from collections import Counter
from sentence_transformers import SentenceTransformer


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

GENRES = {
    "action", "adventure", "animation", "comedy", "crime", "documentary",
    "drama", "family", "fantasy", "history", "horror", "music", "mystery",
    "romance", "science fiction", "tv movie", "thriller", "war", "western"
}

def extract_genres(text):
    return set(word.lower() for word in text.split() if word.lower() in GENRES)

def normalize(series):
    return (series - series.min()) / (series.max() - series.min() + 1e-6)

@app.post("/recommend")
def recommend(request: RecommendRequest):
    discover_df = pd.DataFrame([movie.dict() for movie in request.discover])
    favorites_df = pd.DataFrame([movie.dict() for movie in request.favorites])

    # Procesare release_date -> year
    discover_df["release_year"] = pd.to_datetime(discover_df["release_date"], errors='coerce').dt.year
    favorites_df["release_year"] = pd.to_datetime(favorites_df["release_date"], errors='coerce').dt.year

    # Construim combined_tags
    def build_combined_tags(row):
        return f"{row['title']} {row['tags']} {row['type']} {row['release_year']}"

    discover_df["combined_tags"] = discover_df.apply(build_combined_tags, axis=1).fillna("")
    favorites_df["combined_tags"] = favorites_df.apply(build_combined_tags, axis=1).fillna("")

    # Stemming
    discover_df["combined_tags"] = discover_df["combined_tags"].apply(stem)
    favorites_df["combined_tags"] = favorites_df["combined_tags"].apply(stem)

    # Încarcă modelul
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

    # Obține textele (cu stemming deja aplicat)
    discover_texts = discover_df["combined_tags"].tolist()
    favorites_texts = favorites_df["combined_tags"].tolist()

    # Concatenează pentru embedding consistent
    all_texts = discover_texts + favorites_texts
    all_embeddings = embedding_model.encode(all_texts, convert_to_numpy=True)

    # Separă vectorii
    discover_vectors = all_embeddings[:len(discover_texts)]
    favorite_vectors = all_embeddings[len(discover_texts):]
    user_profile = np.mean(favorite_vectors, axis=0).reshape(1, -1)

    # Similaritate + bonusuri
    similarity_general = cosine_similarity(user_profile, discover_vectors).flatten()

    most_common_type = Counter(favorites_df["type"]).most_common(1)[0][0]
    discover_df["type_match"] = discover_df["type"].apply(lambda t: 1 if t == most_common_type else 0)
    discover_df["vote_bonus"] = normalize(discover_df["vote_average"])
    discover_df["year_bonus"] = normalize(discover_df["release_year"].fillna(0))

    # Genuri favorite
    fav_genres = favorites_df["tags"].apply(extract_genres)
    all_fav_genres = set.union(*fav_genres) if not fav_genres.empty else set()
    discover_df["genre_match"] = discover_df["tags"].apply(
        lambda t: len(extract_genres(t).intersection(all_fav_genres))
    )
    genre_bonus = normalize(discover_df["genre_match"])

    similarity_general += (
        0.1 * discover_df["type_match"] +
        0.2 * discover_df["vote_bonus"] +
        0.1 * discover_df["year_bonus"] +
        0.3 * genre_bonus
    )

    exclude_ids = {(movie.id, movie.type) for movie in request.favorites}

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

    # Recomandări individuale (cu accent puternic pe gen)
    individual_recommendations = []
    used_individual_ids = set()

    for _, favorite in favorites_df.iterrows():
        fav_embedding = embedding_model.encode([favorite["combined_tags"]], convert_to_numpy=True)
        similarity_scores = cosine_similarity(fav_embedding, discover_vectors).flatten()

        fav_genres = extract_genres(favorite["tags"])
        genre_matches = discover_df["tags"].apply(
            lambda t: len(fav_genres.intersection(extract_genres(t)))
        )
        genre_bonus = normalize(genre_matches)

        final_score = similarity_scores + 0.4 * genre_bonus + 0.1 * discover_df["type_match"]

        scored_individual = [
            (i, final_score[i])
            for i in range(len(final_score))
            if (
                (discover_df.iloc[i]["id"], discover_df.iloc[i]["type"]) not in exclude_ids and
                (discover_df.iloc[i]["id"], discover_df.iloc[i]["type"]) not in used_individual_ids
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
            "based_on": favorite["title"],
            "suggestions": suggestions
        })

    return {
        "general": general_recommendations,
        "individual": individual_recommendations
    }

