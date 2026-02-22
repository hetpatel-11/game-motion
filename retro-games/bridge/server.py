import os
import base64
import pickle
from flask import Flask, request, jsonify
from jericho import FrotzEnv

app = Flask(__name__)
env = None
GAMES_DIR = os.path.join(os.path.dirname(__file__), "games")


@app.route("/start", methods=["POST"])
def start_game():
    global env
    data = request.json or {}
    game = data.get("game", "zork1")
    game_path = os.path.join(GAMES_DIR, f"{game}.z5")
    if not os.path.exists(game_path):
        return jsonify({"error": f"Game not found: {game_path}"}), 404
    env = FrotzEnv(game_path)
    obs, info = env.reset()
    return jsonify({
        "observation": obs,
        "info": info,
        "location": _get_location(),
        "inventory": _get_inventory(),
        "objects": _get_room_objects(),
        "valid_actions": _get_valid_actions(),
        "max_score": env.get_max_score(),
    })


@app.route("/step", methods=["POST"])
def step():
    global env
    if env is None:
        return jsonify({"error": "No game running"}), 400
    data = request.json or {}
    command = data.get("command", "look")
    obs, reward, done, info = env.step(command)
    return jsonify({
        "observation": obs,
        "reward": reward,
        "done": done,
        "info": info,
        "location": _get_location(),
        "inventory": _get_inventory(),
        "objects": _get_room_objects(),
        "valid_actions": _get_valid_actions(),
    })


@app.route("/save", methods=["POST"])
def save_state():
    global env
    if env is None:
        return jsonify({"error": "No game running"}), 400
    state = env.get_state()
    encoded = base64.b64encode(pickle.dumps(state)).decode("ascii")
    return jsonify({"state": encoded})


@app.route("/load", methods=["POST"])
def load_state():
    global env
    if env is None:
        return jsonify({"error": "No game running"}), 400
    data = request.json or {}
    state = pickle.loads(base64.b64decode(data["state"]))
    env.set_state(state)
    return jsonify({
        "observation": "State restored.",
        "location": _get_location(),
        "inventory": _get_inventory(),
        "objects": _get_room_objects(),
        "valid_actions": _get_valid_actions(),
    })


def _get_valid_actions():
    try:
        return env.get_valid_actions()
    except Exception:
        return []


def _get_location():
    try:
        loc = env.get_player_location()
        return {"num": loc.num, "name": loc.name} if loc else None
    except Exception:
        return None


def _get_inventory():
    try:
        items = env.get_inventory()
        return [{"num": o.num, "name": o.name} for o in items]
    except Exception:
        return []


def _get_room_objects():
    try:
        loc = env.get_player_location()
        if not loc:
            return []
        all_objects = env.get_world_objects()
        room_objects = [
            {"num": o.num, "name": o.name, "parent": o.parent}
            for o in all_objects
            if o.parent == loc.num and o.num != env.get_player_object().num
        ]
        return room_objects
    except Exception:
        return []


if __name__ == "__main__":
    app.run(port=5001, debug=False)
