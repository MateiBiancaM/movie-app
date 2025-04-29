from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import os
from dotenv import load_dotenv

# Load .env
load_dotenv()
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", 8001))

# Init FastAPI app
app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # sau ["*"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class Movie(BaseModel):
    id: int
    title: str
    genres: List[str]
    description: str
    poster_path: str = ""  # ✅ adăugat cu valoare default
    vote_average: float = 0.0  # ✅ adăugat cu valoare default
    media_type: str = "movie"  # ✅ adăugat cu valoare default


class RecommendationRequest(BaseModel):
    watched: List[Movie]
    all_movies: List[Movie]

# Status check
@app.get("/status")
async def status():
    return {"message": "ok"}

# Recommendation endpoint
@app.post("/recommend")
async def recommend_movies(data: RecommendationRequest):
    all_movies = data.all_movies
    watched_movies = data.watched

    # Pregătim textul pentru vectorizare
    corpus = [
        f"{movie.title} {' '.join(movie.genres)} {movie.description}"
        for movie in all_movies
    ]

    vectorizer = TfidfVectorizer(stop_words="english")
    tfidf_matrix = vectorizer.fit_transform(corpus)

    watched_indices = [
        next((i for i, m in enumerate(all_movies) if m.id == watched.id), None)
        for watched in watched_movies
    ]
    watched_indices = [i for i in watched_indices if i is not None]

    if not watched_indices:
        return []

    watched_vectors = tfidf_matrix[watched_indices]
    user_profile = np.asarray(watched_vectors.mean(axis=0))  # 👈 Fix critic aici

    similarities = cosine_similarity(user_profile, tfidf_matrix).flatten()

    recommendations = []
    for idx, score in enumerate(similarities):
        if all_movies[idx].id not in [w.id for w in watched_movies]:
            recommendations.append({
    "id": all_movies[idx].id,
    "title": all_movies[idx].title,
    "genres": all_movies[idx].genres,
    "description": all_movies[idx].description,
    "poster_path": all_movies[idx].poster_path,  # ✅ ADĂUGAT
    "vote_average": getattr(all_movies[idx], "vote_average", 0),  # opțional
    "media_type": getattr(all_movies[idx], "media_type", "movie"),  # opțional
    "similarity": float(score)
})


    recommendations.sort(key=lambda x: x["similarity"], reverse=True)
    return recommendations[:10]

# Rulează direct cu `python main.py` dacă vrei
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
