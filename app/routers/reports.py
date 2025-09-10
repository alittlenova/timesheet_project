# app/routers/reports.py
from datetime import date, datetime, time, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from .. import models
from ..db import get_db

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/approved_hours")
def approved_hours_report(
    from_date: date | None = None,   # 可选：起始“日期”
    to_date:   date | None = None,   # 可选：结束“日期”（含当天）
    db: Session = Depends(get_db),
):
    # 把 date 转成可比较的 datetime 区间
    dt_from = datetime.combine(from_date, time.min) if from_date else None
    # 右开区间：第二天 00:00
    dt_to   = datetime.combine(to_date + timedelta(days=1), time.min) if to_date else None

    # 把所有筛选条件都放进 JOIN 条件里，这样仍然保持 OUTER JOIN 语义
    join_cond = and_(
        models.Timesheet.user_id == models.User.id,
        models.Timesheet.status == "approved",
    )
    if dt_from:
        join_cond = and_(join_cond, models.Timesheet.created_at >= dt_from)
    if dt_to:
        join_cond = and_(join_cond, models.Timesheet.created_at < dt_to)

    q = (
        db.query(
            models.User.id.label("user_id"),
            models.User.name.label("name"),
            func.coalesce(func.sum(models.Timesheet.hours), 0).label("hours"),
        )
        .outerjoin(models.Timesheet, join_cond)
        .group_by(models.User.id, models.User.name)
        .order_by(models.User.id)
    )

    rows = q.all()
    return [
        {"user_id": r.user_id, "name": r.name, "hours": float(r.hours or 0)}
        for r in rows
    ]
