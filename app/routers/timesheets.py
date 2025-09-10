# app/routers/timesheets.py
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..db import get_db
from .. import models
from ..schemas import TimesheetCreate, TimesheetOut, TimesheetPage
from ..security import get_current_user

router = APIRouter()

# ========== 新增 ==========
@router.post("/timesheets", response_model=TimesheetOut)
def create_timesheet(
    body: TimesheetCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # 直接使用前端传入的小时数；做合理性校验（可按需调整上限）
    hours = float(body.hours or 0)
    if hours <= 0 or hours > 1000:
        raise HTTPException(status_code=400, detail="工时数必须在 0~1000 之间")

    ts = models.Timesheet(
        user_id=user.id,
        project_id=body.project_id,

        # 新字段（全部字符串，可为 None/空串）
        submit_time=body.submit_time,
        fill_id=body.fill_id,
        answer_time=body.answer_time,
        nickname=body.nickname,
        weekly_summary=body.weekly_summary,
        project_group_filter=body.project_group_filter,
        director_filter=body.director_filter,
        week_no=body.week_no,
        pm_reduce_hours=body.pm_reduce_hours,
        identified_by=body.identified_by,
        reduce_desc=body.reduce_desc,
        director_reduce_hours=body.director_reduce_hours,
        group_reduce_hours=body.group_reduce_hours,
        reason_desc=body.reason_desc,

        # 数值/杂项
        hours=hours,
        overtime=bool(body.overtime) if body.overtime is not None else False,
        note=body.note,
        attach_url=body.attach_url,
        geo_lat=body.geo_lat,
        geo_lng=body.geo_lng,

        status="submitted",
    )
    db.add(ts)
    db.commit()
    db.refresh(ts)
    return ts


# ========== 更新 ==========
@router.put("/timesheets/{ts_id}", response_model=TimesheetOut)
def update_timesheet(
    ts_id: int,
    body: TimesheetCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    ts = db.get(models.Timesheet, ts_id)
    if not ts:
        raise HTTPException(status_code=404, detail="Not found")

    # 权限与可编辑状态限制：员工只能改自己的，且仅能改 submitted
    if user.role == "employee":
        if ts.user_id != user.id:
            raise HTTPException(status_code=403, detail="No permission")
        if ts.status != "submitted":
            raise HTTPException(status_code=403, detail="非待审核记录不可修改")

    hours = float(body.hours or 0)
    if hours <= 0 or hours > 1000:
        raise HTTPException(status_code=400, detail="工时数必须在 0~1000 之间")

    # 可更新字段
    ts.project_id = body.project_id

    ts.submit_time = body.submit_time
    ts.fill_id = body.fill_id
    ts.answer_time = body.answer_time
    ts.nickname = body.nickname
    ts.weekly_summary = body.weekly_summary
    ts.project_group_filter = body.project_group_filter
    ts.director_filter = body.director_filter
    ts.week_no = body.week_no
    ts.pm_reduce_hours = body.pm_reduce_hours
    ts.identified_by = body.identified_by
    ts.reduce_desc = body.reduce_desc
    ts.director_reduce_hours = body.director_reduce_hours
    ts.group_reduce_hours = body.group_reduce_hours
    ts.reason_desc = body.reason_desc

    ts.hours = hours
    ts.overtime = bool(body.overtime) if body.overtime is not None else False
    ts.note = body.note
    ts.attach_url = body.attach_url
    ts.geo_lat = body.geo_lat
    ts.geo_lng = body.geo_lng

    # 员工修改后，状态回到待审核
    if user.role == "employee":
        ts.status = "submitted"

    db.commit()
    db.refresh(ts)
    return ts


# ========== 列表 ==========
@router.get("/timesheets", response_model=TimesheetPage)
def list_timesheets(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    user_id: Optional[int] = None,
    project_id: Optional[int] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=200),
):
    q = db.query(models.Timesheet)

    # 权限过滤：员工仅看自己的；管理/管理员可选 user_id，不填则看全部
    if user.role == "employee":
        q = q.filter(models.Timesheet.user_id == user.id)
    elif user.role in ["manager", "admin"] and user_id:
        q = q.filter(models.Timesheet.user_id == user_id)

    if project_id:
        q = q.filter(models.Timesheet.project_id == project_id)
    if status:
        q = q.filter(models.Timesheet.status == status)

    total = q.count()

    # 新排序：按创建时间倒序，其次按 id 倒序
    q = q.order_by(
        models.Timesheet.created_at.desc(),
        models.Timesheet.id.desc(),
    )

    items = q.offset((page - 1) * size).limit(size).all()
    return {"items": items, "page": page, "size": size, "total": total}


# ========== 删除 ==========
@router.delete("/timesheets/{ts_id}")
def delete_timesheet(
    ts_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    ts = db.get(models.Timesheet, ts_id)
    if not ts:
        raise HTTPException(status_code=404, detail="Not found")

    # 员工只能删自己的
    if user.role == "employee" and ts.user_id != user.id:
        raise HTTPException(status_code=403, detail="No permission")

    db.delete(ts)
    db.commit()
    return {"ok": True}


# ========== 审批 ==========
@router.post("/timesheets/{ts_id}/approve")
def approve_timesheet(
    ts_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if user.role not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="无权限")
    ts = db.get(models.Timesheet, ts_id)
    if not ts:
        raise HTTPException(status_code=404, detail="未找到记录")
    ts.status = "approved"
    db.commit()
    return {"ok": True}


@router.post("/timesheets/{ts_id}/reject")
def reject_timesheet(
    ts_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if user.role not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="无权限")
    ts = db.get(models.Timesheet, ts_id)
    if not ts:
        raise HTTPException(status_code=404, detail="未找到记录")
    ts.status = "rejected"
    db.commit()
    return {"ok": True}



# ========== 统计 ==========
@router.get("/timesheets/counts")
def timesheet_counts(
    status: Optional[str] = Query(None, description="submitted/approved/rejected"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    返回每个用户的记录数量（可按状态过滤）：
    [
      {"user_id": 1, "count": 5},
      {"user_id": 2, "count": 0},
      ...
    ]
    员工：只能看自己的。
    经理/管理员：看全员。
    """
    q = db.query(
        models.Timesheet.user_id, func.count(models.Timesheet.id).label("count")
    )
    if status:
        q = q.filter(models.Timesheet.status == status)

    if user.role == "employee":
        q = q.filter(models.Timesheet.user_id == user.id)

    q = q.group_by(models.Timesheet.user_id)
    rows = q.all()
    return [{"user_id": uid, "count": cnt} for (uid, cnt) in rows]


# 兼容旧路径
@router.get("/timesheet_counts")
def timesheet_counts_alias(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return timesheet_counts(status=status, db=db, user=user)


# ========== 批量通过 ==========
@router.post("/timesheets/bulk_approve")
def bulk_approve_timesheets(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    user_id: Optional[int] = Query(None, description="仅审批该用户的待审核；不传则审批全员"),
):
    """
    批量将 submitted -> approved。
    - 仅 manager / admin 可用
    - user_id 为空：全员所有待审核记录
      user_id 有值：仅该用户的待审核记录
    返回 {"approved": 受影响条数}
    """
    if user.role not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="无权限")

    q = db.query(models.Timesheet).filter(models.Timesheet.status == "submitted")
    if user_id:
        q = q.filter(models.Timesheet.user_id == user_id)

    affected = q.update({models.Timesheet.status: "approved"}, synchronize_session=False)
    db.commit()
    return {"approved": int(affected)}
