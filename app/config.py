# app/config.py
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
    )

    # ----- App -----
    app_name: str = "timesheet"
    app_env: str = "dev"
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    # ----- JWT -----
    jwt_secret: str = "dev_secret"
    jwt_expires_minutes: int = 60

    # ----- DB -----
    mysql_host: str = "127.0.0.1"   # 在 docker 内建议用 "db"（compose 服务名）
    mysql_port: int = 3306
    mysql_user: str = "root"
    mysql_password: str = "rootpass"
    mysql_db: str = "timesheet"

    # ----- WeChat -----
    wechat_appid: Optional[str] = None
    wechat_secret: Optional[str] = None

    # ✅ 计算属性：供 app/db.py 使用
    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.mysql_user}:{self.mysql_password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_db}?charset=utf8mb4"
        )

settings = Settings()

# 清理空格
if settings.wechat_appid:
    settings.wechat_appid = settings.wechat_appid.strip()
if settings.wechat_secret:
    settings.wechat_secret = settings.wechat_secret.strip()
