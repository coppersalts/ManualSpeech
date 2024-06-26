const requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame;
let canvas, canvasCtx;
let canvasWidth, canvasHeight, pixelRatio;
let _xmouse = 0;
let _ymouse = 0;
let mouseIsDown = false;
let pmouseIsDown = false;
let lastClickX, lastClickY, valueAtClick;
let doubleClickTimer = -1;
const doubleClickThreshold = 300;
let keysDown = {};
const fontFamily = 'Helvetica';

let zoomKeyPressed = false;
let startPlayKeyPressed = false;
let stopPlayKeyPressed = false;

let audioCtx, mainGain, vowelBaseSound, consonantsBaseSound, voicedConsonantBaseSoundGain, voicedConsonantBaseSoundFilter, customBaseSound, customBaseSoundFile;

const formantFilters = [];
const numberOfFormants = 6;
const consonantFilters = [];
const numberOfConsonantFilters = 6;
const bandpassWidth = -10;
const baseGain = 0.1;
const voicedConsonantNoiseGainMultiplier = 0.4;
let playingPreview = false;
let timeAtPlay;
let playbackId = 0;

let minFreq = 0; // Lowest frequency visible on the frequency map.
let maxFreq = 4000;
let minTime = -0.2;
let maxTime = 3;

const graphWidth = 570;
const graphHeight = 250;
const graphX = 40;
const graphY = 100;
const popupWidth = 600;
const popupHeight = 360;
let popupX, popupY; // Calculated on setup.
const popupMargin = 20;
const ipachartBoxSize = {w:50,h:30,x:90,y:10};
const popupOkButtonSize = {w:80,h:30};
const formantAdderBoxSize = {w:50,h:50,x:30,y:30};
const formantAdderTypeButtonsSize = {w:70,h:30,x:30,y:230,spacing:10};
const formantAdderSlidersSize = {h:70,y:20,knobRadius:6};
const bottomOptionsSize = {x:35, y:18, w:85};
const bottomOptionsText = ['Formants', 'Pitch'];
const optionsMenuSize = {x:35,y:40,vspacing:25,hspacing:150};
let selectedBottomOption = 0;
const graphXButtonHeight = 20;
const subdivisions = 2;
const draggableTimeBoundaryWidth = 3;
const dropdownOptionHeight = 20;
const addDropdownWidth = 60;
const addDropdownOptions = ['hold','glide','gltl. stop','consnt.'];
const A4 = 440;
const noteNames = ['A',0,'A#',1,'Bb',1,'B',2,'Cb',2,'B#',3,'C',3,'C#',4,'Db',4,'D',5,'D#',6,'Eb',6,'E',7,'Fb',7,'E#',8,'F',8,'F#',9,'Gb',9,'G',10,'G#',11,'Ab',11];

let glottisSoundType = 1;
const glottisSoundTypeNames = ['Sawtooth', 'Liljencrants–Fant', 'File Upload (no pitch)'];
let glottisTenseness = 0.4;

let selectedFormant = [-1, 0];
let selectedDraggableTimeBoundary = -1;
let selectedConsonant = -1;
let selectedPitchEnvelopePoint = -1;
let frequencyPopupText;
let addDropdownOpen = false;
let addDropdownOpenLastFrame = false; // I hate that I have to do this
let addDropdownPosition = [0, 0];
let popupOpen = false;
let popupOpenLastFrame = false;
let popupType = -1;
let formantsPopupNewValues = [];

const consonantFilterPresets = {
	'bilabial': [[12000,10000,0.05],[5000,1000,0.1]],
	'labiodental': [[13000,10000,0.2],[8000,5000,0.1]],
	'dental': [[14000,3000,0.2]],
	'alveolar sibilant': [[15000,2000,0.05],[11000,9000,0.25],[7000,5000,0.2]],
	'postalveolar sibilant': [[11000,8000,0.04],[5500,5000,0.3],[3500,2500,0.25]],
	'velar': [[12000,10000,0.1],[5100,5000,0.2],[2100,2000,0.2]],
};
const defaultFormantValues = [240, 2400, 2500, 2600, 2700, 2800];

let debugFrame = false;
let debugKeyPress = false;

// const conosnantChart = [
// 	['-','bilabial','labiodental','dental','alveolar','postalveolar','retroflex','velar','uvular','glottal'],
// 	['fricative (ns)',['ɸ','β'],['f','v'],['θ','ð'],['θ̠','ð̠'],['ɹ̠̊˔','ɹ̠˔'],['ɻ̊˔','ɻ˔'],['ç','ʝ'],['x','ɣ'],['χ','ʁ'],['h','ɦ']],
// 	['fricative (s)',[],[],[],['s','z'],['ʃ','ʒ'],['ʂ','ʐ'],['ɕ','ʑ'],[],[],[]],
// 	['plosive/stop',['p','b'],['p̪','b̪'],['t̪','d̪'],['t','d'],['ʈ','ɖ'],[],['c','ɟ'],['k','g'],['q','ɢ'],[]],
// ];
const consonantChart = [
	['-','bilabial','labiodental','dental','alveolar','postalveolar','velar'],
	['fricative (ns)',['ɸ','β'],['f','v'],['θ','ð'],[],[],['x','ɣ']],
	['fricative (s)',[],[],[],['s','z'],['ʃ','ʒ'],[]],
];

let editorFormants = [{
	type: 'hold',
	formants: [240,2400,null,null,null,null],
	formantGains: [1,1,0,0,0,0],
	time: 0.0
},{
	type: 'hold',
	formants: [null,null,null,null,null,null],
	formantGains: [0,0,0,0,0,0],
	time: 0.15
}];
let pitchEnvelope = [[220, 0]];

window.onload = function() {
	// Canvas setup
	canvas = document.getElementById('main-canvas');
	canvasCtx = canvas.getContext('2d', { alpha: false });
	pixelRatio = window.devicePixelRatio;
	canvasWidth = canvas.width;
	canvasHeight = canvas.height;
	canvas.style.width = canvasWidth + 'px';
	canvas.style.height = canvasHeight + 'px';
	// Account for pixel density
	canvas.width = Math.floor(canvasWidth * pixelRatio);
	canvas.height = Math.floor(canvasHeight * pixelRatio);

	popupX = (canvasWidth - popupWidth) / 2;
	popupY = (canvasHeight - popupHeight) / 2;
	
	window.addEventListener('pointermove', mousemove);
	window.addEventListener('pointerdown', mousedown);
	window.addEventListener('pointerup', mouseup);
	window.addEventListener('keydown', keydown);
	window.addEventListener('keyup', keyup);
	document.getElementById('upload').addEventListener('change', handleFiles, false);

	requestAnimationFrame(draw);
}

function draw() {
	canvasCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
	canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);
	canvasCtx.fillStyle = '#fff';
	canvasCtx.fillRect(0, 0, canvasWidth, canvasHeight); 

	// Process user input
	if (!addDropdownOpen && !popupOpen && !mouseIsDown && pmouseIsDown) {
		selectedDraggableTimeBoundary = -1;
		if (doubleClickTimer === -1) {
			doubleClickTimer = performance.now();
			selectedFormant = [-1, 0];
		} else if (selectedFormant[0] !== -1) {
			popupOpen = true;
			popupType = 1;
			formantsPopupNewValues = [...editorFormants[selectedFormant[0]].formants];
		} else if (selectedPitchEnvelopePoint !== -1) {
			popupOpen = true;
			popupType = 2;
			frequencyPopupText = '';
		}
	}
	if (!addDropdownOpen && !popupOpen  && selectedFormant[0] !== -1) {
		editorFormants[selectedFormant[0]].formants[selectedFormant[1]] = (valueAtClick[0] - minFreq) + mapRange(lastClickY-_ymouse, 0, graphHeight, minFreq, maxFreq);
		if (keysDown['Shift'] && editorFormants[selectedFormant[0]+1].formants[selectedFormant[1]] !== null)
			editorFormants[selectedFormant[0]+1].formants[selectedFormant[1]] = editorFormants[selectedFormant[0]].formants[selectedFormant[1]];
		else
			editorFormants[selectedFormant[0]+1].formants[selectedFormant[1]] = valueAtClick[1];
	}
	if (!addDropdownOpen && !popupOpen && selectedDraggableTimeBoundary !== -1) {
		editorFormants[selectedDraggableTimeBoundary].time = mapRange(_xmouse-graphX, 0, graphWidth, minTime, maxTime) + (valueAtClick[0] - mapRange(lastClickX-graphX, 0, graphWidth, minTime, maxTime));
		if (selectedDraggableTimeBoundary > 0 && editorFormants[selectedDraggableTimeBoundary].time < editorFormants[selectedDraggableTimeBoundary-1].time)
			editorFormants[selectedDraggableTimeBoundary].time = editorFormants[selectedDraggableTimeBoundary-1].time;
		else if (selectedDraggableTimeBoundary < editorFormants.length - 1 && editorFormants[selectedDraggableTimeBoundary].time > editorFormants[selectedDraggableTimeBoundary+1].time)
			editorFormants[selectedDraggableTimeBoundary].time = editorFormants[selectedDraggableTimeBoundary+1].time;
		else if (editorFormants[selectedDraggableTimeBoundary].time <= 0)
			editorFormants[selectedDraggableTimeBoundary].time = 0;
		if (keysDown['Shift']) {
			for (var i = selectedDraggableTimeBoundary+1; i < editorFormants.length; i++) {
				editorFormants[i].time = valueAtClick[i-selectedDraggableTimeBoundary] + (editorFormants[selectedDraggableTimeBoundary].time - valueAtClick[0]);
			}
		}
	}
	if (!addDropdownOpen && !popupOpen && selectedPitchEnvelopePoint !== -1 ) {
		pitchEnvelope[selectedPitchEnvelopePoint] = [mapRange(_ymouse-graphY, 0, graphHeight, maxFreq, minFreq), mapRange(_xmouse-graphX, 0, graphWidth, minTime, maxTime)];
		if (selectedPitchEnvelopePoint > 0 && pitchEnvelope[selectedPitchEnvelopePoint-1][1] > pitchEnvelope[selectedPitchEnvelopePoint][1]) {
			pitchEnvelope[selectedPitchEnvelopePoint][1] = pitchEnvelope[selectedPitchEnvelopePoint-1][1];
		} else if (selectedPitchEnvelopePoint < pitchEnvelope.length-1 && pitchEnvelope[selectedPitchEnvelopePoint+1][1] < pitchEnvelope[selectedPitchEnvelopePoint][1]) {
			pitchEnvelope[selectedPitchEnvelopePoint][1] = pitchEnvelope[selectedPitchEnvelopePoint+1][1];
		}
		if (valueAtClick[0] !== -1) {
			if (keysDown['Shift']) {
				pitchEnvelope[valueAtClick[1]][0] = pitchEnvelope[selectedPitchEnvelopePoint][0];
			} else {
				pitchEnvelope[valueAtClick[1]][0] = valueAtClick[0];
			}
		}
		if (!mouseIsDown) selectedPitchEnvelopePoint = -1;
	}
	// Zoom keys
	if (!addDropdownOpen && !popupOpen  && (keysDown['='] || keysDown['-'] || keysDown['+'] || keysDown['_']) && onRect(_xmouse, _ymouse, 0, 0, canvasWidth, canvasHeight)) {
		if (!zoomKeyPressed) {
			if (keysDown['=']) {
				const mappedXMouse = mapRange(_xmouse-graphX, 0, graphWidth, minTime, maxTime);
				const newMinTime = mappedXMouse - (mappedXMouse - minTime) / 2;
				maxTime = mappedXMouse + (maxTime - mappedXMouse) / 2;
				minTime = newMinTime;
			} else if (keysDown['-']) {
				const mappedXMouse = mapRange(_xmouse-graphX, 0, graphWidth, minTime, maxTime);
				const newMinTime = mappedXMouse - (mappedXMouse - minTime) * 2;
				maxTime = mappedXMouse + (maxTime - mappedXMouse) * 2;
				minTime = newMinTime;
			} else if (keysDown['+']) {
				const mappedYMouse = mapRange(_ymouse-graphY, graphHeight, 0, minFreq, maxFreq);
				const newMinFreq = mappedYMouse - (mappedYMouse - minFreq) / 2;
				maxFreq = mappedYMouse + (maxFreq - mappedYMouse) / 2;
				minFreq = newMinFreq;
				if (minFreq < 0) {
					maxFreq += minFreq;
					minFreq = 0;
				}
			} else if (keysDown['_']) {
				const mappedYMouse = mapRange(_ymouse-graphY, graphHeight, 0, minFreq, maxFreq);
				const newMinFreq = mappedYMouse - (mappedYMouse - minFreq) * 2;
				maxFreq = mappedYMouse + (maxFreq - mappedYMouse) * 2;
				minFreq = newMinFreq;
				if (minFreq < 0) {
					maxFreq += minFreq;
					minFreq = 0;
				}
			}
			zoomKeyPressed = true;
		}
	} else zoomKeyPressed = false;
	// Play key
	if (!stopPlayKeyPressed) {
		if (keysDown[' ']) {
			if (!playingPreview && !startPlayKeyPressed && !popupOpen) {
				startPlaying();
				addDropdownOpen = false;
				startPlayKeyPressed = true;
			}
		} else startPlayKeyPressed = false;
	}
	if (!startPlayKeyPressed) {
		if (keysDown[' ']) {
			if (playingPreview && !startPlayKeyPressed && !stopPlayKeyPressed) {
				stopPlaying(playbackId);
				addDropdownOpen = false;
				popupOpen = false;
				stopPlayKeyPressed = true;
			}
		} else stopPlayKeyPressed = false;
	}
	// Debug key (later parts of the code may use this to console log stuff for just one frame)
	debugFrame = false;
	if (keysDown['d']) {
		if (!debugKeyPress) debugFrame = true;
		debugKeyPress = true;
	} else debugKeyPress = false;

	canvasCtx.save();
	canvasCtx.translate(graphX, graphY);

	// Draw grid
	canvasCtx.strokeStyle = 'grey';
	canvasCtx.lineCap = 'butt';
	canvasCtx.fillStyle = 'black';
	canvasCtx.font = '8pt '+fontFamily;
	canvasCtx.textAlign = 'center';
	canvasCtx.textBaseline = 'bottom';
	let smallPowerOf10 = Math.ceil(Math.log10(maxTime - minTime))-1;
	canvasCtx.lineWidth = 0.5;
	for (var i = 0; i < subdivisions; i++) {
		const justHalves = i == subdivisions-1 && 10**smallPowerOf10 < (maxTime - minTime) / 20;
		for (var j = Math.ceil(minTime / 10**smallPowerOf10); j < maxTime / 10**smallPowerOf10; j++) {
			if (justHalves && j % 5 != 0) continue;
			const lineX = mapRange(j, minTime / 10**smallPowerOf10, maxTime / 10**smallPowerOf10, 0, graphWidth);
			canvasCtx.beginPath();
			canvasCtx.moveTo(lineX, 0);
			canvasCtx.lineTo(lineX, graphHeight);
			canvasCtx.stroke();
			if (i == subdivisions-1)
				canvasCtx.fillText(+(j * 10**(smallPowerOf10)).toFixed(10), lineX, -3); // toFixed is to deal with any float imprecision errors.
		}
		canvasCtx.lineWidth /= 2.0;
		smallPowerOf10--;
	}
	canvasCtx.textAlign = 'right';
	canvasCtx.textBaseline = 'middle';
	smallPowerOf10 = Math.ceil(Math.log10(maxFreq - minFreq))-1;
	canvasCtx.lineWidth = 0.5;
	for (var i = 0; i < subdivisions; i++) {
		const justHalves = i == subdivisions-1 && 10**smallPowerOf10 < (maxFreq - minFreq) / 20;
		for (var j = Math.ceil(minFreq / 10**smallPowerOf10); j < maxFreq / 10**smallPowerOf10; j++) {
			if (justHalves && j % 5 != 0) continue;
			const lineY = mapRange(j, minFreq / 10**smallPowerOf10, maxFreq / 10**smallPowerOf10, graphHeight, 0);
			canvasCtx.beginPath();
			canvasCtx.moveTo(0, lineY);
			canvasCtx.lineTo(graphWidth, lineY);
			canvasCtx.stroke();
			if (i == subdivisions-1)
				canvasCtx.fillText(+(j * 10**(smallPowerOf10)).toFixed(10), -3, lineY); // toFixed is to deal with any float imprecision errors.
		}
		canvasCtx.lineWidth /= 2.0;
		smallPowerOf10--;
	}

	// Draw formants
	canvasCtx.save();
	canvasCtx.beginPath();
	canvasCtx.rect(0, 0, graphWidth, graphHeight);
	canvasCtx.clip();
	let draggableTimeBoundaryDrawn = false;
	const mouseInRange = onRect(_xmouse, _ymouse, graphX, graphY, graphWidth, graphHeight);
	for (var i = 0; i < editorFormants.length; i++) {
		const x1 = mapRange(editorFormants[i].time, minTime, maxTime, 0, graphWidth);
		const x2 = mapRange(editorFormants[(i < editorFormants.length - 1)?i+1:i].time, minTime, maxTime, 0, graphWidth);
		let mouseInHorizontalRange = onRect(_xmouse-graphX, _ymouse-graphY, x1+draggableTimeBoundaryWidth*2, 0, x2-x1-draggableTimeBoundaryWidth*3, graphHeight) && selectedFormant[0] === -1 && mouseInRange && selectedBottomOption === 0;
		let drawDraggableTimeBoundary = false;
		if (selectedDraggableTimeBoundary === -1 && !popupOpen && !draggableTimeBoundaryDrawn && selectedBottomOption === 0 && onRect(_xmouse-graphX, _ymouse-graphY, x1-draggableTimeBoundaryWidth, 0, draggableTimeBoundaryWidth*draggableTimeBoundaryWidth, graphHeight) && selectedFormant[0] === -1 && mouseInRange) {
			drawDraggableTimeBoundary = true;
			draggableTimeBoundaryDrawn = true;
		}
		let sectionHasSelectedFormant = false;
		if (i < editorFormants.length - 1) { // fencepost
			for (var j = 0; j < editorFormants[i].formants.length; j++) {
				if (editorFormants[i].formants[j] === null) continue;
				const y1 = graphHeight - mapRange(editorFormants[i].formants[j], minFreq, maxFreq, 0, graphHeight);
				const y2 = graphHeight - mapRange(editorFormants[(editorFormants[i+1].formants[j]===null||editorFormants[i+1].type=='hold')?i:i+1].formants[j], minFreq, maxFreq, 0, graphHeight);
				if (selectedDraggableTimeBoundary === -1 && !popupOpen && !draggableTimeBoundaryDrawn && !sectionHasSelectedFormant && mouseInHorizontalRange && pointToLineDistance(x1, y1, x2, y2, _xmouse-graphX, _ymouse-graphY) < 7) {
					sectionHasSelectedFormant = true;
					canvasCtx.strokeStyle = 'blue';
					canvasCtx.lineCap = 'butt';
					canvasCtx.lineWidth = 4;
					canvasCtx.beginPath();
					canvasCtx.moveTo(x1, y1);
					canvasCtx.lineTo(x2, y2);
					canvasCtx.stroke();
					if (mouseIsDown && !pmouseIsDown) {
						selectedFormant = [i, j];
						valueAtClick = [editorFormants[i].formants[j], editorFormants[i+1].formants[j]];
					}
				}
				canvasCtx.strokeStyle = editorFormants[i].type=='hold'?'cyan':'green';
				canvasCtx.lineCap = 'round';
				canvasCtx.lineWidth = 2;
				canvasCtx.globalAlpha = editorFormants[i].formantGains[j];
				canvasCtx.beginPath();
				canvasCtx.moveTo(x1, y1);
				canvasCtx.lineTo(x2, y2);
				canvasCtx.stroke();
				canvasCtx.globalAlpha = 1;
			}
		}
		// Draw consonants
		if (editorFormants[i].type == 'consonant') {
			const thisFilterSet = consonantFilterPresets[editorFormants[i].placeOfArticulation];
			if (debugFrame) console.log(thisFilterSet);
			for (var j = 0; j < thisFilterSet.length; j++) {
				const y1 = mapRange(thisFilterSet[j][0], minFreq, maxFreq, graphHeight, 0);
				const y2 = mapRange(thisFilterSet[j][1], minFreq, maxFreq, graphHeight, 0);
				canvasCtx.fillStyle = editorFormants[i].voiced?'red':'blue';
				canvasCtx.globalAlpha = thisFilterSet[j][2];
				canvasCtx.fillRect(x1, y1, x2-x1, y2-y1);
			}
			canvasCtx.globalAlpha = 1;

			if (mouseInHorizontalRange && !mouseIsDown && pmouseIsDown && _xmouse == lastClickX && _ymouse == lastClickY && !addDropdownOpen) {
				popupOpen = true;
				selectedConsonant = i;
				popupType = 0;
			}
		}
		// Draw draggable time boundary
		if (drawDraggableTimeBoundary || selectedDraggableTimeBoundary === i) {
			canvasCtx.strokeStyle = 'black';
			canvasCtx.lineCap = 'butt';
			canvasCtx.lineWidth = 2;
			canvasCtx.beginPath();
			canvasCtx.moveTo(x1, 0);
			canvasCtx.lineTo(x1, graphHeight);
			canvasCtx.stroke();
			if (mouseIsDown && !pmouseIsDown) {
				selectedDraggableTimeBoundary = i;
				valueAtClick = editorFormants.filter((item, index) => index >= i).map((filteredItem) => filteredItem.time);
			} else if (!mouseIsDown && pmouseIsDown && _xmouse == lastClickX &&  _ymouse == lastClickY && !addDropdownOpen && !popupOpen) {
				selectedDraggableTimeBoundary = i;
				addDropdownOpen = true;
				addDropdownPosition = [lastClickX, lastClickY];
			}
		}
	}

	// Draw pitch envelope
	if (selectedBottomOption === 1) {
		canvasCtx.lineCap = 'round';
		canvasCtx.strokeStyle = 'magenta';
		canvasCtx.lineWidth = 2;
		canvasCtx.beginPath();
		canvasCtx.moveTo(0, mapRange(pitchEnvelope[0][0], minFreq, maxFreq, graphHeight, 0));
		for (var i = 0; i < pitchEnvelope.length; i++) {
			canvasCtx.lineTo(mapRange(pitchEnvelope[i][1], minTime, maxTime, 0, graphWidth), mapRange(pitchEnvelope[i][0], minFreq, maxFreq, graphHeight, 0));
		}
		canvasCtx.lineTo(graphWidth, mapRange(pitchEnvelope[i-1][0], minFreq, maxFreq, graphHeight, 0));
		canvasCtx.stroke();
		let pointRemoved = false;
		for (var i = pitchEnvelope.length - 1; i >= 0; i--) {
			if (selectedPitchEnvelopePoint == -1 && pointToPointDistance(_xmouse-graphX, _ymouse-graphY, mapRange(pitchEnvelope[i][1], minTime, maxTime, 0, graphWidth), mapRange(pitchEnvelope[i][0], minFreq, maxFreq, graphHeight, 0)) < 5 && mouseIsDown && !pmouseIsDown) {
				if (keysDown['Control']) {
					pitchEnvelope.splice(i, 1);
					pointRemoved = true;
					continue;
				} else {
					selectedPitchEnvelopePoint = i;
					valueAtClick = [(i<pitchEnvelope.length-1)?pitchEnvelope[i+1][0]:-1, i+1];
				}
			}
			canvasCtx.beginPath();
			canvasCtx.arc(mapRange(pitchEnvelope[i][1], minTime, maxTime, 0, graphWidth), mapRange(pitchEnvelope[i][0], minFreq, maxFreq, graphHeight, 0), 5, 0, Math.PI*2);
			canvasCtx.stroke();
		}
		if (selectedPitchEnvelopePoint == -1 && mouseIsDown && !pmouseIsDown && !pointRemoved && onRect(_xmouse, _ymouse, graphX, graphY, graphWidth, graphHeight)) {
			const newPoint = [mapRange(_ymouse-graphY, 0, graphHeight, maxFreq, minFreq), mapRange(_xmouse-graphX, 0, graphWidth, minTime, maxTime)];
			for (var i = 0; i < pitchEnvelope.length && pitchEnvelope[i][1] < newPoint[1]; i++);
			pitchEnvelope.splice(i, 0, newPoint);
			selectedPitchEnvelopePoint = i;
			valueAtClick = [(i<pitchEnvelope.length-1)?pitchEnvelope[i+1][0]:-1, i+1];
		}
	}
	canvasCtx.restore();

	// Draw vowel delete buttons
	// Repeating myself a bit here 1) to avoid the clip restored in the above line, and 2) because the horizontal range variable in the above loop only extends to the vertical height of the graph and no lower. And 3) because I think removing in the middle of the loop would probably break something and I don't feel like looping backwards.
	canvasCtx.strokeStyle = 'red';
	canvasCtx.lineCap = 'round';
	canvasCtx.lineWidth = 2;
	for (var i = 0; i < editorFormants.length; i++) {
		const x1 = mapRange(editorFormants[i].time, minTime, maxTime, 0, graphWidth);
		const x2 = mapRange(editorFormants[(i < editorFormants.length - 1)?i+1:i].time, minTime, maxTime, 0, graphWidth);
		if (selectedFormant[0] === -1 && selectedDraggableTimeBoundary === -1 && !popupOpen && selectedBottomOption === 0 && onRect(_xmouse-graphX, _ymouse-graphY, x1+draggableTimeBoundaryWidth*2, 0, x2-x1-draggableTimeBoundaryWidth*3, graphHeight + graphXButtonHeight) && selectedFormant[0] === -1) {
			drawXIcon(x1+(x2-x1)/2, graphHeight + graphXButtonHeight - 10, 5, ()=>{
				const timeToMoveBackBy = editorFormants[i+1].time - editorFormants[i].time;
				for (var j = i+1; j < editorFormants.length; j++) {
					editorFormants[j].time -= timeToMoveBackBy;
				}
				editorFormants.splice(i, 1);
			}, ()=>{});
			break;
		}
	}

	// Draw playhead
	if (playingPreview) {
		const currentPlayheadTime = (performance.now() - timeAtPlay) / 1000;
		const playheadX = mapRange(currentPlayheadTime, minTime, maxTime, 0, graphWidth);
		if (playheadX > 0 && playheadX < graphWidth) {
			canvasCtx.strokeStyle = 'purple';
			canvasCtx.lineCap = 'butt';
			canvasCtx.lineWidth = 1;
			canvasCtx.beginPath();
			canvasCtx.moveTo(playheadX, 0);
			canvasCtx.lineTo(playheadX, graphHeight);
			canvasCtx.stroke();
		}
	}
	canvasCtx.restore();

	// Draw bottom options
	canvasCtx.font = '10pt '+fontFamily;
	canvasCtx.textBaseline = 'middle';
	canvasCtx.textAlign = 'left';
	for (var i = 0; i < bottomOptionsText.length; i++) {
		drawRadioButton(bottomOptionsSize.x + bottomOptionsSize.w*i, canvasHeight - bottomOptionsSize.y, 6, selectedBottomOption===i, ()=>{if (!addDropdownOpen && !popupOpen) selectedBottomOption = i;});
		canvasCtx.fillStyle = '#000';
		canvasCtx.fillText(bottomOptionsText[i], bottomOptionsSize.x + bottomOptionsSize.w*i + 10, canvasHeight - bottomOptionsSize.y);
	}
	canvasCtx.textAlign = 'right';
	canvasCtx.fillText('Options', canvasWidth - 15, canvasHeight - bottomOptionsSize.y);
	if (!popupOpen && !addDropdownOpen && onRect(_xmouse, _ymouse, canvasWidth - 15 - 50, canvasHeight - bottomOptionsSize.y - 7, 50, 14) && pmouseIsDown && !mouseIsDown) {
		popupOpen = true;
		popupType = 3;
		if (playingPreview) stopPlaying(playbackId);
	}

	// Draw formant dragging tooltip
	if (selectedFormant[0] !== -1 && !popupOpen) {
		canvasCtx.fillStyle = '#eee';
		canvasCtx.strokeStyle = 'darkgrey';
		canvasCtx.beginPath();
		canvasCtx.rect(lastClickX, _ymouse, 52, 18);
		canvasCtx.stroke();
		canvasCtx.fill();
		canvasCtx.fillStyle = '#000';
		canvasCtx.font = '12pt '+fontFamily;
		canvasCtx.textAlign = 'center';
		canvasCtx.textBaseline = 'bottom';
		canvasCtx.fillText(+editorFormants[selectedFormant[0]].formants[selectedFormant[1]].toFixed(1), lastClickX + 26, _ymouse + 18);
	}

	// Draw add dropdown
	canvasCtx.font = '10pt '+fontFamily;
	canvasCtx.textAlign = 'left';
	canvasCtx.textBaseline = 'bottom';
	dropdown: if (addDropdownOpen) {
		if (addDropdownOpenLastFrame && !mouseIsDown && pmouseIsDown) {
			addDropdownOpen = false;
			for (var i = 0; i < addDropdownOptions.length; i++) {
				if (onRect(_xmouse, _ymouse, addDropdownPosition[0], addDropdownPosition[1] + dropdownOptionHeight*i, addDropdownWidth, dropdownOptionHeight)) {
					let newSoundLength = 0.15;
					let newSound = {
						type: (i==1?'glide':'hold'),
						formants: i==2?[null,null,null,null,null,null]:[240,2400,null,null,null,null],
						formantGains: i==2?[0,0,0,0,0,0]:[1,1,0,0,0,0],
						time: editorFormants[selectedDraggableTimeBoundary].time};
					if (i == 3) {
						newSound.type = 'consonant';
						newSound.formants = [null,null,null,null,null,null];
						newSound.formantGains = [0,0,0,0,0,0];
						newSound.placeOfArticulation = 'alveolar sibilant';
						newSound.voiced = false;
					}
					editorFormants.splice(selectedDraggableTimeBoundary, 0, newSound);
					for (var i = selectedDraggableTimeBoundary+1; i < editorFormants.length; i++) {
						editorFormants[i].time += newSoundLength;
					}
					break;
				}
			}
			selectedDraggableTimeBoundary = -1;
			break dropdown;
		}
		canvasCtx.fillStyle = '#eee';
		canvasCtx.strokeStyle = 'darkgrey';
		canvasCtx.beginPath();
		canvasCtx.rect(addDropdownPosition[0], addDropdownPosition[1], addDropdownWidth, dropdownOptionHeight * addDropdownOptions.length);
		canvasCtx.fill();
		canvasCtx.stroke();
		canvasCtx.fillStyle = 'black';
		for (var i = 0; i < addDropdownOptions.length; i++) {
			canvasCtx.fillText(addDropdownOptions[i], addDropdownPosition[0] + 3, addDropdownPosition[1] + dropdownOptionHeight*(i+1));
		}
	}

	// Draw popup
	canvasCtx.font = '10pt '+fontFamily;
	canvasCtx.textAlign = 'left';
	canvasCtx.textBaseline = 'bottom';
	popup: if (popupOpen) {
		if (popupOpenLastFrame && !mouseIsDown && pmouseIsDown) {
			switch(popupType) {
				case 0:
					popupOpen = false;
					for (var j = 0; j < consonantChart.length; j++) {
						for (var i = 0; i < consonantChart[j].length; i++) {
							if (onRect(_xmouse, _ymouse, popupX + ipachartBoxSize.x + ipachartBoxSize.w*(i-1), popupY + ipachartBoxSize.y + ipachartBoxSize.h*j, ipachartBoxSize.w, ipachartBoxSize.h) && consonantChart[j][i].length > 0) {
								editorFormants[selectedConsonant].placeOfArticulation = consonantChart[0][i]+(j==2?' sibilant':'');
								editorFormants[selectedConsonant].voiced = _xmouse > popupX + ipachartBoxSize.x + ipachartBoxSize.w*(i-0.5);
							}
						}
					}
					break popup;
				case 1:
					if (bothOnRect(_xmouse, _ymouse, lastClickX, lastClickY, popupX + popupWidth - popupMargin - popupOkButtonSize.w, popupY + popupHeight - popupMargin - popupOkButtonSize.h, popupOkButtonSize.w, popupOkButtonSize.h)) {
						popupOpen = false;
						editorFormants[selectedFormant[0]].formants = [...formantsPopupNewValues];
						selectedFormant = [-1, 0];
						break popup;
					}
					for (var i = 0; i < numberOfFormants; i++) {
						if (bothOnRect(_xmouse, _ymouse, lastClickX, lastClickY, popupX + formantAdderBoxSize.x + formantAdderBoxSize.w*(i*2), popupY + formantAdderBoxSize.y, formantAdderBoxSize.w, formantAdderBoxSize.h)) {
							if (formantsPopupNewValues[i] === null)
								formantsPopupNewValues[i] = editorFormants[selectedFormant[0]].formants[i] === null?defaultFormantValues[i]:editorFormants[selectedFormant[0]].formants[i];
							else formantsPopupNewValues[i] = null;
						}
					}
					for (var i = 0; i < 2; i++) {
						if (bothOnRect(_xmouse, _ymouse, lastClickX, lastClickY, popupX + formantAdderTypeButtonsSize.x, popupY + formantAdderTypeButtonsSize.y + formantAdderTypeButtonsSize.h*i + formantAdderTypeButtonsSize.spacing*(i-1), formantAdderTypeButtonsSize.w, formantAdderTypeButtonsSize.h)) {
							editorFormants[selectedFormant[0]].type = addDropdownOptions[i];
						}
					}
					break;
				case 3:
					if (bothOnRect(_xmouse, _ymouse, lastClickX, lastClickY, popupX + popupWidth - popupMargin - popupOkButtonSize.w, popupY + popupHeight - popupMargin - popupOkButtonSize.h, popupOkButtonSize.w, popupOkButtonSize.h)) {
						popupOpen = false;
						break popup;
					}
			}
		}
		canvasCtx.fillStyle = '#000';
		canvasCtx.globalAlpha = 0.5;
		canvasCtx.fillRect(0, 0, canvasWidth, canvasHeight);
		canvasCtx.fillStyle = '#fff';
		canvasCtx.globalAlpha = 1;
		canvasCtx.fillRect(popupX, popupY, popupWidth, popupHeight);
		switch(popupType) {
			case 0:
				canvasCtx.strokeStyle = '#000';
				canvasCtx.fillStyle = '#000';
				canvasCtx.lineWidth = 1;
				canvasCtx.textBaseline = 'middle';
				for (var j = 0; j < consonantChart.length; j++) {
					for (var i = 0; i < consonantChart[j].length; i++) {
						if (i == 0) {
							canvasCtx.textAlign = 'right';
							canvasCtx.font = '8pt '+fontFamily;
							canvasCtx.fillText(consonantChart[j][i], popupX + ipachartBoxSize.x + ipachartBoxSize.w*i - 10, popupY + ipachartBoxSize.y + ipachartBoxSize.h*(j+0.5));
						} else if (j == 0) {
							canvasCtx.textAlign = 'center';
							canvasCtx.font = '8pt '+fontFamily;
							canvasCtx.fillText(consonantChart[j][i], popupX + ipachartBoxSize.x + ipachartBoxSize.w*(i-0.5), popupY + ipachartBoxSize.y + ipachartBoxSize.h*(j+0.5));
						} else {
							if (consonantChart[j][i].length > 0) {
								canvasCtx.textAlign = 'center';
								canvasCtx.font = '12pt '+fontFamily;
								canvasCtx.fillText(consonantChart[j][i][0], popupX + ipachartBoxSize.x + ipachartBoxSize.w*(i-(2/3)), popupY + ipachartBoxSize.y + ipachartBoxSize.h*(j+0.5));
								canvasCtx.fillText(consonantChart[j][i][1], popupX + ipachartBoxSize.x + ipachartBoxSize.w*(i-(1/3)), popupY + ipachartBoxSize.y + ipachartBoxSize.h*(j+0.5));
							}
							canvasCtx.strokeRect(popupX + ipachartBoxSize.x + ipachartBoxSize.w*(i-1), popupY + ipachartBoxSize.y + ipachartBoxSize.h*j, ipachartBoxSize.w, ipachartBoxSize.h);
						}
					}
				}
				break;
			case 1:
				// OK button
				canvasCtx.fillStyle = '#eee';
				canvasCtx.strokeStyle = 'darkgrey';
				canvasCtx.beginPath();
				canvasCtx.rect(popupX + popupWidth - popupMargin - popupOkButtonSize.w, popupY + popupHeight - popupMargin - popupOkButtonSize.h, popupOkButtonSize.w, popupOkButtonSize.h);
				canvasCtx.fill();
				canvasCtx.stroke();
				canvasCtx.fillStyle = '#000';
				canvasCtx.font = '12pt '+fontFamily;
				canvasCtx.textAlign = 'center';
				canvasCtx.textBaseline = 'middle';
				canvasCtx.lineWidth = 1;
				canvasCtx.fillText('OK', popupX + popupWidth - popupMargin - popupOkButtonSize.w/2, popupY + popupHeight - popupMargin - popupOkButtonSize.h/2);
				
				// Formant toggles
				canvasCtx.fillStyle = '#000';
				canvasCtx.font = '24pt '+fontFamily;
				canvasCtx.textAlign = 'center';
				canvasCtx.textBaseline = 'middle';
				for (var i = 0; i < numberOfFormants; i++) {
					canvasCtx.strokeStyle = formantsPopupNewValues[i] === null?'red':'green';
					canvasCtx.strokeRect(popupX + formantAdderBoxSize.x + formantAdderBoxSize.w*(i*2), popupY + formantAdderBoxSize.y, formantAdderBoxSize.w, formantAdderBoxSize.h);
					canvasCtx.fillText('F'+(i+1), popupX + formantAdderBoxSize.x + formantAdderBoxSize.w*(i*2+0.5), popupY + formantAdderBoxSize.y + formantAdderBoxSize.h/2);
				}

				// Gain sliders
				const slidersY = popupY + formantAdderBoxSize.y + formantAdderBoxSize.h + formantAdderSlidersSize.y;
				canvasCtx.lineCap = 'round';
				canvasCtx.lineWidth = 3;
				canvasCtx.strokeStyle = 'grey';
				canvasCtx.fillStyle = 'dodgerblue';
				for (var i = 0; i < editorFormants[selectedFormant[0]].formantGains.length; i++) {
					const thisSliderX = popupX + formantAdderBoxSize.x + formantAdderBoxSize.w*(i*2+0.5);
					canvasCtx.beginPath();
					canvasCtx.moveTo(thisSliderX, slidersY);
					canvasCtx.lineTo(thisSliderX, slidersY + formantAdderSlidersSize.h);
					canvasCtx.stroke();
					if (mouseIsDown && pointToLineDistance(thisSliderX, slidersY, thisSliderX, slidersY + formantAdderSlidersSize.h, lastClickX, lastClickY) <= formantAdderSlidersSize.knobRadius && lastClickY >= slidersY && lastClickY <= slidersY + formantAdderSlidersSize.h) {
						editorFormants[selectedFormant[0]].formantGains[i] = constrain(mapRange(_ymouse - slidersY, 0, formantAdderSlidersSize.h, 1, 0), 0, 1);
					}
					canvasCtx.beginPath();
					canvasCtx.arc(thisSliderX, mapRange(editorFormants[selectedFormant[0]].formantGains[i], 1, 0, 0, formantAdderSlidersSize.h) + slidersY, formantAdderSlidersSize.knobRadius, 0, Math.PI * 2);
					canvasCtx.fill();
				}

				// Type switcher buttons
				canvasCtx.fillStyle = '#000';
				canvasCtx.font = '18pt '+fontFamily;
				canvasCtx.textAlign = 'center';
				canvasCtx.textBaseline = 'middle';
				canvasCtx.lineWidth = 1;
				for (var i = 0; i < 2; i++) {
					canvasCtx.strokeStyle = editorFormants[selectedFormant[0]].type === addDropdownOptions[i]?'green':'red';
					canvasCtx.strokeRect(popupX + formantAdderTypeButtonsSize.x, popupY + formantAdderTypeButtonsSize.y + formantAdderTypeButtonsSize.h*i + formantAdderTypeButtonsSize.spacing*(i-1), formantAdderTypeButtonsSize.w, formantAdderTypeButtonsSize.h);
					canvasCtx.fillText(addDropdownOptions[i], popupX + formantAdderTypeButtonsSize.x + formantAdderTypeButtonsSize.w/2, popupY + formantAdderTypeButtonsSize.y + formantAdderTypeButtonsSize.h*(i+0.5) + formantAdderTypeButtonsSize.spacing*(i-1));
				}
				break;
			case 2:
				canvasCtx.fillStyle = '#000';
				canvasCtx.font = '18pt '+fontFamily;
				canvasCtx.textAlign = 'center';
				canvasCtx.textBaseline = 'middle';
				canvasCtx.fillText('Enter frequency in Hz or note name:', canvasWidth/2, canvasHeight/2 - 50);
				canvasCtx.font = '50pt '+fontFamily;
				canvasCtx.fillText(frequencyPopupText, canvasWidth/2, canvasHeight/2 + 20);
				if (keysDown['Enter'] || keysDown['Return']) {
					let freqToSet = parseFloat(frequencyPopupText);
					if (isNaN(freqToSet) && frequencyPopupText.match(/^[A-Ga-g][#b]?\d+$/)) {
						const noteNumber = noteNames[noteNames.indexOf(frequencyPopupText.replace(/[0-9]/g, ''))+1];
						const octave = +frequencyPopupText.replace(/[^0-9]/g, '');
						freqToSet = A4 * 2**((noteNumber+(octave-4)*12)/12);
						console.log(noteNumber);
					}
					if (!isNaN(freqToSet)) {
						pitchEnvelope[selectedPitchEnvelopePoint][0] = freqToSet;
					}
					popupOpen = false;
					popupType = -1;
					selectedPitchEnvelopePoint = -1;
				}
				break;
			case 3:
				// OK button
				canvasCtx.fillStyle = '#eee';
				canvasCtx.strokeStyle = 'darkgrey';
				canvasCtx.beginPath();
				canvasCtx.rect(popupX + popupWidth - popupMargin - popupOkButtonSize.w, popupY + popupHeight - popupMargin - popupOkButtonSize.h, popupOkButtonSize.w, popupOkButtonSize.h);
				canvasCtx.fill();
				canvasCtx.stroke();
				canvasCtx.fillStyle = '#000';
				canvasCtx.font = '12pt '+fontFamily;
				canvasCtx.textAlign = 'center';
				canvasCtx.textBaseline = 'middle';
				canvasCtx.lineWidth = 1;
				canvasCtx.fillText('OK', popupX + popupWidth - popupMargin - popupOkButtonSize.w/2, popupY + popupHeight - popupMargin - popupOkButtonSize.h/2);

				canvasCtx.textBaseline = 'middle';
				canvasCtx.textAlign = 'left';
				canvasCtx.font = '10pt '+fontFamily;
				for (var i = 0; i < glottisSoundTypeNames.length; i++) {
					drawRadioButton(optionsMenuSize.x, optionsMenuSize.y + optionsMenuSize.vspacing*(i+1), 6, glottisSoundType===i, ()=>{
						glottisSoundType = i;
						document.getElementById('upload').setAttribute('style', glottisSoundType==2?'':'display:none');
					});
					canvasCtx.fillStyle = '#000';
					canvasCtx.fillText(glottisSoundTypeNames[i], optionsMenuSize.x + 10, optionsMenuSize.y + optionsMenuSize.vspacing*(i+1));
				}
				canvasCtx.font = 'bold 14pt '+fontFamily;
				canvasCtx.fillStyle = '#000';
				canvasCtx.fillText('Glottis Sound', optionsMenuSize.x, optionsMenuSize.y);
				if (glottisSoundType == 1) {
					canvasCtx.fillText('Tenseness', optionsMenuSize.x + optionsMenuSize.hspacing, optionsMenuSize.y);

					const thisSliderX = optionsMenuSize.x + optionsMenuSize.hspacing + 50;
					const slidersY = optionsMenuSize.y + optionsMenuSize.vspacing;
				canvasCtx.lineCap = 'round';
				canvasCtx.lineWidth = 3;
				canvasCtx.strokeStyle = 'grey';
				canvasCtx.fillStyle = 'dodgerblue';
					canvasCtx.beginPath();
					canvasCtx.moveTo(thisSliderX, slidersY);
					canvasCtx.lineTo(thisSliderX, slidersY + formantAdderSlidersSize.h);
					canvasCtx.stroke();
					if (mouseIsDown && pointToLineDistance(thisSliderX, slidersY, thisSliderX, slidersY + formantAdderSlidersSize.h, lastClickX, lastClickY) <= formantAdderSlidersSize.knobRadius && lastClickY >= slidersY && lastClickY <= slidersY + formantAdderSlidersSize.h) {
						glottisTenseness = constrain(mapRange(_ymouse - slidersY, 0, formantAdderSlidersSize.h, 1, 0), 0, 1);
					}
					canvasCtx.beginPath();
					canvasCtx.arc(thisSliderX, mapRange(glottisTenseness, 1, 0, 0, formantAdderSlidersSize.h) + slidersY, formantAdderSlidersSize.knobRadius, 0, Math.PI * 2);
					canvasCtx.fill();
				}
				break;
		}
	}

	if (doubleClickTimer >= 0 && performance.now() - doubleClickTimer > doubleClickThreshold) doubleClickTimer = -1;
	pmouseIsDown = mouseIsDown;
	addDropdownOpenLastFrame = addDropdownOpen;
	popupOpenLastFrame = popupOpen;
	requestAnimationFrame(draw);
}



// Sound functions

function playPreview() {
	if (playingPreview) {
		stopPlaying(playbackId);
	} else {
		startPlaying();
	}
}

function startPlaying() {
	reinitContext(); 
	createBaseSounds();
	initFilters();
	setAllFormants();
	audioCtx.currentTime = 0; 
	if (customBaseSound && glottisSoundType == 2) customBaseSoundFile.play();
	else vowelBaseSound.start();
	if (!(customBaseSound && glottisSoundType == 2)) consonantBaseSound.start();
	playingPreview = true;
	playbackId++;
	let thisPlaybackId = playbackId;
	timeAtPlay = performance.now();
	setTimeout(()=>{stopPlaying(thisPlaybackId)}, editorFormants[editorFormants.length-1].time * 1000);
}

function stopPlaying(pid) {
	if (playbackId !== pid) return;
	if (customBaseSound && glottisSoundType == 2) customBaseSoundFile.pause();
	else vowelBaseSound.stop();
	if (!(customBaseSound && glottisSoundType == 2)) consonantBaseSound.stop();
	playingPreview = false;
}

function reinitContext() {
	audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	mainGain = audioCtx.createGain();
	mainGain.gain.value = baseGain;
	mainGain.connect(audioCtx.destination);
}

function createBaseSounds() {
	// Voiced vowels
	if (customBaseSound && glottisSoundType == 2) {
		customBaseSoundFile = new Audio(URL.createObjectURL(customBaseSound));
		vowelBaseSound = audioCtx.createMediaElementSource(customBaseSoundFile);
	} else {
		vowelBaseSound = audioCtx.createOscillator();
		if (glottisSoundType == 0) {
			vowelBaseSound.type = 'sawtooth';
		} else if (glottisSoundType == 1) {
			const frequencies = discreteFourierTransform(createLFWaveform(glottisTenseness, 500));
			const customOscillator = audioCtx.createPeriodicWave(frequencies.map((e) => e.re), frequencies.map((e) => e.im));
			vowelBaseSound.setPeriodicWave(customOscillator);
		} else {
			vowelBaseSound.type = 'sine';
		}
		vowelBaseSound.frequency.setValueAtTime(pitchEnvelope[0][0], 0);
		for (var i = 0; i < pitchEnvelope.length; i++) {
			vowelBaseSound.frequency.linearRampToValueAtTime(pitchEnvelope[i][0], pitchEnvelope[i][1]<0?0:pitchEnvelope[i][1]);
		}
	}

	if (customBaseSound && glottisSoundType == 2) {
		consonantBaseSound = audioCtx.createMediaElementSource(customBaseSoundFile);
	} else {
		// Unvoiced consonants
		var bufferSize = 2 * audioCtx.sampleRate,
			noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate),
			output = noiseBuffer.getChannelData(0);
		for (var i = 0; i < bufferSize; i++) {
			output[i] = Math.random() * 2 - 1;
		}
		consonantBaseSound = audioCtx.createBufferSource();
		consonantBaseSound.buffer = noiseBuffer;
		consonantBaseSound.loop = true;
	}
}

function initFilters() {
	for (var i = 0; i < numberOfFormants; i++) {
		// Create bandpass out of low and high pass.
		let lowpass = audioCtx.createBiquadFilter();
		lowpass.type = 'lowpass';
		lowpass.frequency.setValueAtTime(1, 0);
		lowpass.Q.setValueAtTime(10, 0);
		let highpass = audioCtx.createBiquadFilter();
		highpass.type = 'highpass';
		highpass.frequency.setValueAtTime(1, 0);
		highpass.Q.setValueAtTime(10, 0);
		let gain = audioCtx.createGain();
		gain.gain.setValueAtTime(1, 0);

		vowelBaseSound.connect(gain);
		gain.connect(lowpass);
		lowpass.connect(highpass);
		highpass.connect(mainGain);

		formantFilters[i] = [lowpass,highpass,gain];
	}

	for (var i = 0; i < numberOfConsonantFilters; i++) {
		let lowpass = audioCtx.createBiquadFilter();
		lowpass.type = 'lowpass';
		lowpass.frequency.setValueAtTime(1, 0);
		lowpass.Q.setValueAtTime(10, 0);
		let highpass = audioCtx.createBiquadFilter();
		highpass.type = 'highpass';
		highpass.frequency.setValueAtTime(1, 0);
		highpass.Q.setValueAtTime(10, 0);
		let gain = audioCtx.createGain();
		gain.gain.setValueAtTime(0 , 0);

		consonantBaseSound.connect(gain);
		gain.connect(lowpass);
		lowpass.connect(highpass);
		highpass.connect(mainGain);

		consonantFilters[i] = [lowpass,highpass,gain];
	}

	voicedConsonantBaseSoundFilter = audioCtx.createBiquadFilter();
	voicedConsonantBaseSoundFilter.type = 'lowpass';
	voicedConsonantBaseSoundFilter.frequency.setValueAtTime(500, 0);
	voicedConsonantBaseSoundFilter.Q.setValueAtTime(1, 0);
	voicedConsonantBaseSoundGain = audioCtx.createGain();
	voicedConsonantBaseSoundGain.gain.setValueAtTime(0, 0);
	vowelBaseSound.connect(voicedConsonantBaseSoundGain);
	voicedConsonantBaseSoundGain.connect(voicedConsonantBaseSoundFilter);
	voicedConsonantBaseSoundFilter.connect(mainGain);
}

function setAllFormants() {
	for (var i = 0; i < editorFormants.length; i++) {
		setFormantFrequenciesAtTime(editorFormants[i]);
	}
}

function setFormantFrequenciesAtTime(data) {
	// for (var i = 0; i < consonantFilters.length; i++) consonantFilters[i].gain.setValueAtTime(0, time);
	for (var i = 0; i < formantFilters.length; i++) {
		if (data.formants[i] === null || data.formants[i] === undefined) {
			if (data.type=='glide') formantFilters[i][2].gain.linearRampToValueAtTime(0, data.time);
			else formantFilters[i][2].gain.setValueAtTime(0, data.time);
		} else {
			if (data.type=='glide') {
				formantFilters[i][0].frequency.linearRampToValueAtTime(data.formants[i] + bandpassWidth, data.time);
				formantFilters[i][1].frequency.linearRampToValueAtTime(data.formants[i] - bandpassWidth, data.time);
				formantFilters[i][2].gain.linearRampToValueAtTime(data.formantGains[i], data.time);
			} else {
				formantFilters[i][0].frequency.setValueAtTime(data.formants[i] + bandpassWidth, data.time);
				formantFilters[i][1].frequency.setValueAtTime(data.formants[i] - bandpassWidth, data.time);
				formantFilters[i][2].gain.setValueAtTime(data.formantGains[i], data.time);
			}
		}
	}
	if (data.type=='consonant') {
		const thisFilter = consonantFilterPresets[data.placeOfArticulation];
		for (var i = 0; i < consonantFilters.length; i++) {
			if (i < thisFilter.length) {
				consonantFilters[i][0].frequency.setValueAtTime(thisFilter[i][0], data.time);
				consonantFilters[i][1].frequency.setValueAtTime(thisFilter[i][1], data.time);
				consonantFilters[i][2].gain.setValueAtTime(thisFilter[i][2]*(data.voiced?voicedConsonantNoiseGainMultiplier:1), data.time);
			} else {
				consonantFilters[i][2].gain.setValueAtTime(0, data.time);
			}
		}

		voicedConsonantBaseSoundGain.gain.setValueAtTime(data.voiced?1:0, data.time);
	} else {
		for (var i = 0; i < consonantFilters.length; i++) {
			consonantFilters[i][2].gain.setValueAtTime(0, data.time);
			voicedConsonantBaseSoundGain.gain.setValueAtTime(0, data.time);
		}
	}
}

// stolen from Pink Trombone
// https://dsuedholt.github.io/files/blog/pink-trombone/glottal-source.html
function createLFWaveform(tenseness, samples) {
	loudness = 1;

	var Rd = 3*(1-tenseness);
	if (Rd<0.5) Rd = 0.5;
	if (Rd>2.7) Rd = 2.7;
	// normalized to time = 1, Ee = 1
	var Ra = -0.01 + 0.048*Rd;
	var Rk = 0.224 + 0.118*Rd;
	var Rg = (Rk/4)*(0.5+1.2*Rk)/(0.11*Rd-Ra*(0.5+1.2*Rk));

	var Ta = Ra;
	var Tp = 1 / (2*Rg);
	var Te = Tp + Tp*Rk;

	var epsilon = 1/Ta;
	var shift = Math.exp(-epsilon * (1-Te));
	var Delta = 1 - shift; // divide by this to scale RHS

	var RHSIntegral = (1/epsilon)*(shift - 1) + (1-Te)*shift;
	RHSIntegral = RHSIntegral/Delta;

	var totalLowerIntegral = - (Te-Tp)/2 + RHSIntegral;
	var totalUpperIntegral = -totalLowerIntegral;

	var omega = Math.PI/Tp;
	var s = Math.sin(omega*Te);
	var y = -Math.PI*s*totalUpperIntegral / (Tp*2);
	var z = Math.log(y);
	var alpha = z/(Tp/2 - Te);
	var E0 = -1 / (s*Math.exp(alpha*Te));
	var output = [];
	for (var i = 0; i < samples; i++) {
		var t = mapRange(i, 0, samples, 0, Te*2);
		if (t>Te) output.push(((-Math.exp(-epsilon * (t-Te)) + shift)/Delta) * loudness);
		else output.push(E0 * Math.exp(alpha*t) * Math.sin(omega * t) * loudness);
	}

	return output;
}

//https://stackoverflow.com/questions/44343806/discrete-fourier-transforms-in-javascript
const CLOSE_TO_ZERO_THRESHOLD = 1e-10;
function discreteFourierTransform(inputAmplitudes, zeroThreshold = CLOSE_TO_ZERO_THRESHOLD) {
	const N = inputAmplitudes.length;
	const signals = [];

	// Go through every discrete frequency.
	for (let frequency = 0; frequency < N; frequency++) {
		// Compound signal at current frequency that will ultimately
		// take part in forming input amplitudes.
		let frequencySignal = {re:0, im:0};

		// Go through every discrete point in time.
		for (let timer = 0; timer < N; timer++) {
			const currentAmplitude = inputAmplitudes[timer];

			// Calculate rotation angle.
			const rotationAngle = -1 * (2 * Math.PI) * frequency * (timer / N);

			// Remember that e^ix = cos(x) + i * sin(x);
			const dataPointContribution = complexMultiply(
				{re: Math.cos(rotationAngle), im: Math.sin(rotationAngle)},
				{re: currentAmplitude, im: 0});

			// Add this data point's contribution.
			frequencySignal = complexAdd(frequencySignal, dataPointContribution);
		}

		// Close to zero? You're zero.
		if (Math.abs(frequencySignal.re) < zeroThreshold) frequencySignal.re = 0;
		if (Math.abs(frequencySignal.im) < zeroThreshold) frequencySignal.im = 0;

		// Average contribution at this frequency.
		// The 1/N factor is usually moved to the reverse transform (going from frequencies
		// back to time). This is allowed, though it would be nice to have 1/N in the forward
		// transform since it gives the actual sizes for the time spikes.
		frequencySignal = complexDivide(frequencySignal, {re:N,im:0});

		// Add current frequency signal to the list of compound signals.
		signals[frequency] = frequencySignal;
	}

	return signals;
}



// Draw functions

function drawXIcon(x, y, size, onClick, onHover) {
	if (onRect(_xmouse-graphX, _ymouse-graphY, x-size, y-size, size*2, size*2)) {
		onHover();
		if (mouseIsDown && !pmouseIsDown) onClick();
	}
	canvasCtx.beginPath();
	canvasCtx.moveTo(x-size, y-size);
	canvasCtx.lineTo(x+size, y+size);
	canvasCtx.moveTo(x+size, y-size);
	canvasCtx.lineTo(x-size, y+size);
	canvasCtx.stroke();
}

function drawRadioButton(x, y, size, enabled, onClick) {
	if (onRect(_xmouse, _ymouse, x-size, y-size, size*2, size*2)) {
		if (mouseIsDown && !pmouseIsDown) onClick();
	}
	if (enabled) {
		canvasCtx.strokeStyle = 'dodgerblue';
		canvasCtx.fillStyle = 'dodgerblue';
		canvasCtx.beginPath();
		canvasCtx.arc(x, y, size*0.67, 0, Math.PI*2);
		canvasCtx.fill();
	} else {
		canvasCtx.strokeStyle = 'darkgrey';
	}
	canvasCtx.lineWidth = 1;
	canvasCtx.beginPath();
	canvasCtx.arc(x, y, size, 0, Math.PI*2);
	canvasCtx.stroke();
}



// Utility functions

function mapRange(value, inMin, inMax, outMin, outMax) {
	return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

function constrain(value, min, max) {
	return value>max?max:value<min?min:value;
}

function onRect(tx, ty, x, y, w, h) {
	return tx > x && tx < x + w && ty > y && ty < y + h;
}

function bothOnRect(tx1, ty1, tx2, ty2, x, y, w, h) {
	return onRect(tx1, ty1, x, y, w, h) && onRect(tx2, ty2, x, y, w, h);
}

// x0 and y0 are the point, the other two sets of coordinates are the points defining the line. 
function pointToLineDistance(x1, y1, x2, y2, x0, y0) {
	return Math.abs((x2-x1)*(y0-y1) - (x0-x1)*(y2-y1)) / Math.sqrt((x2-x1)**2 + (y2-y1)**2);
}

function pointToPointDistance(x0, y0, x1, y1) {
	return Math.sqrt(Math.abs(x0-x1)**2 + Math.abs(y0-y1)**2);
}

function complexMultiply(c1, c2) {
	return {re: c1.re*c2.re - c1.im*c2.im, im: c1.re*c2.im + c1.im*c2.re};
}

function complexDivide(c1, c2) {
	return {re: (c1.re*c2.re + c1.im*c2.im)/(c2.re*c2.re + c2.im*c2.im),
		im: (c1.im*c2.re + c1.re*c2.im)/(c2.re*c2.re + c2.im*c2.im)};
}

function complexAdd(c1, c2) {
	return {re: c1.re + c2.re, im: c1.im + c2.im};
}



// Event handlers

function mousemove(event) {
	_xmouse = event.pageX - canvas.getBoundingClientRect().left - window.scrollX;
	_ymouse = event.pageY - canvas.getBoundingClientRect().top - window.scrollY;
}

function mousedown(event) {
	mouseIsDown = true;
	lastClickX = _xmouse;
	lastClickY = _ymouse;
}

function mouseup(event) {
	mouseIsDown = false;
}

function keydown(event) {
	keysDown[event.key] = true;
	if (popupOpen && popupType == 2) {
		if (event.key.length == 1) frequencyPopupText += event.key;
		else if (event.key === 'Backspace') frequencyPopupText = frequencyPopupText.slice(0, -1);
	}

	// Prevent space bar from scrolling the page.
	if (event.keyCode == 32 && event.target == document.body) {
		event.preventDefault();
	}
}

function keyup(event) {
	keysDown[event.key] = false;
}

function handleFiles(event) {
    var files = event.target.files;
    console.log(files[0]);
    customBaseSound = files[0];
}
