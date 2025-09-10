# app/routers/projects.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.db import get_db
from app.models import Project, Timesheet, User
from app.security import require_admin, require_manager_or_admin, get_current_user

router = APIRouter(prefix="/projects", tags=["projects"])


# ---------- helpers ----------
def _row_to_dict(p: Project, count: int) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "description": getattr(p, "description", None),
        "status": getattr(p, "status", None),      # active / archived（若无该列则为 None）
        "timesheet_count": count,
    }


# ---------- 查询项目 ----------
@router.get("/", response_model=List[dict])
def list_projects(
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
    # 对管理员/经理，可通过 ?all=1 强制返回全部；普通员工该参数被忽略，始终只返回 active
    all: bool = Query(False, description="管理员/经理设置为 true 返回全部项目；员工忽略"),
):
    q = db.query(Project)

    # 员工：只显示 active
    if me.role not in ("manager", "admin"):
        if hasattr(Project, "status"):
            q = q.filter(Project.status == "active")
        projects = q.all()
    else:
        # 经理/管理员：all=True 返回全部；all=False 返回 active（方便前端下拉）
        if not all and hasattr(Project, "status"):
            q = q.filter(Project.status == "active")
        projects = q.all()

    # timesheet 计数
    result = []
    for p in projects:
        cnt = db.query(Timesheet).filter(Timesheet.project_id == p.id).count()
        result.append(_row_to_dict(p, cnt))
    return result


# ---------- 新建项目（仅 admin） ----------
@router.post("/")
def create_project(
    body: dict,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    name = (body.get("name") or "").strip()
    description = (body.get("description") or "").strip() or None
    if not name:
        raise HTTPException(400, "name required")

    exists = db.query(Project).filter(Project.name == name).first()
    if exists:
        raise HTTPException(400, "project name exists")

    p = Project(name=name, description=description)
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id, "name": p.name, "description": getattr(p, "description", None)}


# ---------- 删除项目（仅 admin；有工时禁止删除） ----------
@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Project not found")

    cnt = db.query(Timesheet).filter(Timesheet.project_id == project_id).count()
    if cnt > 0:
        raise HTTPException(400, "Project has timesheets, cannot delete")

    db.delete(p)
    db.commit()
    return {"msg": "Project deleted"}


# ---------- 项目详情（管理员/经理） ----------
@router.get("/{project_id}")
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager_or_admin),
):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Project not found")

    items = db.query(Timesheet).filter(Timesheet.project_id == project_id).all()

    def to_iso(d):
        try:
            return d.isoformat() if d else None
        except Exception:
            return str(d) if d is not None else None

    return {
        "id": p.id,
        "name": p.name,
        "description": getattr(p, "description", None),
        "status": getattr(p, "status", None),
        "timesheets": [
            {
                "id": t.id,
                "user_id": t.user_id,
                # 后端字段是 work_date；返回统一键名 "date" 以兼容已有静态页
                "date": to_iso(getattr(t, "work_date", None)),
                "hours": t.hours,
                "note": t.note,
                "status": t.status,
                "start_time": to_iso(getattr(t, "start_time", None)),
                "end_time": to_iso(getattr(t, "end_time", None)),
            }
            for t in items
        ],
    }


# ---------- 更新项目状态（仅 admin） ----------
class ProjectStatusIn(BaseModel):
    status: str  # 'active' | 'archived'

ALLOWED_STATUS = {"active", "archived"}

@router.patch("/{project_id}/status")
def set_project_status(
    project_id: int,
    body: ProjectStatusIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if body.status not in ALLOWED_STATUS:
        raise HTTPException(400, "invalid status")

    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Project not found")

    # 有 timesheet 时允许改为 archived；删除仍由外键限制
    setattr(p, "status", body.status)
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id, "status": getattr(p, "status", None)}

