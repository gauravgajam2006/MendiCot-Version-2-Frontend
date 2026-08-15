# MendiCot Stranger Things Theme — Production Deck

Locked source-faithful custom deck package.

## Contents
- `cards/` — 48 individual front PNGs
- `card-back.png` — production back
- `manifest.json` — rank/suit/code/file mapping and SHA-256 checksums
- `QA-report.json` — extraction/production QA
- `deck-preview.png` — visual inspection sheet

## Codes
Ranks: `3,4,5,6,7,8,9,10,J,Q,K,A`

Suits: `S=Spades`, `H=Hearts`, `C=Clubs`, `D=Diamonds`

Examples: `3S.png`, `10H.png`, `QC.png`, `AD.png`.

## Production lock
- 48 fronts + 1 back
- 900×1000 px
- 9:10 ratio
- PNG
- no 2s
- no generative redraw for individual fronts
- approved design-sheet artwork is deterministically cropped
- aspect normalization uses outer-edge padding + one uniform scale only
- card-back central art is preserved; existing edge material is extended sideways to 9:10

## Frontend target
`public/deck/mendicot-stranger-things-deck/`
