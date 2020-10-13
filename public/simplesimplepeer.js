/**
 *
 * @class SimpleSimplePeer
 * @constructor
 * @param {p5.sketch} [something] blah blah blah.
 * @param {SimpleSimplePeer.MEDIA TYPE}
 * @param {WebRTC stream}
 * @example
 *  		
    function setup() {
        // Stream Video
        createCanvas(400, 300);
        video = createCapture(VIDEO, function(stream) {
            ssp = new SimpleSimplePeer(this,SimpleSimplePeer.CAPTURE,stream)
            ssp.on('stream', gotStream);
        });  
        video.muted = true;     
        video.hide();

        // OR //

        // Stream Canvas
        let c = createCanvas(400, 300);
        video = createCapture(VIDEO);
        video.muted = true;     
        video.hide();				
        ssp = new SimpleSimplePeer(this,SimpleSimplePeer.CANVAS,c);
        ssp.on('stream', gotStream);
    }

    function draw() {
        image(video,0,0,width/2,height);
        ellipse(mouseX,mouseY,100,100);
        if (ovideo != null) {
            rect(10,10,10,10);
            image(ovideo,width/2,0,width/2,height);
        }
    }		
    
    // We got a new stream!
    function gotStream(stream) {
        // This is just like a video/stream from createCapture(VIDEO)
        ovideo = stream;
        //ovideo.hide();
    }
*/
class SimpleSimplePeer {

    constructor(sketch, type, elem, host, room) {

        this.CAPTURE = 1;
        this.CANVAS = 2;

        this.sketch = sketch;
        this.simplepeers = [];
        
        if (!host) {
            this.socket = io.connect("https://simplesimplepeer.itp.io/");
        } else {
            this.socket = io.connect(host);
        }
        
        console.log(elem.elt);
    
        if (type == this.CANVAS) {
            this.mystream = elem.elt.captureStream(30);
        } else {
            // Assume it is CAPTURE
            this.mystream = elem;
        }

        this.socket.on('connect', () => {
            console.log("Socket Connected");
            console.log("My socket id: ", this.socket.id);

            // Sends back a list of users in the room
            if (!room) {
                this.socket.emit("room_connect", window.location.href);
            } else {
                this.socket.emit("room_connect", room);
            }
        });

        this.socket.on('disconnect', (data) => {
            console.log("Socket disconnected");
        });

        this.socket.on('peer_disconnect', (data) => {
            console.log("simplepeer has disconnected " + data);
            for (let i = 0; i < this.simplepeers.length; i++) {
                if (this.simplepeers[i].socket_id == data) {
                    console.log("Removing simplepeer: " + i);
                    this.simplepeers.splice(i,1);
                } 
            }			
        });			

        // Receive listresults from server
        this.socket.on('listresults', (data) => {
            console.log(data);
            for (let i = 0; i < data.length; i++) {
                // Make sure it's not us
                if (data[i] != this.socket.id) {	

                    // create a new simplepeer and we'll be the "initiator"			
                    let simplepeer = new SimplePeerWrapper(this,
                        true, data[i], this.socket, this.mystream
                    );

                    // Push into our array
                    this.simplepeers.push(simplepeer);	
                }
            }
        });
            
        this.socket.on('signal', (to, from, data) => {

            console.log("Got a signal from the server: ", to, from, data);

            // to should be us
            if (to != this.socket.id) {
                console.log("Socket IDs don't match");
            }

            // Look for the right simplepeer in our array
            let found = false;
            for (let i = 0; i < this.simplepeers.length; i++)
            {
                
                if (this.simplepeers[i].socket_id == from) {
                    console.log("Found right object");
                    // Give that simplepeer the signal
                    this.simplepeers[i].inputsignal(data);
                    found = true;
                    break;
                }
            
            }	
            if (!found) {
                console.log("Never found right simplepeer object");
                // Let's create it then, we won't be the "initiator"
                let simplepeer = new SimplePeerWrapper(this,
                    false, from, this.socket, this.mystream
                );
                
                // Push into our array
                this.simplepeers.push(simplepeer);	
                    
                // Tell the new simplepeer that signal
                simplepeer.inputsignal(data);
            }
        });
    }

    on(event, callback) {
        if (event == 'stream') {
            this.onStream(callback);
        }
    }

    onStream(callback) {
        this.onStreamCallback = callback;
    }

    callOnStreamCallback(domElement) {
        if (this.onStreamCallback) {

            //////////////////////
            // Copied from createCapture and addElement in p5.js source 10/12/2020
            //const videoEl = addElement(domElement, this.sketch, true);
            document.body.appendChild(domElement);
            let videoEl = new p5.MediaElement(domElement, this.sketch);
            this.sketch._elements.push(videoEl);

            videoEl.loadedmetadata = false;
            // set width and height onload metadata
            domElement.addEventListener('loadedmetadata', function() {
              domElement.play();
              if (domElement.width) {
                videoEl.width = domElement.width;
                videoEl.height = domElement.height;
              } else {
                videoEl.width = videoEl.elt.width = domElement.videoWidth;
                videoEl.height = videoEl.elt.height = domElement.videoHeight;
              }
              videoEl.loadedmetadata = true;
            });
            /////////////////////////////

            this.onStreamCallback(videoEl);
        }
        else {
            console.log("no onStreamCallback set");
        }
    }
}

// A wrapper for simplepeer as we need a bit more than it provides
class SimplePeerWrapper {

    constructor(ssp, initiator, socket_id, socket, stream) {
        this.simplepeer = new SimplePeer({
            initiator: initiator,
            trickle: false
        });				

        this.supersimplepeer = ssp;

        // Their socket id, our unique id for them
        this.socket_id = socket_id;

        // Socket.io Socket
        this.socket = socket;

        // Our video stream - need getters and setters for this
        this.stream = stream;

        // simplepeer generates signals which need to be sent across socket
        this.simplepeer.on('signal', data => {						
            this.socket.emit('signal', this.socket_id, this.socket.id, data);
        });

        // When we have a connection, send our stream
        this.simplepeer.on('connect', () => {
            console.log('CONNECT')
            console.log(this.simplepeer);
            //p.send('whatever' + Math.random())

            // Let's give them our stream
            this.simplepeer.addStream(stream);
            console.log("Send our stream");
        });

        // Stream coming in to us
        this.simplepeer.on('stream', stream => {
            console.log('Incoming Stream');

            // This should really be a callback
            // Create a video object
            let ovideo = document.createElement("VIDEO");
            ovideo.id = this.socket_id;
            ovideo.srcObject = stream;
            ovideo.muted = false;
            ovideo.onloadedmetadata = function(e) {
                ovideo.play();
            };					
            //document.body.appendChild(ovideo);
            console.log(ovideo);

            this.supersimplepeer.callOnStreamCallback(ovideo);
        });					
    }

    inputsignal(sig) {
        this.simplepeer.signal(sig);
    }

}		
