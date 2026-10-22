from datetime import datetime
from sqlalchemy import Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.database.base import Base


class FavoriteShip(Base):
    __tablename__ = "user_favorites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("accounts_user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cruise_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("crosses_cross.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "cruise_id", name="uq_user_favorite_cruise"),
    )

    # Relationships
    user = relationship("User", back_populates="favorites")
    cruise = relationship("Cross")
