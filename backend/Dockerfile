FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app

# uploads is mounted as a volume in compose; create it so the image works standalone too
RUN mkdir -p /app/uploads && chmod +x /app/app/scripts/entrypoint.sh

EXPOSE 8000

CMD ["./app/scripts/entrypoint.sh"]