# TryHackMe Dashboard

Osobisty, ciemny dashboard postępów na [TryHackMe](https://tryhackme.com). Cała zawartość strony liczy się z jednego pliku JSON — edytujesz liczby, odświeżasz przeglądarkę.

## Edycja postępu

Źródło prawdy: [`data/progress.json`](data/progress.json)

- `meta` — nick, data synchronizacji, krótki opis
- `challenges` — Easy / Medium / Hard (`done` / `total`)
- `categories` — Paths, Walkthroughs, Modules, Networks, AI Upskilling, Recent Threats (`all`, `done`, `inProgress`, `notStarted`)
- `history` — opcjonalny log ukończonych pozycji (możesz dopisywać kolejne dni)

Po zmianie JSON-a wystarczy odświeżyć stronę. Dashboard sam przelicza procenty, wykresy kołowe, paski i porównanie kategorii.

## Lokalny podgląd

Przeglądarka nie wczyta JSON-a z `file://`. Uruchom prosty serwer w katalogu projektu:

```bash
python3 -m http.server 8080
```

Wejdź na [http://localhost:8080](http://localhost:8080).

## GitHub Pages

W repozytorium: **Settings → Pages → Deploy from a branch → `main` / `/ (root)`**.

Po publikacji dashboard będzie pod:

`https://savaqe21.github.io/TryHackMe-Dashboard/`
