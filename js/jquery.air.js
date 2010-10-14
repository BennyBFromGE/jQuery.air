(function($){
    var $air = {};
    
    $air.hash = {
        toArray: function(hash){
            var arr = [];
            for (var key in hash) {
                arr.push(hash[key]);
            }
            return arr;
        },
        getKeyCount: function(hash){
            return this.toArray(hash).length;
        }
    }
    
    /*** jQuery.air.crypto - utlity ***/
    $air.crypto = (function(){
        var ELS_RGN_ITEM_NAME = "Random Generated Number";
        var BYTE_LENGTH = 32;
        
        function random(){
            var value = air.EncryptedLocalStore.getItem(ELS_RGN_ITEM_NAME);
            
            if (value == null) {
                //		This is the first Key generation and no RN was stored in ELS
                //		Generate a new RN with the flash RNG
                air.trace("Generated 256 bit RN");
                
                value = new air.ByteArray();
                value.length = BYTE_LENGTH; //32 bytes 
                for (var i = 0; i < BYTE_LENGTH; i++) {
                    value[i] = runtime.Math.floor(runtime.Math.random() * 256);
                }
                
                //	Step 5: Store the random number from step one in ELS
                //  in order to be able to rebuild the key later, with the propper pass
                air.EncryptedLocalStore.setItem(ELS_RGN_ITEM_NAME, value);
            }
            else {
                //	 Getting the RN from ELS to generate the first key as the first time
                runtime.trace("Got RN from ELS");
            }
            
            return value;
        };
        
        function concat(value){
            var concatVal = new air.ByteArray();
            concatVal.length = BYTE_LENGTH;
            
            var passIndex = 0;
            for (var i = 0; i < BYTE_LENGTH; i++) {
                concatVal[i] = value.charCodeAt(passIndex);
                
                passIndex++;
                if (passIndex == value.length) 
                    passIndex = 0;
            }
            
            return concatVal;
        };
        
        function xor(first, second){
            var xorResult = new air.ByteArray();
            xorResult.length = BYTE_LENGTH;
            
            for (var i = 0; i < BYTE_LENGTH; i++) {
                xorResult[i] = first[i] ^ second[i];
            }
            
            return xorResult;
        };
        
        function hash(xor){
            return runtime.com.adobe.crypto.SHA256.hashBytes(xor);
        };
        
        function toByteArray(hash){
            var key = new air.ByteArray();
            key.length = BYTE_LENGTH / 2;
            
            for (var i = 0; i < BYTE_LENGTH / 2; i++) {
                var t = parseInt("0x" + hash.substr(i, 2));
                key.writeByte(t & 0x00FF);
            }
            
            return key;
        };
        
        return {
            encrypt: function(value){
                //	Step 1: generate a 256 bit random number (or check if one such number exists in ELS)
                //	Step 2: concatenate password into a 256 bit string
                //	Step 3: XOR the above two 256 bit numbers
                //	Step 4: use sha256 to hash the result of the XOR
                //	Step 5: convert to byte array 
                return toByteArray(hash(xor(random(), concat(value))));
            }
        };
    })();
    
    /*** jQuery.air.bounds - utlity ***/
    $air.bounds = {
        get: function(el){
            var htmlLoader = el.ownerDocument.defaultView.htmlLoader;
            
            var e = $(el), offset = e.offset(), width = e.width(), height = e.height();
            return {
                x: offset.left + htmlLoader.x,
                y: offset.top + htmlLoader.y,
                width: width,
                height: height
            };
        },
        resize: function(value, bounds1, bounds2){
            var lvalue = 1 - value;
            return {
                x: value * bounds1.x + lvalue * bounds2.x,
                y: value * bounds1.y + lvalue * bounds2.y,
                width: value * bounds1.width + lvalue * bounds2.width,
                height: value * bounds1.height + lvalue * bounds2.height
            };
        }
    };
    
    /*** jQuery.air.HTMLLoader - htmlLoader utility ***/
    $air.HTMLLoader = {
        create: function(config){
            var loader = new air.HTMLLoader();
            loader.x = config.x || 20;
            loader.y = config.y || 20;
            loader.paintsDefaultBackground = config.paintsDefaultBackground || false;
            loader.visible = config.visible || false;
            
            var filterFactory = new $air.filters.FilterFactory();
            loader.filters = [filterFactory.create("shadow").filter];
            
            return loader;
        },
        fitToContent: function(loader){
            loader.width = loader.window.document.width;
            loader.height = loader.window.document.height;
        },
        copyAsBitmap: function(loader){
            var data = new air.BitmapData(loader.width, loader.height, true, 0);
            data.draw(loader);
            
            return new air.Bitmap(data);
        }
    };
    
    /*** jQuery.air.filters ***/
    $air.filters = {};
    
    /* Abstract filter */
    $air.filters.Filter = function(config){
        this.config = $.extend({}, {
            x: 0,
            y: 0,
            blurX: 20,
            blurY: 20
        }, config || {});
        
        this.filter = null;
        this.init();
    };
    $air.filters.Filter.prototype = {
        init: function(){
        }
    };
    
    /* Custom filter */
    $air.filters.DropShadow = function(config){
        $air.filters.Filter.call(this, config);
    };
    $air.filters.DropShadow.prototype = new $air.filters.Filter();
    $air.filters.DropShadow.prototype.constructor = $air.filters.DropShadow;
    $air.filters.DropShadow.prototype.init = function(){
        var config = this.config;
        this.filter = new runtime.flash.filters.DropShadowFilter(config.x, config.y);
        this.filter.blurX = config.blurX;
        this.filter.blurY = config.blurY;
    };
    
    /* Filter factory */
    $air.filters.FilterFactory = function(){
    }
    $air.filters.FilterFactory.prototype = {
        create: function(type, config){
            type = type.toLowerCase();
            switch (type) {
                case "dropshadow":
                case "drop-shadow":
                case "shadow":
                    return new $air.filters.DropShadow(config);
            }
        }
    };
    
    /*** jQuery.air.anim ***/
    $air.anim = {
        linear: function(t, b, c, d){
            return (t / d) * c + b;
        },
        ease: function(t, b, c, d){
            if (t == 0) {
                return b;
            }
            if ((t /= d) == 1) {
                return b + c;
            }
            
            var p = d * .3, s = p / 4, a = c;
            return (a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b);
        }
    };
    
    /* Tween */
    $air.anim.Tween = function(config){
		this.config = $.extend({}, { effect: $air.anim.ease }, config || {}); 
		
        this.reversed = false;
        this.running = false;
        this.interval = null;
		
		var tween = this;
		$.each(this.config, function(key, value) { tween[key] = value; }); 
    };
    $air.anim.Tween.fps = 30;
    $air.anim.Tween.prototype = (function(){
    
        return {
            onStart: null,
            onEffect: null,
            onFinish: null,
            start: function(reversed){
                if (this.running) { this.finish(false); }
                
                if (!this.onEffect) { return; }
                
                this.reversed = reversed;
                this.running = true;
                
                var begin = this.begin, end = this.end;
                var transitionEffect = this.effect, currentEffect = 0;
                var duration = this.duration, fps = $air.anim.Tween.fps, startTime = new Date().getTime();
                
                if (this.onStart) {
                    this.onStart();
                }
                
				//air.trace("starting tween"); 
				//air.trace(begin); air.trace(end); air.trace(duration);
                currentEffect = transitionEffect(0, begin, end - begin, duration);
                if (!this.onEffect(currentEffect, 0)) {
                    var self = this;
                    this.interval = setInterval(function() {
                        var newTime = new Date().getTime(), 
							deltaTime = newTime - startTime;
                        currentEffect = transitionEffect(deltaTime, begin, end - begin, duration);
						//air.trace("tween effect - cuurentEffect: " + currentEffect);
						//air.trace("tween effect - duration: " + duration);
						//air.trace("tween effect - deltatime: " + deltaTime);
                        if (nativeWindow.closed || self.onEffect(currentEffect, deltaTime / duration) || duration <= deltaTime || !self.running) {
                            self.finish(false);
                        }
                    }, 1000 / fps);
                }
            },
            stop: function(){
                if (this.running) {
                    this.finish(true)
                };
                            },
            finish: function(interactive){
				air.trace("finishing tween");
				air.trace(this);
                clearInterval(this.interval);
                this.interval = null;
                this.running = false;
                if (this.onFinish) {
                    this.onFinish(interactive);
                }
            }
        };
    })();
    
    /*** jQuery.air.transform ***/
    $air.transform = {};
    $air.transform.Rotation = function(target){
        this.target = target;
        this.setCenter();
    };
    $air.transform.Rotation.prototype = (function(){
    
        return {
            setCenter: function(){
                this.position = {
                    x: this.target.x,
                    y: this.target.y
                }
                this.rotationCenter = {
                    x: this.target.width / 2,
                    y: this.target.height / 2,
                    z: 0
                };
            },
            rotate: function(degrees, axis){
                this.target.z = 0;
                var center = this.rotationCenter, position = this.position;
                
                var result;
                if (this.target.transform.perspectiveProjection) {
                    result = this.target.transform.perspectiveProjection.toMatrix3D();
                }
                else {
                    result = new air.Matrix3D();
                }
                result.appendTranslation(-center.x, -center.y, -center.z);
                result.appendRotation(degrees, axis);
                result.appendTranslation(position.x + center.x, position.y + center.y, center.z);
                this.target.transform.matrix3D = result;
            },
            reset: function(){
                this.target.transform.matrix3D = null;
                this.target.x = this.position.x;
                this.target.y = this.position.y;
            }
        };
    })();
    
    /*** jQuery.air.fx ***/
    $air.fx = {};
    
    /* Abstract 3D effect */
    $air.fx.Effect = function(config){
        this.config = $.extend({}, {
            view: null,
            axis: null,
            duration: 200
        }, config || {});
		this.view = this.config.view; 
        this.tween = null;
        this.init();
    };
    $air.fx.Effect.prototype = {
        init: function() { },
        start: function(reversed) {
            if (this.tween) {
                this.tween.start(reversed);
            }
        },
        stop: function() {
            if (this.tween) {
                this.tween.stop();
            }
        }
    };
    
    /* Custom 3D fx */
    $air.fx.Flip = function(config){
        $air.fx.Effect.call(this, config);
    };
    $air.fx.Flip.prototype = new $air.fx.Effect();
    $air.fx.Flip.prototype.constructor = $air.fx.Flip;
    $air.fx.Flip.prototype.init = function(){
        var config = this.config, 
			firstFace = config.view.htmlLoader, 
			secondFace = config.secondView.htmlLoader, 
			axis = config.axis, 
			duration = config.duration, 
			startValue = 0, 
			endValue = -180, 
			switchValue = (startValue + endValue) / 2, 
			flipped = false, 
			firstFaceRotation = new $air.transform.Rotation(firstFace), 
			secondFaceRotation = new $air.transform.Rotation(secondFace);
        
        this.tween = new $air.anim.Tween({
			begin: startValue,
			end: endValue,
			duration: duration,
			effect: $air.anim.linear
		});
        this.tween.onStart = function(){
            firstFace.stage.mouseChildren = false;
            secondFace.stage.mouseChildren = false;
            
            firstFace.visible = !this.reversed;
            secondFace.visible = this.reversed;
            
            flipped = false;
        };
        this.tween.onEffect = function(value, percent){
            var shouldFlipLoaders = percent > 0.5;
            var rotation = !this.reversed ? value : endValue - (value - startValue);
            
            firstFaceRotation.rotate(rotation, axis);
            secondFaceRotation.rotate(rotation + 180, axis);
			
            if (shouldFlipLoaders && !flipped) {
                firstFace.visible = this.reversed;
                secondFace.visible = !this.reversed;
                flipped = true;
            }
        };
        this.tween.onFinish = function(){
            firstFaceRotation.reset();
            secondFaceRotation.reset();
            firstFace.stage.mouseChildren = true;
            secondFace.stage.mouseChildren = true;
        };
    };
    
    $air.fx.SingleFlip = function(config){
        $air.fx.Effect.call(this, config);
    };
    $air.fx.SingleFlip.prototype = new $air.fx.Effect();
    $air.fx.SingleFlip.prototype.constructor = $air.fx.SingleFlip;
    $air.fx.SingleFlip.prototype.init = function(){
        var config = this.config, 
			firstFace = config.view.htmlLoader, 
			firstFaceParent = null, 
			secondFace = null, 
			axis = config.axis, 
			duration = config.duration, 
			startValue = 0, 
			endValue = -90, 
			flipped = false, 
			firstFaceRotation = new $air.transform.Rotation(firstFace), 
			secondFaceRotation = null, 
			oldFilters, 
			filteredSprite;
        
        firstFaceRotation.rotationCenter.z = firstFace.width / 2;
        
        this.tween = new $air.anim.Tween({
			begin: startValue,
			end: endValue,
			duration: duration,
			effect: $air.anim.linear
		});
        this.tween.onStart = function(){  
            firstFace.stage.mouseChildren = false;
            firstFace.visible = true;
            
            oldFilters = firstFace.filters;
            firstFace.filters = [];
            
            filteredSprite = new runtime.flash.display.Sprite();
            filteredSprite.filters = oldFilters;
            
            firstFaceParent = firstFace.parent;
            
            firstFaceParent.addChild(filteredSprite);
            firstFaceParent.removeChild(firstFace);
            filteredSprite.addChild(firstFace);
            
            secondFace = $air.HTMLLoader.copyAsBitmap(firstFace);
            filteredSprite.addChild(secondFace);
            secondFaceRotation = new $air.transform.Rotation(secondFace); 
            secondFaceRotation.position = firstFaceRotation.position;
            secondFaceRotation.rotationCenter.z = secondFace.width / 2;
            
            // change to the other half now, as we already have a 
            // snapshot of the old image
            //if (this.onHalf) {
              //  this.onHalf();
            //}
            
            flipped = false;
        };
        this.tween.onEffect = function(value, percent){
            var shouldFlipLoaders = percent > 0.5;
            var rotation = !this.reversed ? value : endValue - (value - startValue);
            
            if (this.reversed) {
                firstFaceRotation.rotate(rotation, axis);
                secondFaceRotation.rotate(rotation + 90, axis);
            }
            else {
                firstFaceRotation.rotate(rotation + 90, axis);
                secondFaceRotation.rotate(rotation, axis);
            }
            if (shouldFlipLoaders && !flipped) {
                filteredSprite.swapChildren(firstFace, secondFace);
                flipped = true;
            }
        };
        this.tween.onFinish = function(){
            filteredSprite.removeChild(secondFace);
            filteredSprite.removeChild(firstFace);
            filteredSprite.filters = null;
            firstFaceParent.removeChild(filteredSprite);
            firstFaceParent.addChild(firstFace);
            firstFaceRotation.reset();
            firstFace.filters = oldFilters;
            firstFace.stage.mouseChildren = true;
            filteredSprite = null;
            secondFace.bitmapData.dispose();
            secondFace = null;
            oldFilters = null;
        };
    };
    
    $air.fx.Zoom = function(config){
        $air.fx.Effect.call(this, config);
    };
    $air.fx.Zoom.prototype = new $air.fx.Effect();
    $air.fx.Zoom.prototype.constructor = $air.fx.Zoom;
    $air.fx.Zoom.prototype.init = function(){
		air.trace("zooooom init"); 
		
        var config = this.config, 
			firstFace = config.view.htmlLoader, 
			duration = config.duration;
        this.tween = new $air.anim.Tween({
			begin: 0,
			end: 1,
			duration: duration,
			effect: $air.anim.linear
		});
        this.tween.originalBounds = {
            x: firstFace.x,
            y: firstFace.y,
            width: firstFace.width,
            height: firstFace.height
        };
        this.tween.onStart = function(){
            firstFace.stage.mouseChildren = false;
            
            if (!this.reversed) {
                firstFace.visible = true;
            }
        };
        this.tween.onEffect = function(value){
            var transition = this.reversed ? value : 1 - value;
			
			air.trace("zooooming");  
			
            var newBounds = $air.bounds.resize(transition, this.bounds, this.originalBounds);
            firstFace.x = newBounds.x;
            firstFace.y = newBounds.y;
            firstFace.scaleX = newBounds.width / this.originalBounds.width;
            firstFace.scaleY = newBounds.height / this.originalBounds.height;
            firstFace.alpha = 1 - transition;
        };
        this.tween.onFinish = function(){
			air.trace("zoooom finish");
			
            var originalBounds = this.originalBounds;
            firstFace.x = originalBounds.x;
            firstFace.y = originalBounds.y;
            firstFace.scaleX = 1;
            firstFace.scaleY = 1;
            firstFace.alpha = 1;
            
            if (this.reversed) {
                firstFace.visible = false;
            }
            firstFace.stage.mouseChildren = true;
        };
    };
    
    /* 3D fx factory */
    $air.fx.EffectFactory = function() { };
    $air.fx.EffectFactory.prototype = (function() {
    
        return {
            create: function(type, config){
                if (!type) { throw new Error("fx type required"); }
                type = type.toLowerCase();
                switch (type) {
                    case "flip":
                        return new $air.fx.Flip(config);
                    case "singleflip":
                    case "single-flip":
                        return new $air.fx.SingleFlip(config);
                    case "zoom":
                        return new $air.fx.Zoom(config);
                }
            }
        };
    })();
    
    /** jQuery.air.db ***/
    $air.fx.blender = {};
    
    /* Abstract blender effect */
    $air.fx.blender.Effect = function(config){
        this.config = $.extend({}, {
            view: null,
            url: "",
            shader: null,
            shaderConfig: {},
            axis: null,
            duration: 200,
            transition: $air.anim.linear
        }, config || {}); 
		this.view = this.config.view;
        this.tween = null;
        this.init();
    };
    $air.fx.blender.Effect.prototype = (function(){
    
        //Private methods
        function resetFilters(target, filters){
            var oldFilters = target.filters;
            for (var i = 0; i < oldFilters.length; i++) {
                var oldFilter = oldFilters[i];
                if (typeof oldFilter.shader == 'undefined') {
                    filters.push(oldFilter);
                }
            }
            target.filters = filters;
        }
        
        function loadShader(){ }
        function applyShader(target, shader, shaderConfig){
            if (!shader) {
                return;
            }
            if (shader.data.width) {
                shader.data.width.value[0] = target.width;
                shader.data.height.value[0] = target.height;
            }
            for (var key in shaderConfig) {
                shader.data[key].value[0] = shaderConfig[key];
            }
            
            // let the shader always be the first filter 
            var shaderFilter = new air.ShaderFilter(shader);
            shaderFilter.leftExtension = shaderFilter.topExtension = shaderFilter.bottomExtension = shaderFilter.rightExtension = 30;
            
            resetFilters(target, [shaderFilter]);
        }
        
        //Private events
        
        return {
            init: function(){
                if (this.config.url === "") {
                    return;
                }
                
                var config = this.config;
                
                var loader = new air.URLLoader();
                loader.dataFormat = air.URLLoaderDataFormat.BINARY;
                loader.addEventListener(air.Event.COMPLETE, function(){
                    config.shader = new air.Shader(loader.data);
                });
                loader.load(new air.URLRequest(config.url));
                
                this.tween = new $air.anim.Tween({
					begin: 0,
					end: 1,
					duration: config.duration,
					effect: config.transition
				});
                this.tween.keepTheEffect = false;
                this.tween.hideOnFinish = false;
                this.tween.disableInteraction = false;
                
                this.tween.onStart = function(){
                    if (this.disableInteraction) {
                        window.htmlLoader.stage.mouseChildren = false;
                    }
                };
                this.tween.onEffect = function(value){
                    // apply the blender effct
                    var firstFace = config.view.htmlLoader, shader = config.shader, shaderConfig = config.shaderConfig, transition = this.reversed ? 1 - value : value;
                    var shaderConfig = $.extend({}, {
                        transition: transition
                    }, shaderConfig || {}); 
					
                    applyShader(firstFace, shader, shaderConfig);
                };
                this.tween.onFinish = function(value){
                    var firstFace = config.view.htmlLoader;
                    if (this.hideOnFinish) {
                        firstFace.visible = false;
                    }
                    
                    if (!this.keepTheEffect) {
                        resetFilters(firstFace, []);
                    }
                    
                    if (this.disableInteraction) {
                        window.htmlLoader.stage.mouseChildren = true;
                    }
                };
            },
	        start: function(reversed) {
	            if (this.tween) {
	                this.tween.start(reversed);
	            }
	        },
	        stop: function() {
	            if (this.tween) {
	                this.tween.stop();
	            }
	        }
        };
    })();
    
    /* Custom blender fx */
    $air.fx.blender.Dissolve = function(config){
        config = $.extend({}, {
            url: "app:/lib/disolve.pbj",
            duration: 500,
            transition: $air.anim.linear
        }, config || {});
        $air.fx.blender.Effect.call(this, config);
    };
    $air.fx.blender.Dissolve.prototype = new $air.fx.blender.Effect();
    $air.fx.blender.Dissolve.prototype.constructor = $air.fx.blender.Dissolve;
    
    $air.fx.blender.Page = function(config){
        config = $.extend({}, {
            url: "app:/lib/page.pbj",
            duration: 1200,
            transition: $air.anim.ease
        }, config || {});
        
        $air.fx.blender.Effect.call(this, config);
    };
    $air.fx.blender.Page.prototype = new $air.fx.blender.Effect();
    $air.fx.blender.Page.prototype.constructor = $air.fx.blender.Page;
    
    $air.fx.blender.Waves = function(config){
        config = $.extend({}, {
            url: "app:/lib/waves.pbj",
            duration: 1200,
            transition: $air.anim.linear
        }, config || {});
        
        $air.fx.blender.Effect.call(this, config);
    };
    $air.fx.blender.Waves.prototype = new $air.fx.blender.Effect();
    $air.fx.blender.Waves.prototype.constructor = $air.fx.blender.Waves;
    
    $air.fx.blender.Shake = function(config){
        config = $.extend({}, {
            url: "app:/lib/shake.pbj",
            duration: 1000
        }, config || {});
        
        $air.fx.blender.Effect.call(this, config);
    };
    $air.fx.blender.Shake.prototype = new $air.fx.blender.Effect();
    $air.fx.blender.Shake.prototype.constructor = $air.fx.blender.Shake;
    
    /* Blender fx factory */
    $air.fx.blender.EffectFactory = function(){
    };
    $air.fx.blender.EffectFactory.prototype = (function(){
    
        return {
            create: function(type, config){
                if (!type) {
                    throw new Error("blender effect type required");
                }
                type = type.toLowerCase();
                
                switch (type) {
                    case "dissolve":
                        return new $air.fx.blender.Dissolve(config);
                    case "page":
                        return new $air.fx.blender.Page(config);
                    case "waves":
                        return new $air.fx.blender.Waves(config);
                    case "shake":
                        return new $air.fx.blender.Shake(config);
                    default:
                        throw new Error("unregistered blender effect");
                }
            }
        };
    })();
    
    $air.fx.blender.EffectManager = function(){
        this.fx = [];
    };
    $air.fx.blender.EffectManager.prototype = (function(){
    
        return {
            get: function(type){
                if (!this.fx[type]) {
                    var factory = $air.fx.blender.EffectFactory();
                    this.fx[type] = factory.create(type);
                }
                return this.fx[type];
            }
        };
    })();
	
	/*** jQuery.air.files ***/
	$air.files = {
		temp: function(id) { 
			var dir = air.File.applicationStorageDirectory.resolvePath("temp/");
			return id ? dir.resolvePath(id) : dir.resolvePath("$temp$");
		},
		move: function(oldFile, newFile) { 
			try { 
				oldFile.moveTo(newFile);	
			} catch(ex) { 
				air.trace(ex); 
			}
		},
		del: function(file) { 
			if(!file && !file.exists) { return; }
			try { 
				file.deleteFile(true);
			} catch(ex) { 
				air.trace(ex);
			}
		},
		
		text: function(file) {
			
			var fileStream = new air.FileStream(), text = "";
			try {		
				fileStream.open(file, air.FileMode.READ);
				text = fileStream.readUTFBytes(file.size);
				fileStream.close();
			}  catch (ex) { 
				air.trace(ex); 
				return ""; 
			}
			return text;
		}, 
		
		read: function(file) { 
			var filestream = new air.FileStream(), bytes = new air.ByteArray();
			try {
				filestream.open(file, air.FileMode.READ);
				filestream.readBytes(bytes, 0, file.size);
				filestream.close();
			} catch (ex) { 
				air.trace(ex); 
				return false; 
			}
			return bytes;
		}, 
		write: function(file, bytes) { 
			var filestream = new air.FileStream();
			try {
				filestream.open(file, air.FileMode.WRITE);
				filestream.writeBytes(bytes, 0, bytes.length);
				filestream.close();
			} catch (ex) {
				air.trace(ex);
				return false;
			}
			return true;
		},
		
		images: { 
			resize: function(orig, resized, onResize){
				var loader = new air.Loader();

				function onComplete(event) { 
					loader.contentLoaderInfo.removeEventListener(air.Event.COMPLETE, onComplete);
					
					var image = loader.content,
						scaled = new air.BitmapData(84, 112),
						matrix = new air.Matrix(); 
					matrix.scale(84 / image.width, 112 / image.height);
					scaled.draw(image, matrix);
					
					var img = new air.Bitmap(scaled),
						bytes = runtime.com.adobe.images.PNGEncoder.encode(img.bitmapData);  
					if (!$air.files.write(resized, bytes)) { onResize(false); }
					onResize(true, resized);
				};
				function onError(event) {
					loader.contentLoaderInfo.removeEventListener(air.Event.COMPLETE, onComplete);
					
					onResize(false);
				};
				loader.contentLoaderInfo.addEventListener(air.Event.COMPLETE, completeHandler);
				loader.contentLoaderInfo.addEventListener(air.IOErrorEvent.IO_ERROR, ioErrorHandler);
				loader.load(new air.URLRequest(orig.url));
			}
		} 
	}; 
	
	/*** jQuery.air.data ***/ 
	$air.data = {};
//	$air.data.Hash = function(collection) { 
//		this.tuples = [];
//		
//		for(var i = 0; i < collection.length; i++) { 
//			var item = collection[i];
//			this.tuples[item.id] = item;
//		}
//	};
//	$air.data.List.prototype = {  
//		add: function(key, value) {
//			this.tuples[key] = value;
//		}, 
//		remove: function(key) { 
//			if(!this.tuples[key]) return;
//			
//			delete this.tuples[key]; 
//		}, 
//		get: function(index) {
//			this.index = index;
//			return this.items[this.index];
//		}, 
//		pop: function() { return this.items.pop(); },
//		push: function(item) { 
//			if(!item) return;
//			this.items.push(item);
//		}, 
//		prev: function() {
//			if(this.index === 0) return;
//			
//			this.index = this.index - 1;
//			return this.items[this.index];
//		}, 
//		next: function() {
//			air.trace("nexting");
//			air.trace(this.items);
//			if(this.items) { air.trace(this.items.length); }
//			if(this.index === (this.items.length - 1)) return;
//			
//			this.index = this.index + 1;
//			return this.items[this.index];
//		}, 
//		find: function(parms) { 
//			for(var i = 0, len = this.items.length; i < len; i++) {
//				var item = this.items[i];
//				var found = true;
//				for(var key in parms) {  
//					if(item[key] !== parms[key]) { 
//						found = false;
//						break;
//					}
//				}
//				
//				if(found) return item; 
//			} 
//		},
//		sort: function(comparer) {
//			this.items.sort(comparer);
//			this.index = 0;
//		}
//	};



    /*** jQuery.air.db ***/
    /* Query */
    /* Table */
    /* Database */
    $air.db = {};
    
    $air.db.Query = function(connection){
        this.connection = connection;
        
        //var table = this; 
        //$.each({ onSuccess: function() {}, onFailure: function() {}}, function(key, value) { 
        //	table[key] = value;
        //	$(table).bind(key, $.proxy(table[key], table)); 
        //});
    };
    $air.db.Query.prototype = (function(){
        //Private methods
        function setParm(key, value){
			air.trace("setting parm");
			air.trace(key); air.trace(value);
			if (!$.isFunction(value)) {
				this.statement.parameters[":" + key] = value;
			}
        }
        
        //Private events				
        function onSuccess(){ 
            var result = this.statement.getResult(), 
				data = result ? result.data : {};
			
            air.trace("successful query"); 
            air.trace(this.statement.text); 
			
            $(this).trigger("success", result);
            
			this.statement.removeEventListener(air.SQLErrorEvent.ERROR, $.proxy(onSuccess, this));
        }
        function onError(error){
			air.trace("query error");
			air.trace(error);
            $(this).trigger("error", error);
            
			this.statement.removeEventListener(air.SQLErrorEvent.ERROR, $.proxy(onFailure, this));
        }
        
        return {
            execute: function(sql, parms) {
		        this.statement = new air.SQLStatement();
		        this.statement.sqlConnection = this.connection;
                this.statement.text = sql;
                this.statement.clearParameters();
                $.each(parms, $.proxy(setParm, this)); 
				
				$.each(this.statement.parameters, function(k, v) { air.trace(k); air.trace(v); });
			 	
				this.statement.addEventListener(air.SQLEvent.RESULT, $.proxy(onSuccess, this));
				this.statement.addEventListener(air.SQLErrorEvent.ERROR, $.proxy(onError, this));
                this.statement.execute(); //-1, new air.Responder($.proxy(onSuccess, this), $.proxy(onFailure, this)));
            }
        };
    })();
    
    $air.db.Table = function(name, config, connection){
        this.name = name;
        this.config = $.extend({}, {
            columns: {},
            events: { ready: function(){ }, error: function(){ }}
        }, config || {});
        this.connection = connection;
        
        var table = this;
        $.each(this.config.events, function(key, value){
            $(table).bind(key, $.proxy(value, table));
        });
        
		air.trace("table constructor");
        this.init();
    };
    $air.db.Table.prototype = (function(){
        //Private methods
        function executeQuery(sql, parms, onSuccess, onFailure){
            air.trace("executing query");
            air.trace(sql);
            var query = new $air.db.Query(this.connection);
            
            if (onSuccess) {
				air.trace("binding callback to query" + onSuccess);
                $(query).bind("success", onSuccess);
            }
            if (onFailure) {
                $(query).bind("failure", onFailure);
            }
            query.execute(sql, parms);
        }
        
        //Private events
        
        return {
            init: function(){
                air.trace("creating table");
                var columnDefinitions = [];
                for (var columnName in this.config.columns) {
                    var column = this.config.columns[columnName];
                    
                    var columnDefinition = columnName + " " + column.type;
                    if (column.size) {
                        columnDefinition += "(" + column.size + ")";
                    }
                    if (column.primaryKey === true) {
                        columnDefinition += " PRIMARY KEY ";
                    }
                    if (column.autoIncrement === true) {
                        columnDefinition += " AUTOINCREMENT ";
                    }
                    columnDefinitions.push(columnDefinition);
                    
                    //this.columns[columnName] = column;
                }
				
			
	            var query = new $air.db.Query(this.connection),
					sql = "CREATE TABLE IF NOT EXISTS " + this.name + " ( " + columnDefinitions.join() + ")",  
					parms = {};

		        function onSuccess(e, result){
					air.trace("table create success"); 
					
					//$(query).unbind("success", $.proxy(onCreate, this));
					
		            $(this).trigger("ready");
		        };
				$(query)
				.bind("success", $.proxy(onSuccess, this))
	            .get(0).execute(sql, parms);
            },
            get: function(parms) { //, onSuccess, onFailure){ 
				var query = new $air.db.Query(this.connection),  sql = "SELECT * FROM " + this.name;
					
                if (!$.isEmptyObject(parms)) {
                    var clauses = [];
					$.each(parms, function(key, value) {
						clauses.push(key + "= :" + key);
					});
                    
                    sql += " WHERE " + clauses.join(" AND ");
                }
                
				air.trace("calling table get");
				function onSuccess(e, result) {
					air.trace("table row get success");
					
					$(this).trigger("success", result);	
				};
				function onError(e, error) {
					air.trace("table row get error");
					
					$(this).trigger("error", error);
				};
				
				$(query)
				.bind("success", $.proxy(onSuccess, this))
				.bind("error", $.proxy(onError, this)) 
	            .get(0).execute(sql, parms); 
            },
            set: function(parms, onSuccess, onFailure){ 
                if ($.isEmptyObject(parms)) {
					air.trace("set parms empty");
                    return;
                } 
				
	            var query = new $air.db.Query(this.connection), sql = "";
                if (!parms.id) {
                    sql = "INSERT INTO " + this.name + " ";

					delete parms["id"];
                    var columns = [], values = [];
					$.each(parms, function(key, value) {
						if (!$.isFunction(value)) {
							columns.push(key);
							values.push(":" + key);
						}
					}) 
                    sql += "(" + columns.join(",") + ") VALUES (" + values.join(",") + ")"; 
                }
                else {
                    sql = "UPDATE " + this.name + " SET "; 
					
                    var columns = [];
					$.each(parms, function(key, value) {
						if (!$.isFunction(value)) {
							columns.push(key + " = :" + key);
						}
					});
                    
                    sql += columns.join(",") + " WHERE id = :id"; 
                } 
				
		        function onSuccess(e, result) {
					air.trace("table row set success"); 
					
					//$(query).unbind("success", $.proxy(onSuccess, this));
					
					$(this).trigger("success", result);
		        };
				function onError(e, error) {
					air.trace("table row set error");
					
					//$(query).unbind("error", $.proxy(onError, this));
					$(this).trigger("error", error)
				};
				$(query)
				.bind("success", $.proxy(onSuccess, this))
				.bind("error", $.proxy(onError, this))
				.get(0).execute(sql, parms); 
            },
            del: function(parms, onSuccess, onFailure){
                if ($.isEmptyObject(parms) || !parms.id) { return; }
                
                var query = new $air.db.Query(this.connection), sql = "DELETE FROM " + this.name + " WHERE id = :id";
				 
				
		        function onSuccess(e, result) {
					air.trace("table row del success"); 
					
					//$(query).unbind("success", $.proxy(onDelete, this));
					
					$(this).trigger("success", result);
		        };
				function onError(e, error) {
					air.trace("table row del error");
					
					//$(query).unbind("error", $.proxy(onError, this));
					
					$(this).trigger("error", error);
				};
				$(query)
				.bind("success", $.proxy(onSuccess, this))
				.bind("error", $.proxy(onError, this))
	            .get(0).execute(sql, parms);  
            }
        };
    })();
    
    $air.db.Database = function(key, config){
        this.key = key;
        this.config = $.extend({}, {
            tables: {
                columns: {}
            },
            events: {}
        }, config || {});
        
        this.file = air.File.applicationStorageDirectory.resolvePath(this.key);
        //if(!this.file.exists) { this.create(); }
        
        this.connection = null;
        
        this.table = [];
        
        this.init();
    };
    $air.db.Database.prototype = (function(){
        //Private methods 
        
        //Private events
        function onOpen(event){
            air.trace("database opened - creating tables");
			
			this.connection.removeEventListener(air.SQLEvent.OPEN, $.proxy(onOpen, this));
            
            var db = this, tableCount = $air.hash.getKeyCount(this.config.tables), readyCount = 0;
            $.each(db.config.tables, function(key, value){
                function onReady(result){ 
					air.trace("table loaded"); 
					
					readyCount++;
					if (tableCount === readyCount) { $(db).trigger("open"); }
                };
                function onError(result){ air.trace(result.error); };
                var tableConfig = $.extend({}, {
	                    events: { ready: $.proxy(onReady, db), error: $.proxy(onError, db) }
	                }, value), 
					table = new $air.db.Table(key, tableConfig, db.connection);
                
				air.trace("storing table!!!");
                db.tables(key, table);
            });
        }
        function onError(event){
            air.trace("database open error - " + event.text); 
			
			this.connection.removeEventListener(air.SQLErrorEvent.ERROR, $.proxy(onError, this));
			
            $(this).trigger("error", { error: event.text });
        }
        
        return {
            file: null,
            connection: null, 
            
            init: function(){
            	air.trace("db initing");
                var db = this, events = this.config.events;
                
                //event init
                $.each(events, function(key, value){
                    $(db).bind(key, $.proxy(value, db));
                });
                
                //native air sql connection
                //event attachment
                db.connection = new air.SQLConnection();
                db.connection.addEventListener(air.SQLEvent.OPEN, $.proxy(onOpen, db));
                db.connection.addEventListener(air.SQLErrorEvent.ERROR, $.proxy(onError, db));
            },
            open: function(pwd){
                this.connection.openAsync(this.file, air.SQLMode.CREATE, null, false, 1024, $air.crypto.encrypt(pwd));
            },
            dispose: function(){
                if (this.connection == null || !this.connection.connected) {
                    return;
                }
                this.connection.close();
            },
            
            isInitialized: function(){
                return this.file.exists;
            },
            
            tables: function(name, table){
                if (!table) {
                    air.trace("getting table from cache");
                    return this.table[name];
                }
                if (!this.table[name]) {
                    this.table[name] = table;
                }
            },
            getTable: function(name){
                return this.table[name];
            },
            addTable: function(table){
                if (!this.table[table.name]) {
                    this.table[table.name] = table;
                }
            }
        };
    })();
	
	
    
    /*** jQuery.air.widgets ***/
	$air.widgets = {};
    $air.widgets.Widget = function(config){  
        this.config = $.extend({}, {
			id: "", 
            type: "",
			actions: {}
        }, config || {});
        
		this.app = null;
        this.view = null;
        
        this.init();
    };
    $air.widgets.Widget.prototype = (function(){
        return { 
            config: null,
            
            view: null,
            
            toString: function(){
                return "$.air.widgets.Widget";
            },
            init: function(){ 
				var widget = this;
				$.each(this.config.actions, function(key, value) {
					switch(key) {
						case "keydown":
						break;
						default:
						$(widget).bind(key, $.proxy(value, widget));
						break;
					}
				});
            },
            build: function(){
                air.trace("build cannot be called on abstract $.air.widgets.Widget");
            },
            populate: function(model){
                air.trace("populate cannot be called on abstract $.air.widgets.Widget");
            }
        };
    })();
    
	/* Form */
    $air.widgets.Form = function(config){
        $air.widgets.Widget.call(this, config);
    };
    $air.widgets.Form.prototype = new $air.widgets.Widget();
    $air.widgets.Form.prototype.constructor = $air.widgets.Form;
    $air.widgets.Form.prototype.toString = function(){
        return "$.air.widgets.Form";
    };
    $air.widgets.Form.prototype.build = function(){
		this.el = this.view.get(this.config.id);
    };
    $air.widgets.Form.prototype.populate = function(model){
        var view = this.view;
        $.each(model, function(key, value){
			if (!$.isFunction(value)) {
				var el = view.get(key);
				if (el) {
					var nodeName = el.nodeName.toLowerCase();
					switch (nodeName) {
						case "img":
							break;
							case "td":
							case "th":
							case "label":
							case "span":
							case "div":
							$(el).html(value);
						default:
							$(el).val(value);
							break;
					}
				}
			}
        });
    };
    $air.widgets.Form.prototype.read = function(model){
        var view = this.view, obj = {};
        $.each(model, function(key, value){
			if ($.isFunction(value)) {
				obj[key] = value;
			}
			else {
				obj[key] = ""; 
				var el = view.get(key);
				if (el) {
					var nodeName = el.nodeName.toLowerCase();
					switch (nodeName) {
						case "img":
							break;
						default:
							obj[key] = $(el).val();
							air.trace(key);
							break;
					}
				}
			}
        });
		
		return obj;
    }; 
    
	/* List */
    $air.widgets.List = function(el, config){
		this.selectedIndex = 0;
		
        $air.widgets.Widget.call(this, el, config);
    };
    $air.widgets.List.prototype = new $air.widgets.Widget();
    $air.widgets.List.prototype.constructor = $air.widgets.List;
    $air.widgets.List.prototype.toString = function(){
        return "$.air.widgets.List";
    }; 
    $air.widgets.List.prototype.build = function(){ 
		air.trace("list build");
		
		this.el = this.view.get(this.config.id);
		
		function onClick(event) {
			air.trace("list click"); 
			this.selectedId = parseInt($(event.target).closest("div").get(0).id);
			air.trace("Innnnndex:   " + this.selectedId);
			$(this).trigger("click"); 
		}
        
		$(this.el).bind("click", $.proxy(onClick, this));
    };
    $air.widgets.List.prototype.populate = function(models){
		air.trace("Populating list");
        if ($.isArray(models)) {
			air.trace(models.length);
            var listEl = $(this.el);
            $.each(models, function(i, model){
                listEl.append("<div class='listDiv' id='" + model.id + "'>" + model.toHTML() + "</div>");
            });
        }
    };
	$air.widgets.List.prototype.select = function(id) {
		$(this.el).children().removeClass("selected");
		$(this.el).children("#" + id).addClass("selected");
	};
	$air.widgets.List.prototype.item = function(id) { 
		return $(this.el).children("#" + id).get(0);
	};
	
	$air.widgets.List.prototype.remove = function(id) {
		$(this.el).remove("#" + id);
	};
    
    $air.widgets.WidgetFactory = function(){
    
	};
    $air.widgets.WidgetFactory.prototype = {
        create: function(type, config){
            type = type.toLowerCase();
            switch (type) {
                case "form":
                    return new $air.widgets.Form(config);
                case "list":
                    return new $air.widgets.List(config);
                default:
                    air.trace("unsupported $air.widgets.Widget type");
                    return null;
            }
        }
    };
    
    
    /*** jQuery.air.app ***/
    $air.app = {};
    
    /* Model */
    $air.app.Model = function(key, config){
        this.key = key;
        this.config = $.extend({}, {}, config || {});
        
        this.init();
    };
    $air.app.Model.prototype = (function(){
        //Private methods
        function getTable(){
            return this.app.db.tables(this.key);
        }
        
        function getDefaultPropertyValue(type){
            type = type.toLowerCase();
            switch (type) {
                case "int":
                case "integer":
                case "long":
                    return 0;
                default:
                    return "";
            }
        };
        
        //Private events
        
        return {
            key: null,
            
            app: null,
            
            init: function(){
            
            },
            
            build: function(props) {
                var obj = {};
                $.each(this.config, function(key, value){
					if ($.isFunction(value)) {
						obj[key] = value;
					}
					else {
						obj[key] = (props && props[key]) ? props[key] : getDefaultPropertyValue(value.type);
					}
                });
                
                return obj;
            },
            
            get: function(parms) { //, onSuccess, onFailure){
				var table = this.app.db.tables(this.key);
            
                air.trace("getting model");
                air.trace(this.key);
                
                function onSuccess(e, result){
					if(!result.data) { return; }
					
                    var model = this, models = [];
                    air.trace("got some results - hot digggggs"); 
					
					var data = result.data;
					$.each(data, function(i, item) {
                        models.push(model.build(item));
					});
					
					$(this).trigger("success", { data: models }); 
                };
                function onError(e, error){
					air.trace("model get error: " + error.message);
					
					//$(table).unbind("error", $.proxy(onError, this));
					$(this).trigger("error", error); 
                };
                
				air.trace("calling get table - get");
				$(table).
				bind("success", $.proxy(onSuccess, this)).
				bind("error", $.proxy(onError, this)).
				get(0).get(parms);
            },
            save: function(parms) { //, onSuccess, onFailure){
				var table = this.app.db.tables(this.key);
				
				function onSuccess(e, result) { 
					air.trace("model save success");
					air.trace(result);
					air.trace("result.data...");
					air.trace(result.data);
					air.trace(result.lastInsertRowID);
					
					if(!parms.id) { parms.id = result.lastInsertRowID; }

					//$(table).unbind("success", $.proxy(onSuccess, this));
					$(this).trigger("success", this.build(parms));
				};
                function onError(e, error){
					air.trace("model save error: " + text);
					
					//$(table).unbind("error", $.proxy(onError, this));
					$(this).trigger("error", { error: error }); 
                };

				air.trace("calling model table set");
				$(table).
				bind("success", $.proxy(onSuccess, this)).
				bind("error", $.proxy(onError, this)).
				get(0).set(parms);
            },
			del: function(parms) { //, onSuccess, onFailure) { 
				var table = this.app.db.tables(this.key);
			
				function onSuccess(e, result) {
					
					//$(table).unbind("success", $.proxy(onSuccess, this));
					$(this).trigger("success", { });
				};
                function onError(e, error){
					air.trace("model del error: " + text);
					
					//$(table).unbind("error", $.proxy(onError, this));
					$(this).trigger("error", { error: error }); 
                };


				air.trace("calling table del"); 
				$(table).
				bind("success", $.proxy(onSuccess, this)).
				bind("error", $.proxy(onError, this)).
				get(0).del(parms);
			}, 
            
            toTable: function(){
                var table = {
                    columns: {}
                };
                $.each(this.config, function(key, value){
					if (!$.isFunction(value)) {
						table.columns[key] = value;
					}
                });
                
                return table;
            }
        };
    })();
    
    /* Action */
    $air.app.Action = function(type, config){
        this.type = type;
        
        this.config = $.extend({}, {
            target: "",
            keyCode: ""
        }, config || {});
        
        this.view = null;
    };
    $air.app.Action.prototype = (function(){
        //Private methods
        
        //Private events
        
        //Public prototype
        return {
            toString: function(){
                return "$air.app.Action";
            },
            register: function() {},
            dispose: function(){ },
            handle: function(event){  
				this.config.handle.call(this.view, event); 
			}
        };
    })();
    
    $air.app.KeyAction = function(type, config){
        $air.app.Action.call(this, type, config);
    };
    $air.app.KeyAction.prototype = new $air.app.Action();
    $air.app.KeyAction.constructor = $air.app.KeyAction;
    $air.app.KeyAction.prototype.toString = function(){
        return "$air.app.KeyAction";
    }; 
    
    $air.app.MouseAction = function(type, config){
        $air.app.Action.call(this, type, config);
    };
    $air.app.MouseAction.prototype = new $air.app.Action();
    $air.app.MouseAction.constructor = $air.app.MouseAction;
    $air.app.MouseAction.prototype.toString = function(){
        return "$air.app.MouseAction";
    };
    $air.app.MouseAction.prototype.register = function(){
        var target = this.view.get(this.config.target);
        if (target) {
            $(target).bind(this.type, $.proxy(this.handle, this)); // $.proxy(this.config.handle, this.view));
        }
    }; 
    
    $air.app.ActionFactory = function(){
    };
    $air.app.ActionFactory.prototype = {
        toString: function(){
            return "$air.app.ActionFactory";
        },
        create: function(type, config){
            type = type.toLowerCase();
            switch (type) {
                case "keydown":
                    return new $air.app.KeyAction(type, config);
                default:
                    return new $air.app.MouseAction(type, config);
            }
        }
    };
    
    /* View */
    $air.app.View = function(key, config){
        this.key = key;
        this.config = $.extend({}, {
            path: "",
            htmlLoader: {},
			widgets: {}, 
            transitions: {},
            actions: {},
            events: { load: function() { } }
        }, config || {});
        
        this.loaded = false;
        this.htmlLoader = null;
        
        this.element = [];
        
        this.widget = [];
        
        this.fx = [];
        
        this.transition = [];
        
        this.action = [];
        
        this.init();
    };
    $air.app.View.prototype = (function(){
        //Private methods 
        
        //3D fx 
        function getFlipXEffect(to, config){
            var fxConfig = $.extend({}, { view: this, secondView: to, axis: air.Vector3D.X_AXIS, duration: 200 }, config || {} ); 
            return this.app.get3DEffect("flip", fxConfig);
        };
        function getSingleFlipYEffect(config){
            var fxConfig = $.extend({}, { view: this, axis: air.Vector3D.Y_AXIS, duration: 300 }, config || {} );  
            return this.app.get3DEffect("single-flip", fxConfig);
        };
        function getZoomEffect(config){
            var fxConfig = $.extend({}, { view: this, duration: 300 }, config || {} ); 
			
			air.trace("zoom effect"); 
			air.trace(fxConfig.duration);
            return this.app.get3DEffect("zoom", fxConfig);
        };
        
        //Blender fx
        function getDissolveEffect(config){
            var fxConfig = $.extend({}, { view: this }, config || {} );
            return this.app.getBlenderEffect("dissolve", fxConfig);
        };
        function getPageEffect(config){
            var fxConfig = $.extend({}, { view: this }, config || {} );
            return this.app.getBlenderEffect("page", fxConfig);
        };
        function getWavesEffect(config){
            var fxConfig = $.extend({}, { view: this, shaderConfig: { waves: 2, weight: 0.9 } }, config || {} ); 
            return this.app.getBlenderEffect("waves", fxConfig);
        };
        function getShakeEffect(config){
            var fxConfig = $.extend({}, { view: this, shaderConfig: { waves: 2, weight: 0.9 } }, config || {} ); 
            return this.app.getBlenderEffect("shake", fxConfig);
        };
        
        //Private events
        function onLoadComplete(event){
            $air.HTMLLoader.fitToContent(event.target);
            
            this.loaded = true;
            
            air.trace("view loaded - " + this.key); 
            air.trace(this.widgets().length);
            air.trace(this.actions().length);
            
            $.each(this.widgets(), function(i, widget){
                air.trace("widget building");
                widget.build();
            });
            $.each(this.actions(), function(i, action){
                action.register();
            });
            
            $(this).trigger("load"); //, this);
        };
        
        return {
            key: null,
            
            loaded: false,
            htmlLoader: null,
            element: null,
            widget: null,
            
            transition: null,
            action: null,
            
            app: null,
            
            toString: function(){
                return "$air.app.View";
            },
            init: function(){
                var view = this, 
					config = this.config, 
					widgets = config.widgets, widgetFactory = new $air.widgets.WidgetFactory(), 
					transitions = config.transitions, 
					actions = config.actions, actionFactory = new $air.app.ActionFactory(), 
					events = config.events;
                
                //controls init
                air.trace("controls init");
                for (var key in widgets) {
                    var widgetConfig = widgets[key];
                    view.widgets(key, widgetFactory.create(key, widgetConfig));
                }
                
                //transitions init
                air.trace("transitions init");
                for (var key in transitions) {
                    var transition = transitions[key];
                    view.transitions(key, transition);
                }
                
                //actions init
                air.trace("actions init");
                for (var key in actions) {
                    var actionConfig = actions[key];
                    if ($.isFunction(actionConfig)) {
						air.trace(key);
						air.trace(actionConfig);
                        view.actions(key, actionFactory.create(key, {
                            handle: actionConfig
                        }));
                    }
                    else {
                        $.each(actionConfig, function(id, callback){
                            air.trace("adding action for " + id);
                            view.actions(key + "-" + id, actionFactory.create(key, {
                                target: id,
                                handle: callback
                            }));
                        });
                    }
                }
                
                //events
                air.trace("events init");
                for (var key in events) {
                    var event = events[key];
                    $(view).bind(key, event);
                }
                
                //methods
                $.each(config, function(key, value){
                    switch (key) {
                        case "path":
                        case "htmlLoader":
						case "widgets":
                        case "transitions":
                        case "actions":
                        case "events":
                            break;
                        default:
                            view[key] = value;
                            delete config[key];
                            break;
                    }
                });
                
                //native air element init
                //htmlLoader element
                air.trace("html loader init");
                air.trace(view.key);
                air.trace(config.path);
                view.htmlLoader = $air.HTMLLoader.create(config.htmlLoader);
                view.htmlLoader.addEventListener(air.Event.COMPLETE, $.proxy(onLoadComplete, view));
                view.htmlLoader.load(new air.URLRequest(config.path));
            },
            
            get: function(id){
                if (!this.element[id]) {
                    this.element[id] = this.htmlLoader.window.document.getElementById(id);
                }
                return this.element[id];
            },
            
            widgets: function(key, widget){
                if (!key) {
                    return $air.hash.toArray(this.widget);
                }
                if (!widget) {
                    return this.widget[key];
                };
                if (!this.widget[key]) {
                    widget.view = this;
					widget.app = this.app;
                    this.widget[key] = widget;
                }
            },
            getWidget: function(key){
                return this.widget[key];
            },
            addWidget: function(key, widget){
                if (!this.widget[key]) {
                    widget.view = this;
					widget.app = this.app;
                    this.widget[key] = widget;
                }
            },
            
            actions: function(key, action){
                if (!key) {
                    return $air.hash.toArray(this.action);
                }
                if (!action) {
                    return this.action[key];
                };
                if (!this.action[key]) {
                    action.view = this;
                    this.action[key] = action;
                }
            },
            getAction: function(key){
                return this.action[key];
            },
            addAction: function(key, action){
                if (!this.action[key]) {
                    action.view = this;
                    this.action[key] = action;
                }
            },
            
            transitions: function(key, transition){
                if (!key) {
                    return $air.hash.toArray(this.transition);
                }
                if (!transition) {
                    return this.transition[key];
                }
                if (!this.transition[key]) {
                    this.transition[key] = transition;
                }
            },
            getTransition: function(key){
                return this.transition[key];
            },
            addTransition: function(key, transition){
                if (!this.transition[key]) {
                    this.transition[key] = transition;
                }
            },
            
            handleKeyDown: function(event){ 
                var action = this.actions("keydown"); 
                if (action) { 
                    action.handle(event);
                    return true;
                }
                return false;
            },
            
            setX: function(x){
                this.htmlLoader.x = x;
            },
            setY: function(y){
                this.htmlLoader.y = y;
            },
            
            show: function(){
                this.htmlLoader.stage.mouseChildren = true;
                this.htmlLoader.visible = true;
            },
            hide: function(){
                this.htmlLoader.visible = false;
            },
            
            //FX methods 
            flipX: function(to, reversed){
                var effect = getFlipXEffect.call(this, to); 
				effect.start(reversed);
            },
            flipY: function(reversed){
                var effect = getSingleFlipYEffect.call(this);  
                effect.start(!reversed); 
            },
            
            shake: function(){
                var effect = getShakeEffect.call(this); 
                effect.tween.hideOnFinish = false;
                effect.tween.disableInteraction = true; 
				effect.start(false);
            },
            blenderDissolve: function(){
                this.htmlLoader.stage.mouseChildren = false;
                
                var effect = getDissolveEffect.call(this); 
                effect.tween.hideOnFinish = true; 
				effect.start(false);
            },
            blenderAppear: function(){
                this.show();
                
                var effect = getDissolveEffect.call(this); 
                effect.tween.hideOnFinish = false; 
				effect.start(true);
            },
            blenderHide: function(){
                this.show();
                // disable mouse events on the list html loader
                // as we don't want users to select the background list
                this.htmlLoader.mouseChildren = false;
                this.htmlLoader.tabEnabled = false;
                this.htmlLoader.stage.focus = null;
                
				air.trace("blender hide start");
                var effect = getPageEffect.call(this); 
                effect.tween.keepTheEffect = true; 
				effect.start(false);
            },
            blenderShow: function(){
                this.show();
                this.htmlLoader.mouseChildren = true;
                this.htmlLoader.tabEnabled = true;
                
                var effect = getPageEffect.call(this); 
                effect.tween.keepTheEffect = false; 
				effect.start(true);
            },
            wavesHide: function(){
                var effect = getWavesEffect.call(this);  
                effect.tween.hideOnFinish = true; 
				effect.start(true);
            },
            wavesShow: function(){
                this.show();
                
                var effect = getWavesEffect.call(this); 
                effect.tween.hideOnFinish = false; 
				effect.start(false);
            },
            
            zoomHide: function(bounds){
                var blenderEffect = getPageEffect.call(this); 
                blenderEffect.tween.keepTheEffect = false; 
                blenderEffect.start(true);
				
                var effect = getZoomEffect.call(this); 
                effect.tween.bounds = bounds; 
				effect.start(true);
            },
            zoomShow: function(bounds){ 
                var blenderEffect = getPageEffect.call(this); 
                blenderEffect.tween.duration = 1500;
                blenderEffect.tween.keepTheEffect = false; 
                blenderEffect.start(true);
				
                var effect = getZoomEffect.call(this); 
                effect.tween.bounds = bounds; 
				effect.start(false);
            },
            
            //Transition methods
            to: function(viewKey, args){
				var nextView = this.app.views(viewKey);
                this.transitions(viewKey).call({
                    app: this.app, 
                    from: this,
                    to: nextView
                }, args); 
				
				this.app.currentView = nextView;
            }
        };
    })();
    
    /* Application */
    $air.app.Application = function(config){
        this.config = $.extend({}, {
            models: {},
            views: {}
        }, config || {});
        
        this.stage = null;
		
		this.map = [];
        
        this.model = [];
        
        this.db = null;
        
        this.view = [];
        this.currentView = null;
        
        this.fx = [];
        
        this.init();
    };
    $air.app.Application.prototype = (function(){
        var loadCount = 0, viewCount = 0;
        
        //Private methods    
        
        //Private events
        function onStageKeyDown(event){
			air.trace("stage key down");
			air.trace(event);
			air.trace(event.keyCode);
            if (event.target.stage.mouseChildren == true) {
				air.trace("yoooohooo");
				this.currentView.handleKeyDown(event);
            }
        }
        
        function onUserIdle(){
        
        }
        
        function onViewLoad(e, view){
            //air.trace(view.config.path + "loaded");
            loadCount++;
            
            air.trace("viewcount: " + viewCount);
            air.trace("loadcount: " + loadCount);
            if (loadCount === viewCount) {
                $(this).trigger("start"); //, this); 
            }
        }
        
        return {
            stage: null,
            
            db: null,
            
            view: null,
            currentView: null,
            
            fx: null,
            
            //Initialization - events added/disposed
            toString: function(){
                return "$air.app.Application";
            },
            init: function(){
                air.trace("application initializing");
                
                //native air element init
                //native air element event attachment
                this.stage = htmlLoader.stage;
                this.stage.transform.perspectiveProjection.focalLength = 800;
                this.stage.addEventListener("keyDown", $.proxy(onStageKeyDown, this), true);
                
                air.trace(this.config.idleThreshold);
                if (this.config.idleThreshold) {
                    var nativeApp = air.NativeApplication.nativeApplication;
                    nativeApp.idleThreshold = this.config.idleThreshold;
                    nativeApp.addEventListener(air.Event.USER_IDLE, $.proxy(onUserIdle, this));
                }
                
                air.trace("model init");
                var modelConfigs = this.config.models, dbConfig = {
                    tables: {}
                };
                for (var modelKey in modelConfigs) {
                    var modelConfig = modelConfigs[modelKey], model = new $air.app.Model(modelKey, modelConfig);
                    this.models(modelKey, model);
                    
                    dbConfig.tables[modelKey] = model.toTable();
                }
                
                air.trace("db init");
                this.db = new $air.db.Database(this.config.key, dbConfig);
                
                
                air.trace("view init");
                
                var viewConfigs = this.config.views;
                loadCount = 0;
                viewCount = $air.hash.getKeyCount(viewConfigs);
                for (var viewKey in viewConfigs) {
                    var viewConfig = $.extend({}, {
                        events: {
                            load: $.proxy(onViewLoad, this)
                        }
                    }, viewConfigs[viewKey]), view = new $air.app.View(viewKey, viewConfig);
                    air.trace(view.key);
                    air.trace(view.htmlLoader);
                    this.views(viewKey, view);
                }
                
                //custom fx loading?  
            },
			
			//Data
			data: function(key, value) { 
				if(!key) { return; }
				if(!value) { return this.map[key]; }
				this.map[key] = value;
			},
			removedata: function(key) { 
				delete this.map[key];
			},
            
            //Model management
            models: function(key, model){
                if (!key) {
                    return $air.hash.toArray(this.model);
                }
                if (!model) {
                    return this.model[key];
                }
                if (!this.model[key]) {
                    model.app = this;
                    this.model[key] = model;
                }
            },
            getModel: function(key){
                return this.model[key];
            },
            addModel: function(key, model){
                if (!this.model[key]) {
                    model.app = this;
                    
                    this.model[key] = model;
                }
            },
            
            //View management 
            views: function(key, view){
                if (!key) {
                    return $air.hash.toArray(this.view);
                }
                if (!view) {
                    return this.view[key];
                }
                if (!this.view[key]) {
                    this.stage.addChild(view.htmlLoader);
                    view.app = this;
                    
                    this.view[key] = view;
                }
            },
            getView: function(key){
                return this.view[key];
            },
            addView: function(key, view){
                if (!this.view[key]) {
                    this.stage.addChild(view.htmlLoader);
                    view.app = this;
                    
                    this.view[key] = view;
                }
            },
            
            show: function(key){
                if (this.view[key]) {
                    $.each(this.views(), function(i, view){
                        view.hide();
                    });
                    
                    this.currentView = this.view[key];
                    this.currentView.show();
                }
            },
			minimize: function() {
				window.nativeWindow.minimize();
			}, 
			exit: function() {
				this.db.dispose();
				air.NativeApplication.nativeApplication.exit();
			}, 
            
            get3DEffect: function(type, config){
               	var key = config.view.key + "-3D-" + type;
                if (!this.fx[key]) {
                    var factory = new $air.fx.EffectFactory();
                    this.fx[key] = factory.create(type, config);
				}
                return this.fx[key];
            },
            getBlenderEffect: function(type, config){
                var key = config.view.key + "-blender-" + type;
                if (!this.fx[key]) {
                    var factory = new $air.fx.blender.EffectFactory();
                    this.fx[key] = factory.create(type, config);
				}
                return this.fx[key];
            }
        };
    })();
    
    
    /*** jquery.air ***/ 
    $.air = function(config){
        air.trace("return new air application");
        return new $air.app.Application(config);
    };
	$.air.bounds = $air.bounds;
	$.air.data = $air.data;
})(jQuery);
