FROM python:3.13-slim

WORKDIR /app

COPY server.py index.html app.js styles.css ./

ENV DB_PATH=/data/meal_tracker.db

EXPOSE 8000

CMD ["python3", "server.py"]
