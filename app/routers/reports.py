from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from datetime import date
from typing import Optional, List
from ..db import get_db
from ..security import get_current_user
from ..schemas import SummaryRow, UserHoursRow
from .. import models

router = APIRouter()

@router.get("/reports/timesheet_counts")
def timesheet_counts(status: str | None = None, db: Session = Depends(get_db)):
    """
    返回形如 [{"user_id": 1, "count": 3}, ...]
    status 为空统计总数；传 'submitted' 只统计待审核数量。
    """
    q = db.query(models.Timesheet.user_id, func.count().label("count"))
    if status:
        q = q.filter(models.Timesheet.status == status)
    rows = q.group_by(models.Timesheet.user_id).all()
    return [{"user_id": r[0], "count": int(r[1])} for r in rows]

@router.get('/reports/summary', response_model=List[SummaryRow])
def summary(
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
    group_by: str = Query('user', pattern='^(user|project)$'),
    from_date: str = Query(None),
    to_date: str = Query(None)
):
    group_col = 'user_id' if group_by == 'user' else 'project_id'
    where = []
    params = {}
    if from_date:
        where.append('work_date >= :from_date')
        params['from_date'] = from_date
    if to_date:
        where.append('work_date <= :to_date')
        params['to_date'] = to_date
    if user.role == 'employee':
        where.append('user_id = :uid')
        params['uid'] = user.id
    where_sql = ('WHERE ' + ' AND '.join(where)) if where else ''
    sql = f"""
        SELECT CAST({group_col} AS CHAR) as `key`, ROUND(SUM(hours),2) as total_hours
        FROM timesheets
        {where_sql}
        GROUP BY {group_col}
        ORDER BY total_hours DESC
        LIMIT 100
    """
    rows = db.execute(text(sql), params).mappings().all()
    return [SummaryRow(**r) for r in rows]

@router.get("/reports/approved_hours", response_model=List[UserHoursRow])
def approved_hours_report(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
):
    """
    汇总各用户在[from, to]区间内的已审核(approved)总工时。
    仅管理员/经理可用（若只限管理员，把判断改成 user.role != 'admin'）。
    """
    if user.role not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="无权限")

    q = (
        db.query(
            models.User.id.label("user_id"),
            models.User.name.label("name"),
            func.coalesce(func.sum(models.Timesheet.hours), 0).label("total_hours"),
        )
        .outerjoin(models.Timesheet, models.Timesheet.user_id == models.User.id)
        .group_by(models.User.id, models.User.name)
    )

    # 仅统计已审核
    q = q.filter(
        (models.Timesheet.id == None) | (models.Timesheet.status == "approved")
    )

    # 时间过滤（作用在 timesheets.work_date 上）
    if from_date:
        q = q.filter((models.Timesheet.id == None) | (models.Timesheet.work_date >= from_date))
    if to_date:
        q = q.filter((models.Timesheet.id == None) | (models.Timesheet.work_date <= to_date))

    # 只返回有记录/有用户；也可在前端过滤 0 的
    rows = q.all()

    # 转为 Pydantic
    return [
        UserHoursRow(
            user_id=row.user_id,
            name=row.name,
            total_hours=float(row.total_hours or 0),
        )
        for row in rows
    ]