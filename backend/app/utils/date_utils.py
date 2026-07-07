from datetime import datetime, timedelta, timezone

QUESTIONNAIRE_PERIOD_DAYS = 30


def _as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def days_since(dt: datetime) -> int:
    return (datetime.now(timezone.utc) - _as_utc(dt)).days


def next_questionnaire_date(answered_at: datetime) -> datetime:
    return _as_utc(answered_at) + timedelta(days=QUESTIONNAIRE_PERIOD_DAYS)
