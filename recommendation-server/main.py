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
from transformers import pipeline
from typing import Optional 

# Inițializări
nltk.download("punkt")
ps = PorterStemmer()
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
emotion_classifier = pipeline("text-classification", model="j-hartmann/emotion-english-distilroberta-base", return_all_scores=True)

app = FastAPI()

# CORS pentru acces frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Stemming
def stem(text):
    return " ".join([ps.stem(word) for word in text.split()])

# Genuri definite
GENRES = {
    "action", "adventure", "animation", "comedy", "crime", "documentary",
    "drama", "family", "fantasy", "history", "horror", "music", "mystery",
    "romance", "science fiction", "tv movie", "thriller", "war", "western"
}

def extract_genres(text):
    return set(word.lower() for word in text.split() if word.lower() in GENRES)

def normalize(series):
    return (series - series.min()) / (series.max() - series.min() + 1e-6)

# Modele
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

class EmotionRequest(BaseModel):
    text: str
    discover: List[Movie]

@app.get("/")
def root():
    return {"message": "Success!"}

@app.post("/recommend")
def recommend(request: RecommendRequest):
    discover_df = pd.DataFrame([movie.dict() for movie in request.discover])
    favorites_df = pd.DataFrame([movie.dict() for movie in request.favorites])

    discover_df["release_year"] = pd.to_datetime(discover_df["release_date"], errors='coerce').dt.year
    favorites_df["release_year"] = pd.to_datetime(favorites_df["release_date"], errors='coerce').dt.year

    def build_combined_tags(row):
        return f"{row['title']} {row['tags']} {row['type']} {row['release_year']}"

    discover_df["combined_tags"] = discover_df.apply(build_combined_tags, axis=1).fillna("")
    favorites_df["combined_tags"] = favorites_df.apply(build_combined_tags, axis=1).fillna("")

    discover_df["combined_tags"] = discover_df["combined_tags"].apply(stem)
    favorites_df["combined_tags"] = favorites_df["combined_tags"].apply(stem)

    discover_texts = discover_df["combined_tags"].tolist()
    favorites_texts = favorites_df["combined_tags"].tolist()

    all_texts = discover_texts + favorites_texts
    all_embeddings = embedding_model.encode(all_texts, convert_to_numpy=True)

    discover_vectors = all_embeddings[:len(discover_texts)]
    favorite_vectors = all_embeddings[len(discover_texts):]
    user_profile = np.mean(favorite_vectors, axis=0).reshape(1, -1)

    similarity_general = cosine_similarity(user_profile, discover_vectors).flatten()

    most_common_type = Counter(favorites_df["type"]).most_common(1)[0][0]
    discover_df["type_match"] = discover_df["type"].apply(lambda t: 1 if t == most_common_type else 0)
    discover_df["vote_bonus"] = normalize(discover_df["vote_average"])
    discover_df["year_bonus"] = normalize(discover_df["release_year"].fillna(0))

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

    # Individual
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

# ----------------------------
# EMOTION-BASED RECOMMENDATION
# ----------------------------

EMOTION_GENRE_MAP = {
    "joy": ["animation", "family", "comedy"],
    "sadness": ["drama", "comedy", "romance"],
    "anger": ["action", "thriller", "crime"],
    "fear": ["horror", "thriller", "mystery"],
    "surprise": ["mystery", "science fiction", "fantasy"],
    "love": ["romance", "drama", "comedy"],
    "gratitude": ["documentary", "family", "history"],
    "disappointment": ["drama", "comedy"],
    "nervousness": ["comedy", "romance"],
    "optimism": ["adventure", "fantasy", "animation", "science fiction"]
}

def manual_emotion_override(text: str) -> Optional[str]: 
    lowered = text.lower()
    override_map = {
        "love": ["love", "in love", "romantic", "falling for", "soulmate", "valentine"],
        "gratitude": ["grateful", "thankful", "appreciate", "blessed"],
        "fear": ["scared", "terrified", "panic", "afraid", "frightened"],
        "anger": ["angry", "furious", "rage", "mad"],
        "sadness": ["sad", "cry", "heartbroken", "depressed"],
        "joy": ["happy", "excited", "delighted", "cheerful"],
        "disappointment": ["disappointed", "regret", "let down"],
        "nervousness": ["nervous", "anxious", "worried", "stressed"],
        "optimism": ["hopeful", "positive", "looking forward"]
    }
    for emotion, keywords in override_map.items():
        if any(word in lowered for word in keywords):
            return emotion
    return None

@app.post("/emotion-recommend")
@app.post("/emotion-recommend")
def emotion_recommend(req: EmotionRequest):
    text_lower = req.text.lower()

    # 1️⃣ Căutăm genuri din text
    detected_genres = set(
        g for g in GENRES if g in text_lower
    )

    if detected_genres:
        # ✅ Dacă textul conține genuri, folosim doar acestea
        related_genres = detected_genres
        top_emotion = "custom genre"
    else:
        # 2️⃣ Emoție override
        manual_emotion = manual_emotion_override(req.text)

        if manual_emotion:
            top_emotion = manual_emotion
        else:
            results = emotion_classifier(req.text)
            sorted_scores = sorted(results[0], key=lambda x: x["score"], reverse=True)
            top_emotion = sorted_scores[0]["label"].lower()

        related_genres = set(EMOTION_GENRE_MAP.get(top_emotion, []))

    # Procesare filme
    discover_df = pd.DataFrame([movie.dict() for movie in req.discover])
    discover_df["release_year"] = pd.to_datetime(discover_df["release_date"], errors='coerce').dt.year

    def build_combined_tags(row):
        return f"{row['title']} {row['tags']} {row['type']} {row['release_year']}"

    discover_df["combined_tags"] = discover_df.apply(build_combined_tags, axis=1).fillna("")
    discover_df["combined_tags"] = discover_df["combined_tags"].apply(stem)

    input_embedding = embedding_model.encode([req.text], convert_to_numpy=True)
    movie_embeddings = embedding_model.encode(discover_df["combined_tags"].tolist(), convert_to_numpy=True)
    semantic_sim = cosine_similarity(input_embedding, movie_embeddings).flatten()

    discover_df["genre_match"] = discover_df["tags"].apply(
        lambda t: len(related_genres.intersection(extract_genres(t)))
    )
    genre_bonus = normalize(discover_df["genre_match"])
    discover_df["vote_bonus"] = normalize(discover_df["vote_average"])
    discover_df["year_bonus"] = normalize(discover_df["release_year"].fillna(0))

    final_score = (
        0.6 * semantic_sim +
        0.2 * genre_bonus +
        0.1 * discover_df["vote_bonus"] +
        0.1 * discover_df["year_bonus"]
    )
    discover_df["final_score"] = final_score

    seen = set()
    ranked = []
    for _, row in discover_df.sort_values(by="final_score", ascending=False).iterrows():
        key = (row["id"], row["type"])
        if key not in seen:
            ranked.append(row.to_dict())
            seen.add(key)
        if len(ranked) >= 10:
            break

    return {
        "emotion": top_emotion,
        "recommended": ranked
    }
