from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models
from ..schemas import LoginRequest, TokenResponse, UserOut, UserCreate
from ..security import create_token, verify_password, hash_password
from ..security import get_current_user
from ..models import User as UserModel
from sqlalchemy.exc import IntegrityError

router = APIRouter()

@router.post('/login', response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.mobile == body.mobile).first()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=400, detail='Invalid credentials')
    token = create_token(user.id)
    return TokenResponse(token=token, user=UserOut.model_validate(user))

@router.post('/register', response_model=UserOut)
def register(body: UserCreate, db: Session = Depends(get_db)):
    mobile = body.mobile.strip()
    # 先查：更友好
    if db.query(models.User).filter(models.User.mobile == mobile).first():
        raise HTTPException(status_code=400, detail="Mobile already registered")

    user = models.User(
        name=body.name.strip(),
        mobile=mobile,
        password_hash=hash_password(body.password),
        role=body.role,
        department_id=body.department_id
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # 兜底：并发/竞态时仍可能撞唯一约束
        raise HTTPException(status_code=400, detail="Mobile already registered")
    db.refresh(user)
    return user

@router.get("/me", response_model=UserOut) 
def auth_me(user=Depends(get_current_user)):
    return user