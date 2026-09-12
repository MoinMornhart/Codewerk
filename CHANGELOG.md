# Änderungsprotokoll

🇩🇪 Deutsch · [🇬🇧 English](CHANGELOG.en.md)

Neueste Einträge oben. Versionsschema: siehe [README.md](README.md).

<!-- EINTRÄGE -->

## [Codewerk 0.0.3] – 2026-09-12
- release.js legt den GitHub-Release zuerst als Entwurf an und veröffentlicht ihn erst nach dem Upload – verhindert doppelte Releases
- Release-Text wird automatisch aus CHANGELOG.md und CHANGELOG.en.md erzeugt
- bump.js erzeugt annotierte Tags, damit sie mit hochgeladen werden
- md.js ohne rohe Steuerzeichen, zwei neue Markdown-Tests

## [Codewerk 0.0.2] – 2026-09-11
- Electron-App für Windows angelegt: Startseite mit fünf Kursen (Python, JavaScript, Java, C#, C++) als eigenständige Mini-Apps.
- KI-Mentor über das eigene Claude-Konto (Claude Agent SDK, kein API-Key nötig); Mentor-Anweisungen auf Deutsch und Englisch.
- Tages-Sessions: jeder Lerntag startet mit dem gespeicherten Lernprofil, der alte Chat wird archiviert.
- Werkzeuge für den Mentor: Übung in den Editor laden und Lernprofil speichern; eingebaute Claude-Code-Werkzeuge sind gesperrt.
- Code-Editor mit Ausführung: Python (Pyodide) und JavaScript direkt in der App, Java/C#/C++ über lokale Compiler, Zeitlimit gegen Endlosschleifen.
- Lernprofil-Seitenleiste, Kursbefehle als Knöpfe, Oberfläche auf Deutsch und Englisch.
- Automatische Updates über GitHub Releases; Skripte `npm run bump` und `npm run release` für versionierte Commits und Releases.
- Unit-Tests und ein Selbsttest der App (`npm run selftest`).

## [Codewerk 0.0.1] – 2026-09-11
- Git-Repository angelegt, Commit-Regeln festgelegt, Dokumentation auf Deutsch und Englisch.
