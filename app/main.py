from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers import auth, projects, timesheets, reports, users, departments
from fastapi.staticfiles import StaticFiles
from .routers import auth_wechat

app = FastAPI(title=settings.app_name)

#挂载静态文件目录
app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(projects.router, tags=["projects"])
app.include_router(timesheets.router, tags=["timesheets"])
app.include_router(reports.router, tags=["reports"])
app.include_router(users.router, tags=["users"])
app.include_router(auth_wechat.router, tags=["auth-wechat"])
app.include_router(departments.router, tags=["departments"])

@app.get("/healthz")
def healthz():
    return {"status": "ok", "env": settings.app_env}

@app.get("/ping")
def ping():
    return {"ok": True, "msg": "hello from FastAPI"}