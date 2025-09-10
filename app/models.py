from sqlalchemy import Column, Integer, BigInteger, String, Enum, Date, DateTime, Boolean, DECIMAL, JSON, TIMESTAMP, Text, ForeignKey, Float, Table, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .db import Base
import enum
from sqlalchemy.dialects.mysql import ENUM as MySQLEnum
from sqlalchemy import Column, Integer, String, Boolean, DateTime


user_departments = Table(
    "user_departments",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("department_id", Integer, ForeignKey("departments.id", ondelete="CASCADE"), primary_key=True),
    UniqueConstraint("user_id", "department_id", name="uq_user_department")
)

class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128), nullable=False, unique=True)
    parent_id = Column(BigInteger)

    # 反向：部门下的员工（多对多）
    users = relationship(
        "User",
        secondary=user_departments,
        back_populates="departments",
        lazy="selectin"
    )

class RoleEnum(str, enum.Enum):
    employee = 'employee'
    manager = 'manager'
    admin = 'admin'



class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # 历史字段
    openid = Column(String(64), unique=True, nullable=True)
    unionid = Column(String(64), unique=True, nullable=True)
    name = Column(String(64), nullable=False)

    # 你之前已有的 mobile 列
    mobile = Column(String(20), unique=True, nullable=True)

    # ✅ 数据库已存在，但模型缺失的列
    phone = Column(String(20), unique=True, nullable=True)

    email = Column(String(128), nullable=True)

    role = Column(
        MySQLEnum("employee", "manager", "admin"),
        default="employee",
        nullable=True,
    )

    department_id = Column(Integer, nullable=True)
    password_hash = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # ✅ 为微信登录新增/已存在的列
    wechat_openid = Column(String(64), unique=True, nullable=True)
    auth_provider = Column(String(20), nullable=True)

    # ✅ 注册/审批状态（与数据库一致：first_come/pending/approved/rejected/suspended）
    status = Column(
        MySQLEnum("first_come", "pending", "approved", "rejected", "suspended"),
        default="first_come",
        nullable=True,
    )
    timesheets = relationship(
        "Timesheet",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    departments = relationship(
        "Department",
        secondary=user_departments,
        back_populates="users",
        lazy="selectin"
    )

class Project(Base):
    __tablename__ = 'projects'
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    code = Column(String(32), unique=True)
    name = Column(String(128), nullable=False)
    status = Column(Enum('active','archived', name='project_status'), default='active')
    manager_id = Column(BigInteger)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    description = Column(Text, nullable=True)

class Task(Base):
    __tablename__ = 'tasks'
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, nullable=False)
    name = Column(String(128), nullable=False)

class Timesheet(Base):
    __tablename__ = "timesheets"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id"))
    project_id = Column(BigInteger, ForeignKey("projects.id", ondelete="RESTRICT"), nullable=True)
    project = relationship("Project")
    task_id = Column(BigInteger, nullable=True)

    # ---- 新结构：去掉 work_date/start_time/end_time，只保留 hours + 一批字符串字段 ----
    hours = Column(Float, nullable=False, default=0.0)  # 工时数（小时；由前端直接提交）

    # 其余全部是“字符串”字段（允许为空）
    submit_time = Column(Text, nullable=True)              # 提交时间（字符串）
    fill_id = Column(Text, nullable=True)                  # 填写ID
    answer_time = Column(Text, nullable=True)              # 答题时间
    nickname = Column(Text, nullable=True)                 # 昵称
    weekly_summary = Column(Text, nullable=True)           # 本周完成情况说明
    project_group_filter = Column(Text, nullable=True)     # 项目群筛选
    director_filter = Column(Text, nullable=True)          # 室主任筛选
    week_no = Column(Text, nullable=True)                  # 周数
    pm_reduce_hours = Column(Text, nullable=True)          # 项目负责人核减工时数（字符串）
    identified_by = Column(Text, nullable=True)            # 认定人
    reduce_desc = Column(Text, nullable=True)              # 核减情况说明
    director_reduce_hours = Column(Text, nullable=True)    # 室主任核减工时（字符串）
    group_reduce_hours = Column(Text, nullable=True)       # 项目群核减工时（字符串）
    reason_desc = Column(Text, nullable=True)              # 原因情况说明

    # 其它原有字段保留
    overtime = Column(Boolean, default=False)
    note = Column(Text)
    attach_url = Column(String)
    geo_lat = Column(Float, nullable=True)
    geo_lng = Column(Float, nullable=True)
    status = Column(String, default="submitted")

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship(
        "User",
        back_populates="timesheets",
        lazy="joined",   # 或者 "selectin"，二选一
    )

class AuditLog(Base):
    __tablename__ = 'audit_logs'
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    actor_id = Column(BigInteger)
    action = Column(String(64))
    entity = Column(String(32))
    entity_id = Column(BigInteger)
    detail = Column(JSON)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
