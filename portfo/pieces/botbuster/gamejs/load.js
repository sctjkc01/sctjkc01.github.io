"use strict";

var app = app || {};

app.loader = {
    canvas: undefined,
    ctx: undefined,
    arcs: [0,0],
    
    doneLoadingImgs: false,
    doneLoadingAuds: false,
    loadedAuds: 0,
    images: ["player.png", "enemy.png", "mlmb.png", "mneu.png", "bg.png", "rld.png", "bhit.png"],
    begin: function() {
        this.canvas = document.querySelector("#main");
        this.ctx = this.canvas.getContext("2d");
        
        loadImagesWithCallback("gameres/", this.images, function(imgs) {
            for(var i = 0; i < imgs.length; i++) {
                app.main.images[app.loader.images[i].split(".")[0]] = imgs[i];
            }
            app.loader.doneLoadingImgs = true;
        });
        
        createjs.Sound.addEventListener("fileload", function(e) {
            app.loader.loadedAuds++;
            if(app.loader.loadedAuds == 7) app.loader.doneLoadingAuds = true;
        });
        
        createjs.Sound.registerSound("gameres/gunshot.mp3", "shot");
        createjs.Sound.registerSound("gameres/reload.mp3", "reload");
        
        createjs.Sound.registerSounds([
            {src:"rica.mp3", id:"rica"},
            {src:"ricb.mp3", id:"ricb"},
            {src:"ricc.mp3", id:"ricc"},
            {src:"ricd.mp3", id:"ricd"}
        ], "gameres/");
        
        createjs.Sound.registerSound("gameres/541679.mp3", "bg");
        
        this.render();
    },
    render: function() {
        if(!(this.doneLoadingImgs && this.doneLoadingAuds))
            requestAnimationFrame(this.render.bind(this));
        else
            app.main.init();
        
        this.canvas.width = this.canvas.scrollWidth;
        this.canvas.height = this.canvas.scrollHeight;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.strokeStyle = "white";
        this.ctx.lineWidth = 8;
        
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2, 100, this.arcs[0], this.arcs[0] - (Math.PI * 0.5), true);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2, 80, this.arcs[1], this.arcs[1] + (Math.PI * 0.5), false);
        this.ctx.stroke();
        
        var dt = getDeltaTime();
        
        this.arcs[0] = this.arcs[0] - (dt * Math.PI * 0.2);
        this.arcs[1] = this.arcs[1] + (dt * Math.PI * 0.2);
        
        this.ctx.font = "20pt acknowtt";
        this.ctx.fillStyle = "white";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText("Loading...", this.canvas.width / 2, this.canvas.height / 2);
    }
}

window.onload = function() {
    app.loader.begin();
}