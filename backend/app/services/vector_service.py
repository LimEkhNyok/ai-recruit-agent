import numpy as np


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)
    dot = np.dot(a, b)
    norm = np.linalg.norm(a) * np.linalg.norm(b)
    if norm == 0:
        return 0.0
    return float(dot / norm)


def rank_by_similarity(
    query_vec: list[float],
    candidates: list[dict],
    embedding_key: str = "embedding",
    top_n: int | None = None,
) -> list[dict]:
    """
    Rank candidates by cosine similarity to query_vec.

    Each candidate dict must have an `embedding_key` field containing a list[float].
    Returns candidates sorted by similarity (descending), each augmented with a
    `similarity_score` field. If top_n is set, only return the top N results.
    """
    q = np.array(query_vec, dtype=np.float32)
    q_norm = np.linalg.norm(q)
    if q_norm == 0:
        return []

    scored = []
    for candidate in candidates:
        emb = candidate.get(embedding_key)
        if not emb:
            continue
        c = np.array(emb, dtype=np.float32)
        c_norm = np.linalg.norm(c)
        if c_norm == 0:
            continue
        score = float(np.dot(q, c) / (q_norm * c_norm))
        scored.append({**candidate, "similarity_score": score})

    scored.sort(key=lambda x: x["similarity_score"], reverse=True)

    if top_n is not None:
        scored = scored[:top_n]

    return scored
