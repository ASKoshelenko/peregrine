FROM python:3.12-slim AS build

WORKDIR /build
COPY pyproject.toml README.md ./
COPY src ./src
RUN python -m pip wheel --no-cache-dir --wheel-dir /wheels '.[serving]'

FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    PEREGRINE_MODEL_PATH=/app/models/best.onnx \
    PEREGRINE_MODEL_SHA256=020a524193b32dafdac0126daea1ecddacc7878499b3119111e84ae1b594d14f \
    PEREGRINE_SITE_DIR=/app/site \
    PEREGRINE_ARTIFACT_DIR=/app/artifacts

WORKDIR /app
COPY --from=build /wheels /wheels
RUN python -m pip install --no-cache-dir /wheels/*.whl && rm -rf /wheels
COPY site ./site
COPY artifacts/observed/latest.json ./artifacts/observed/latest.json
COPY models/best.onnx ./models/best.onnx

USER 65532:65532
EXPOSE 8080
CMD ["sh", "-c", "exec uvicorn peregrine.api:app --host 0.0.0.0 --port ${PORT} --workers 1"]
