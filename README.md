# p5LiveMedia
Simple P5 WebRTC

Include this library in a p5 sketch and share audio/video streams or the canvas itself as a stream.  Can also share data (string only for now).  All WebRTC so Peer to Peer.  

Running a public signaling server on https://p5livemedia.itp.io - Run your own signalling server by running server.js (with Node, Express and Socket.io).

#### Video Introducing p5LiveMedia 
[![Introducing p5LiveMedia](https://img.youtube.com/vi/Ga3dZPrdSRg/0.jpg)](https://www.youtube.com/watch?v=Ga3dZPrdSRg "Introducing p5LiveMedia")

## Getting Started

Requires [simplepeer](https://github.com/feross/simple-peer) and [socket.io](https://socket.io/) be included in the HTML:
```
<script type="text/javascript" src="https://p5livemedia.itp.io/simplepeer.min.js"></script>
```
```
<script type="text/javascript" src="https://p5livemedia.itp.io/socket.io.js"></script>
```

Of course, this library needs to be included as well:
```
<script type="text/javascript" src="https://p5livemedia.itp.io/p5livemedia.js"></script>
```

### Basics - Sharing Live Video Stream
Use the callback from [createCapture](https://p5js.org/reference/#/p5/createCapture) to get at the media stream.  

Instantiate p5Live with:
* a reference to the sketch (this) 
* a string indicating if this is audio/video ("CAPTURE") or a canvas ("CANVAS")
* the media stream from the createCapture callback
* and a unique room name.  The sketch id from the p5 editor works well (in this case, "jZQ64AMJc").  
Add a callback for the "stream" event, in this case, a function defined later called "gotStream":
```
let myVideo = null;

function setup() {
  createCanvas(400,400);

  myVideo = createCapture(VIDEO, 
    function(stream) {
	let p5lm = new p5LiveMedia(this, "CAPTURE", stream, "jZQ64AMJc")
  	p5lm.on('stream', gotStream);
    }
  );
}
```

You can specify the normal [MediaStreamConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamConstraints) to specify framerates, sizes, and stream types.  You'll want to mute your local video to prevent feedback:
```
let myVideo = null;

function setup() {
  createCanvas(400,400);
  
  let constraints = {audio: true, video: true};
  myVideo = createCapture(constraints, 
    function(stream) {
      let p5lm = new p5LiveMedia(this, "CAPTURE", stream, "jZQ64AMJc")
      p5lm.on('stream', gotStream);
    }
  );

  myVideo.elt.muted = true;
}
```

The "stream" callback gives a normal video element: 
```
let otherVideo;
function gotStream(stream, id) {
  otherVideo = stream;
  //otherVideo.id and id are the same and unique identifier
}
```

Both video elements can be used in the draw loop:
```
function draw() {
  if (myVideo != null) {
    image(myVideo,0,0,width/2,height);
    text("My Video", 10, 10);
  }

  if (otherVideo != null) {
    image(otherVideo,width/2,0,width/2,height);
    text("Their Video", width/2+10, 10);
  }  
}
```

#### Video: Getting Started and Video Sharing Basics Part 1
[![Getting Started and Video Sharing Basics Part 1](https://img.youtube.com/vi/l0Ht-3P_x4E/0.jpg)](https://www.youtube.com/watch?v=l0Ht-3P_x4E "Getting Started and Video Sharing Basics Part 1")

#### Video: Video Sharing Basics Part 2
[![Video Sharing Basics Part 2](https://img.youtube.com/vi/U8PhnLiqPQk/0.jpg)](https://www.youtube.com/watch?v=U8PhnLiqPQk "Video Sharing Basics Part 2")

### Basics - Sharing p5 Canvas as Live Video Stream
Alternatively the p5 Canvas can be streamed instead of video:
```
let otherCanvas;

function setup() {
  let myCanvas = createCanvas(400, 400);
  let p5lm = new p5LiveMedia(this, "CANVAS", myCanvas, "e4LTqKI8Q");
  p5lm.on('stream', gotStream);
}

function draw() {
  background(220);
  fill(255,0,0);
  ellipse(mouseX,mouseY,100,100); 
}

function gotStream(stream) {
  otherCanvas = stream;
}
```

### Sharing a p5 Canvas and Live Audio
Streaming a Canvas and Audio is a little more involved:
```
let myAudio;
let myCanvas;

let otherVideo;

function setup() {
  myCanvas = createCanvas(400, 400);
  
  // Use constraints to request audio from createCapture
  let constraints = {
    audio: true
  };
  
  // Need to use the callback to get at the audio/video stream
  myAudio = createCapture(constraints, function(stream) {
    
    // Get a stream from the canvas to send
    let canvasStream = myCanvas.elt.captureStream(15);
    
    // Extract the audio tracks from the stream
    let audioTracks = stream.getAudioTracks();
    
    // Use the first audio track, add it to the canvas stream
    if (audioTracks.length > 0) {
      canvasStream.addTrack(audioTracks[0]);
    }
    
    // Give the canvas stream to SimpleSimplePeer as a "CAPTURE" stream
    let p5lm = new p5LiveMedia(this, "CAPTURE", canvasStream, "SimpleSimplePeerAdvancedTest");
    p5lm.on('stream', gotStream);       
  });
  
  myAudio.elt.muted = true;
  myAudio.hide();
}

function draw() {
  background(220);
  fill(255,0,0);
  ellipse(mouseX,mouseY,100,100); 
}

function gotStream(stream) {
  otherVideo = stream;
}
```

### Sharing Data
data can be shared between connected users (a data connection is always available between the connected users).  To use you'll need to implement an additional callback for "data":
```
let otherX = 0;
let otherY = 0;

let ssp;

function setup() {
  createCanvas(400, 400);
  
  // Passing in "DATA" as the capture type but data sharing works with "CAPTURE" and "CANVAS" as well
  p5lm = new p5LiveMedia(this, "DATA", null, "w83C-S6DU");
  // "data" callback
  p5lm.on('data', gotData);
}

function draw() {
  background(220);
  
  fill(255,0,0);
  ellipse(mouseX,mouseY,100,100); 
  
  fill(0,255,0);
  ellipse(otherX,otherY,100,100); 
}

function gotData(data, id) {
  print(id + ":" + data);
  
  // If it is JSON, parse it
  let d = JSON.parse(data);
  otherX = d.x;
  otherY = d.y;
}

function mouseMoved() {
  // Package as JSON to send
  let dataToSend = {x: mouseX, y: mouseY};
  
  // Send it
  p5lm.send(JSON.stringify(dataToSend));
}
```

### Callbacks and IDs
Each callback also includes an "id" to indicate who is sending the stream or data and there is a "disconnect" callback when a user disconnects:
```
  p5lm.on('data', gotData);
  function gotData(theData, id) {
  }
  
  p5lm.on('stream', gotStream);
  function gotStream(theStream, id) {
  }
  
  p5lm.on('disconnect', gotDisconnect);
  function gotDisconnect(id) {
  }
```

More documentation forthcoming.

## Examples
* [Basic Video Example](https://editor.p5js.org/shawn/sketches/jZQ64AMJc)
* [Basic Audio/Video Example (video overlayed)](https://editor.p5js.org/shawn/sketches/2AXFd9TLV)
* [Basic Canvas Example](https://editor.p5js.org/shawn/sketches/e4LTqKI8Q)
* [Video on Canvas Example](https://editor.p5js.org/shawn/sketches/U396jFtFT)
* [Another Video on Canvas Example](https://editor.p5js.org/shawn/sketches/fW5DrBPAK)
* [Data Only](https://editor.p5js.org/shawn/sketches/w83C-S6DU)
* [Multiple Users Overlayed](https://editor.p5js.org/shawn/sketches/1XRw9Mut5)
* [Multiple Users 3D with Data](https://editor.p5js.org/shawn/sketches/cSGEgsk1n)
* ADVANCED: [3D Shared Space](https://github.com/vanevery/3D-Shared-Space)
* ADVANCED: [Manipulated Video on Canvas + Audio](https://editor.p5js.org/shawn/sketches/SbNzhNujd)
* ADVANCED: [50 Days of Video Chat](https://github.com/vanevery/50daysofvideochat)

Contributed Examples
* [Video + Data](https://editor.p5js.org/AidanNelson/sketches/8EcgJpEUi)
* [Flocking Video](https://editor.p5js.org/AidanNelson/sketches/yu2CjoP8H)
* ADVANCED: [Frame Differencing](https://editor.p5js.org/dano/sketches/ZVOoN1GB9)
* [Simple Multiple Users](https://editor.p5js.org/dano/sketches/Xw4A5RK2J)
* [Mutiple Users Associative Array](https://editor.p5js.org/dano/sketches/pAYsVgG_r)
* [Mutliple Users with Data](https://editor.p5js.org/dano/sketches/HRvsj7kDk)
* Three.js Integration: Example Sending AV Stream from a Capture Object: [code](https://github.com/dano1234/OSC21/tree/master/Convene/ShareAVStream) [live](https://www.hypercinema.org/OSC/Convene/ShareAVStream/liveMedia.html) 
* Three.js Integration: Sending Data to Move AV Stream from Capture Object: [code](https://github.com/dano1234/OSC21/tree/master/Convene/ShareAVData) [live](https://www.hypercinema.org/OSC/Convene/ShareAVData/liveMediaData.html) 
* Three.js Integration: Example Sending from a Canvas: [code](https://github.com/dano1234/OSC21/tree/master/Convene/ShareCanvas) [live](https://www.hypercinema.org/OSC/Convene/ShareCanvas/liveMediaCanvas.html) 
