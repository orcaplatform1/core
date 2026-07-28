"""ORCA Sentiment Service — internal-only FastAPI microservice.

Loads a small finance-tuned BERT model (FinBERT) once at startup and scores
short text batches (news headlines/summaries) as positive/negative/neutral.
Bound to 127.0.0.1 only — NestJS is the sole caller, never exposed externally.
Runs fully offline after the first model download.
"""

from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline

app = FastAPI(title="ORCA Sentiment Service")

_classifier = pipeline("sentiment-analysis", model="ProsusAI/finbert")


class ScoreRequest(BaseModel):
    texts: list[str]


class ScoreResult(BaseModel):
    label: str
    score: float


@app.post("/score", response_model=list[ScoreResult])
def score(req: ScoreRequest) -> list[ScoreResult]:
    if not req.texts:
        return []
    results = _classifier(req.texts, truncation=True)
    return [{"label": r["label"].upper(), "score": r["score"]} for r in results]


@app.get("/health")
def health():
    return {"status": "ok"}
