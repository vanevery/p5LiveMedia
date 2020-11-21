/**
 *
 * @class p5Live
 * @constructor
 * @param {p5.sketch} [something] blah blah blah.
 * @param {p5.live.MEDIA TYPE}
 * @param {WebRTC stream}
 * @example
 *  		
    function setup() {
        // Stream Audio/Video
        createCanvas(400, 300);
        // For A/V streams, we need to use the createCapture callback method to get the "stream" object
        video = createCapture(VIDEO, function(stream) {
            let p5l = new p5Live(this,"CAPTURE",stream)
            p5l.on('stream', gotStream);
            p5l.on('data', gotData);
            p5l.on('disconnect', gotDisconnect);
        });  
        video.muted = true;     
        video.hide();

        // OR //

        // Stream Canvas as Video
        let c = createCanvas(400, 300);
        video = createCapture(VIDEO);
        video.muted = true;     
        video.hide();				
        let p5l = new p5Live(this,"CANVAS",c);
        p5l.on('stream', gotStream);
        p5l.on('data', gotData);
        p5l.on('disconnect', gotDisconnect);


        // OR //

        // Just Data
        createCanvas(400, 300);
        let p5l = new p5Live(this,"DATA");
        p5l.on('data', gotData);
        p5l.on('disconnect', gotDisconnect);
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
    function gotStream(stream, id) {
        print("New Stream from " + id);
        // This is just like a video/stream from createCapture(VIDEO)
        ovideo = stream;
        //ovideo.hide();
    }

    function gotData(data, id) {
        print("New Data from " + id);
        // Got some data from a peer
        print(data);
    }

    function gotDisconnect(id) {
        print(id + " disconnected");
    }
*/
class p5Live {

    constructor(sketch, type, elem, room, host) {

        this.sketch = sketch;
        this.simplepeers = [];
        this.mystream;
        this.onStreamCallback;
        this.onDataCallback;
        this.onDisconnectCallback;
        
        if (!host) {
            this.socket = io.connect("https://p5live.itp.io/");
        } else {
            this.socket = io.connect(host);
        }
        
        //console.log(elem.elt);
    
        if (type == "CANVAS") {
            this.mystream = elem.elt.captureStream(30);
        } else if (type == "CAPTURE") {
            this.mystream = elem;
        } else {
            // Assume it is just "DATA"

        }

        this.socket.on('connect', () => {
            console.log("Socket Connected");
            console.log("My socket id: ", this.socket.id);

            //console.log("***"+window.location.href);

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
                    console.log("Removed the DOM Element if it is exits");
                    this.removeDomElement(this.simplepeers[i]);
                    console.log("Removing simplepeer: " + i);
                    this.simplepeers.splice(i,1);
                    break;
                } 
            }	
            this.callOnDisconnectCallback(id);
        });			

        // Receive listresults from server
        this.socket.on('listresults', (data) => {
            //console.log(data);
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

            // // to should be us
            // if (to != this.socket.id) {
            //     console.log("Socket IDs don't match");
            // }

            // Look for the right simplepeer in our array
            let found = false;
            for (let i = 0; i < this.simplepeers.length; i++)
            {
                
                if (this.simplepeers[i].socket_id == from) {
                    //console.log("Found right object");
                    // Give that simplepeer the signal
                    this.simplepeers[i].inputsignal(data);
                    found = true;
                    break;
                }
            
            }	
            if (!found) {
                //console.log("Never found right simplepeer object");
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

    // // use this to add a track to a stream - assuming this is a stream, it will have to extract the track out
    // addtrack(stream, type) {
    //     if (type == "CANVAS") {
    //         this.mystream = elem.elt.captureStream(30);
    //     } else if (type == "CAPTURE") {
    //         this.mystream = elem;
    //     }
    // }

    send(data) {
        for (let i = 0; i < this.simplepeers.length; i++) {
            if (this.simplepeers[i] != null) {
                this.simplepeers[i].send(data);
            }
        }
    }

    on(event, callback) {
        if (event == 'stream') {
            this.onStream(callback);
        } else if (event == 'data') {
            this.onData(callback);
        } else if (event == "disconnect") {
            this.onDisconnect(callback);
        }
    }

    onDisconnect(callback) {
        this.onDisconnectCallback = callback;
    }

    onStream(callback) {
        this.onStreamCallback = callback;
    }

    onData(callback) {
        this.onDataCallback = callback;
    }

    callOnDisconnectCallback(id) {
        if (this.onDisconnectCallback) {
            this.callOnDisconnectCallback(id);
        }
    }

    callOnDataCallback(data, id) {
        if (this.onDataCallback) {
            this.onDataCallback(data, id);
        }
    }

    removeDomElement(ssp) {
        if (ssp.domElement) {
            document.body.removeChild(ssp.domElement);
        }
    }

    callOnStreamCallback(domElement, id) {
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

            this.onStreamCallback(videoEl, id);
        }
        else {
            console.log("no onStreamCallback set");
        }
    }
}

// A wrapper for simplepeer as we need a bit more than it provides
class SimplePeerWrapper {

    constructor(p5l, initiator, socket_id, socket, stream) {
        this.simplepeer = new SimplePeer({
            initiator: initiator,
            trickle: false
        });

        this.p5live = p5l;

        // Their socket id, our unique id for them
        this.socket_id = socket_id;

        // Socket.io Socket
        this.socket = socket;

        // Are we connected?
        this.connected = false;

        // Our video stream
        this.stream = stream;

        // Dom Element
        this.domElement = null;

        // simplepeer generates signals which need to be sent across socket
        this.simplepeer.on('signal', data => {						
            this.socket.emit('signal', this.socket_id, this.socket.id, data);
        });

        // When we have a connection, send our stream
        this.simplepeer.on('connect', () => {
            console.log('simplepeer connection')
            //console.log(this.simplepeer);
            //p.send('whatever' + Math.random())

            // We are connected
            this.connected = true;

            // Let's give them our stream, if we have a stream that is
            if (stream != null) {
                this.simplepeer.addStream(stream);
                //console.log("Send our stream");
            }
        });

        // Stream coming in to us
        this.simplepeer.on('stream', stream => {
            console.log('Incoming Stream');

            // This should really be a callback

            // Create a video object
            this.domElement = document.createElement("VIDEO");
            this.domElement.id = this.socket_id;
            this.domElement.srcObject = stream;
            this.domElement.muted = false;
            this.domElement.onloadedmetadata = function(e) {
                this.domElement.play();
            };					
            //document.body.appendChild(ovideo);
            console.log(this.domElement);

            this.p5live.callOnStreamCallback(this.domElement, this.socket_id);
        });		
        
        this.simplepeer.on('data', data => {
            let stringData = String(data);

            this.p5live.callOnDataCallback(stringData, this.socket_id);
        });
    }

    send(data) {
        if (this.connected) {
            this.simplepeer.send(data);
        } else {
            console.log("Can't send, not connected");
        }
    }

    inputsignal(sig) {
        this.simplepeer.signal(sig);
    }
}		
