# app/services/users.py
from sqlalchemy.orm import Session
from app.models import User, Department

DEFAULT_DEPT_ID = 1  # General 部门 ID

def create_user_with_default_department(db: Session, **user_data) -> User:
    """
    创建用户；若存在 id=1 的 General 部门，则将用户加入该部门。
    """
    user = User(**user_data)
    db.add(user)
    db.flush()  # 让 user.id 可用

    general = db.get(Department, DEFAULT_DEPT_ID)
    if general:
        user.departments.append(general)

    db.commit()
    db.refresh(user)
    return user
