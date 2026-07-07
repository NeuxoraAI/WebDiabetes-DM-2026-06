from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Message, Patient, User, UserRole
from app.schemas.message import InboxItem, MessageOut


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _to_out(m: Message, sender: User) -> MessageOut:
    return MessageOut(
        id=m.id,
        sender_id=m.sender_id,
        sender_name=sender.full_name,
        sender_role=sender.role.value,
        content=m.content,
        sent_at=m.sent_at,
        read_at=m.read_at,
        replied_at=m.replied_at,
    )


def _thread(db: Session, patient_id: int) -> list[tuple[Message, User]]:
    return db.execute(
        select(Message, User)
        .join(User, User.id == Message.sender_id)
        .where(Message.patient_id == patient_id)
        .order_by(Message.sent_at.asc())
    ).all()


def patient_send(db: Session, patient: Patient, user: User, content: str) -> MessageOut:
    if patient.doctor_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu médico aún no ha confirmado tu registro. "
            "Podrás enviar mensajes una vez que sea aceptado.",
        )
    message = Message(sender_id=user.id, patient_id=patient.id, content=content)
    db.add(message)
    db.commit()
    db.refresh(message)
    return _to_out(message, user)


def doctor_send(db: Session, patient: Patient, doctor_user: User, content: str) -> MessageOut:
    message = Message(sender_id=doctor_user.id, patient_id=patient.id, content=content)
    db.add(message)
    # La respuesta del médico marca como respondidos los mensajes pendientes del paciente
    pending = db.scalars(
        select(Message).where(
            Message.patient_id == patient.id,
            Message.sender_id != doctor_user.id,
            Message.replied_at.is_(None),
        )
    ).all()
    now = _now()
    for m in pending:
        m.replied_at = now
    db.commit()
    db.refresh(message)
    return _to_out(message, doctor_user)


def get_thread_for_patient(db: Session, patient: Patient) -> list[MessageOut]:
    rows = _thread(db, patient.id)
    # Al abrir el hilo, el paciente marca como leídos los mensajes del médico
    now = _now()
    changed = False
    for m, sender in rows:
        if sender.role == UserRole.doctor and m.read_at is None:
            m.read_at = now
            changed = True
    if changed:
        db.commit()
    return [_to_out(m, s) for m, s in rows]


def get_thread_for_doctor(db: Session, patient: Patient, doctor_user: User) -> list[MessageOut]:
    rows = _thread(db, patient.id)
    now = _now()
    changed = False
    for m, sender in rows:
        if sender.role == UserRole.patient and m.read_at is None:
            m.read_at = now
            changed = True
    if changed:
        db.commit()
    return [_to_out(m, s) for m, s in rows]


def unread_count_for_patient(db: Session, patient: Patient) -> int:
    """Mensajes del médico que el paciente no ha leído."""
    return db.scalar(
        select(func.count(Message.id))
        .join(User, User.id == Message.sender_id)
        .where(
            Message.patient_id == patient.id,
            User.role == UserRole.doctor,
            Message.read_at.is_(None),
        )
    ) or 0


def unanswered_count(db: Session, patient_id: int) -> int:
    """Mensajes del paciente sin respuesta del médico."""
    return db.scalar(
        select(func.count(Message.id))
        .join(User, User.id == Message.sender_id)
        .where(
            Message.patient_id == patient_id,
            User.role == UserRole.patient,
            Message.replied_at.is_(None),
        )
    ) or 0


def doctor_inbox(db: Session, doctor_user: User) -> list[InboxItem]:
    """Mensajes sin responder de todos los pacientes del doctor, más antiguos primero."""
    rows = db.execute(
        select(Message, Patient, User)
        .join(Patient, Patient.id == Message.patient_id)
        .join(User, User.id == Patient.user_id)
        .where(
            Patient.doctor_id == doctor_user.id,
            Message.sender_id == Patient.user_id,  # enviados por el propio paciente
            Message.replied_at.is_(None),
        )
        .order_by(Message.sent_at.asc())
    ).all()
    return [
        InboxItem(
            message_id=m.id,
            patient_id=p.id,
            patient_name=u.full_name,
            content=m.content,
            sent_at=m.sent_at,
        )
        for m, p, u in rows
    ]
