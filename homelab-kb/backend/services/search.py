from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


async def fulltext_search(query: str, db: AsyncSession, limit: int = 20) -> list[dict]:
    """PostgreSQL full-text search on article title and body."""
    if not query.strip():
        return []

    sql = text("""
        SELECT
            a.id,
            a.title,
            a.category,
            a.created_at,
            a.updated_at,
            ts_rank_cd(a.search_vector, plainto_tsquery('english', :query)) AS rank,
            ts_headline(
                'english',
                a.body,
                plainto_tsquery('english', :query),
                'MaxWords=35, MinWords=15, ShortWord=3, MaxFragments=2, FragmentDelimiter=\" ... \"'
            ) AS snippet
        FROM articles a
        WHERE a.is_published = 1
          AND a.search_vector @@ plainto_tsquery('english', :query)
        ORDER BY rank DESC
        LIMIT :limit
    """)

    result = await db.execute(sql, {"query": query, "limit": limit})
    rows = result.fetchall()
    return [
        {
            "id": row.id,
            "title": row.title,
            "category": row.category,
            "snippet": row.snippet,
            "rank": float(row.rank),
            "created_at": row.created_at.isoformat(),
            "updated_at": row.updated_at.isoformat(),
        }
        for row in rows
    ]
