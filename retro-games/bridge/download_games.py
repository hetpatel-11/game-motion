import jericho
import os
import shutil

games_dir = os.path.join(os.path.dirname(__file__), "games")
os.makedirs(games_dir, exist_ok=True)

rom_dir = os.path.join(os.path.dirname(jericho.__file__), "roms")
if os.path.exists(rom_dir):
    for f in os.listdir(rom_dir):
        if f.endswith((".z5", ".z8", ".z3")):
            shutil.copy(os.path.join(rom_dir, f), os.path.join(games_dir, f))
            print(f"Copied {f}")
else:
    print(f"Jericho roms not found at {rom_dir}")
