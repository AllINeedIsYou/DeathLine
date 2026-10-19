from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo


def get_month_bounds(year: int, month: int, timezone_name: str):
    team_timezone = ZoneInfo(timezone_name)

    start = datetime(year, month, 1, tzinfo=team_timezone)

    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=team_timezone)
    else:
        end = datetime(year, month + 1, 1, tzinfo=team_timezone)

    start = start.astimezone(timezone.utc)
    end = end.astimezone(timezone.utc)

    return start, end


def get_month_points(year: int, month: int, timezone_name: str, now: datetime):
    if now.tzinfo is None or now.utcoffset() is None:
        raise ValueError('Provide the current time with a time zone')

    now = now.astimezone(timezone.utc)
    start, end = get_month_bounds(year, month, timezone_name)
    team_timezone = ZoneInfo(timezone_name)
    day = start.astimezone(team_timezone).date()
    points = []

    while True:
        day_start = datetime.combine(day, time.min, tzinfo=team_timezone).astimezone(timezone.utc)
        if day_start >= end or day_start > now:
            break

        next_day = day + timedelta(days=1)
        next_start = datetime.combine(next_day, time.min, tzinfo=team_timezone).astimezone(timezone.utc)
        if next_start > day_start:
            day_end = next_start - timedelta(microseconds=1)
            points.append(min(day_end, now))
        day = next_day

    return points
