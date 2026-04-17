from __future__ import annotations

from pydantic import BaseModel, Field


class AnalyzeProductCardImageInput(BaseModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    size: int = Field(ge=0)
    src: str | None = None
    alt: str | None = None
    caption: str | None = None


class AnalyzeProductCardPayload(BaseModel):
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    images: list[AnalyzeProductCardImageInput] = Field(min_length=1, max_length=12)


class AnalyzeProductCardRankedImage(BaseModel):
    id: str
    score: int
    reason: str


class AnalyzeProductCardResult(BaseModel):
    overallScore: int
    rankedImages: list[AnalyzeProductCardRankedImage]
    suggestedDescription: str
    suggestedOverallScore: int
    suggestedRankedImages: list[AnalyzeProductCardRankedImage]
    recommendations: list[str]
