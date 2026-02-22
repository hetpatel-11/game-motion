export type TileType = "grass" | "forest" | "house" | "cave" | "water" | "path" | "indoor" | "dark";

export interface RoomLayout {
  tileType: TileType;
  exits: Record<string, boolean>;
  objectPositions: { name: string; x: number; y: number }[];
}

const ROOM_KEYWORDS: Record<string, TileType> = {
  forest: "forest",
  tree: "forest",
  clearing: "forest",
  house: "house",
  kitchen: "indoor",
  attic: "indoor",
  living: "indoor",
  room: "indoor",
  cave: "cave",
  cavern: "cave",
  underground: "cave",
  cellar: "cave",
  river: "water",
  lake: "water",
  stream: "water",
  dam: "water",
  path: "path",
  road: "path",
  trail: "path",
  dark: "dark",
  maze: "dark",
};

export function mapRoomToLayout(
  locationName: string,
  observation: string,
  objects: { name: string }[],
  validActions: string[]
): RoomLayout {
  const combined = `${locationName} ${observation}`.toLowerCase();

  let tileType: TileType = "grass";
  for (const [keyword, type] of Object.entries(ROOM_KEYWORDS)) {
    if (combined.includes(keyword)) {
      tileType = type;
      break;
    }
  }

  const exitDirs = ["north", "south", "east", "west", "up", "down"];
  const exits: Record<string, boolean> = {};
  for (const dir of exitDirs) {
    exits[dir] = validActions.includes(dir);
  }

  const objectPositions = objects.map((obj, i) => ({
    name: obj.name,
    x: 2 + (i % 3) * 3,
    y: 2 + Math.floor(i / 3) * 3,
  }));

  return { tileType, exits, objectPositions };
}
