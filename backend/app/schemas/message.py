from datetime import datetime

from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class MessageOut(BaseModel):
    id: int
    sender_id: int
    sender_name: str
    sender_role: str
    content: str
    sent_at: datetime
    read_at: datetime | None
    replied_at: datetime | None


class InboxItem(BaseModel):
    message_id: int
    patient_id: int
    patient_name: str
    content: str
    sent_at: datetime
