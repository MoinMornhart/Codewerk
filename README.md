# Codewerk

🇩🇪 Deutsch · [🇬🇧 English](README.en.md)

**Codewerk-Version:** 0.0.2

Codewerk ist eine Lern-App für Windows. Ein KI-Mentor (Claude) bringt dir Programmieren bei – von Level 0 bis Level 10, in fünf eigenständigen Kursen: **Python, JavaScript, Java, C# und C++**. Jeder Kurs ist eine eigene kleine App mit eigenem Level, Lernprofil, Chat und Archiv. Empfohlen: nacheinander, jeden Tag eine Session.

## So läuft ein Lerntag

1. Kurs öffnen und **„Neuen Tag starten“** klicken. Der Mentor bekommt dein gespeichertes Lernprofil und setzt dort an, wo du aufgehört hast.
2. Der Mentor erklärt ein Konzept in kleinen Schritten und lädt eine **Übung direkt in den Editor**.
3. Du schreibst den Code, drückst **▶ Ausführen** (Strg+Enter) und schickst ihn mit **„An Mentor senden“** zur Prüfung – zusammen mit der echten Ausgabe.
4. Ist etwas falsch, erklärt der Mentor die Ursache, und ihr verbessert den Code gemeinsam, bis du es verstanden hast.
5. Am Ende des Tages speichert der Mentor dein Lernprofil. Ziel: ungefähr ein Level pro Tag – und am Ende ein eigenes kleines Spiel.

## Funktionen

- Mentor nach festen Regeln ([prompts/mentor.de.md](prompts/mentor.de.md)): Hilfe-Eskalation statt fertiger Lösungen, Code-Review-Format, Fehlerliste mit Wiederholungen, Levelprüfungen
- Code-Ausführung in der App: Python (Pyodide) und JavaScript ohne Installation; Java, C# und C++ mit lokal installierten Compilern; Zeitlimit gegen Endlosschleifen
- Eingabefeld für `input()`, `prompt()`, `Console.ReadLine()` usw.
- Lernprofil-Seitenleiste: Level, Fortschritt, Konzepte, Fehlerliste, Projekte, Glossar
- Kursbefehle als Knöpfe: `/weiter`, `/status`, `/nochmal`, `/beispiel`, `/warum`, `/loesung`, `/glossar`, `/pause`
- Oberfläche und Mentor auf Deutsch und Englisch
- Automatische Updates über GitHub Releases

## Voraussetzungen

- Windows 10 oder 11
- Ein **Claude-Konto (Pro oder Max)**, angemeldet in Claude Code – zum Beispiel über die Claude-Erweiterung in VS Code oder mit `claude` im Terminal. Der Mentor läuft über dieses Konto: kein API-Key, keine Extrakosten; die Nutzung zählt gegen die Limits deines Abos. Für Personen ohne Claude-Konto gibt es in den Einstellungen ein optionales Feld für einen Anthropic-API-Key.
- Nur für die Kurse 3–5 (PowerShell):

  | Kurs | Installation |
  |------|--------------|
  | Java | `winget install Microsoft.OpenJDK.21` |
  | C#   | `winget install Microsoft.DotNet.SDK.10` |
  | C++  | `winget install BrechtSanders.WinLibs.POSIX.UCRT` |

## Installation

Den Installer `Codewerk-Setup-x.y.z.exe` von der [Releases-Seite](https://github.com/MoinMornhart/Codewerk/releases) laden. Die App ist nicht signiert, deshalb fragt Windows SmartScreen nach („Weitere Informationen“ → „Trotzdem ausführen“). Danach aktualisiert sich die App selbst.

## Entwicklung

```powershell
npm install        # Abhängigkeiten installieren
npm start          # App starten
npm test           # Unit-Tests
npm run selftest   # App unsichtbar starten und Code-Ausführung prüfen
```

## Versionen und Updates

Versionen folgen dem Zähler-System: Jede Aktualisierung erhöht die letzte Stelle um 1. Wird eine Stelle größer als 9, springt sie auf 0 und die Stelle links davon wird um 1 erhöht.

    0.0.1 → 0.0.2 → … → 0.0.9 → 0.1.0 → … → 0.9.9 → 1.0.0

Eine neue Version veröffentlichen:

```powershell
npm run bump -- --title "Kurzer Titel" --de "Änderung 1" --de "Änderung 2" --en "Change 1" --en "Change 2"
npm run release
```

`bump` erhöht die Version, trägt die Änderungen in `CHANGELOG.md` und `CHANGELOG.en.md` ein, committet alles und setzt den Tag `vX.Y.Z`. `release` pusht, baut den Installer und veröffentlicht ihn als GitHub Release – installierte Apps holen sich das Update automatisch.

## Git-Regeln

Jede Aktualisierung ist ein eigener Commit. Der Titel nennt immer die neue Version, der Text listet die Änderungen auf Deutsch und Englisch:

    [Codewerk 0.0.3] Kurzer Titel

    DE:
    - Änderung
    EN:
    - Change

Die komplette Historie zeigt `git log`.

## Projektstruktur

```
src/main/       Hauptprozess: Fenster, Mentor (Claude Agent SDK), Code-Ausführung, Updates, Speicher
src/renderer/   Oberfläche: HTML, CSS, App-Logik, Markdown, Übersetzungen, Web Worker
src/shared/     Kursliste und Versionslogik
prompts/        Mentor-Anweisungen (Deutsch und Englisch)
scripts/        bump.js und release.js
test/           Unit-Tests (node --test)
```

## Daten und Datenschutz

Chats, Lernprofile und Einstellungen liegen in `%APPDATA%\Codewerk\codewerk-data.json`. Ein optionaler API-Key wird mit Windows verschlüsselt gespeichert. Der Mentor hat keinen Zugriff auf Dateien oder die Kommandozeile; Chat-Inhalte gehen über Claude Code an Anthropic.
