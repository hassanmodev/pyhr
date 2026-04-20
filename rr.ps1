docker compose down -v
docker compose up -d
Start-Sleep -Seconds 5
docker compose exec api python -m src.seed
