// Init audio context and variables
let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let oscList = [];
let masterGainNode = null;

// Reference to html elements
let keyboard = document.querySelector(".keyboard");
let wavePicker = document.querySelector("select[name='waveform']");
let volumeControl = document.querySelector("input[name='volume']");
let octaveDownButton = document.getElementById('octave_down')
let octaveUpButton = document.getElementById('octave_up')

// Init variable for octaver
let globalOctave = 0
let nbOctaves = 3
let maxOctave = 4

// Init global oscillators variables
let noteFreq = null;
let customWaveform = null;
let sineTerms = null;
let cosineTerms = null;


// Build the keyboard and prepare the app to play music
function setup() {

  // Create the note to frequency table
  noteFreq = createNoteTable();

  // Volume control
  volumeControl.addEventListener("change", changeVolume, false);
  masterGainNode = audioContext.createGain();
  masterGainNode.connect(audioContext.destination);
  masterGainNode.gain.value = volumeControl.value;

  // Create the keys; skip any that are sharp or flat; for
  // our purposes we don't need them. Each octave is inserted
  // into a <div> of class "octave".

  noteFreq.forEach(function(keys, idx) {
    let keyList = Object.entries(keys);
    let octaveElem = document.createElement("div");
    octaveElem.className = "octave";

    keyList.forEach(function(key) {
      if (key[0].length == 1) {
        octaveElem.appendChild(createKey(key[0], idx, key[1], false));
      }
      else {
        octaveElem.appendChild(createKey(key[0], idx, key[1], true));
      }
    });

    keyboard.appendChild(octaveElem);
  });

  sineTerms = new Float32Array([0, 0, 1, 0, 1]);
  cosineTerms = new Float32Array(sineTerms.length);
  customWaveform = audioContext.createPeriodicWave(cosineTerms, sineTerms);

  for (i=0; i<4; i++) {
      oscList[i] = {};
  }
}

setup();




//			KEYBOARD FUNCTIONS

// Create note to frequency table
function createNoteTable() {

  // Init table and variables
  let noteFreq = [];
  let listChroma = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
  for (let i=0; i<nbOctaves+1; i++) {
    noteFreq[i] = [];
  }

  noteFreq[0]["C"] = 32.703195662574829*4
  for (let i=0; i<nbOctaves; i++) {    
    for (let k=1; k<12; k++) {
      noteFreq[i][listChroma[k]] = noteFreq[i][listChroma[k-1]] * Math.pow(2,1/12);
    }
    noteFreq[i+1]["C"] = noteFreq[i]["C"]*2
  }
  
  return noteFreq;
}


// Create key according to the values of note, octave and frequency
function createKey(note, octave, freq, sharp) {
  let keyElement = document.createElement("div");
  keyElement.tagName = "key"
  let labelElement = document.createElement("div");

  if (sharp == false) {
    keyElement.className = "white_key";
  }
  else {
    keyElement.className = "black_key";
  }

  keyElement.dataset["octave"] = octave;
  keyElement.dataset["note"] = note;
  keyElement.dataset["frequency"] = freq;
  keyElement.innerHTML = note;

  keyElement.appendChild(labelElement);
  keyElement.addEventListener("mousedown", notePressed, false);
  keyElement.addEventListener("mouseup", noteReleased, false);
  keyElement.addEventListener("mouseover", notePressed, false);
  keyElement.addEventListener("mouseleave", noteReleased, false);

  return keyElement;
}



//			TONE FUNCTIONS

// Play a tone at a given frequency
function playTone(freq) {
  let osc = audioContext.createOscillator();
  osc.connect(masterGainNode);

  let type = wavePicker.options[wavePicker.selectedIndex].value;

  if (type == "custom") {
    osc.setPeriodicWave(customWaveform);
  } else {
    osc.type = type;
  }

  osc.frequency.value = freq;
  osc.start();

  return osc;
}

// Play the tone when a note is pressed
function notePressed(event) {
  if (event.buttons & 1) {
    let dataset = event.target.dataset;

    if (!dataset["pressed"]) {
      let octave = +dataset["octave"];
      oscList[octave][dataset["note"]] = playTone(dataset["frequency"]);
      dataset["pressed"] = "yes";
    }
  }
}


// Stop the tone when the note is released
function noteReleased(event) {
  let dataset = event.target.dataset;

  if (dataset && dataset["pressed"]) {
    let octave = +dataset["octave"];
    oscList[octave][dataset["note"]].stop();
    delete oscList[octave][dataset["note"]];
    delete dataset["pressed"];
  }
}

// Change master volume
function changeVolume(event) {
  let volume = parseFloat(volumeControl.value);
  if (isFinite(volume)) {
    masterGainNode.gain.value = volume;
  }
  console.log(volumeControl.value)
}

// Change octave
function TransposeOctave(x) {

  let oct = 2;
  if (x==-1){
    oct = 0.5;
  }

  for (let i=0; i<3; i++) {    
    for (let k=0; k<12; k++) {
      noteFreq[i][listChroma[k]] = noteFreq[i][listChroma[k]]*oct;
    }
    print(noteFreq[i][listChroma[k]])
  }
  noteFreq[3]["C"] = noteFreq[3]["C"]*oct
}


document.getElementById('-_OCTAVE').addEventListener('click', function() { TransposeOctave(-1); });
document.getElementById('+_OCTAVE').addEventListener('click', function() { TransposeOctave(1); });