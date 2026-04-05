import bleach
import logging
from bleach.css_sanitizer import CSSSanitizer
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, text
from pydantic import BaseModel, field_validator

from ..core.database import get_db
from ..core.auth import get_current_user, require_role
from ..models.article import Article, ArticleChunk
from ..models.feedback import Feedback
from ..models.user import User
from ..services.embeddings import generate_embedding, chunk_text

router = APIRouter(prefix="/articles", tags=["articles"])
logger = logging.getLogger(__name__)

ALLOWED_TAGS = list(bleach.sanitizer.ALLOWED_TAGS) + [
    "p", "br", "h1", "h2", "h3", "h4", "h5", "h6",
    "pre", "code", "blockquote", "hr", "img",
    "table", "thead", "tbody", "tr", "th", "td",
    "span", "div", "ul", "ol", "li",
]
ALLOWED_ATTRIBUTES = {
    **bleach.sanitizer.ALLOWED_ATTRIBUTES,
    "img": ["src", "alt", "width", "height"],
    "a": ["href", "title", "target"],
    "code": ["class"],
    "span": ["style", "class"],
    "th": ["colspan", "rowspan"],
    "td": ["colspan", "rowspan"],
}
ALLOWED_STYLES = ["color", "background-color", "font-weight", "font-style", "text-decoration"]
_css_sanitizer = CSSSanitizer(allowed_css_properties=ALLOWED_STYLES)


def sanitize_html(html: str) -> str:
    return bleach.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        css_sanitizer=_css_sanitizer,
        strip=True,
    )


class ArticleCreate(BaseModel):
    title: str
    body: str
    category: str = "General"
    is_published: int = 1

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Title cannot be empty")
        if len(v) > 512:
            raise ValueError("Title too long")
        return v

    @field_validator("category")
    @classmethod
    def category_valid(cls, v: str) -> str:
        return v.strip()[:128] or "General"


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    category: Optional[str] = None
    is_published: Optional[int] = None


class ArticleOut(BaseModel):
    id: int
    title: str
    body: str
    category: str
    author_id: Optional[int]
    is_published: int
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, obj: Article) -> "ArticleOut":
        return cls(
            id=obj.id,
            title=obj.title,
            body=obj.body,
            category=obj.category,
            author_id=obj.author_id,
            is_published=obj.is_published,
            created_at=obj.created_at.isoformat(),
            updated_at=obj.updated_at.isoformat(),
        )


class FeedbackCreate(BaseModel):
    helpful: bool
    comment: Optional[str] = None

    @field_validator("comment")
    @classmethod
    def sanitize_comment(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return bleach.clean(v, tags=[], strip=True)[:2000]
        return v


async def _regenerate_embeddings(article_id: int, title: str, body: str):
    """Background task: chunk article and regenerate embeddings."""
    import re
    from ..core.database import AsyncSessionLocal
    db = AsyncSessionLocal()
    try:
        # Delete old chunks
        await db.execute(delete(ArticleChunk).where(ArticleChunk.article_id == article_id))
        await db.commit()

        # Strip HTML tags and generate embeddings
        plain = re.sub(r"<[^>]+>", " ", f"{title}\n\n{body}")
        plain = re.sub(r"\s+", " ", plain).strip()

        chunks = chunk_text(plain)
        for idx, chunk in enumerate(chunks):
            embedding = await generate_embedding(chunk)
            db.add(ArticleChunk(
                article_id=article_id,
                chunk_index=idx,
                chunk_text=chunk,
                embedding=embedding,
            ))
        await db.commit()
        logger.info(f"Regenerated {len(chunks)} embedding chunks for article {article_id}")
    except Exception as e:
        logger.error(f"Embedding regeneration failed for article {article_id}: {e}")
        await db.rollback()
    finally:
        await db.close()


@router.get("", response_model=list[ArticleOut])
async def list_articles(
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Article)
    # Readers only see published articles; editors/admins see everything
    if current_user.role == "reader":
        q = q.where(Article.is_published == 1)
    if category:
        q = q.where(Article.category == category)
    q = q.order_by(Article.category, Article.title)
    result = await db.execute(q)
    articles = result.scalars().all()
    return [ArticleOut.from_orm(a) for a in articles]


@router.get("/categories")
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Readers only see categories that have published articles
    if current_user.role == "reader":
        result = await db.execute(
            text("SELECT DISTINCT category FROM articles WHERE is_published = 1 ORDER BY category")
        )
    else:
        result = await db.execute(
            text("SELECT DISTINCT category FROM articles ORDER BY category")
        )
    return [row[0] for row in result.fetchall()]


@router.get("/{article_id}", response_model=ArticleOut)
async def get_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return ArticleOut.from_orm(article)


@router.post("", response_model=ArticleOut, status_code=status.HTTP_201_CREATED)
async def create_article(
    req: ArticleCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("editor", "admin")),
):
    clean_body = sanitize_html(req.body)
    article = Article(
        title=req.title,
        body=clean_body,
        category=req.category,
        author_id=current_user.id,
        is_published=req.is_published,
    )
    db.add(article)
    await db.flush()
    await db.refresh(article)

    # Update search vector
    await db.execute(
        text("UPDATE articles SET search_vector = to_tsvector('english', :title || ' ' || :body) WHERE id = :id"),
        {"title": article.title, "body": article.body, "id": article.id},
    )
    await db.commit()

    background_tasks.add_task(_regenerate_embeddings, article.id, article.title, article.body)
    return ArticleOut.from_orm(article)


@router.put("/{article_id}", response_model=ArticleOut)
async def update_article(
    article_id: int,
    req: ArticleUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("editor", "admin")),
):
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    if req.title is not None:
        article.title = req.title.strip()
    if req.body is not None:
        article.body = sanitize_html(req.body)
    if req.category is not None:
        article.category = req.category.strip()[:128] or "General"
    if req.is_published is not None:
        article.is_published = req.is_published

    article.updated_at = datetime.now(timezone.utc)
    await db.flush()

    await db.execute(
        text("UPDATE articles SET search_vector = to_tsvector('english', :title || ' ' || :body) WHERE id = :id"),
        {"title": article.title, "body": article.body, "id": article.id},
    )
    await db.commit()
    await db.refresh(article)

    background_tasks.add_task(_regenerate_embeddings, article.id, article.title, article.body)
    return ArticleOut.from_orm(article)


@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_role("editor", "admin")),
):
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    await db.delete(article)


@router.post("/{article_id}/feedback", status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    article_id: int,
    req: FeedbackCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Article).where(Article.id == article_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Article not found")
    fb = Feedback(article_id=article_id, user_id=current_user.id, helpful=req.helpful, comment=req.comment)
    db.add(fb)
    return {"status": "ok"}


@router.get("/{article_id}/feedback")
async def get_feedback(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_role("editor", "admin")),
):
    result = await db.execute(
        select(Feedback).where(Feedback.article_id == article_id).order_by(Feedback.created_at.desc())
    )
    rows = result.scalars().all()
    return [
        {
            "id": f.id,
            "helpful": f.helpful,
            "comment": f.comment,
            "created_at": f.created_at.isoformat(),
        }
        for f in rows
    ]
