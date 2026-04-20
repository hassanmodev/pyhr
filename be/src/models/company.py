from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .department import Department
    from .employee import Employee


class Company(Base, TimestampMixin):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

    departments: Mapped[list[Department]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )
    employees: Mapped[list[Employee]] = relationship(back_populates="company")

    def __repr__(self) -> str:
        return f"<Company id={self.id} name={self.name!r}>"
