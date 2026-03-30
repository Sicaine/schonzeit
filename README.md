# Schonzeit Editor

Interaktiver Editor für Jagd- und Schonzeiten (Bayern). Zum Lernen, Bearbeiten und Drucken der Jagdzeiten-Übersicht.

## Voraussetzungen

- [Node.js](https://nodejs.org/) (v18+)

## Setup

```bash
npm install
```

## Entwicklung

Lokalen Dev-Server starten:

```bash
npm run dev
```

Öffne dann [http://localhost:5173](http://localhost:5173) im Browser.

## Produktions-Build

```bash
npm run build
```

Die statischen Dateien landen in `dist/`. Diese können mit jedem Webserver ausgeliefert werden.

Lokal vorab testen:

```bash
npm run preview
```

## Funktionen

- **Anzeige** der Jagd- und Schonzeiten als Monatsraster
- **Bearbeiten** – Tiere, Gruppen und Kategorien hinzufügen/entfernen, Halbmonats-Zeiträume per Klick setzen
- **Zusammenfassen / Aufteilen** von Tierarten in einer Zeile
- **Sortierung** nach Standard oder Jagdzeitbeginn
- **Import/Export** als JSON
- **Drucken** – optimiertes Print-Layout (Querformat)
