from enum import StrEnum

from pydantic import BaseModel, Field, HttpUrl, field_validator


class CrawlType(StrEnum):
    SINGLE = "single"
    RECURSIVE = "recursive"
    SITEMAP = "sitemap"


class CrawlRequest(BaseModel):
    url: HttpUrl
    tenant_id: str = Field(min_length=1, max_length=160)
    user_id: str = Field(min_length=1, max_length=160)
    type: CrawlType = CrawlType.RECURSIVE
    max_depth: int = Field(default=2, ge=0, le=5)
    limit: int = Field(default=100, ge=1, le=500)
    include_patterns: list[str] = Field(default_factory=list, max_length=20)
    exclude_patterns: list[str] = Field(default_factory=list, max_length=20)
    respect_robots_txt: bool = True

    @field_validator("tenant_id", "user_id")
    @classmethod
    def no_control_characters(cls, value: str) -> str:
        value = value.strip()
        if any(ord(character) < 32 for character in value):
            raise ValueError("control characters are not allowed")
        return value


class Page(BaseModel):
    url: str
    title: str
    markdown: str
    checksum: str
    crawled_at: str
    depth: int = 0
    # The date the page itself states. Every page of a crawl shares one
    # crawled_at, so "the newest article" is unanswerable without this.
    published_at: str | None = None


class CrawlResult(BaseModel):
    success: bool
    job_id: str | None = None
    pages_count: int = 0
    skipped_count: int = 0
    active_keys: list[str] = Field(default_factory=list)
    error: str | None = None
