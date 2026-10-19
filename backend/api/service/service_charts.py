from datetime import datetime, timezone

from fastapi import HTTPException

from DataBase.database import SessionDep
from DataBase.models import Tasks, Teams, TeamMembers
from api.shemas import TaskHistoryPointSchema, TaskHistoryResponseSchema
from api.time_utils import get_month_bounds, get_month_points

from .service_task_history import get_task_states_at, get_team_task_events
from .service_statistics import calculate_task_statistics


def calculate_history_point(events, at: datetime):
    states = get_task_states_at(events, at)
    return calculate_task_statistics(states.values(), at=at)


def _build_history_point(tasks, events, at: datetime, user_id: int | None):
    existing_tasks = [task for task in tasks if task.created_at <= at]
    recorded_states = get_task_states_at(events, at)
    states = {}

    for task in existing_tasks:
        state = recorded_states.get(task.id)
        if task.updated_at <= at and (state is None or task.updated_at > state.occurred_at):
            state = task
        if state is not None:
            states[task.id] = state

    if user_id is not None:
        if len(states) != len(existing_tasks):
            return TaskHistoryPointSchema(at=at, created=None, completed=None, overdue=None)
        member_states = [state for state in states.values() if state.user_id == user_id]
        statistics = calculate_task_statistics(member_states, at=at)
        return TaskHistoryPointSchema(
            at=at,
            created=statistics.total,
            completed=statistics.completed,
            overdue=statistics.overdue
        )

    completed = sum(
        task.completed_at is not None and task.completed_at <= at
        for task in existing_tasks
    )
    unknown_unfinished = any(
        task.id not in states and (task.completed_at is None or task.completed_at > at)
        for task in existing_tasks
    )
    statistics = calculate_task_statistics(states.values(), at=at)
    return TaskHistoryPointSchema(
        at=at,
        created=len(existing_tasks),
        completed=completed,
        overdue=None if unknown_unfinished else statistics.overdue
    )


def _get_history_team(session: SessionDep, team_id: int):
    team = session.query(Teams).filter(Teams.id == team_id).first()
    if team is None:
        raise HTTPException(status_code=404, detail='Team not found')
    return team


def _build_task_history(session: SessionDep, team: Teams, year: int, month: int, member: TeamMembers | None = None):
    now = datetime.now(timezone.utc)
    moments = get_month_points(year, month, team.timezone, now)
    points = []

    if moments:
        _, end = get_month_bounds(year, month, team.timezone)
        tasks = session.query(Tasks).filter(
            Tasks.team_id == team.id,
            Tasks.created_at <= moments[-1]
        ).all()
        events = get_team_task_events(session, team.id, end)
        points = [
            _build_history_point(tasks, events, at, member.user_id if member is not None else None)
            for at in moments
        ]

    return TaskHistoryResponseSchema(
        team_id=team.id,
        member_id=member.id if member is not None else None,
        year=year,
        month=month,
        timezone=team.timezone,
        as_of=now,
        history_complete=all(
            point.created is not None and point.completed is not None and point.overdue is not None
            for point in points
        ),
        points=points
    )


def get_team_task_history(session: SessionDep, team_id: int, year: int, month: int):
    team = _get_history_team(session, team_id)
    return _build_task_history(session, team, year, month)


def get_member_task_history(session: SessionDep, team_id: int, employee_member_id: int, year: int, month: int):
    team = _get_history_team(session, team_id)
    member = session.query(TeamMembers).filter(
        TeamMembers.team_id == team_id,
        TeamMembers.id == employee_member_id
    ).first()
    if member is None:
        raise HTTPException(status_code=404, detail='Member not found')
    return _build_task_history(session, team, year, month, member)
