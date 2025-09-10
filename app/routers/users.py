from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import and_

from app import models, schemas
from app.db import get_db
from app.security import get_current_user, require_admin, require_manager_or_admin, hash_password
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from ..models import User

router = APIRouter(prefix="/users", tags=["users"])

class UserStatusUpdate(BaseModel):
    status: str  # 'first_come' | 'pending' | 'approved' | 'rejected' | 'suspended'


ALLOWED_USER_STATUS = {"first_come", "pending", "approved", "rejected", "suspended"}

@router.patch("/{user_id}/status")
def set_user_status(user_id: int, payload: UserStatusUpdate,
                    db: Session = Depends(get_db),
                    _: dict = Depends(require_admin)):  # 仅 admin
    if payload.status not in ALLOWED_USER_STATUS:
        raise HTTPException(status_code=400, detail="invalid status")

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.status = payload.status
    user.is_active = (payload.status == "approved")
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "name": user.name,
        "mobile": user.mobile,
        "email": user.email,
        "role": user.role,
        "status": user.status,
        "is_active": user.is_active,
    }

class SelfUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None  # 可选，改密码用

@router.put("/me", response_model=schemas.UserOut)
def update_me(
    body: SelfUpdate,
    db: Session = Depends(get_db),
    me=Depends(get_current_user),
):
    user = db.get(models.User, me.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.name is not None:
        user.name = body.name
    if body.email is not None:
        user.email = body.email
    if body.password is not None:
        user.password_hash = hash_password(body.password)

    db.commit()
    db.refresh(user)
    return user

@router.get("/", response_model=List[schemas.UserOut])
def get_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager_or_admin),
):
    return db.query(models.User).all()

@router.get("/{user_id}", response_model=schemas.UserOut)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if current_user.id != user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")
    return user

@router.api_route("/{user_id}", methods=["PUT", "PATCH"], response_model=schemas.UserOut)
def update_user(
    user_id: int,
    body: schemas.UserUpdate,
    db: Session = Depends(get_db),
    actor = Depends(get_current_user),
):
    # 仅 admin 可以改别人信息（也可放宽到 manager）
    if actor.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # mobile 唯一性检查
    if body.mobile is not None:
        exists = (
            db.query(models.User)
            .filter(and_(models.User.mobile == body.mobile, models.User.id != user_id))
            .first()
        )
        if exists:
            raise HTTPException(status_code=400, detail="Mobile already registered")
        user.mobile = body.mobile

    if body.name is not None:
        user.name = body.name
    if body.email is not None:
        user.email = body.email
    if body.role is not None:
        user.role = body.role
    if body.department_id is not None:
        user.department_id = body.department_id
    if body.password:  # 只要传了就更新
        user.password_hash = hash_password(body.password)

    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()

# 审批接口路径修正：最终路径为 /users/{user_id}/approve|reject|suspend
@router.post("/{user_id}/approve")
def approve_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager_or_admin),
):
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    # 允许管理员从异常状态拉正
    user.status = "approved"
    user.is_active = True
    db.commit()
    return {"msg": "User approved"}

@router.post("/{user_id}/reject")
def reject_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager_or_admin),
):
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    user.status = "rejected"
    user.is_active = False
    db.commit()
    return {"msg": "User rejected"}

@router.post("/{user_id}/suspend")
def suspend_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager_or_admin),
):
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    user.status = "suspended"
    user.is_active = False
    db.commit()
    return {"msg": "User suspended"}
