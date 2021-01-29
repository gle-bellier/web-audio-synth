// Init audio context and variables
let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let oscList = [];
let masterGainNode = null;
let ringGainNode = null;

// Reference to html elements
let keyboard = document.querySelector(".keyboard");
let wavePicker = document.querySelector("select[name='waveform']");
let volumeControl = document.querySelector("input[name='volume']");
let ringControl = document.querySelector("input[name='ring']");
let octaveDownButton = document.getElementById('octave_down')
let octaveUpButton = document.getElementById('octave_up')

// Init variable for octaver
let nbOctaves = 3

// Init global oscillators variables
let noteFreq = null;
let customWaveform = null;
let sineTerms = null;
let cosineTerms = null;

// Build chroma list
let listChroma = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]

// Build the keyboard and prepare the app to play music
function setup() {

  // Create the note to frequency table
  noteFreq = createNoteTable();

  // Volume control
  volumeControl.addEventListener("change", changeVolume, false);
  masterGainNode = audioContext.createGain();
  masterGainNode.connect(audioContext.destination);
  masterGainNode.gain.value = volumeControl.value;

  // Ring modulation control
  ringControl.addEventListener("change", changeRing, false);
  ringGainNode = audioContext.createGain();
  ringGainNode.connect(masterGainNode);
  ringGainNode.gain.value = ringControl.value;

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

    // Init Web Midi
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess().then(onMIDIInit, onMIDIReject);
    } else {
        console.log("No MIDI support present in your browser. You're gonna have a bad time.");
    }
}

setup();


//      MIDI FUNCTIONS

// Midi callback is called if Midi is accessible
function onMIDIInit (midi) {
    console.log('MIDI ready!');

    let haveAtLeastOneDevice = false;
    let inputs = midi.inputs.values();

    // assign Midi Event Handler for all midi Inputs (for example)
    for (let input of inputs) {
        console.log(input); // id : new one is created on machine reboot or on new connection
        input.onmidimessage = getMIDIMessage;
        haveAtLeastOneDevice = true;
    }

    if (!haveAtLeastOneDevice) { console.log("No MIDI input devices present. You're gonna have a bad time."); }
}

// Reject Midi
function onMIDIReject (err) {
    console.log("The MIDI system failed to start. You're gonna have a bad time.");
}

// Receive MIDI message
function getMIDIMessage(message) {

    var command = message.data[0];
    var note = message.data[1];
    var velocity = (message.data.length > 2) ? message.data[2] : 0; // a velocity value might not be included with a noteOff command

    switch (command) {
        case 144: // note on
            if (velocity > 0) {
                noteOn(note);
            } else {
                noteOff(note);
            }
            break;
        case 128: // note off
            noteOff(note);
            break;
        // we could easily expand this switch statement to cover other types of commands such as controllers or sysex
    }
}

// Function to handle noteOn messages (ie. key is pressed)
// Think of this like an 'onkeydown' event
function noteOn(note) {
  let octave = Math.trunc(note / 12) - 1;
  let chroma = note % 12
  let keys = Array.from(document.querySelectorAll("div.white_key, div.black_key"));

  if ((octave >= 0 && octave < 3) || (octave == 3 && chroma == 0)) {
    let keyOn = keys.find(key => (key.dataset["octave"] == octave && key.dataset["note"] == listChroma[chroma]));
    oscList[keyOn.dataset["octave"]][keyOn.dataset["note"]] = playTone(keyOn.dataset["frequency"]);
    // Color in red when the note is played
    keyOn.style.backgroundColor="rgb(250, 1, 1)";
  }

}

// Function to handle noteOff messages (ie. key is released)
// Think of this like an 'onkeyup' event
function noteOff(note) {
  let octave = Math.trunc(note / 12) - 1;
  let chroma = note % 12
  let keys = Array.from(document.querySelectorAll("div.white_key, div.black_key"));

  if ((octave >= 0 && octave < 3) || (octave == 3 && chroma == 0)) {
    let keyOff = keys.find(key => (key.dataset["octave"] == octave && key.dataset["note"] == listChroma[chroma]));
    oscList[keyOff.dataset["octave"]][keyOff.dataset["note"]].stop();
    delete oscList[keyOff.dataset["octave"]][keyOff.dataset["note"]];

    // Get the color back to normal when note is released
    if (keyOff.dataset["note"].length == 1){
      keyOff.style.backgroundColor="rgb(250, 250, 250)";
    }
    else {
      keyOff.style.backgroundColor="rgb(0, 0, 0)";
    }
  }
}


//			KEYBOARD FUNCTIONS

// Create note to frequency table
function createNoteTable() {

  // Init table and variables
  let noteFreq = [];
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

  var ringGain = audioContext.createGain();
  ringGain.gain.setValueAtTime(0, 0);
  var ringCarrier = audioContext.createOscillator();
  ringCarrier.type = ringCarrier.SINE;
  ringCarrier.frequency.setValueAtTime(freq*0.5, 0);
  ringCarrier.connect(ringGain.gain);
  osc.connect(ringGain);

  ringGain.connect(ringGainNode);
  ringCarrier.start();

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

    // Color in red when the note is played
    event.target.style.backgroundColor="rgb(250, 1, 1)";
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

  // Get the color back to normal when note is released
  if (dataset["note"].length == 1) {
    event.target.style.backgroundColor="rgb(250, 250, 250)";
  }
  else {
    event.target.style.backgroundColor="rgb(0, 0, 0)";
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

// Change ring modulation
function changeRing(event) {
  let ring = parseFloat(ringControl.value);
  if (isFinite(ring)) {
    ringGainNode.gain.value = ring;
  }
  console.log(ringControl.value)
}

// Change octave
function TransposeOctave(x) {

  let oct = 2;
  if (x==-1){
    oct = 0.5;
  }

  let keys = document.querySelectorAll("div.white_key, div.black_key");
  keys.forEach((key) => {
    key.dataset["frequency"] = key.dataset["frequency"]*oct;
  });

}

document.getElementById('-_OCTAVE').addEventListener('click', function() { TransposeOctave(-1); });
document.getElementById('+_OCTAVE').addEventListener('click', function() { TransposeOctave(1); });