"""Date watermarks shared by monthly collectors (no dependency on runner caches)."""
from datetime import date, timedelta


def pending_start(completed, origin, overlap_days=7):
    if overlap_days < 0:
        raise ValueError('El solapamiento no puede ser negativo')
    origin = date.fromisoformat(origin)
    if not completed:
        return origin
    return max(origin, date.fromisoformat(completed[:10]) + timedelta(days=1 - overlap_days))
