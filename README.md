# SubQG Image Transformer

## 📘 Inhaltsverzeichnis

1. [Einführung](#einführung)
2. [Kernkonzept: Transformation und Originalität](#kernkonzept-transformation-und-originalität)
3. [Funktionsweise im Detail](#funktionsweise-im-detail)

   * [Bildeingabe](#bildeingabe)
   * [SubQG-Simulation](#subqg-simulation)
   * [Riemann-Analogie & Harmony Score](#riemann-analogie--harmony-score)
   * [Farbanalyse](#farbanalyse)
   * [Pixel-Transformation (`processImageWithSubQG`)](#pixel-transformation-processimagewithsubqg)
   * [Nachbearbeitung](#nachbearbeitung)
   * [Ausgabe](#ausgabe)
4. [Hauptmerkmale](#hauptmerkmale)
5. [Technologie-Stack](#technologie-stack)
6. [Hinweis zur Originalität & Urheberrecht](#hinweis-zur-originalität--urheberrecht)
7. [Setup & Start (Entwickler)](#setup--start-entwickler)

---

## Einführung

Der **SubQG Image Transformer** ist eine React-basierte Webanwendung zur tiefgreifenden künstlerischen Bildtransformation. Anders als klassische Filter nutzt sie:

* eine simulierte **Subquanten-Resonanz (SubQG)**,
* eine mathematisch inspirierte **Riemann-Analogie** zur Bewertung der Bildharmonie,
* und eine kontextabhängige **Farbcharakteranalyse**.

Das Ziel ist kein simples Styling – sondern die algorithmische Erschaffung eines völlig **neuen digitalen Kunstwerks**.

---

## Kernkonzept: Transformation & Originalität

Die Anwendung erzeugt ein Werk, das strukturell vom Ursprungsbild inspiriert ist, aber **algorithmisch rekonstruiert** wird:

* **Keine Filter, keine Überblendungen**
* Stattdessen: **pixelweise Neuberechnung**, moduliert durch globale Felder
* Das Ergebnis: ein Bild mit **eigener digitaler Signatur**, nicht bloß ein Derivat

Diese Vorgehensweise schafft einen **unabhängigen digitalen Output**, vergleichbar mit einem Gemälde, das sich auf eine Fotografie bezieht – aber ein völlig eigenes Werk darstellt.

---

## Funktionsweise im Detail

### 🔹 Bildeingabe

* Nutzer können:

  * eigene Bilder (JPG, PNG, SVG etc.) hochladen
  * neue Bilder per Prompt via **Google Gemini API** generieren (Modell: `imagen-3.0-generate-002`)
* Das Bild wird analysiert und als Ausgangsbasis gespeichert.

---

### 🔹 SubQG-Simulation

* Ein `SubQGSimulator` erzeugt ein **Energie- und Phasenfeld**
* Konfigurierbare Parameter:

  * Simulationsgröße: Bruchteil der Bildgröße (z. B. `Breite / 8`), typischerweise ein niedrigaufgelöstes Gitter (z.B. 64x64 Pixel).
  * Energie- und Phasenfrequenzen (`f_energy`, `f_phase`)
  * Rauschanteil (`noise_factor`)
* **Knotendetektion**: Punkte mit kohärentem Energie- und Phasenwert (Threshold + Rundung) innerhalb des Simulationsgitters.
* Ergebnis:
  * `knot_map`: Eine 2D-Karte, die die Dichte und Verteilung der detektierten "Knoten" auf dem niedrigaufgelösten Simulationsgitter darstellt.
    * **Visualisierung im Interface:** Die im Interface angezeigte "SubQG Knot Map" ist eine direkte, grafische Darstellung dieser *rohen, niedrigaufgelösten* Karte. Ihre Muster (z.B. Cluster-Bildungen oder diffuse Verteilungen) sind ein direktes Ergebnis der gewählten Simulationsparameter (Frequenzen, Schwellenwert etc.) und geben einen Einblick in die rohen Simulationsdaten, *bevor* diese für die Bildtransformation weiterverarbeitet werden.
  * Für die eigentliche Bildtransformation wird diese niedrigaufgelöste `knot_map` auf die volle Auflösung des Eingangsbildes **hochskaliert und interpoliert**.
  * Diese *skalierte* Karte (`resizedKnotMap`) dient dann als Basis für die globale Modulation der Bildwerte im nächsten Schritt.

---

### 🔹 Riemann-Analogie & Harmony Score

* Analyse der Knotendaten aus der `knot_map`:

  * Mittelwert, Standardabweichung, Median der "projizierten Re(s)-Werte" der Knoten.
* Abgeleitet: ein `harmony_score` ∈ \[0, 1]
* Bedeutung:

  * Hoch (nahe 1) = tendenziell kohärente, ruhige, harmonische Knotenanordnung in der Simulation.
  * Niedrig (nahe 0) = tendenziell chaotische, unruhige, unregelmäßige Knotenanordnung.
* Beeinflusst die globale Modulationsintensität, die Farbverschiebung und die Nachbearbeitungseffekte (Schärfe/Unschärfe) des gesamten Bildes. Eine animierte Farbwelle im Interface visualisiert diesen Wert dynamisch.

---

### 🔹 Farbanalyse

* Dominante Farben werden aus dem Eingangsbild extrahiert.
* Diese werden zu "Aktivierungswerten" für vordefinierte Farbkategorien (Rot, Grün, Blau, Cyan etc.) umgewandelt.
* Dient der **farbabhängigen Modulation** der Basis-Helligkeit und des Kontrasts während der Transformation.

---

### 🔹 Pixel-Transformation (`processImageWithSubQG`)

Dieser Schritt findet für **jeden einzelnen Pixel** des Originalbildes statt:

1. Die zuvor generierte, niedrigaufgelöste `knot_map` wird auf die volle Auflösung des Eingangsbildes skaliert und interpoliert, wodurch die `resizedKnotMap` entsteht.
2. Für **jeden Pixel** des Bildes:
   * Die ursprünglichen RGB-Werte des Pixels werden gelesen.
   * Eine Basis-Anpassung von Helligkeit und Kontrast erfolgt basierend auf den globalen Slider-Einstellungen und den `categoryActivations` (aus der Farbanalyse).
   * Ein sogenanntes **"SubQG Wave Field"** wird für die aktuelle Pixelposition berechnet. Dieses Feld entsteht durch die Kombination von Sinuswellen, deren Eigenschaften von folgenden Faktoren beeinflusst werden:
     * den normierten (x,y)-Koordinaten des aktuellen Pixels,
     * dem interpolierten Wert aus der **`resizedKnotMap`** (der hochskalierten Knot Map) an der Position des Pixels,
     * dem globalen `harmony_score`.
   * Der resultierende Wert dieses `fieldInfluence` (Einfluss des Wellenfeldes) an der Pixelposition moduliert dann kontinuierlich:
     * die **globale Farbverschiebung** (Farbtemperatur und Sättigung), die primär vom `harmonyScore` gesteuert wird.
     * die **lokale Helligkeit** des Pixels, was zu sanften, wellenartigen Helligkeitsvariationen über das gesamte Bild führt.
3. Die modifizierten RGB-Werte werden auf den gültigen Bereich \[0, 255] geklemmt und in die neue Bilddatenstruktur (`ImageData`) geschrieben.

Das Ergebnis ist ein vollständig neu berechnetes und moduliertes Bild, dessen Transformation auf kontinuierlichen Feldern basiert und somit punktuelle Effekte oder künstliche Artefakte vermeidet, die von einzelnen "Knoten" herrühren könnten.

---

### 🔹 Nachbearbeitung

* Abhängig vom `harmony_score` werden globale Filtereffekte angewendet:
  * `harmony_score` > 0.75 → leichte Schärfung und Kontrasterhöhung.
  * `harmony_score` < 0.25 → leichte Weichzeichnung (Gaußscher Weichzeichner).
* Das Bild wird auf die vom Nutzer gewählte Ausgabeauflösung skaliert.

---

### 🔹 Ausgabe

* Das transformierte Bild wird als `dataURL` generiert und im Browser angezeigt.
* Ein Download des Bildes (typischerweise als PNG) ist möglich.
* Statistiken zur SubQG-Simulation und der Riemann-Analyse (`harmony_score`) werden neben dem Bild angezeigt.

---

## Hauptmerkmale

* 🎨 Individuelle Bildtransformation durch Simulation eines physikalisch inspirierten Feldes.
* ⚙️ Vollständig parametrisierbar (Simulationsparameter, globale Transformationen).
* 🔁 Jedes Ergebnis ist potenziell **einzigartig** durch die Kombination von Parametern und der internen Dynamik der Simulation (z.B. zufällige Phasenoffsets im Wellenfeld).
* 🖼️ **Live-Visualisierung** der rohen SubQG-Knotenkarte.
* 🌊 **Animierte Visualisierung** des Harmony Scores als dynamische Farbwelle.
* 🔍 Doppelte Bildanzeige (Vorher / Nachher).
* 📊 Detaillierte Statistiken zur SubQG-Analyse & visuellen Harmonie.
* 💾 Downloadfunktion für transformierte Bilder.
* 📱 Responsive Design für verschiedene Bildschirmgrößen.
* 🖼️ Unterstützung für SVG-Dateien als Input (werden clientseitig gerastert).

---

## Technologie-Stack

* **Frontend:** React, TypeScript
* **Styling:** Tailwind CSS
* **State-Handling:** React Hooks (useState, useCallback, useEffect, useRef)
* **Bildgenerierung (optional):** Google Gemini API (`@google/genai` via `esm.sh`)
* **Client-seitige Bildverarbeitung:** Canvas API
* **Buildsystem (impliziert für `process.env.API_KEY`):** Vite, Webpack, Parcel oder ähnliches.

---

## Hinweis zur Originalität & Urheberrecht

Die transformierten Bilder sind **algorithmisch generierte Einzelstücke**.

* Es handelt sich nicht um einen einfachen Filter oder eine Kopie des Originalbildes.
* Jeder Pixel des Ausgabebildes wird auf Basis einer komplexen Simulation und mathematischer Transformationen neu berechnet.
* Dadurch entsteht ein **neues, eigenständiges digitales Werk**, das zwar vom Original inspiriert sein kann, aber eine eigene algorithmische Signatur trägt – vergleichbar mit der Interpretation eines Themas durch einen Künstler in einem anderen Medium oder Stil.
* Die Nutzung fremder Bildquellen als Basis für die Transformation impliziert nicht notwendigerweise eine Urheberrechtsverletzung, da keine direkte Reproduktion des geschützten Werkes stattfindet, sondern eine tiefgreifende algorithmische Neuinterpretation. Die rechtliche Bewertung kann jedoch im Einzelfall komplex sein.

---

## Setup & Start (Entwickler)

### Voraussetzungen

* Ein moderner Webbrowser.
* Für die optionale Bildgenerierung via Gemini: Ein gültiger Google Gemini API-Key.

### `.env` Konfiguration (Bei Verwendung eines Bundlers)

Wenn Sie die Anwendung lokal mit einem Build-Tool (wie Vite, Webpack, Parcel) entwickeln, das `process.env`-Variablen unterstützt, erstellen Sie eine `.env`-Datei im Stammverzeichnis des Projekts:

```env
VITE_API_KEY=DEIN_GEMINI_API_KEY
```
*(Das Präfix `VITE_` ist spezifisch für Vite. Andere Bundler können andere Konventionen haben, z.B. `REACT_APP_` für Create React App.)*

> Achten Sie darauf, dass Ihr Bundler so konfiguriert ist, dass `process.env.API_KEY` (oder die bundlerspezifische Variable) im Code korrekt durch den tatsächlichen Wert ersetzt wird. Die `index.html` in diesem Projekt ist für den direkten Einsatz mit `esm.sh` und einem global verfügbaren `process.env.API_KEY` (während des Build-Prozesses injiziert) konzipiert.

### Installation (Bei Verwendung eines Bundlers)

```bash
npm install
# oder
yarn install
```

### Starten der Anwendung (Bei Verwendung eines Bundlers)

```bash
npm run dev
# oder
yarn dev
```

Die Anwendung wird typischerweise unter `http://localhost:PORT` (z.B. `http://localhost:5173` für Vite) verfügbar sein.

### Direkter Start (Ohne Bundler - nur für einfache Tests mit Einschränkungen)
Die `index.html` ist so strukturiert, dass sie theoretisch direkt im Browser geöffnet werden kann, wenn der API-Key für Gemini manuell im Code (z.B. in `services/geminiService.ts` oder global) verfügbar gemacht wird. Dies wird jedoch für die Entwicklung oder den produktiven Einsatz **nicht empfohlen**, da die Handhabung von API-Keys clientseitig sicherheitskritisch ist. Die bevorzugte Methode ist die Verwendung eines Bundlers und Umgebungsvariablen.

---
