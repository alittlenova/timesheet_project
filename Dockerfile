# 用镜像站前缀，避免直连 Docker Hub
FROM docker.m.daocloud.io/library/python:3.11-slim

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DEFAULT_TIMEOUT=300

# 可通过 --build-arg 覆盖镜像源（默认用阿里）
ARG PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple

# 如需代理可在构建时传：--build-arg http_proxy=... --build-arg https_proxy=...
ARG http_proxy
ARG https_proxy
ENV http_proxy=${http_proxy} https_proxy=${https_proxy}

WORKDIR /app
COPY requirements.txt /app/requirements.txt

# 先把依赖全部下载为 wheels（走国内镜像）
RUN python -m pip install -U pip && \
    mkdir -p /wheels && \
    pip download -r /app/requirements.txt -d /wheels \
        -i ${PIP_INDEX_URL} \
        --retries 10 --timeout 300 --prefer-binary --progress-bar off && \
    pip install --no-index --find-links=/wheels -r /app/requirements.txt --progress-bar off

# 其余代码再复制，避免每次改代码都重复下依赖
COPY . /app

ENV PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
