# Orb Runner

A small browser game: collect gold orbs and dodge the red blocks. The blocks get faster and more frequent as time goes on.

## Controls

- Start / Play again button (or Space): start a game
- Arrow keys or WASD: move
- P: pause

On a phone or tablet:

- Tap Start / Play again to begin
- Drag anywhere on the game to move (like a trackpad)
- Pause / Resume button below the game (the game also pauses when you switch apps)

## Run locally

Open `index.html` in a browser, or serve the folder:

```
python -m http.server 8000
```

Then visit http://localhost:8000.

## Files

- `index.html`: page and canvas
- `style.css`: page styling
- `game.js`: game loop, input, update and draw logic

## Publish with GitHub Pages

1. Push this folder to a public GitHub repository.
2. In the repo, go to Settings > Pages.
3. Set Source to "Deploy from a branch", pick `main` and `/ (root)`, then Save.
4. The game will be live at `https://YOUR-USERNAME.github.io/REPO-NAME/` after a minute or two.
