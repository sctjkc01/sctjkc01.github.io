"use strict";

var app = app || {};

app.main = {
    bgCanvas: undefined,
    bgCtx: undefined,
    bgAud: undefined,
    canvas: undefined,
    ctx: undefined,
    canvasScale: 1,
    
    GAME_STATE: Object.freeze({
        MAIN_MENU: 0,
        PLAYING: 1,
        UPGRADE: 2,
        DEAD: 3
    }),
    WPN_STATE: Object.freeze({
        IDLE: 0,
        SHOOTING: 1,
        RELOADING: 2
    }),
    currGS: 0, // current game state
    
    images: {}, // List of images loaded by load.js -- that code fills this out.
    bullets: [], // List of bullets currently being tracked
    bulletPings: [], // List of bullet pings (hit a wall) being tracked
    Bullet: function(m) { // Craft a bullet
        m.player.weapon.currclip--; // Remove bullet from player's clip
        createjs.Sound.play("shot")
        
        Entity.call(this);
        
        // figure out direction - adapted from getUnitVector
        var xVec = (m.canvas.width * 0.5) - (m.mouseLoc.x); 
        var yVec = (m.canvas.height * 0.5) - (m.mouseLoc.y);
        var len = Math.sqrt(xVec*xVec + yVec*yVec);
        
        if(len == 0) {
            xVec = 0;
            yVec = 1;
        } else {
            xVec /= len;
            yVec /= len;
        }
        
        // Create variables
        this.xDir = xVec;
        this.yDir = yVec;
        this.x = m.player.x;
        this.y = m.player.y;
    },
    player: Object.seal({
        x: 0,
        y: 0,
        w: 40,
        h: 40,
        health: 100,
        maxhealth: 100,
        scrap: 0, // Currency
        totscrap: 0, // Total scrap collected, "final score"
        weapon: Object.seal({
            damage: 2, // points of damage
            auto: false, // true = fires when held, false = fire only when mouse button is clicked
            firedelay: 500, //ms
            clipsize: 7,
            currclip: 7,
            reloaddelay: 1500, //ms
            timeSinceLastShot: 0, //ms - when this number reaches firedelay, another shot is fired (auto only)
            timeSinceReloadStart: 0, //ms - when this number reaches reloaddelay, clip is reloaded
            currState: 1 // starts "shooting", will immediately set itself to "idle" when game starts
        }),
        upgradeCosts: {
            auto: 300,
            damage: 40,
            clipsize: 100,
            reloaddelay: 80,
            firedelay: 200,
            health: 175
        },
        speed: 150,
        sprintSpeed: 250,
        tutflags: { // individual tutorial flags
            hasMoved: false,
            hasReloaded: false,
            hasFired: false
        }
    }),
    obstacles: [
        // Manually-entered obstacle references to keep everything in the arena, and from walking over the inner blocks
        
        // Walls
        {x: 0, y: 0, w: 80, h: 80}, {x: 80, y: 0, w: 48, h: 64}, {x: 128, y: 0, w: 48, h: 48},
        {x: 0, y: 80, w: 64, h: 48}, {x: 0, y: 128, w: 48, h: 48}, {x: 176, y: 0, w: 672, h: 32},
        {x: 944, y: 0, w: 80, h: 80}, {x: 896, y: 0, w: 48, h: 64}, {x: 848, y: 0, w: 48, h: 48},
        {x: 960, y: 80, w: 64, h: 48}, {x: 976, y: 128, w: 48, h: 48}, {x: 0, y: 176, w: 32, h: 672},
        {x: 992, y: 176, w: 32, h: 672}, {x: 944, y: 944, w: 80, h: 80}, {x: 896, y: 960, w: 48, h: 64},
        {x: 848, y: 976, w: 48, h: 48}, {x: 960, y: 896, w: 64, h: 48}, {x: 976, y: 848, w: 48, h: 48},
        {x: 0, y: 944, w: 80, h: 80}, {x: 80, y: 960, w: 48, h: 64}, {x: 128, y: 976, w: 48, h: 48},
        {x: 0, y: 896, w: 64, h: 48}, {x: 0, y: 848, w: 48, h: 48},
        // L Block
        {x: 176, y: 992, w: 672, h: 32}, {x: 304, y: 128, w: 96, h: 112}, {x: 240, y: 144, w: 128, h: 112},
        {x: 176, y: 176, w: 144, h: 96}, {x: 192, y: 160, w: 64, h: 128}, {x: 160, y: 176, w: 16, h: 32},
        {x: 192, y: 288, w: 16, h: 16}, {x: 352, y: 112, w: 32, h: 16}, {x: 400, y: 176, w: 16, h: 64},
        // R Block
        {x: 576, y: 720, w: 112, h: 128}, {x: 672, y: 736, w: 64, h: 144}, {x: 720, y: 752, w: 64, h: 144},
        {x: 768, y: 768, w: 64, h: 144}, {x: 544, y: 816, w: 16, h: 16}, {x: 560, y: 768, w: 16, h: 80},
        {x: 848, y: 784, w: 16, h: 16}, {x: 832, y: 768, w: 16, h: 96}, {x: 576, y: 704, w: 64, h: 16},
        {x: 608, y: 848, w: 64, h: 16}
    ],
    Enemy: function(level, bgDim) {
        Entity.call(this);
        
        // Craft enemy
        this.health = Math.ceil(level * 1.33) + 2;
        this.scrapVal = (getRandom(5 * level, 15 + (5 * level))|0);
        this.damage = Math.ceil(level * 2.33);
        this.atkCD = 0;
        this.x = (getRandom(0, 1) < 0.5) ? getRandom(0, (bgDim.w / 2) - 100) : getRandom((bgDim.w / 2) + 100, bgDim.w);
        this.y = (getRandom(0, 1) < 0.5) ? getRandom(0, (bgDim.h / 2) - 100) : getRandom((bgDim.h / 2) + 100, bgDim.h);
        this.w = 40;
        this.h = 40;
        
        // Make sure enemy isn't spawned embedded in wall
        while(app.main.testForRectCollide({x: this.x, y: this.y, w: 50, h: 50})) {
            this.x = (getRandom(0, 1) < 0.5) ? getRandom(0, (bgDim.w / 2) - 200) : getRandom((bgDim.w / 2) + 200, bgDim.w);
            this.y = (getRandom(0, 1) < 0.5) ? getRandom(0, (bgDim.h / 2) - 200) : getRandom((bgDim.h / 2) + 200, bgDim.h);
        }
    },
    makeLevel: function() {
        // produce a level
        this.level++;
        
        var enemyCount = (this.level < 4) ? 5 : getRandom(4, 8);
        for(var i = 0; i < enemyCount; i++) {
            this.enemies.push(Object.seal(new this.Enemy(this.level, {w: this.images.bg.width, h: this.images.bg.height})));
        }
    },
    enemies: [],
    level: 0,
    mouseLoc: {
        x: 0, y: 0,
        insideRect: function(x, y, w, h) {
            // quick function to test if mouse is inside a rectangle's bounds
            return (this.x > x && this.x < x + w && this.y > y && this.y < y + h);
        },
        deadX: 0, deadY: 0
    },
    prevMouseDown: false,
    mouseDown: false,
    paused: false,
    
    init: function() {
        // fetch from load.js - waste not want not
        this.canvas = app.loader.canvas;
        this.ctx = app.loader.ctx;
        
        // register mouse events
        this.canvas.addEventListener("mousemove", this.onmousemove.bind(this));
        this.canvas.addEventListener("mousedown", this.onmousedown.bind(this));
        this.canvas.addEventListener("mouseup", this.onmouseup.bind(this));
        window.addEventListener("focus", this.onfocus.bind(this));
        window.addEventListener("blur", this.onblur.bind(this));
        
        // fetch background canvas too
        this.bgCanvas = document.querySelector("#bg");
        this.bgCtx = this.bgCanvas.getContext("2d");
        
        // place player in center of arena
        this.player.x = this.images.bg.width * 0.5;
        this.player.y = this.images.bg.height * 0.5;
        
        // start background audio
        this.bgAud = createjs.Sound.play("bg", {volume: 0.5, loop: -1});
        
        // kick things off
        this.update();
    },
    
    update: function() {
        requestAnimationFrame(this.update.bind(this));
        var dt = getDeltaTime();
        
        this.canvas.width = this.bgCanvas.width = this.canvas.scrollWidth * this.canvasScale;
        this.canvas.height = this.bgCanvas.height = this.canvas.scrollHeight * this.canvasScale;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.bgCtx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        
        if(!this.paused) {
            // draw background (ALWAYS)
            this.bgCtx.save();
            this.bgCtx.translate(this.canvas.width * 0.5, this.canvas.height * 0.5);
            this.bgCtx.translate(-this.player.x, -this.player.y);
            this.bgCtx.drawImage(this.images.bg, 0, 0);
            this.bgCtx.restore();
            
            this.ctx.save();
            this.ctx.translate(this.canvas.width * 0.5, this.canvas.height * 0.5); // Always start in center of screen
            
            switch(this.currGS) {
                case 0: // MAIN MENU
                    {
                        this.renderPlayer(); // render player
                        
                        //done with world things, go back to screenspace.
                        this.ctx.restore();
                        
                        { // render title
                            this.ctx.save();
                            
                            this.ctx.fillStyle = "#333";
                            this.ctx.font = "80pt acknowtt";
                            this.ctx.textAlign = "center";
                            this.ctx.textBaseline = "middle";
                            
                            this.ctx.save();
                            this.ctx.translate(this.canvas.width * 0.5, this.canvas.height * 0.5 - 128);
                            this.ctx.rotate(-0.1);
                            this.ctx.fillText("Bot Buster", 0, 0);

                            this.ctx.font = "15pt acknowtt"
                            if(window.location.hash == "#realname")
                                this.ctx.fillText("A Game by Chris Cheng", 0, 25);
                            else 
                                this.ctx.fillText("A Game by The Stick", 0, 25);
                            this.ctx.restore();
                            
                            this.ctx.restore();
                        }
                        { // render instructions
                            this.ctx.save();
                            
                            this.ctx.font = "30pt acknowtt";
                            this.ctx.textAlign = "center";
                            this.ctx.textBaseline = "middle";
                            
                            this.ctx.save();
                            this.ctx.translate(this.canvas.width * 0.5, this.canvas.height * 0.5);
                            this.ctx.fillStyle = "#999";
                            this.ctx.fillRect(-450, -64, 384, 128);
                            this.ctx.fillRect(66, -64, 384, 128);
                            this.ctx.fillStyle = "#333";
                            this.ctx.fillText("Kill   , get Scrap", -256, 0);
                            this.ctx.drawImage(this.images.enemy, -330, -16);
                            this.ctx.fillText("Spend Scrap", 256, -30);
                            this.ctx.fillText("between rounds", 256, -10);
                            this.ctx.fillText("to upgrade your", 256, 10);
                            this.ctx.fillText("Weapon", 256, 30);
                            this.ctx.restore();
                            
                            this.ctx.restore();
                        }
                        
                        { // render start "button"
                            this.ctx.save();
                            
                            this.ctx.font = "30pt acknowtt";
                            this.ctx.textAlign = "center";
                            this.ctx.textBaseline = "middle";
                            
                            this.ctx.save();
                            this.ctx.translate(this.canvas.width * 0.5, this.canvas.height * 0.5);
                            this.ctx.fillStyle = "#999";
                            this.ctx.fillRect(-120, 128, 240, 128);
                            this.ctx.fillStyle = "#333";
                            this.ctx.fillText("Click Here", 0, 182);
                            this.ctx.fillText("to begin", 0, 202);
                            this.ctx.restore();
                            
                            this.ctx.restore();
                        }
                        
                        if(this.mouseDown) { // start button's a fake, clicking anywhere starts it.
                            // It's just that "using" it fires onmousemove so we have a real mouse position point.
                            this.currGS = this.GAME_STATE.PLAYING;
                            
                            this.makeLevel();
                        }
                    }
                    break;
                case 1: // PLAYING
                    {
                        { // update player
                            var mvSpd = this.player.speed;
                            if(myKeys.keydown[myKeys.KEYBOARD.KEY_SHIFT]) {
                                mvSpd += this.player.sprintSpeed;
                            }
                            var newPos = this.player.y;
                            if(myKeys.keydown[myKeys.KEYBOARD.KEY_W] || myKeys.keydown[myKeys.KEYBOARD.KEY_UP]) {
                                newPos -= mvSpd * dt;
                                this.player.tutflags.hasMoved = true;
                            }
                            if(myKeys.keydown[myKeys.KEYBOARD.KEY_S] || myKeys.keydown[myKeys.KEYBOARD.KEY_DOWN]) {
                                newPos += mvSpd * dt;
                                this.player.tutflags.hasMoved = true;
                            }
                            if(!this.testForRectCollide({x: this.player.x, y: newPos, w: this.player.w, h: this.player.h})) {
                                this.player.y = newPos;
                            }
                            newPos = this.player.x;
                            if(myKeys.keydown[myKeys.KEYBOARD.KEY_A] || myKeys.keydown[myKeys.KEYBOARD.KEY_LEFT]) {
                                newPos -= mvSpd * dt;
                                this.player.tutflags.hasMoved = true;
                            }
                            if(myKeys.keydown[myKeys.KEYBOARD.KEY_D] || myKeys.keydown[myKeys.KEYBOARD.KEY_RIGHT]) {
                                newPos += mvSpd * dt;
                                this.player.tutflags.hasMoved = true;
                            }
                            if(!this.testForRectCollide({x: newPos, y: this.player.y, w: this.player.w, h: this.player.h})) {
                                this.player.x = newPos;
                            }
                        }
                        
                        // handle player weapon
                        switch(this.player.weapon.currState) {
                            case 0: // IDLE
                                if(myKeys.keydown[myKeys.KEYBOARD.KEY_R] && this.player.weapon.currclip < this.player.weapon.clipsize) {
                                    this.player.weapon.timeSinceReloadStart = 0;
                                    this.player.weapon.currState = this.WPN_STATE.RELOADING;
                                    this.player.tutflags.hasReloaded = true;
                                } else if(this.mouseDown && this.player.weapon.currclip == 0) {
                                    this.player.weapon.timeSinceReloadStart = 0;
                                    this.player.weapon.currState = this.WPN_STATE.RELOADING;
                                } else if(this.mouseDown && this.player.weapon.currclip > 0) {
                                    this.player.weapon.currState = this.WPN_STATE.SHOOTING;
                                    if(!this.player.weapon.auto || this.player.weapon.timeSinceLastShot > this.player.weapon.firedelay) {
                                        this.player.weapon.timeSinceLastShot = 0;
                                        this.bullets.push(Object.seal(new this.Bullet(this)));
                                    }
                                    this.player.tutflags.hasFired = true;
                                }
                                if(this.player.weapon.auto)
                                    this.player.weapon.timeSinceLastShot += 1000 * dt; // sec -> msec
                                break;
                            case 1: // SHOOTING
                                if(!this.mouseDown) {
                                    this.player.weapon.currState = this.WPN_STATE.IDLE;
                                } else if(this.player.weapon.currclip == 0) {
                                    this.player.weapon.timeSinceReloadStart = 0;
                                    this.player.weapon.currState = this.WPN_STATE.RELOADING;
                                } else if(this.player.weapon.timeSinceLastShot > this.player.weapon.firedelay) {
                                    this.player.weapon.timeSinceLastShot = 0;
                                    this.bullets.push(Object.seal(new this.Bullet(this)));
                                } else if(this.player.weapon.auto) {
                                    this.player.weapon.timeSinceLastShot += 1000 * dt; // sec -> msec
                                }
                                break;
                            case 2: // RELOADING
                                if(this.player.weapon.timeSinceReloadStart > this.player.weapon.reloaddelay) {
                                    createjs.Sound.play("reload");
                                    this.player.weapon.currclip = this.player.weapon.clipsize;
                                    this.player.weapon.currState = this.WPN_STATE.IDLE;
                                } else {
                                    this.player.weapon.timeSinceReloadStart += 1000 * dt; // sec -> msec
                                }
                                break;
                            default:
                                break;
                        }
                        
                        // draw player
                        this.renderPlayer();
                        
                        this.ctx.translate(-this.player.x, -this.player.y);
                        
                        var x = this.bullets.length;
                        // handle & draw player bullets
                        while(--x > -1) {
                            var bullet = this.bullets[x];
                            var newPos = {x: bullet.x - (bullet.xDir * 2000 * dt), y: bullet.y - (bullet.yDir * 2000 * dt)};
                            var test = this.testForLineSegmentCollide({x1: bullet.x, x2: newPos.x, y1: bullet.y, y2: newPos.y});
                            
                            this.ctx.save();
                            
                            switch(test.t) {
                                case 0:  // Hit nothing
                                    bullet.x = newPos.x;
                                    bullet.y = newPos.y;
                                    
                                    this.ctx.translate(bullet.x, bullet.y);
                                    this.ctx.strokeStyle = "yellow";
                                    this.ctx.lineWidth = 2;
                                    
                                    this.ctx.beginPath();
                                    this.ctx.moveTo(0, 0);
                                    this.ctx.lineTo(bullet.xDir * 10, bullet.yDir * 10);
                                    this.ctx.stroke();
                                    break;
                                case 1:  // Hit obstacle
                                    this.bullets.splice(x, 1);
                                    
                                    this.bulletPings.push({x: newPos.x, y: newPos.y, frame: 0, framedelay: 75});
                                    createjs.Sound.play(["rica","ricb","ricc","ricd"].randomElement());
                                    break;
                                case 2:  // Hit enemy
                                    this.bullets.splice(x, 1);
                                    
                                    this.enemies[test.id].health -= this.player.weapon.damage;
                                    createjs.Sound.play(["rica","ricb","ricc","ricd"].randomElement());
                                    if(this.enemies[test.id].health < 0) {
                                        this.player.scrap += this.enemies[test.id].scrapVal;
                                        this.player.totscrap += this.enemies[test.id].scrapVal;
                                        this.enemies.splice(test.id, 1);
                                    }
                                    break;
                                default:
                                    break;
                            }
                            
                            this.ctx.restore();
                        }
                        
                        var x = this.bulletPings.length;
                        while (--x > -1){
                            var thisPing = this.bulletPings[x];
                            
                            if(thisPing.framedelay <= 0) {
                                if(thisPing.frame == 3) {
                                    this.bulletPings.splice(x, 1);
                                } else {
                                    thisPing.frame++;
                                    thisPing.framedelay = 75;
                                }
                            } else {
                                thisPing.framedelay -= 1000 * dt;
                            }
                            
                            this.ctx.save();
                            this.ctx.translate(thisPing.x, thisPing.y);
                            
                            this.ctx.drawImage(this.images.bhit, thisPing.frame * 16, 0, 16, 16, -8, -8, 16, 16);
                            
                            this.ctx.restore();
                        }
                        
                        // handle and draw enemies
                        x = this.enemies.length
                        while(--x > -1) {
                            var thisEn = this.enemies[x];
                            
                            var dirVec = {x: thisEn.x - this.player.x, y: thisEn.y - this.player.y};
                            var dirVecLen = Math.sqrt(dirVec.x*dirVec.x + dirVec.y*dirVec.y);
                            dirVec.x /= dirVecLen;
                            dirVec.y /= dirVecLen;
                            
                            if(dirVecLen < 50) {
                                if(thisEn.atkCD <= 0) {
                                    thisEn.atkCD = 1000;
                                    this.player.health -= thisEn.damage;
                                } else {
                                    thisEn.atkCD -= 1000 * dt;
                                }
                            } else if(!this.testForRectCollide({x: thisEn.x + (dirVec.x * 100 * dt), y: thisEn.y + (dirVec.y * 100 * dt), w: thisEn.w, h: thisEn.h})) {
                                thisEn.x -= (dirVec.x * 100 * dt);
                                thisEn.y -= (dirVec.y * 100 * dt);
                            }
                            
                            this.ctx.save();
                            this.ctx.translate(thisEn.x, thisEn.y);
                            this.ctx.rotate(Math.atan2(dirVec.y, dirVec.x) - Math.PI / 2);
                            
                            this.ctx.drawImage(this.images.enemy, -16, -16);
                            this.ctx.restore();
                        }
                        if(this.player.health <= 0) {
                            this.currGS = this.GAME_STATE.DEAD;
                        
                            this.enemies.length = 0;
                            this.bullets.length = 0;
                            this.bulletPings.length = 0;
                        } else if(this.enemies.length == 0) {
                            this.currGS = this.GAME_STATE.UPGRADE;
                            this.player.x = this.images.bg.width * 0.5;
                            this.player.y = this.images.bg.height * 0.5;
                        }
                        
                        // done with world things, go back to screenspace.
                        this.ctx.restore();
                        
                        // draw HUD
                        if(!this.player.tutflags.hasMoved) {
                            this.ctx.save();
                            this.ctx.translate(this.canvas.width * 0.5, this.canvas.height * 0.5);
                            
                            this.ctx.font = "20pt acknowtt";
                            this.ctx.fillStyle = "black";
                            this.ctx.textAlign = "center";
                            this.ctx.textBaseline = "middle";
                            this.ctx.fillText("W", 0, -30);
                            this.ctx.fillText("A", -30, 0);
                            this.ctx.fillText("S", 0, 30);
                            this.ctx.fillText("D", 30, 0);
                            this.ctx.restore();
                        }
                        if(!this.player.tutflags.hasFired) {
                            if(this.mouseLoc)
                                this.ctx.drawImage(this.images.mlmb, this.mouseLoc.x + 6, this.mouseLoc.y + 15);
                        }
                        if(!this.player.tutflags.hasReloaded && this.player.weapon.currclip < this.player.weapon.clipsize) {
                            this.ctx.save();
                            this.ctx.translate(this.canvas.width - 40, this.canvas.height - 90);
                            
                            this.ctx.font = "20pt acknowtt";
                            this.ctx.fillStyle = "white";
                            this.ctx.textAlign = "center";
                            this.ctx.textBaseline = "middle";
                            this.ctx.fillText("R", -30, 0);
                            this.ctx.drawImage(this.images.rld, -16, -16);
                            
                            this.ctx.restore();
                        }
                        { // Player Health & Scrap
                            this.ctx.save();
                            
                            this.ctx.translate(10, 64);
                            this.ctx.rotate(-0.1);
                            
                            this.ctx.fillStyle = "#DDD";
                            this.ctx.fillRect(0, -32, 256, 64);
                            
                            this.ctx.fillStyle = "#F77";
                            this.ctx.fillRect(4, -28, 248, 28);
                            
                            this.ctx.fillStyle = "#7F7";
                            this.ctx.fillRect(4, -28, 248 * (this.player.health / this.player.maxhealth), 28);
                            
                            this.ctx.font = "20pt acknowtt";
                            this.ctx.fillStyle = "black";
                            this.ctx.textAlign = "left";
                            this.ctx.textBaseline = "middle";
                            this.ctx.fillText("Health: " + this.player.health + "/" + this.player.maxhealth, 8, -14);
                            this.ctx.fillText("Scrap: " + this.player.scrap, 8, 14);
                            
                            this.ctx.restore();
                        }
                        { // Weapon Clip
                            this.ctx.save();
                            this.ctx.translate(this.canvas.width - 20, this.canvas.height);
                            this.ctx.rotate(0.1);
                            
                            this.ctx.font = "20pt acknowtt";
                            this.ctx.textAlign = "left";
                            this.ctx.textBaseline = "middle";
                            
                            if(this.player.weapon.currState == this.WPN_STATE.RELOADING) {
                                this.ctx.fillStyle = "#999";
                                this.ctx.fillRect(-256, -64, 256, 64);
                                var w = 256 * (this.player.weapon.timeSinceReloadStart / this.player.weapon.reloaddelay);
                                this.ctx.fillStyle = "#DDD";
                                this.ctx.fillRect(w * -1, -64, w, 64);
                                
                                this.ctx.fillStyle = "black";
                                this.ctx.fillText("Reloading...", -248, -32);
                            } else {
                                this.ctx.fillStyle = "#DDD";
                                this.ctx.fillRect(-256, -64, 256, 64);
                                
                                this.ctx.fillStyle = "black";
                                this.ctx.fillText("Ammo: " + this.player.weapon.currclip, -248, -32);
                            }
                            
                            this.ctx.restore();
                        }
                    }
                    break;
                case 2: // UPGRADING
                    {
                        this.bullets.length = 0;
                        this.bulletPings.length = 0;
                        // draw player
                        this.renderPlayer();
                        
                        // done with world things, go back to screenspace.
                        this.ctx.restore();
                        
                        { // Render Player Health & Scrap
                            this.ctx.save();
                            
                            this.ctx.translate(10, 64);
                            this.ctx.rotate(-0.1);
                            
                            this.ctx.fillStyle = "#DDD";
                            this.ctx.fillRect(0, -32, 256, 64);
                            
                            this.ctx.fillStyle = "#F77";
                            this.ctx.fillRect(4, -28, 248, 28);
                            
                            this.ctx.fillStyle = "#7F7";
                            this.ctx.fillRect(4, -28, 248 * (this.player.health / this.player.maxhealth), 28);
                            
                            this.ctx.font = "20pt acknowtt";
                            this.ctx.fillStyle = "black";
                            this.ctx.textAlign = "left";
                            this.ctx.textBaseline = "middle";
                            this.ctx.fillText("Health: " + this.player.health + "/" + this.player.maxhealth, 8, -14);
                            this.ctx.fillText("Scrap: " + this.player.scrap, 8, 14);
                            
                            this.ctx.restore();
                        }
                        
                        var makeButton = function(text, x, y, w, h, cb) {
                            this.ctx.save();
                            
                            this.ctx.font = "20pt acknowtt";
                            this.ctx.textAlign = "left";
                            this.ctx.textBaseline = "middle";
                            
                            this.ctx.fillStyle = "#DDD";
                            this.ctx.fillRect(x, y, w, h);
                            
                            this.ctx.fillStyle = "black";
                            this.ctx.fillText(text, x + 4, y + 16);
                            
                            if(!this.prevMouseDown && this.mouseDown && this.mouseLoc.insideRect(x, y, w, h)) {
                                cb.call(this);
                            }
                            
                            this.ctx.restore();
                        }
                        
                        if(this.player.health < this.player.maxhealth && this.player.scrap > 10) { // Cheap Health Restore
                            makeButton.call(this, "Restore Health for 10 Scrap", 270, 8, 384, 32, function() {
                                this.player.scrap -= 10;
                                this.player.health = this.player.maxhealth;
                            });
                        }
                        
                        { // Upgrade Pane
                            this.ctx.save();
                            
                            this.ctx.font = "30pt acknowtt";
                            this.ctx.textAlign = "center";
                            this.ctx.textBaseline = "middle";
                            
                            this.ctx.fillStyle = "#999";
                            this.ctx.fillRect(32, 128, (this.canvas.width * 0.5) - 64, this.canvas.height - 136);
                            
                            this.ctx.fillStyle = "white";
                            this.ctx.fillText("Upgrades!", this.canvas.width * 0.25, 150);
                            
                            this.ctx.restore();
                            
                            { // Upgrade Buttons
                                this.ctx.save();
                                
                                this.ctx.font = "20pt acknowtt";
                                this.ctx.textAlign = "left";
                                this.ctx.textBaseline = "middle";
                                this.ctx.fillStyle = "white";
                                
                                var top = 175;
                                
                                this.ctx.fillText("Health: " + this.player.maxhealth + " HP", 40, top);
                                this.ctx.fillText("Add some armor plating to", 40, top + 18);
                                this.ctx.fillText("improve survivability", 56, top + 30);
                                makeButton.call(this, "Improve for " + this.player.upgradeCosts.health, 40, top + 42, 303, 32, function() {
                                    if(this.player.upgradeCosts.health > this.player.scrap) return;
                                    
                                    this.player.scrap -= this.player.upgradeCosts.health;
                                    this.player.upgradeCosts.health *= 1.2;
                                    this.player.upgradeCosts.health = Math.round(this.player.upgradeCosts.health);
                                    this.player.maxhealth += 25;
                                    this.player.health += 25;
                                });
                                
                                top += 100;
                                
                                this.ctx.fillText("Damage: " + this.player.weapon.damage + " points", 40, top);
                                this.ctx.fillText("How much pain you inflict on", 40, top + 18);
                                this.ctx.fillText("your foes", 56, top + 30);
                                makeButton.call(this, "Improve for " + this.player.upgradeCosts.damage, 40, top + 42, 303, 32, function() {
                                    if(this.player.upgradeCosts.damage > this.player.scrap) return;
                                    
                                    this.player.scrap -= this.player.upgradeCosts.damage;
                                    this.player.upgradeCosts.damage *= 1.2;
                                    this.player.upgradeCosts.damage = Math.round(this.player.upgradeCosts.damage);
                                    this.player.weapon.damage += 2;
                                });
                                
                                top += 100;
                                
                                this.ctx.fillText("Clip Size: " + this.player.weapon.clipsize + " rounds", 40, top);
                                this.ctx.fillText("Larger clips mean more shots", 40, top + 18);
                                this.ctx.fillText("between reloads", 56, top + 30);
                                makeButton.call(this, "Improve for " + this.player.upgradeCosts.clipsize, 40, top + 42, 303, 32, function() {
                                    if(this.player.upgradeCosts.clipsize > this.player.scrap) return;
                                    
                                    this.player.scrap -= this.player.upgradeCosts.clipsize;
                                    this.player.upgradeCosts.clipsize *= 1.2;
                                    this.player.upgradeCosts.clipsize = Math.round(this.player.upgradeCosts.clipsize);
                                    this.player.weapon.clipsize += 5;
                                });
                                
                                top += 100;
                                
                                this.ctx.fillText("Reload Time: " + this.player.weapon.reloaddelay + " ms", 40, top);
                                this.ctx.fillText("How long it takes to reload", 40, top + 18);
                                this.ctx.fillText("once your clip has run dry", 56, top + 30);
                                if(this.player.weapon.reloaddelay > 250) {
                                    makeButton.call(this, "Improve for " + this.player.upgradeCosts.reloaddelay, 40, top + 42, 303, 32, function() {
                                        if(this.player.upgradeCosts.reloaddelay > this.player.scrap) return;
                                        
                                        this.player.scrap -= this.player.upgradeCosts.reloaddelay;
                                        this.player.upgradeCosts.reloaddelay *= 1.5;
                                        this.player.upgradeCosts.reloaddelay = Math.round(this.player.upgradeCosts.reloaddelay);
                                        this.player.weapon.reloaddelay -= 50;
                                    });
                                }
                                
                                top += 100;
                                
                                this.ctx.fillText("Automatic Weaponry", 40, top);
                                this.ctx.fillText("Buy to make your weapon full", 40, top + 18);
                                this.ctx.fillText("auto, no need to lift your", 56, top + 30);
                                this.ctx.fillText("finger between shots!", 56, top + 42);
                                if(!this.player.weapon.auto)
                                    makeButton.call(this, "Implement for " + this.player.upgradeCosts.auto, 40, top + 54, 303, 32, function() {
                                        if(this.player.upgradeCosts.auto > this.player.scrap) return;
                                        
                                        this.player.scrap -= this.player.upgradeCosts.auto;
                                        this.player.weapon.auto = true;
                                    });
                                else {
                                    
                                    top += 112;
                                    
                                    this.ctx.fillText("Fire Rate: " + parseFloat((1000 / this.player.weapon.firedelay).toFixed(3)) + " rounds/sec", 40, top);
                                    this.ctx.fillText("Dish out more lead!", 40, top + 18);
                                    if(this.player.weapon.firedelay > 50) {
                                        makeButton.call(this, "Improve for " + this.player.upgradeCosts.firedelay, 40, top + 30, 303, 32, function() {
                                            if(this.player.upgradeCosts.firedelay > this.player.scrap) return;
                                            
                                            this.player.scrap -= this.player.upgradeCosts.firedelay;
                                            this.player.upgradeCosts.firedelay *= 1.5;
                                            this.player.upgradeCosts.firedelay = Math.round(this.player.upgradeCosts.firedelay);
                                            this.player.weapon.firedelay -= 50;
                                        });
                                    }
                                }
                                
                                this.ctx.restore();
                            }
                        }
                        
                        makeButton.call(this, "Begin Next Level", this.canvas.width - 238, 8, 230, 32, function() { // Next Level
                            this.currGS = this.GAME_STATE.PLAYING;
                            this.player.weapon.currclip = this.player.weapon.clipsize;
                            this.player.weapon.currState = this.WPN_STATE.SHOOTING;
                            
                            this.makeLevel();
                        });
                        
                    }
                    break;
                case 3: // DEAD
                    this.ctx.save();
                    if(this.mouseLoc) // rotate player towards last "living" rotation
                        this.ctx.rotate(Math.atan2((this.canvas.height * 0.5) - (this.mouseLoc.deadY), (this.canvas.width * 0.5) - (this.mouseLoc.deadX)) - Math.PI / 2);
                    
                    this.ctx.drawImage(this.images.player, -16, -16);
                    this.ctx.restore(); 
                    
                    // done with world things, go back to screenspace.
                    this.ctx.restore();
                    
                    { // render gameover
                        this.ctx.save();
                        
                        this.ctx.fillStyle = "#F33";
                        this.ctx.font = "80pt acknowtt";
                        this.ctx.textAlign = "center";
                        this.ctx.textBaseline = "middle";
                        
                        this.ctx.save();
                        this.ctx.translate(this.canvas.width * 0.5, this.canvas.height * 0.5 - 128);
                        this.ctx.rotate(-0.1);
                        this.ctx.fillText("GAME OVER", 0, 0);

                        this.ctx.font = "15pt acknowtt"
                        this.ctx.fillText("#gotrekt", 0, 25);
                        this.ctx.restore();
                        
                        this.ctx.restore();
                    }
                    
                    { // render final score
                        this.ctx.save();
                        
                        this.ctx.fillStyle = "#afa";
                        this.ctx.font = "40pt acknowtt";
                        this.ctx.textAlign = "center";
                        this.ctx.textBaseline = "middle";
                        
                        this.ctx.save();
                        this.ctx.translate(this.canvas.width * 0.5, this.canvas.height * 0.5 + 128);
                        this.ctx.rotate(0.05);
                        this.ctx.fillText("Collected a total of", 0, 0);
                        this.ctx.fillText(this.player.totscrap + " scrap", 0, 30);

                        this.ctx.font = "20pt acknowtt"
                        this.ctx.fillText("Click anywhere to try again", 0, 50);
                        this.ctx.restore();
                        
                        this.ctx.restore();
                    }
                        
                    if(this.mouseDown) { // User clicked to restart
                        
                        this.level = 0; // Set level to 0; will be set to 1 in makeLevel
                        this.makeLevel();
                        this.currGS = this.GAME_STATE.PLAYING;
                        
                        { // Reset the Player
                            var p = this.player;
                            p.health = 100;
                            p.maxhealth = 100;
                            p.scrap = 0;
                            p.totscrap = 0;
                            p.weapon.damage = 2;
                            p.weapon.auto = false;
                            p.weapon.firedelay = 500;
                            p.weapon.clipsize = 7;
                            p.weapon.currclip = 7;
                            p.weapon.reloaddelay = 1500;
                            p.weapon.currState = 1;
                            p.upgradeCosts.auto = 300;
                            p.upgradeCosts.damage = 40;
                            p.upgradeCosts.clipsize = 100;
                            p.upgradeCosts.reloaddelay = 80;
                            p.upgradeCosts.firedelay = 200;
                            p.upgradeCosts.health = 175;
                            
                            p.x = this.images.bg.width * 0.5;
                            p.y = this.images.bg.height * 0.5;
                        }
                    }
                    break;
                default:
                    this.currGS = this.GAME_STATE.MAIN_MENU;
                    break;
            }
        } else { // Game IS paused
            this.ctx.save();
            this.ctx.fillStyle = "#CCC";
            this.ctx.font = "80pt acknowtt";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.translate(this.canvas.width * 0.5, this.canvas.height * 0.5);
            this.ctx.rotate(0.1);
            this.ctx.fillText("Paused", 0, 0);

            this.ctx.font = "15pt acknowtt"
            this.ctx.fillText("Click Inside to Resume", 0, 25);
            this.ctx.restore();
        }
        
        this.prevMouseDown = this.mouseDown;
    },
    
    renderPlayer: function() {
        this.ctx.save();
        if(this.mouseLoc) // rotate player towards mouse
            this.ctx.rotate(Math.atan2((this.canvas.height * 0.5) - (this.mouseLoc.y), (this.canvas.width * 0.5) - (this.mouseLoc.x)) - Math.PI / 2);
        
        this.ctx.drawImage(this.images.player, -16, -16);
        this.ctx.restore();  
    },
    
    testForRectCollide: function(ent) {  // Test if an entity is colliding with the world (AABB-style)
        // Code adapted from https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
        for(var x in this.obstacles) {
            var thisObs = this.obstacles[x];
            if(ent.x - (ent.w * 0.5) < thisObs.x + thisObs.w &&
               ent.x + (ent.w * 0.5) > thisObs.x &&
               ent.y - (ent.h * 0.5) < thisObs.y + thisObs.h &&
               ent.y + (ent.h * 0.5) > thisObs.y)
                return true;
        }
        return false;
    },
    
    testForLineSegmentCollide: function(seg) {  // Test if line segment (typically bullets) is interacting with world
        // Performs cheap AABB first, then gets into nitty gritty.
        // Adapted from http://www.geeksforgeeks.org/check-if-two-given-line-segments-intersect/
        var segBB = { // AABB of segment to test.
            x: Math.min(seg.x1, seg.x2), y: Math.min(seg.y1, seg.y2),
            w: Math.abs(seg.x1 - seg.x2), h: Math.abs(seg.y1, seg.y2)
        };
        
        var testOrient = function(pt1, pt2, pt3) { // Function to get orientation
            var val = (pt2.y - pt1.y) * (pt3.x - pt2.x) - (pt2.x - pt1.x) * (pt3.y - pt2.y);
            
            if(val == 0) return 0;  // Colinear
            return (val > 0) ? 1 : 2; // CW, CCW
        };
        
        var onSegment = function(pt, seg1, seg2) { // Function to test if point is on a line segment
            return (pt.x <= Math.max(seg1.x, seg2.x) && pt.x >= Math.min(seg1.x, seg2.x) &&
                    pt.y <= Math.max(seg1.y, seg2.y) && pt.y >= Math.min(seg1.y, seg2.y));
        };
        
        for(var x in this.enemies) { // Test if bullet struck enemy
            var thisEn = this.enemies[x];
            
            if(segBB.x < thisEn.x + (thisEn.w * 0.5) && // Perform cheap AABB first
               segBB.x + segBB.w > thisEn.x - (thisEn.w * 0.5) &&
               segBB.y < thisEn.y + (thisEn.h * 0.5) &&
               segBB.y + segBB.h > thisEn.y - (thisEn.h * 0.5)) {
                // Might have collided
                
                var segs = [{x1: thisEn.x, x2: thisEn.x, y1: thisEn.y, y2: thisEn.y + thisEn.h}, // Compile line segments of enemy
                            {x1: thisEn.x, x2: thisEn.x + thisEn.w, y1: thisEn.y, y2: thisEn.y},
                            {x1: thisEn.x, x2: thisEn.x + thisEn.w, y1: thisEn.y + thisEn.h, y2: thisEn.y + thisEn.h},
                            {x1: thisEn.x + thisEn.w, x2: thisEn.x + thisEn.w, y1: thisEn.y, y2: thisEn.y + thisEn.h}];
                
                for(var i in segs) {
                    var enseg = segs[i];
                    var orients = [ // compile orients
                        testOrient({x: enseg.x1, y: enseg.y1}, {x: enseg.x2, y: enseg.y2}, {x: seg.x1, y: seg.y1}),
                        testOrient({x: enseg.x1, y: enseg.y1}, {x: enseg.x2, y: enseg.y2}, {x: seg.x2, y: seg.y2}),
                        testOrient({x: seg.x1, y: seg.y1}, {x: seg.x2, y: seg.y2}, {x: enseg.x1, y: enseg.y1}),
                        testOrient({x: seg.x1, y: seg.y1}, {x: seg.x2, y: seg.y2}, {x: enseg.x2, y: enseg.y2}),
                    ];
                    
                    if((orients[0] != orients[1] && orients[2] != orients[3]) ||
                       (orients[0] == 0 && onSegment({x: seg.x1, y: seg.y1}, {x: enseg.x1, y: enseg.y1}, {x: enseg.x2, y: enseg.y2})) ||
                       (orients[1] == 0 && onSegment({x: seg.x2, y: seg.y2}, {x: enseg.x1, y: enseg.y1}, {x: enseg.x2, y: enseg.y2})) ||
                       (orients[2] == 0 && onSegment({x: enseg.x1, y: enseg.y1}, {x: seg.x1, y: seg.y1}, {x: seg.x2, y: seg.y2})) || 
                       (orients[3] == 0 && onSegment({x: enseg.x2, y: enseg.y2}, {x: seg.x1, y: seg.y1}, {x: seg.x2, y: seg.y2})))
                        return {t: 2, id: x}; // Definitely collided with enemy
                }
            }
        }
        
        for(var x in this.obstacles) { // Test if bullet pinged against obstacle
            var thisObs = this.obstacles[x];
            if(segBB.x < thisObs.x + thisObs.w && // Perform cheap AABB first
               segBB.x + segBB.w > thisObs.x &&
               segBB.y < thisObs.y + thisObs.h &&
               segBB.y + segBB.h > thisObs.y) {
                // Might have collided
                
                var segs = [{x1: thisObs.x, x2: thisObs.x, y1: thisObs.y, y2: thisObs.y + thisObs.h},  // Compile line segments of obstacle first
                            {x1: thisObs.x, x2: thisObs.x + thisObs.w, y1: thisObs.y, y2: thisObs.y},
                            {x1: thisObs.x, x2: thisObs.x + thisObs.w, y1: thisObs.y + thisObs.h, y2: thisObs.y + thisObs.h},
                            {x1: thisObs.x + thisObs.w, x2: thisObs.x + thisObs.w, y1: thisObs.y, y2: thisObs.y + thisObs.h}];
                
                for(var i in segs) {
                    var boxseg = segs[i];
                    var orients = [ // compile orientations
                        testOrient({x: boxseg.x1, y: boxseg.y1}, {x: boxseg.x2, y: boxseg.y2}, {x: seg.x1, y: seg.y1}),
                        testOrient({x: boxseg.x1, y: boxseg.y1}, {x: boxseg.x2, y: boxseg.y2}, {x: seg.x2, y: seg.y2}),
                        testOrient({x: seg.x1, y: seg.y1}, {x: seg.x2, y: seg.y2}, {x: boxseg.x1, y: boxseg.y1}),
                        testOrient({x: seg.x1, y: seg.y1}, {x: seg.x2, y: seg.y2}, {x: boxseg.x2, y: boxseg.y2}),
                    ];
                    
                    if((orients[0] != orients[1] && orients[2] != orients[3]) ||
                       (orients[0] == 0 && onSegment({x: seg.x1, y: seg.y1}, {x: boxseg.x1, y: boxseg.y1}, {x: boxseg.x2, y: boxseg.y2})) ||
                       (orients[1] == 0 && onSegment({x: seg.x2, y: seg.y2}, {x: boxseg.x1, y: boxseg.y1}, {x: boxseg.x2, y: boxseg.y2})) ||
                       (orients[2] == 0 && onSegment({x: boxseg.x1, y: boxseg.y1}, {x: seg.x1, y: seg.y1}, {x: seg.x2, y: seg.y2})) || 
                       (orients[3] == 0 && onSegment({x: boxseg.x2, y: boxseg.y2}, {x: seg.x1, y: seg.y1}, {x: seg.x2, y: seg.y2})))
                        return {t: 1}; // Definitely collided with obstacle
                }
            }
        }
        
        return {t: 0}; // Collided with nothing
    },
    
    onmousemove: function(e) { // Figure out where user moved mouse
        var mLoc = getMouse(e);
        this.mouseLoc.x = mLoc.x * this.canvasScale;
        this.mouseLoc.y = mLoc.y * this.canvasScale;
        if(this.player.health > 0) {
            this.mouseLoc.deadX = this.mouseLoc.x;
            this.mouseLoc.deadY = this.mouseLoc.y;
        }
    },
    
    onmousedown: function(e) {
        this.mouseDown = true;
    },
    
    onmouseup: function(e) {
        this.mouseDown = false;
    },
    
    onfocus: function() {
        this.paused = false;
        this.bgAud.volume = 0.5;
    },
    
    onblur: function() {
        this.paused = true;
        this.bgAud.volume = 0.1;
    }
}

function Entity() {
    this.x = 0;
    this.y = 0;
    this.w = 0;
    this.h = 0;
}

app.main.Bullet.prototype = Object.create(Entity.prototype);
app.main.Bullet.prototype.constructor = app.main.Bullet;
app.main.Enemy.prototype = Object.create(Entity.prototype);
app.main.Enemy.prototype.constructor = app.main.Enemy;

