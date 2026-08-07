from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
import uvicorn
import os

app = FastAPI()

# Комнаты: room_id → список WebSocket соединений
rooms: dict[str, list[WebSocket]] = {}

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()

    if room_id not in rooms:
        rooms[room_id] = []
    rooms[room_id].append(websocket)

    print(f"[+] Подключился к комнате '{room_id}'. Сейчас в комнате: {len(rooms[room_id])}")

    try:
        while True:
            data = await websocket.receive_text()
            # Пересылаем сообщение всем остальным в этой комнате
            for peer in rooms[room_id]:
                if peer != websocket:
                    await peer.send_text(data)
    except WebSocketDisconnect:
        rooms[room_id].remove(websocket)
        if len(rooms[room_id]) == 0:
            del rooms[room_id]
        print(f"[-] Вышел из комнаты '{room_id}'")

@app.get("/")
async def index():
    with open("index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
