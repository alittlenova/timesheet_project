# app/routers/departments.py
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List

from app.db import get_db
from app.models import Department, User
from app.security import require_admin, require_manager_or_admin


router = APIRouter(prefix="/departments", tags=["departments"])


# 列出所有部门
@router.get("/", response_model=List[dict])
def list_departments(db: Session = Depends(get_db), _: User = Depends(require_manager_or_admin)):
    depts = db.query(Department).all()
    return [{"id": d.id, "name": d.name, "parent_id": d.parent_id} for d in depts]


# 创建新部门
@router.post("/")
def create_department(body: dict, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(400, "name required")
    dept = Department(name=name)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return {"id": dept.id, "name": dept.name}


# 删除部门
@router.delete("/{dept_id}")
def delete_department(dept_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    dept = db.get(Department, dept_id)
    if not dept:
        raise HTTPException(404, "Department not found")
    db.delete(dept)
    db.commit()
    return {"msg": "Department deleted"}


# 获取部门详情（含成员）
@router.get("/{dept_id}")
def get_department(dept_id: int, db: Session = Depends(get_db), _: User = Depends(require_manager_or_admin)):
    dept = db.get(Department, dept_id)
    if not dept:
        raise HTTPException(404, "Department not found")
    return {
        "id": dept.id,
        "name": dept.name,
        "users": [{"id": u.id, "name": u.name, "mobile": u.mobile, "email": u.email,
                   "role": u.role, "status": u.status} for u in dept.users]
    }


# 添加成员
@router.post("/{dept_id}/members")
def add_members(
    dept_id: int,
    body: dict = Body(...),                   # ✅ 显式指定 Body
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    ids = body.get("user_ids", [])
    dept = db.get(Department, dept_id)
    if not dept:
        raise HTTPException(404, "Department not found")
    for uid in ids:
        user = db.get(User, uid)
        if user and user not in dept.users:
            dept.users.append(user)
    db.commit()
    return {"msg": "Members added"}



# 移除成员
@router.delete("/{dept_id}/members")
def remove_members(
    dept_id: int,
    body: dict = Body(...),                   # ✅ 显式指定 Body
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    ids = body.get("user_ids", [])
    dept = db.get(Department, dept_id)
    if not dept:
        raise HTTPException(404, "Department not found")
    for uid in ids:
        user = db.get(User, uid)
        if user and user in dept.users:
            dept.users.remove(user)
    db.commit()
    return {"msg": "Members removed"}

@router.post("/{dept_id}/add_user")
def add_user_alias(dept_id: int, body: dict,
                   db: Session = Depends(get_db),
                   _: User = Depends(require_admin)):
    """
    兼容旧地址：POST /departments/{id}/add_user
    body: { "user_id": 123 }
    """
    uid = body.get("user_id")
    if not uid:
        raise HTTPException(400, "user_id required")
    # 复用真正的添加逻辑
    return add_members(dept_id, {"user_ids": [uid]}, db, _)

@router.post("/{dept_id}/users/add")
def add_users_alias(dept_id: int, body: dict,
                    db: Session = Depends(get_db),
                    _: User = Depends(require_admin)):
    """
    兼容旧地址：POST /departments/{id}/users/add
    body: { "user_id": 1 } 或 { "user_ids": [1,2] }
    """
    ids = body.get("user_ids")
    if not ids and body.get("user_id"):
        ids = [body["user_id"]]
    if not ids:
        raise HTTPException(400, "user_id or user_ids required")
    return add_members(dept_id, {"user_ids": ids}, db, _)