from fastapi import FastAPI

app = FastAPI(title="pyhr API")


@app.get("/health")
def health():
    return {"status": "ok"}
