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

  * eigene Bilder (JPG, PNG) hochladen
  * neue Bilder per Prompt via **Google Gemini API** generieren (Modell: `imagen-3.0-generate-002`)
* Das Bild wird analysiert und als Ausgangsbasis gespeichert.

---

### 🔹 SubQG-Simulation

* Ein `SubQGSimulator` erzeugt ein **Energie- und Phasenfeld**
* Konfigurierbare Parameter:

  * Simulationsgröße: Bruchteil der Bildgröße (z. B. `Breite / 8`)
  * Energie- und Phasenfrequenzen (`f_energy`, `f_phase`)
  * Rauschanteil (`noise_factor`)
* **Knotendetektion**: Punkte mit kohärentem Energie- und Phasenwert (Threshold + Rundung)
* Ergebnis:

  * `knot_map`: 2D-Karte mit Knotendichte
  * Diese wird zur globalen Modulation verwendet

---

### 🔹 Riemann-Analogie & Harmony Score

* Analyse der Knotendaten:

  * Mittelwert, Standardabweichung, Median
* Abgeleitet: ein `harmony_score` ∈ \[0, 1]
* Bedeutung:

  * Hoch = kohärent, ruhig, harmonisch
  * Niedrig = chaotisch, unruhig, unregelmäßig
* Beeinflusst globale Modulationsintensität und Farbverschiebung

---

### 🔹 Farbanalyse

* Dominante Farben werden aus dem Bild extrahiert
* Zuordnung in Farbkategorien (Rot, Grün, Blau, Cyan etc.)
* Dient der **farbabhängigen Modulation** während der Transformation

---

### 🔹 Pixel-Transformation (`processImageWithSubQG`)

1. `knot_map` wird auf Bildgröße skaliert → `resizedKnotMap`
2. Für **jeden Pixel**:

   * RGB-Werte werden gelesen
   * Farb- und Kontrastbasis wird angepasst
   * Sinuswellen werden anhand von:

     * normierten Koordinaten
     * interpolierten Knotendaten
     * `harmony_score`
     * kombiniert zu einem Feld: `fieldInfluence`
   * Dieses Feld beeinflusst:

     * **Farbverschiebung**
     * **Helligkeit**
	 
3. Alle RGB-Werte werden normalisiert → `ImageData`

Ergebnis: Ein vollständig moduliertes Bild ohne punktuelle Effekte oder künstliche Artefakte.

---

### 🔹 Nachbearbeitung

* Abhängig vom `harmony_score`:

  * > 0.75 → leichte Schärfung
  * < 0.25 → Weichzeichnung
* Optionale Ausgabegrößen möglich

---

### 🔹 Ausgabe

* Bild wird als `dataURL` ausgegeben und im Browser angezeigt
* Download als PNG möglich
* Statistiken zur Simulation werden eingeblendet

---

## Hauptmerkmale

* 🎨 Individuelle Bildtransformation mit physikalischer Simulation
* ⚙️ Vollständig parametrisierbar (Farben, Felder, Wellen, Energie)
* 🔁 Jedes Ergebnis ist **einzigartig** – kein Preset, keine Wiederholung
* 🔍 Doppelte Bildanzeige (Vorher / Nachher)
* 📊 Statistiken zur SubQG-Analyse & visuelle Harmonie
* 💾 Downloadfunktion für transformierte Bilder
* 📱 Responsive Design

---

## Technologie-Stack

* **Frontend:** React, TypeScript
* **Styling:** Tailwind CSS
* **State-Handling:** React Hooks
* **Bildgenerierung:** Google Gemini API (`@google/genai`)
* **Buildsystem:** Vite/Webpack + `.env`-Konfiguration

---

## Hinweis zur Originalität & Urheberrecht

Die transformierten Bilder sind **algorithmisch generierte Einzelstücke**.

* Kein einfacher Filter, keine Kopie
* Jeder Pixel wird auf Basis einer physikalischen Simulation neu berechnet
* Damit entsteht ein **neues Werk** – vergleichbar mit der Interpretation eines Künstlers
* Die Nutzung fremder Bildquellen verletzt nicht automatisch Urheberrecht, da keine direkte Reproduktion stattfindet

---

## Setup & Start (Entwickler)

### Voraussetzungen

* Node.js & npm oder yarn
* Google Gemini API-Key

### `.env` Konfiguration

```env
VITE_API_KEY=DEIN_GEMINI_API_KEY
```

> Achte darauf, dass dein Bundler `.env`-Variablen korrekt ersetzt.

### Installation

```bash
npm install
# oder
yarn install
```

### Starten der Anwendung

```bash
npm run dev
# oder
yarn dev
```

Die Anwendung wird unter `http://localhost:PORT` verfügbar sein.

---
