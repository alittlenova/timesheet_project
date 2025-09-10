import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from .config import settings
from .db import get_db
from . import models
from .models import User

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
security = HTTPBearer()

def create_token(user_id: int) -> str:
    exp = datetime.utcnow() + timedelta(minutes=settings.jwt_expires_minutes)
    payload = {'sub': str(user_id), 'exp': exp}
    return jwt.encode(payload, settings.jwt_secret, algorithm='HS256')

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> models.User:
    token = creds.credentials
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=['HS256'])
        user_id = int(payload.get('sub'))
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.get(models.User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail='User inactive or not found')
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

def require_manager_or_admin(current=Depends(get_current_user)):
    if current.role not in ("manager", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager or admin access required"
        )
    return current