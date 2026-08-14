FROM python:3.12-slim AS runtime
WORKDIR /app
COPY pyproject.toml README.md ./
COPY src ./src
RUN pip install --no-cache-dir .
USER 1000
EXPOSE 8000
CMD ["uvicorn", "peregrine.api:app", "--host", "0.0.0.0", "--port", "8000"]
