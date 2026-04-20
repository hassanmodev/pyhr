from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .company import Company
    from .employee import Employee


class Department(Base, TimestampMixin):
    __tablename__ = "departments"
    __table_args__ = (UniqueConstraint("name", "company_id", name="uq_department_name_company"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )

    company: Mapped[Company] = relationship(back_populates="departments")
    employees: Mapped[list[Employee]] = relationship(back_populates="department")

    def __repr__(self) -> str:
        return f"<Department id={self.id} name={self.name!r} company_id={self.company_id}>"
