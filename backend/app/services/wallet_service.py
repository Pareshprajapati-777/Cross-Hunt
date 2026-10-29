from datetime import datetime
from decimal import Decimal
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from backend.app.models.user import User
from backend.app.models.booking import Booking, PlatformNotification
from backend.app.models.wallet import WalletTransaction


def credit_wallet(
    db: Session,
    user: User,
    amount: Decimal | float | int,
    source: str,
    description: str,
    booking: Optional[Booking] = None,
    reference_id: Optional[str] = None
) -> Optional[WalletTransaction]:
    """
    Credits money to the user's wallet, records a WalletTransaction,
    and sends an in-app platform notification.
    """
    dec_amount = Decimal(str(round(float(amount), 2)))
    if dec_amount <= Decimal("0.00"):
        return None

    current_balance = Decimal(str(round(float(user.wallet_balance or 0.0), 2)))
    new_balance = current_balance + dec_amount
    user.wallet_balance = new_balance

    tx = WalletTransaction(
        user_id=user.id,
        booking_id=booking.id if booking else None,
        booking_code=booking.booking_id if booking else None,
        transaction_type="CREDIT",
        amount=dec_amount,
        balance_after=new_balance,
        source=source,
        description=description,
        reference_id=reference_id or f"TXN-CR-{int(datetime.utcnow().timestamp())}",
        status="COMPLETED",
        created_at=datetime.utcnow()
    )
    db.add(tx)

    # In-app notification for the user
    try:
        notif = PlatformNotification(
            title=f"₹{float(dec_amount):,.2f} Added to Wallet",
            message=f"₹{float(dec_amount):,.2f} has been credited to your Cruise-Hunt Wallet. {description}. Available balance: ₹{float(new_balance):,.2f}.",
            notification_type="WALLET_CREDIT",
            target_audience="SINGLE_USER",
            target_user_id=user.id,
            action_link="/dashboard?tab=wallet",
            sender_name="Cruise-Hunt Wallet System",
            is_read=False,
            created_at=datetime.utcnow()
        )
        db.add(notif)
    except Exception:
        pass

    return tx


def debit_wallet(
    db: Session,
    user: User,
    amount: Decimal | float | int,
    source: str,
    description: str,
    booking: Optional[Booking] = None,
    reference_id: Optional[str] = None
) -> WalletTransaction:
    """
    Debits money from the user's wallet if sufficient balance is available.
    """
    dec_amount = Decimal(str(round(float(amount), 2)))
    if dec_amount <= Decimal("0.00"):
        raise ValueError("Debit amount must be greater than zero.")

    current_balance = Decimal(str(round(float(user.wallet_balance or 0.0), 2)))
    if current_balance < dec_amount:
        raise ValueError(
            f"Insufficient wallet balance (Available: ₹{float(current_balance):,.2f}, Required: ₹{float(dec_amount):,.2f})"
        )

    new_balance = current_balance - dec_amount
    user.wallet_balance = new_balance

    tx = WalletTransaction(
        user_id=user.id,
        booking_id=booking.id if booking else None,
        booking_code=booking.booking_id if booking else None,
        transaction_type="DEBIT",
        amount=dec_amount,
        balance_after=new_balance,
        source=source,
        description=description,
        reference_id=reference_id or f"TXN-DB-{int(datetime.utcnow().timestamp())}",
        status="COMPLETED",
        created_at=datetime.utcnow()
    )
    db.add(tx)

    try:
        notif = PlatformNotification(
            title=f"₹{float(dec_amount):,.2f} Debited from Wallet",
            message=f"₹{float(dec_amount):,.2f} was deducted from your wallet for {description}. Remaining balance: ₹{float(new_balance):,.2f}.",
            notification_type="WALLET_DEBIT",
            target_audience="SINGLE_USER",
            target_user_id=user.id,
            action_link="/dashboard?tab=wallet",
            sender_name="Cruise-Hunt Wallet System",
            is_read=False,
            created_at=datetime.utcnow()
        )
        db.add(notif)
    except Exception:
        pass

    return tx


def refund_booking_to_wallet(
    db: Session,
    booking: Booking,
    reason: str = "Booking cancellation",
    refund_amount: Optional[Decimal | float | int] = None,
    source: str = "CANCELLATION_REFUND"
) -> Tuple[Decimal, Optional[WalletTransaction]]:
    """
    Automatically refunds the booking payment directly into the customer's wallet.
    Calculates remaining refundable amount, credits user's wallet, and updates booking.
    """
    total_price = Decimal(str(booking.total_price or 0.0))
    already_refunded = Decimal(str(booking.refund_amount or 0.0))
    remaining_refundable = max(Decimal("0.00"), total_price - already_refunded)

    if refund_amount is not None:
        amount_to_refund = min(remaining_refundable, Decimal(str(round(float(refund_amount), 2))))
    else:
        amount_to_refund = remaining_refundable

    if amount_to_refund <= Decimal("0.00"):
        return Decimal("0.00"), None

    booking_user = booking.user
    if not booking_user:
        booking_user = db.query(User).filter(User.id == booking.user_id).first()

    tx = None
    if booking_user:
        desc = f"Instant refund for cancelled ride #{booking.booking_id} ({booking.cabin_type or 'Booking'}). Reason: {reason}"
        tx = credit_wallet(
            db=db,
            user=booking_user,
            amount=amount_to_refund,
            source=source,
            description=desc,
            booking=booking,
            reference_id=f"REF-{booking.booking_id}"
        )

    # Update booking refund bookkeeping
    booking.refund_amount = already_refunded + amount_to_refund
    booking.refund_date = datetime.utcnow()
    booking.refund_reason = reason

    return amount_to_refund, tx
