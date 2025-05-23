// Emotion colors for UI
export const emotionColors = {
    happy: '#FFD700',     // Gold
    sad: '#4682B4',       // Steel Blue
    angry: '#FF4500',     // Orange Red
    fearful: '#800080',   // Purple
    disgusted: '#006400', // Dark Green
    surprised: '#FF69B4', // Hot Pink
    neutral: '#A9A9A9'    // Dark Gray
  };
  
  // Translate emotion names to Dutch for UI display
  export const emotionNamesDutch = {
    happy: 'BLIJ',
    sad: 'VERDRIETIG',
    angry: 'BOOS',
    fearful: 'ANGSTIG',
    disgusted: 'WALGEND',
    surprised: 'VERRAST',
    neutral: 'NEUTRAAL'
  };
  
  // Define unique musical parameters for each emotion
  export const emotionMusicData = {
    happy: {
      scale: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'], // Major scale
      chords: [['C4', 'E4', 'G4'], ['F4', 'A4', 'C5'], ['G4', 'B4', 'D5']],
      bassNotes: ['C3', 'G3', 'F3', 'G3'],
      tempo: 120,
      effects: {
        filter: 2000,
        reverb: 0.3,
        chorus: 0.3,
        delay: 0.2
      },
      synth: {
        oscillator: "triangle"
      }
    },
    sad: {
      scale: ['A3', 'C4', 'D4', 'E4', 'G4', 'A4'], // Minor scale
      chords: [['A3', 'C4', 'E4'], ['G3', 'B3', 'D4'], ['E3', 'G3', 'B3']],
      bassNotes: ['A2', 'E3', 'G2', 'D3'],
      tempo: 75,
      effects: {
        filter: 800,
        reverb: 0.8,
        chorus: 0.4,
        delay: 0.5
      },
      synth: {
        oscillator: "sine"
      }
    },
    angry: {
      scale: ['E3', 'G3', 'A3', 'B3', 'D4', 'E4'], // Phrygian mode
      chords: [['E3', 'G3', 'B3', 'D4'], ['A3', 'C4', 'E4'], ['B3', 'D4', 'F4']],
      bassNotes: ['E2', 'F2', 'D2', 'E2'],
      tempo: 140,
      effects: {
        filter: 4000,
        reverb: 0.2,
        chorus: 0.1,
        delay: 0.1,
        distortion: 0.8
      },
      synth: {
        oscillator: "sawtooth"
      }
    },
    fearful: {
      scale: ['D3', 'F3', 'G3', 'A3', 'C4', 'D4'], // Dorian mode
      chords: [['D3', 'F3', 'A3'], ['C3', 'E3', 'G3'], ['A2', 'C3', 'E3']],
      bassNotes: ['D2', 'A2', 'C2', 'G2'],
      tempo: 95,
      effects: {
        filter: 600,
        reverb: 0.9,
        chorus: 0.6,
        delay: 0.7,
        phaser: 0.6
      },
      synth: {
        oscillator: "triangle"
      }
    },
    disgusted: {
      scale: ['D3', 'E3', 'F3', 'G3', 'A3', 'C4', 'D4'], // Altered scale
      chords: [['D3', 'F3', 'G3'], ['G3', 'C4', 'D4'], ['F3', 'A3', 'C4']],
      bassNotes: ['D2', 'G2', 'F2', 'A2'],
      tempo: 85,
      effects: {
        filter: 1200,
        reverb: 0.5,
        chorus: 0.3,
        delay: 0.3,
        distortion: 0.5
      },
      synth: {
        oscillator: "square"
      }
    },
    surprised: {
      scale: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5'], // Pentatonic major
      chords: [['C4', 'E4', 'G4', 'B4'], ['G4', 'B4', 'D5'], ['A4', 'C5', 'E5']],
      bassNotes: ['C3', 'G3', 'A3', 'E3'],
      tempo: 110,
      effects: {
        filter: 3000,
        reverb: 0.4,
        chorus: 0.5,
        delay: 0.4,
        phaser: 0.4
      },
      synth: {
        oscillator: "triangle"
      }
    },
    neutral: {
      scale: ['C4', 'D4', 'E4', 'G4', 'A4'], // Pentatonic
      chords: [['C4', 'E4', 'G4'], ['G3', 'B3', 'D4'], ['A3', 'C4', 'E4']],
      bassNotes: ['C3', 'G2', 'A2', 'D3'],
      tempo: 95,
      effects: {
        filter: 1500,
        reverb: 0.5,
        chorus: 0.2,
        delay: 0.3
      },
      synth: {
        oscillator: "sine"
      }
    }
  };
  
  // Map of scale names by emotion (for UI display)
  export const emotionScaleNames = {
    happy: 'majeur',
    sad: 'mineur',
    angry: 'phrygisch',
    fearful: 'dorisch',
    disgusted: 'alternatief',
    surprised: 'pentatonisch majeur',
    neutral: 'pentatonisch'
  };