from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database.session import get_db, checkpoint_db
from backend.app.models.user import User
from backend.app.models.wallet import WalletTransaction
from backend.app.dependencies.auth import get_current_user
from backend.app.services.wallet_service import credit_wallet, debit_wallet

router = APIRouter(prefix="/wallet", tags=["Wallet & Payments"])


class WalletTopupPayload(BaseModel):
    amount: float = Field(..., gt=0, description="Amount to add in INR")
    payment_method: Optional[str] = "UPI / Card"
    reference_id: Optional[str] = None


@router.get("/")
@router.get("/summary")
async def get_wallet_summary(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the user's current wallet balance and comprehensive financial summary.
    """
    db.refresh(user)
    transactions = db.query(WalletTransaction).filter(
        WalletTransaction.user_id == user.id
    ).order_by(desc(WalletTransaction.created_at)).all()

    total_credits = sum((tx.amount for tx in transactions if tx.transaction_type == "CREDIT"), Decimal("0.00"))
    total_debits = sum((tx.amount for tx in transactions if tx.transaction_type == "DEBIT"), Decimal("0.00"))
    total_refunds = sum(
        (tx.amount for tx in transactions if tx.transaction_type == "CREDIT" and "REFUND" in tx.source),
        Decimal("0.00")
    )

    return {
        "success": True,
        "wallet_balance": float(user.wallet_balance or 0.0),
        "currency": "INR",
        "currency_symbol": "₹",
        "total_credits": float(total_credits),
        "total_debits": float(total_debits),
        "total_refunds_received": float(total_refunds),
        "transactions_count": len(transactions),
        "transactions": [tx.to_dict() for tx in transactions[:50]]
    }


@router.get("/transactions")
async def get_wallet_transactions(
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns paginated list of user's wallet transactions.
    """
    query = db.query(WalletTransaction).filter(
        WalletTransaction.user_id == user.id
    ).order_by(desc(WalletTransaction.created_at))

    total = query.count()
    txs = query.offset(offset).limit(limit).all()

    return {
        "success": True,
        "total": total,
        "wallet_balance": float(user.wallet_balance or 0.0),
        "transactions": [tx.to_dict() for tx in txs]
    }


@router.post("/topup")
async def topup_wallet(
    payload: WalletTopupPayload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add funds into user's wallet balance.
    """
    if payload.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Top-up amount must be greater than zero."
        )

    if payload.amount > 500000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Single top-up limit cannot exceed ₹5,00,000."
        )

    tx = credit_wallet(
        db=db,
        user=user,
        amount=payload.amount,
        source="TOPUP",
        description=f"Wallet top-up via {payload.payment_method or 'Online Payment'}",
        booking=None,
        reference_id=payload.reference_id
    )

    db.commit()
    db.refresh(user)
    checkpoint_db()

    return {
        "success": True,
        "message": f"₹{payload.amount:,.2f} added to your wallet successfully!",
        "wallet_balance": float(user.wallet_balance or 0.0),
        "transaction": tx.to_dict() if tx else None
    }
