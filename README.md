# p5.simplesimplepeer
Simple P5 WebRTC

Include this library in a p5 sketch and share audio/video streams or the canvas itself as a stream.  Can also share data (string only for now).  All WebRTC so Peer to Peer.  

Running a public signaling server on https://simplesimplepeer.itp.io - Run your own signalling server by running server.js (with Node, Express and Socket.io) or do it o [Glitch](https://glitch.com/~p5-simplesimplepeer).  

## Getting Started

Requires [simplepeer](https://github.com/feross/simple-peer) and [socket.io](https://socket.io/) be included in the HTML:
```
<script type="text/javascript" src="https://simplesimplepeer.itp.io/simplepeer.min.js"></script>
```
```
<script type="text/javascript" src="https://simplesimplepeer.itp.io/socket.io.js"></script>
```

Of course, this library needs to be included as well:
```
<script type="text/javascript" src="https://simplesimplepeer.itp.io/simplesimplepeer.js"></script>
```

### Basics - Sharing Live Video Stream
Use the callback from [createCapture](https://p5js.org/reference/#/p5/createCapture) to get at the media stream.  

Instantiate SimpleSimplePeer with:
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
	let ssp = new SimpleSimplePeer(this, "CAPTURE", stream, "jZQ64AMJc")
  	ssp.on('stream', gotStream);
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
      let ssp = new SimpleSimplePeer(this, "CAPTURE", stream, "jZQ64AMJc")
      ssp.on('stream', gotStream);
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

### Basics - Sharing p5 Canvas as Live Video Stream
Alternatively the p5 Canvas can be streamed instead of video:
```
let otherCanvas;

function setup() {
  let myCanvas = createCanvas(400, 400);
  let ssp = new SimpleSimplePeer(this, "CANVAS", myCanvas, "e4LTqKI8Q");
  ssp.on('stream', gotStream);
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
    let ssp = new SimpleSimplePeer(this, "CAPTURE", canvasStream, "SimpleSimplePeerAdvancedTest");
    ssp.on('stream', gotStream);       
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
  ssp = new SimpleSimplePeer(this, "DATA", null, "w83C-S6DU");
  // "data" callback
  ssp.on('data', gotData);
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
  ssp.send(JSON.stringify(dataToSend));
}
```

### Callbacks and IDs
Each callback also includes an "id" to indicate who is sending the stream or data and there is a "disconnect" callback when a user disconnects:
```
  ssp.on('data', gotData);
  function gotData(theData, id) {
  }
  
  ssp.on('stream', gotStream);
  function gotStream(theStream, id) {
  }
  
  ssp.on('disconnect', gotDisconnect);
  function gotDisconnect(id) {
  }
```

More documentation forthcoming.

## Examples
* Basic Video Example: https://editor.p5js.org/shawn/sketches/jZQ64AMJc
* Basic Audio/Video Example (on same canvas): https://editor.p5js.org/shawn/sketches/2AXFd9TLV
* Basic Canvas Example: https://editor.p5js.org/shawn/sketches/e4LTqKI8Q
* Video on Canvas Example: https://editor.p5js.org/shawn/sketches/U396jFtFT
* Another Video on Canvas Example: https://editor.p5js.org/shawn/sketches/fW5DrBPAK
* Data Only: https://editor.p5js.org/shawn/sketches/w83C-S6DU

* ADVANCED:  Manipulated Video on Canvas + Audio: https://editor.p5js.org/shawn/sketches/SbNzhNujd

Contributed Examples
* Video + Data: https://editor.p5js.org/AidanNelson/sketches/8EcgJpEUi
* Flocking Video: https://editor.p5js.org/AidanNelson/sketches/yu2CjoP8H
* ADVANCED: Frame Differencing: https://editor.p5js.org/dano/sketches/ZVOoN1GB9
