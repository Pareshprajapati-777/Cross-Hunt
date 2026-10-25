import os
import shutil
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

# Use an isolated test database so pytest NEVER pollutes the main db.sqlite3!
TEST_DB_PATH = BASE_DIR / "test_db.sqlite3"
MAIN_DB_PATH = BASE_DIR / "db.sqlite3"

if MAIN_DB_PATH.exists():
    try:
        import sqlite3
        with sqlite3.connect(str(MAIN_DB_PATH)) as conn:
            conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
    except Exception:
        pass
    shutil.copyfile(MAIN_DB_PATH, TEST_DB_PATH)

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import SessionLocal, get_db
from backend.app.models.user import User


@pytest.fixture(scope="session", autouse=True)
def cleanup_test_database():
    yield
    # Remove test database when test session finishes
    try:
        if TEST_DB_PATH.exists():
            os.remove(TEST_DB_PATH)
        for ext in ["-wal", "-shm"]:
            wal = Path(str(TEST_DB_PATH) + ext)
            if wal.exists():
                os.remove(wal)
    except Exception:
        pass


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="function")
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
