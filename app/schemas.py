from datetime import date, datetime
from typing import Literal, Optional, List 
from pydantic import BaseModel, Field, field_validator, ValidationInfo, ConfigDict

from app.models import RoleEnum


# ---------- 公共输出模型 ----------

class UserOut(BaseModel):
    id: int
    name: str
    mobile: Optional[str] = None
    email: Optional[str] = None
    role: RoleEnum
    department_id: Optional[int] = None
    status: Optional[str] = None
    # Pydantic v2 配置写法
    model_config = ConfigDict(
        from_attributes=True,   # ORM 模式
        use_enum_values=True,   # 输出枚举的 value（不是枚举名）
    )


class UserUpdate(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    role: Optional[RoleEnum] = None
    department_id: Optional[int] = None
    password: Optional[str] = None  # 明文；后端会 hash

    class Config:
        use_enum_values = True


class UserCreate(BaseModel):
    name: str
    mobile: str
    password: str
    role: Literal["employee", "manager", "admin"]
    department_id: Optional[int] = None


class LoginRequest(BaseModel):
    mobile: str
    password: str


class TokenResponse(BaseModel):
    token: str
    user: UserOut


# ---------- 项目 & 工时 ----------

class ProjectOut(BaseModel):
    id: int
    code: Optional[str] = None
    name: str
    status: Literal["active", "archived"]

    model_config = ConfigDict(from_attributes=True)


# ====== Timesheet 新结构 ======
class TimesheetCreate(BaseModel):
    project_id: int
    task_id: Optional[int] = None

    # 现在只保留 hours 数值，其余新增字段均为字符串
    hours: float = Field(..., gt=0, description="工时（小时）")

    submit_time: Optional[str] = None
    fill_id: Optional[str] = None
    answer_time: Optional[str] = None
    nickname: Optional[str] = None
    weekly_summary: Optional[str] = None
    project_group_filter: Optional[str] = None
    director_filter: Optional[str] = None
    week_no: Optional[str] = None
    pm_reduce_hours: Optional[str] = None
    identified_by: Optional[str] = None
    reduce_desc: Optional[str] = None
    director_reduce_hours: Optional[str] = None
    group_reduce_hours: Optional[str] = None
    reason_desc: Optional[str] = None

    overtime: bool = False
    note: Optional[str] = Field(None, max_length=2000)
    attach_url: Optional[str] = None
    geo_lat: Optional[float] = None
    geo_lng: Optional[float] = None


class TimesheetOut(BaseModel):
    id: int
    user_id: int
    project_id: int
    task_id: Optional[int]

    # 不再有 work_date/start_time/end_time
    hours: float

    submit_time: Optional[str] = None
    fill_id: Optional[str] = None
    answer_time: Optional[str] = None
    nickname: Optional[str] = None
    weekly_summary: Optional[str] = None
    project_group_filter: Optional[str] = None
    director_filter: Optional[str] = None
    week_no: Optional[str] = None
    pm_reduce_hours: Optional[str] = None
    identified_by: Optional[str] = None
    reduce_desc: Optional[str] = None
    director_reduce_hours: Optional[str] = None
    group_reduce_hours: Optional[str] = None
    reason_desc: Optional[str] = None

    overtime: bool
    note: Optional[str]
    status: Literal["submitted", "approved", "rejected"]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SummaryRow(BaseModel):
    key: str
    total_hours: float

class TimesheetPage(BaseModel):
    items: List[TimesheetOut]
    page: int
    size: int
    total: int

class UserHoursRow(BaseModel):
    user_id: int
    name: Optional[str] = None
    total_hours: float
