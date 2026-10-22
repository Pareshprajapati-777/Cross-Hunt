import pytest


def test_ai_concierge_endpoints(client):
    # Suggestions
    sug_res = client.get("/api/ai/suggestions/")
    assert sug_res.status_code == 200
    assert len(sug_res.json()["suggestions"]) > 0

    # Chat query
    chat_res = client.post("/api/ai/chat/", json={
        "messages": [{"role": "user", "content": "Mumbai se Goa luxury cruise ke baare me bataiye"}],
        "current_path": "/explore"
    })
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert chat_data["success"] is True
    assert len(chat_data["reply"]) > 0

    # Ticket lookup unauthenticated
    client.post("/api/auth/logout/")
    lookup_res = client.post("/api/ai/ticket-lookup/", json={"code": "CRS-TEST-1234"})
    assert lookup_res.status_code in [401, 404]


def test_whatsapp_management(client):
    client.post("/api/auth/login/", json={"username": "admin", "password": "Admin@12345"})

    # WhatsApp config
    cfg_res = client.get("/api/admin/whatsapp/config/")
    assert cfg_res.status_code == 200
    cfg_data = cfg_res.json()
    assert "config" in cfg_data
    assert "upcoming_queue" in cfg_data
    assert "recent_logs" in cfg_data

    # WhatsApp logs
    logs_res = client.get("/api/admin/whatsapp/logs/")
    assert logs_res.status_code == 200
    assert "logs" in logs_res.json()

    # Dry-run dispatch
    disp_res = client.post("/api/admin/whatsapp/dispatch/", json={"dry_run": True})
    assert disp_res.status_code == 200
    assert disp_res.json()["success"] is True
