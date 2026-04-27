docker compose down -v
docker compose up -d --build
Start-Sleep -Seconds 5
docker compose exec api python -m src.seed
