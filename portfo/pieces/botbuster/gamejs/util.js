"use strict";

function getMouse(e){
    var mouse = {};
    
    if(e.type.startsWith('touch')) {
        if(e.type == 'touchend') {
            mouse.x = e.changedTouches[0].pageX - e.target.offsetLeft;
            mouse.y = e.changedTouches[0].pageY - e.target.offsetTop;
        } else {
            mouse.x = e.touches[0].pageX - e.target.offsetLeft;
            mouse.y = e.touches[0].pageY - e.target.offsetTop;
        }
    } else {
        mouse.x = e.pageX - e.target.offsetLeft;
        mouse.y = e.pageY - e.target.offsetTop;
    }
    
    return mouse;
}

function getRandom(min, max) {
  	return Math.random() * (max - min) + min;
}


function makeColor(red, green, blue, alpha){
	var color='rgba('+red+','+green+','+blue+', '+alpha+')';
	return color;
}

function getRandomUnitVector(){
	var x = getRandom(-1,1);
	var y = getRandom(-1,1);
	var length = Math.sqrt(x*x + y*y);
	if(length == 0){ // very unlikely
		x=1; // point right
		y=0;
		length = 1;
	} else{
		x /= length;
		y /= length;
	}
	
	return {x:x, y:y};
}

function simplePreload(imageArray){
	// loads images all at once
	for (var i = 0; i < imageArray.length; i++) {
		var img = new Image();
		img.src = imageArray[i];
	}
}


function loadImagesWithCallback(base, sources, callback) {
	var imageObjects = [];
	var numImages = sources.length;
	var numLoadedImages = 0;
	
	for (var i = 0; i < numImages; i++) {
        imageObjects[i] = new Image();
        imageObjects[i].onload = function() {
            numLoadedImages++;
            if(numLoadedImages >= numImages) {
                callback(imageObjects); // send the images back
            }
        };
	  
	    imageObjects[i].src = base + sources[i];
	}
}
  
function clamp(val, min, max){
	return Math.max(min, Math.min(max, val));
}


 // FULL SCREEN MODE
function requestFullscreen(element) {
	if (element.requestFullscreen) {
	  element.requestFullscreen();
	} else if (element.mozRequestFullscreen) {
	  element.mozRequestFullscreen();
	} else if (element.mozRequestFullScreen) { // camel-cased 'S' was changed to 's' in spec
	  element.mozRequestFullScreen();
	} else if (element.webkitRequestFullscreen) {
	  element.webkitRequestFullscreen();
	}
	// .. and do nothing if the method is not supported
}


Array.prototype.randomElement = function(){
	return this[Math.floor(Math.random() * this.length)];
}

var getDeltaTime = (function() {
    var lastTime = 0;
    
    return function() {
		var now,fps;
		now = (+new Date); 
		fps = 1000 / (now - lastTime);
		fps = clamp(fps, 12, 60);
		lastTime = now; 
		return 1/fps;
	};
})();