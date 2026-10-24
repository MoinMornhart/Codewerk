# Stand: Codewerk (Übergabe 2026-10-24)

## Was es ist
Windows-Lern-App (Electron): Ein KI-Mentor (Claude über das eigene Claude-Konto via Claude Agent SDK) bringt Programmieren bei – von Level 0 bis Level 10, fünf Kurse (Python, JavaScript, Java, C#, C++), tägliche Lern-Sessions, Code direkt in der App schreiben und ausführen.

## Aktueller Stand
- Version im Code: **0.0.4** (12.09.). Funktioniert laut README/CHANGELOG: Startseite mit fünf Kursen, Mentor mit strengen Regeln (keine sofortige Lösung, `/loesung` nötig), Tages-Sessions mit Lernprofil, Code-Ausführung (Python über Pyodide, JavaScript im Worker, Java/C#/C++ über lokale Compiler, Zeitlimit), Kursbefehle als Knöpfe, Oberfläche DE/EN, Autoupdate über GitHub Releases, Unit-Tests + Selbsttest.
- GitHub-Actions „Tests“ grün (24.10.).
- **Veröffentlichtes Release nur v0.0.2.** Tags v0.0.3 und v0.0.4 existieren, aber ohne veröffentlichtes Release → installierte Apps haben vermutlich noch 0.0.2 (neues App-Icon „kommt mit dem nächsten Release“).
- Seit 12.09. keine Funktionsänderungen mehr (nur automatische VibeWorks-Checks). Projekt ruht offenbar.

## Zuletzt gemacht
- 2026-10-24 Cloud-Start-Hook (Philips Skills automatisch in Cloud-Sitzungen)
- 2026-09-16 bis 09-26 VibeWorks-Repo-Check eingerichtet/aktualisiert
- 2026-09-12 0.0.4: README neu (Banner, Screenshots, Diagramme), App-Icon, `npm run graphics`, Tests in GitHub Actions
- 2026-09-12 0.0.3: Release-Skript (genau ein Release pro Version, Entwurf → veröffentlichen)
- 2026-09-11 0.0.2: Lern-App mit KI-Mentor, Code-Ausführung, Autoupdate

## Offen / Nächste Schritte
- Release für 0.0.4 (oder neue Version) wirklich veröffentlichen – prüfen, warum 0.0.3/0.0.4 kein Release haben (`npm run release`).
- Issue #3: Sicherheitslücke in `electron` (^44.3.0 → 45.0.0, mittel/niedrig).
- Issue #2: Abhängigkeiten aktualisieren (`@anthropic-ai/sdk`, `@anthropic-ai/claude-agent-sdk`, `pyodide` …).
- Issue #1 „Electron für Android Request!“ (von JONIMONI09, ohne Text) – Wunsch nach Android-Version; Entscheidung von Philip **offen**.
- Weitere Pläne/Roadmap: im Repo und in Chats nichts gefunden (**unklar**).

## Wichtige Infos
- Technik: Electron 44, Node, Claude Agent SDK (nutzt Claude-Pro/Max-Login, kein API-Key nötig; optionales API-Key-Feld), Pyodide, electron-updater, electron-builder (NSIS).
- Befehle: `npm install`, `npm start`, `npm test`, `npm run selftest`, `npm run graphics`.
- Versionen: `npm run bump -- --title "…" --de "…" --en "…"` (erhöht Version, schreibt CHANGELOG.md + CHANGELOG.en.md, Commit + Tag), dann `npm run release` (push, Release-Entwurf, Installer bauen/hochladen, veröffentlichen).
- Versionsschema: Ziffern 0–9, dann Übertrag (0.0.9 → 0.1.0, nie 0.0.10).
- Mentor-Regeln: `prompts/mentor.de.md` / `mentor.en.md`; Mentor hat nur zwei Werkzeuge (Übung in Editor laden, Lernprofil speichern).
- Nutzerdaten: `%APPDATA%\Codewerk\codewerk-data.json`.
- Lizenz in `package.json`: UNLICENSED, `private: true` (Repo selbst ist aber öffentlich).

## Philips Vorgaben
- Commit-Format: Titel `[Codewerk X.Y.Z] Kurzer Titel`, Text mit `DE:`- und `EN:`-Liste; jede Aktualisierung ein eigener Commit; Doku zweisprachig (DE/EN).
- „Verfasst mit Claude 🤖“: im Repo **nicht** festgelegt (kommt nirgends vor) – unklar, vor Verwendung Philip fragen.
- Update-Funktion: **ja** (GitHub Releases).
- Repo: **öffentlich** (MoinMornhart/Codewerk).

---
Diese Datei wird beim Arbeiten aktuell gehalten: nach jedem größeren Schritt „Aktueller Stand“ und „Offen“ anpassen.
