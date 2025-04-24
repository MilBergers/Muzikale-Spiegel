# De Muzikale Spiegel

**De Muzikale Spiegel** is een React-applicatie die je webcam gebruikt om gelaatsuitdrukkingen te detecteren en in real-time dynamische muziek te genereren op basis van je emoties. Aangedreven door **face-api.js** voor emotieherkenning en **Tone.js** voor audio-synthese, creëert dit project een interactieve audio-visuele ervaring.

## Functies

- **Realtijd emotiedetectie**: detecteert zeven emoties (happy, sad, angry, fearful, disgusted, surprised, neutral) met face-api.js.
- **Dynamische muziekgeneratie**: past tempo, scale, chords, bass en effects aan op basis van de gedetecteerde emotie.
- **Manual Mode**: via het debug-menu kun je handmatig een emotie selecteren en de bijbehorende muziek beluisteren.
- **Volume Control**: pas het master volume aan met de slider in de app.
- **Debug Menu**: schakel tussen Dynamic (gezichtsdetectie) en Manual modus en selecteer emoties handmatig.

## Demo

1. Klik op **"Start Muziekervaring"** om de audio te initialiseren en de ervaring te starten.
2. Maak expressieve gelaatsuitdrukkingen om de muzikale stemming dynamisch te veranderen.
3. Gebruik de **Debug** knop (rechtsonder) om het ontwikkelaarsmenu te openen voor handmatige bediening.

## Prerequisites

- Node.js (v14 of nieuwer)
- npm
- Browser met webcam-ondersteuning (bijv. Chrome, Firefox)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MilBergers/Muzikale-Spiegel.git
   cd Muzikale-Spiegel
   ```

2. **Install dependencies**  
   ```bash
   npm install
   ```

3. **Models**  
   De benodigde face-api.js modellen zijn al opgenomen in de map `public/models`. Er is dus geen extra download nodig.

## Running Locally

Start de development server:

```bash
npm start
```

De app opent op [http://localhost:3000](http://localhost:3000). Sta camera-toegang toe wanneer daarom wordt gevraagd.

## Building for Production

Genereer een productie-build:

```bash
npm run build
```

De geoptimaliseerde bestanden vind je in de `build/` directory.

## Project Structure

```
public/
├── index.html
└── models/            # face-api.js modelbestanden
src/
├── App.js             # Main React component
├── App.css            # Application styles
└── index.js           # App entry point
```

## Acknowledgements

- **face-api.js**
- **Tone.js**
