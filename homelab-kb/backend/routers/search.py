from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.auth import get_current_user
from ..services.search import fulltext_search

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
async def search(
    q: str = Query(..., min_length=1, max_length=256),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    results = await fulltext_search(q, db, limit=limit)
    return {"query": q, "results": results, "count": len(results)}
