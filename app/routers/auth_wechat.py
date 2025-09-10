from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, field_validator, Field, AliasChoices, ConfigDict
from sqlalchemy.orm import Session
import httpx, logging, re
from typing import Optional
from sqlalchemy import select, exists, or_, and_

from ..config import settings
from ..security import create_token
from ..db import SessionLocal, get_db
from ..models import User, Department


logger = logging.getLogger(__name__)
router = APIRouter()

# 如需强制开发模式（永远使用假 openid），设为 True
FORCE_WECHAT_DEV = False
DEFAULT_DEPT_ID = 1

# ---------- 请求体 ----------

class WechatLoginIn(BaseModel):
    code: str
    dev_openid: Optional[str] = None  # 开发模式下的稳定 openid（前端持久化后传上来）

class WechatRegisterIn(BaseModel):
    user_id: int
    name: str
    # 统一使用 mobile；兼容历史字段名 "phone"
    mobile: str = Field(..., validation_alias=AliasChoices("mobile", "phone"))

    # 允许用别名字段进行赋值（配合上面的 validation_alias）
    model_config = ConfigDict(populate_by_name=True)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str):
        if not v or not v.strip():
            raise ValueError("name required")
        return v.strip()

    @field_validator("mobile")
    @classmethod
    def mobile_is_valid(cls, v: str):
        v = v.strip()
        # 可根据需要替换为更严格的手机号校验
        if not re.fullmatch(r"[0-9+\-()\s]{6,20}", v):
            raise ValueError("invalid mobile")
        return v

# ---------- WeChat 交互 ----------

async def code2session_real(code: str) -> dict:
    """真实调用微信 jscode2session（不在此处 raise，外层决定是否回退）"""
    url = "https://api.weixin.qq.com/sns/jscode2session"
    params = {
        "appid": settings.wechat_appid,
        "secret": settings.wechat_secret,
        "js_code": code,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=5.0) as client:
        r = await client.get(url, params=params)
    data = r.json()
    logger.warning("code2session resp: %s", data)
    return data

async def code2session_wrapper(body: WechatLoginIn) -> dict:
    """统一入口：真实优先 + 失败回退；支持强制开发模式"""
    use_real = (not FORCE_WECHAT_DEV) and bool((settings.wechat_appid or "").strip() and (settings.wechat_secret or "").strip())
    if use_real:
        try:
            data = await code2session_real(body.code)
            if data.get("errcode"):
                # 微信返回错误，回退到开发 openid（不抛 400，便于联调）
                logger.warning("REAL code2session error: %s - fallback to DEV", data)
                if body.dev_openid:
                    return {"openid": body.dev_openid, "session_key": "dev"}
                return {"openid": f"devopenid_{hash(body.code) & 0xffffffff:08x}", "session_key": "dev"}
            return data
        except Exception as e:
            logger.warning("REAL code2session exception: %s - fallback to DEV", e)
            if body.dev_openid:
                return {"openid": body.dev_openid, "session_key": "dev"}
            return {"openid": f"devopenid_{hash(body.code) & 0xffffffff:08x}", "session_key": "dev"}

    # 开发模式（或未配置 appid/secret）：使用 dev_openid 或 hash(code)
    logger.warning("wechat_login: USING DEV MODE")
    if body.dev_openid:
        return {"openid": body.dev_openid, "session_key": "dev"}
    return {"openid": f"devopenid_{hash(body.code) & 0xffffffff:08x}", "session_key": "dev"}

# ---------- DB 工具 ----------

def get_or_create_user_by_openid(db: Session, openid: str) -> User:
    u = db.query(User).filter(User.wechat_openid == openid).one_or_none()
    if u:
        return u

    # 初次创建：占位名、默认 first_come、不激活
    u = User(
        name="WeChatUser",
        role="employee",            # 微信注册固定 employee
        is_active=False,            # 注册/审批前不激活
        wechat_openid=openid,
        auth_provider="wechat",
        status="first_come",
    )
    db.add(u)
    db.flush()  # 先拿到 u.id，便于建立多对多关系

    # 将用户加入默认部门（若存在）
    try:
        general = db.get(Department, DEFAULT_DEPT_ID)
        if general is not None:
            # 依赖于 models.py 中已定义的多对多关系：
            # User.departments <-> Department.users (secondary=user_departments)
            u.departments.append(general)
    except Exception:
        # 不让部门问题影响登录创建流程（比如还没建表、或没有该部门）
        pass

    db.commit()
    db.refresh(u)
    return u


def _phone_in_use(db: Session, phone: str, exclude_user_id: int | None = None) -> bool:
    """
    历史命名保留：检查“手机号是否被占用”。
    现在统一用 users.mobile 列。
    """
    cond = User.mobile == phone
    if exclude_user_id:
        cond = and_(cond, User.id != exclude_user_id)
    stmt = select(exists().where(cond))
    return db.execute(stmt).scalar()

# ---------- 路由 ----------

@router.post("/auth/wechat/login")
async def wechat_login(body: WechatLoginIn):
    if not body.code:
        raise HTTPException(400, "code required")

    sess = await code2session_wrapper(body)
    openid = sess.get("openid")
    if not openid:
        # 极端容错：生成一个稳定 openid，避免联调被卡
        openid = f"devopenid_{hash(body.code) & 0xffffffff:08x}"

    with SessionLocal() as s:
        user = get_or_create_user_by_openid(s, openid)

        # 守卫：若缺姓名/手机号，则置为 first_come
        if (not user.name or user.name.strip() == "" or user.name == "WeChatUser") or (not user.mobile):
            if user.status not in ("first_come", "rejected"):
                user.status = "first_come"
                user.is_active = False
                s.commit()
                s.refresh(user)

        # 分流
        if user.status in ("first_come", "rejected"):
            return {
                "need_register": True,
                "user_id": user.id,
                "status": user.status,
                "msg": "Please complete registration" if user.status == "first_come" else "Registration rejected, please resubmit",
            }

        if user.status == "pending":
            # 不抛错，方便前端统一处理
            return {"need_register": False, "status": "pending", "detail": "waiting for approval"}

        if user.status == "suspended":
            raise HTTPException(403, "Account suspended, contact admin")

        if user.status == "approved":
            if not user.is_active:
                user.is_active = True
                s.commit()
            token = create_token(user.id)
            return {"token": token, "user": {"id": user.id, "role": user.role, "status": user.status}}

        # 兜底
        return {"need_register": True, "user_id": user.id, "status": user.status}

@router.post("/auth/wechat/register")
def wechat_register(body: WechatRegisterIn, db: Session = Depends(get_db)):
    try:
        user = db.get(User, body.user_id)
        if not user:
            raise HTTPException(404, "User not found")

        # 仅允许 first_come / rejected 提交注册
        if user.status not in ("first_come", "rejected"):
            raise HTTPException(400, "Already submitted or approved")

        # 手机号唯一：统一检查/占位到 users.mobile
        if _phone_in_use(db, body.mobile, exclude_user_id=user.id):
            raise HTTPException(400, "Phone already used")

        user.name = body.name.strip()
        user.mobile = body.mobile.strip()
        user.status = "pending"
        user.is_active = False

        db.add(user)
        db.commit()
        db.refresh(user)

        return {"msg": "Registered successfully, waiting for approval", "user_id": user.id, "status": user.status}
    except HTTPException:
        raise
    except Exception as e:
        # 打印异常，便于排查
        logger.exception("wechat_register failed: %s", e)
        # 可能是唯一索引冲突或 SQLAlchemy 写法不兼容
        raise HTTPException(400, "Register failed")
