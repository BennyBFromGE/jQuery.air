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
//    $air.HTMLLoader = {
//        create: function(config){
//            var loader = new air.HTMLLoader();
//            loader.x = config.x || 20;
//            loader.y = config.y || 20;
//            loader.paintsDefaultBackground = config.paintsDefaultBackground || false;
//            loader.visible = config.visible || false;
//            
//            var filterFactory = new $air.filters.FilterFactory();
//            loader.filters = [filterFactory.create("shadow").filter];
//            
//            return loader;
//        },
//        fitToContent: function(loader){
//            loader.width = loader.window.document.width;
//            loader.height = loader.window.document.height;
//        },
//        copyAsBitmap: function(loader){
//            var data = new air.BitmapData(loader.width, loader.height, true, 0);
//            data.draw(loader);
//            
//            return new air.Bitmap(data);
//        }
//    };
	
	$air.HtmlLoader = function(config) {
		this.config =  $.extend({}, {  
			x: 20, y: 20,  
			paintsDefaultBackground: false, 
			visible: false,  
		}, partial || {}); 
		
		this.loader = new air.HTMLLoader();
		
		this.init();
	};
	$air.HtmlLoader.prototype = (function() { 
        function onLoadComplete(e){
            this.fitToContent(); 
            
			$(this).trigger("loaded");
        };
	
		return {
			init: function(){
				$.each(this.config, $.proxy(function(key, val){ this.loader[key] = value; }, this));
				
				var filterFactory = new $air.filters.FilterFactory();
				this.loader.filters = [filterFactory.create("shadow").filter]; 
				
				this.loader.addEventListener(air.Event.COMPLETE, $.proxy(onLoadComplete, this)); 
			},
			load: function() {
				this.loader.load(new air.URLRequest(this.path));
			}, 
			fitToContent: function(){
				this.loader.width = this.loader.window.document.width;
				this.loader.height = this.loader.window.document.height;
			},
			copyAsBitmap: function(){
				var data = new air.BitmapData(this.loader.width, this.loader.height, true, 0);
				data.draw(this.loader);
				
				return new air.Bitmap(data);
			}
		};
	})();
    
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
    };
    $air.filters.Filter.prototype = {};
    
    /* Custom filter */
    $air.filters.DropShadow = function(config){
        $air.filters.Filter.call(this, config);

        this.filter = new runtime.flash.filters.DropShadowFilter(this.config.x, this.config.y);
        this.filter.blurX = this.config.blurX;
        this.filter.blurY = this.config.blurY;
    };
    $air.filters.DropShadow.prototype = new $air.filters.Filter();
    $air.filters.DropShadow.prototype.constructor = $air.filters.DropShadow; 
    
    /* Filter factory */
    $air.filters.FilterFactory = function(){};
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
    };
    $air.anim.Tween.fps = 30;
    $air.anim.Tween.prototype = (function(){
    
        return { 
//            onStart: null,
//            onEffect: null,
//            onFinish: null,

            start: function(reversed){
                if (this.running) { this.finish(false); }
                
//                if (!this.onEffect) { return; }
                
                this.reversed = reversed;
                this.running = true;
                
                var begin = this.config.begin, end = this.config.end;
                var transitionEffect = this.config.effect, currentEffect = 0;
                var duration = this.config.duration, fps = $air.anim.Tween.fps, startTime = new Date().getTime();
                
				$(this).trigger("started");
				
//                if (this.onStart) {
//                    this.onStart();
//                }
                
				//air.trace("starting tween"); 
				//air.trace(begin); air.trace(end); air.trace(duration);
                currentEffect = transitionEffect(0, begin, end - begin, duration); 
				$(this).trigger("tweening", currentEffect, 0);
				 
                var self = this;
                this.interval = setInterval(function() {
                    var newTime = new Date().getTime(), 
						deltaTime = newTime - startTime;
                    currentEffect = transitionEffect(deltaTime, begin, end - begin, duration);
					$(self).trigger("tweening", currentEffect, deltaTime / duration);
					
					//air.trace("tween effect - cuurentEffect: " + currentEffect);
					//air.trace("tween effect - duration: " + duration);
					//air.trace("tween effect - deltatime: " + deltaTime);
                    if (nativeWindow.closed || duration <= deltaTime || !self.running) {
                        self.finish(false);
                    }
                }, 1000 / fps); 
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
				
				$(this).trigger("finished", interactive);
				
//                if (this.onFinish) {
//                    this.onFinish(interactive);
//                }
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
            htmlLoader: null,
			secondHtmlLoader: null, 
            axis: null,
            duration: 200
        }, config || {});

        this.tween = null; 
    };
    $air.fx.Effect.prototype = { 
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

		this.firstFace = this.config.htmlLoader;
		this.secondFace = this.config.secondHtmlLoader; 
		this.firstFaceRotation = new $air.transform.Rotation(this.firstFace); 
		this.secondFaceRotation = new $air.transform.Rotation(this.secondFace); 
		this.axis = this.config.axis;
		this.duration = this.config.duration; 
		this.startValue = 0; 
		this.endValue = -180; 
		this.switchValue = (this.startValue + this.endValue) / 2; 
		this.flipped = false;
        
        this.tween = new $air.anim.Tween({
			begin: this.startValue,
			end: this.endValue,
			duration: this.duration,
			effect: $air.anim.linear
		}); 
		
		$(this.tween)
			.bind("started", $.proxy(function() {
	            this.firstFace.stage.mouseChildren = false;
	            this.secondFace.stage.mouseChildren = false;
	            
	            this.firstFace.visible = !this.reversed;
	            this.secondFace.visible = this.reversed;
	            
	            this.flipped = false;
			}, this))
			.bind("tweening", $.proxy(function(value, percent) { 
	            var shouldFlipLoaders = percent > 0.5;
				var reversed = this.tween.reversed;
	            var rotation = !reversed ? value : this.endValue - (value - this.startValue);
	            
	            this.firstFaceRotation.rotate(rotation, this.axis);
	            this.secondFaceRotation.rotate(rotation + 180, this.axis);
				
	            if (this.shouldFlipLoaders && !this.flipped) {
	                this.firstFace.visible = reversed;
	                this.secondFace.visible = !reversed;
	                this.flipped = true;
	            }
			}, this))
			.bind("finished", $.proxy(function() {
	            this.firstFaceRotation.reset();
	            this.secondFaceRotation.reset();
	            this.firstFace.stage.mouseChildren = true;
	            this.secondFace.stage.mouseChildren = true;
			}, this));
		
			
//        var firstFace = this.config.htmlLoader, 
//			secondFace = this.config.secondHtmlLoader, 
//			firstFaceRotation = new $air.transform.Rotation(firstFace), 
//			secondFaceRotation = new $air.transform.Rotation(secondFace), 
//			axis = this.config.axis, 
//			duration = this.config.duration, 
//			startValue = 0, 
//			endValue = -180, 
//			switchValue = (startValue + endValue) / 2, 
//			flipped = false;
		
//        this.tween.onStart = function(){
//            firstFace.stage.mouseChildren = false;
//            secondFace.stage.mouseChildren = false;
//            
//            firstFace.visible = !this.reversed;
//            secondFace.visible = this.reversed;
//            
//            flipped = false;
//        };
//        this.tween.onEffect = function(value, percent){
//            var shouldFlipLoaders = percent > 0.5;
//            var rotation = !this.reversed ? value : endValue - (value - startValue);
//            
//            firstFaceRotation.rotate(rotation, axis);
//            secondFaceRotation.rotate(rotation + 180, axis);
//			
//            if (shouldFlipLoaders && !flipped) {
//                firstFace.visible = this.reversed;
//                secondFace.visible = !this.reversed;
//                flipped = true;
//            }
//        };
//        this.tween.onFinish = function(){
//            firstFaceRotation.reset();
//            secondFaceRotation.reset();
//            firstFace.stage.mouseChildren = true;
//            secondFace.stage.mouseChildren = true;
//        };
    };
    $air.fx.Flip.prototype = new $air.fx.Effect();
    $air.fx.Flip.prototype.constructor = $air.fx.Flip; 
    
    $air.fx.SingleFlip = function(config){
        $air.fx.Effect.call(this, config);

		this.firstFace = config.htmlLoader, 
		this.firstFaceParent = null; 
		this.firstFaceRotation = new $air.transform.Rotation(firstFace);  
        this.firstFaceRotation.rotationCenter.z = firstFace.width / 2; 
		this.secondFace = null;
		this.secondFaceRotation = null; 
		this.axis = config.axis; 
		this.duration = config.duration; 
		this.startValue = 0; 
		this.endValue = -90;
		this.flipped = false;
		this.oldFilters;
		this.filteredSprite; 
        
        this.tween = new $air.anim.Tween({
			begin: this.startValue,
			end: this.endValue,
			duration: this.duration,
			effect: $air.anim.linear
		});
		$(this.tween)
			.bind("started", $.proxy(function() {
	            this.firstFace.stage.mouseChildren = false;
	            this.firstFace.visible = true;
	            
	            this.oldFilters = this.firstFace.filters;
	            this.firstFace.filters = [];
	            
	            this.filteredSprite = new runtime.flash.display.Sprite();
	            this.filteredSprite.filters = this.oldFilters;
	            
	            this.firstFaceParent = this.firstFace.parent;
	            
	            this.firstFaceParent.addChild(this.filteredSprite);
	            this.firstFaceParent.removeChild(this.firstFace);
	            this.filteredSprite.addChild(this.firstFace);
	            
	            this.secondFace = this.firstFace.copyAsBitmap();
	            this.filteredSprite.addChild(this.secondFace);
	            this.secondFaceRotation = new $air.transform.Rotation(this.secondFace); 
	            this.secondFaceRotation.position = this.firstFaceRotation.position;
	            this.secondFaceRotation.rotationCenter.z = this.secondFace.width / 2;
	            
	            // change to the other half now, as we already have a 
	            // snapshot of the old image
	            //if (this.onHalf) {
	              //  this.onHalf();
	            //}
	            
	            this.flipped = false;
			}, this))
			.bind("tweening", $.proxy(function(value, percent) { 
	            var shouldFlipLoaders = percent > 0.5;
				var reversed = this.tween.reversed;
	            var rotation = !reversed ? value : endValue - (value - startValue);
	            
	            if (reversed) {
	                this.firstFaceRotation.rotate(rotation, axis);
	                this.secondFaceRotation.rotate(rotation + 90, axis);
	            }
	            else {
	                this.firstFaceRotation.rotate(rotation + 90, axis);
	                this.secondFaceRotation.rotate(rotation, axis);
	            }
	            if (this.shouldFlipLoaders && !this.flipped) {
	                this.filteredSprite.swapChildren(this.firstFace, this.secondFace);
	                this.flipped = true;
	            }
			}, this))
			.bind("finished", $.proxy(function() {
	            this.filteredSprite.removeChild(this.secondFace);
	            this.filteredSprite.removeChild(this.firstFace);
	            this.filteredSprite.filters = null;
	            this.firstFaceParent.removeChild(this.filteredSprite);
	            this.firstFaceParent.addChild(this.firstFace);
	            this.firstFaceRotation.reset();
	            this.firstFace.filters = this.oldFilters;
	            this.firstFace.stage.mouseChildren = true;
	            this.filteredSprite = null;
	            this.secondFace.bitmapData.dispose();
	            this.secondFace = null;
	            this.oldFilters = null;
			}, this)); 
			
//			var config = this.config, 
//			firstFace = config.htmlLoader, 
//			firstFaceParent = null, 
//			secondFace = null, 
//			axis = config.axis, 
//			duration = config.duration, 
//			startValue = 0, 
//			endValue = -90, 
//			flipped = false, 
//			firstFaceRotation = new $air.transform.Rotation(firstFace), 
//			secondFaceRotation = null, 
//			oldFilters, 
//			filteredSprite;
//        
//        firstFaceRotation.rotationCenter.z = firstFace.width / 2;
//		this.tween.onStart = function(){  
//            firstFace.stage.mouseChildren = false;
//            firstFace.visible = true;
//            
//            oldFilters = firstFace.filters;
//            firstFace.filters = [];
//            
//            filteredSprite = new runtime.flash.display.Sprite();
//            filteredSprite.filters = oldFilters;
//            
//            firstFaceParent = firstFace.parent;
//            
//            firstFaceParent.addChild(filteredSprite);
//            firstFaceParent.removeChild(firstFace);
//            filteredSprite.addChild(firstFace);
//            
//            secondFace = $air.HTMLLoader.copyAsBitmap(firstFace);
//            filteredSprite.addChild(secondFace);
//            secondFaceRotation = new $air.transform.Rotation(secondFace); 
//            secondFaceRotation.position = firstFaceRotation.position;
//            secondFaceRotation.rotationCenter.z = secondFace.width / 2;
//            
//            // change to the other half now, as we already have a 
//            // snapshot of the old image
//            //if (this.onHalf) {
//              //  this.onHalf();
//            //}
//            
//            flipped = false;
//        };
//        this.tween.onEffect = function(value, percent){
//            var shouldFlipLoaders = percent > 0.5;
//            var rotation = !this.reversed ? value : endValue - (value - startValue);
//            
//            if (this.reversed) {
//                firstFaceRotation.rotate(rotation, axis);
//                secondFaceRotation.rotate(rotation + 90, axis);
//            }
//            else {
//                firstFaceRotation.rotate(rotation + 90, axis);
//                secondFaceRotation.rotate(rotation, axis);
//            }
//            if (shouldFlipLoaders && !flipped) {
//                filteredSprite.swapChildren(firstFace, secondFace);
//                flipped = true;
//            }
//        };
//        this.tween.onFinish = function(){
//            filteredSprite.removeChild(secondFace);
//            filteredSprite.removeChild(firstFace);
//            filteredSprite.filters = null;
//            firstFaceParent.removeChild(filteredSprite);
//            firstFaceParent.addChild(firstFace);
//            firstFaceRotation.reset();
//            firstFace.filters = oldFilters;
//            firstFace.stage.mouseChildren = true;
//            filteredSprite = null;
//            secondFace.bitmapData.dispose();
//            secondFace = null;
//            oldFilters = null;
//        };
    };
    $air.fx.SingleFlip.prototype = new $air.fx.Effect();
    $air.fx.SingleFlip.prototype.constructor = $air.fx.SingleFlip; 
    
    $air.fx.Zoom = function(config){
        $air.fx.Effect.call(this, config); 
		
        this.firstFace = this.config.htmlLoader, 
		this.duration = this.config.duration; 
		this.originalBounds = {
            x: this.firstFace.x,
            y: this.firstFace.y,
            width: this.firstFace.width,
            height: this.firstFace.height
        };
			
        this.tween = new $air.anim.Tween({
			begin: 0,
			end: 1,
			duration: this.duration,
			effect: $air.anim.linear
		}); 
		$(this.tween)
			.bind("started", $.proxy(function() {
				var reversed = this.tween.reversed; 
	            this.firstFace.stage.mouseChildren = false;
	            
	            if (!reversed) {
	                this.firstFace.visible = true;
	            }
			}, this))
			.bind("tweening", $.proxy(function(value, percent) { 
				var reversed = this.tween.reversed;
	            var transition = reversed ? value : 1 - value;
				
				air.trace("zooooming");  
				
	            var newBounds = $air.bounds.resize(transition, this.bounds, this.originalBounds);
	            this.firstFace.x = newBounds.x;
	            this.firstFace.y = newBounds.y;
	            this.firstFace.scaleX = newBounds.width / this.originalBounds.width;
	            this.firstFace.scaleY = newBounds.height / this.originalBounds.height;
	            this.firstFace.alpha = 1 - transition;
			}, this))
			.bind("finished", $.proxy(function() {
				air.trace("zoooom finish");
				
				var reversed = this.tween.reversed;
	            var originalBounds = this.originalBounds;
	            this.firstFace.x = originalBounds.x;
	            this.firstFace.y = originalBounds.y;
	            this.firstFace.scaleX = 1;
	            this.firstFace.scaleY = 1;
	            this.firstFace.alpha = 1;
	            
	            if (reversed) {
	                this.firstFace.visible = false;
	            }
	            this.firstFace.stage.mouseChildren = true;
			}, this));

		
//        var config = this.config, 
//			firstFace = config.htmlLoader, 
//			duration = config.duration; 
//        this.tween.originalBounds = {
//            x: firstFace.x,
//            y: firstFace.y,
//            width: firstFace.width,
//            height: firstFace.height
//        };
//        this.tween.onStart = function(){
//            firstFace.stage.mouseChildren = false;
//            
//            if (!this.reversed) {
//                firstFace.visible = true;
//            }
//        };
//        this.tween.onEffect = function(value){
//            var transition = this.reversed ? value : 1 - value;
//			
//			air.trace("zooooming");  
//			
//            var newBounds = $air.bounds.resize(transition, this.bounds, this.originalBounds);
//            firstFace.x = newBounds.x;
//            firstFace.y = newBounds.y;
//            firstFace.scaleX = newBounds.width / this.originalBounds.width;
//            firstFace.scaleY = newBounds.height / this.originalBounds.height;
//            firstFace.alpha = 1 - transition;
//        };
//        this.tween.onFinish = function(){
//			air.trace("zoooom finish");
//			
//            var originalBounds = this.originalBounds;
//            firstFace.x = originalBounds.x;
//            firstFace.y = originalBounds.y;
//            firstFace.scaleX = 1;
//            firstFace.scaleY = 1;
//            firstFace.alpha = 1;
//            
//            if (this.reversed) {
//                firstFace.visible = false;
//            }
//            firstFace.stage.mouseChildren = true;
//        };
    };
    $air.fx.Zoom.prototype = new $air.fx.Effect();
    $air.fx.Zoom.prototype.constructor = $air.fx.Zoom; 
    
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
            htmlLoader: null,
            url: "",
            shader: null,
            shaderConfig: {},
            axis: null,
            duration: 200,
            transition: $air.anim.linear
        }, config || {}); 

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
                    var firstFace = config.htmlLoader, shader = config.shader, shaderConfig = config.shaderConfig, transition = this.reversed ? 1 - value : value;
                    var shaderConfig = $.extend({}, {
                        transition: transition
                    }, shaderConfig || {}); 
					
                    applyShader(firstFace, shader, shaderConfig);
                };
                this.tween.onFinish = function(value){
                    var firstFace = config.htmlLoader;
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
    $air.app.View = function(loader){  
        this.loader = loader; 
        
        this.elements = {}; 
		
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
        
        return {  
            toString: function(){ return "$air.app.View"; },
            init: function(){

            },
            
			$: function(selector) {
				if(!this.elements[selector]) { this.elements[selector] = $(selector, this.loader.window.document); }
				return this.elements[selector];
			}, 
            get: function(id){
                if (!this.element[id]) {
                    this.element[id] = this.loader.window.document.getElementById(id);
                }
                return this.element[id];
            }, 
            
            setX: function(x){
                this.loader.x = x;
            },
            setY: function(y){
                this.loader.y = y;
            },
            
            show: function(){
                this.loader.stage.mouseChildren = true;
                this.loader.visible = true;
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
                this.loader.stage.mouseChildren = false;
                
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
                this.loader.mouseChildren = false;
                this.loader.tabEnabled = false;
                this.loader.stage.focus = null;
                
				air.trace("blender hide start");
                var effect = getPageEffect.call(this); 
                effect.tween.keepTheEffect = true; 
				effect.start(false);
            },
            blenderShow: function(){
                this.show();
                this.loader.mouseChildren = true;
                this.loader.tabEnabled = true;
                
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
            }
        };
    })();
	
	/* Presenter */
	$air.app.Presenter = function(view, eventBus) {
		
		
		this.view = view;
		this.eventBus = eventBus;
		
//		this.config = $.extend({}, {
//			
//		}, config || {});

		this.init();
	};
	$air.app.Presenter.prototype = (function() {
		
		return {
			init: function() { 
				$.each(this.view.events, $.proxy(function(key, e) {
					
				}, this));
			}, 
			dispose: function() {
				$.each(this.view.events, $.proxy(function(key, e) {
					
				}, this));
			}, 
			trigger: function(e, args) {
				this.eventBus.trigger(e, args);
			},  
			stage: function(options) {
				
			}
		};
	})();
	
	/* Shell */
	$air.app.Shell = function(appDef) {
		this.appDef = appDef;
		
		this.stage = htmlLoader.stage;
		this.loaders = {};
		this.loaderCount = 0;
		this.loadCount = 0;
		
		this.eventBus = new $air.app.ActionBus();
		
		this.init();
	};
	$air.app.Shell.prototype = (function() { 
        //Private methods    
        
        //Private events
        function onKeyDown(event){
			air.trace("stage key down");
			air.trace(event);
			air.trace(event.keyCode);
            if (event.target.stage.mouseChildren == true) {
				air.trace("yoooohooo");
				this.currentView.handleKeyDown(event); //????
            }
        }
        
        function onUserIdle(){ alert("fart!"); }
        
        function onHtmlLoaderLoad(e){ 
			this.stage.addChild(e.data.htmlLoader);
			
            //air.trace(e.data.view.config.path + "loaded");
            this.loadCount++;
            
            air.trace("loaderCount: " + this.loaderCount);
            air.trace("loadcount: " + this.loadCount);
            if (this.loadCount === this.loaderCount) { this.go(); }
        } 	
		
		return {
			init: function() { 
                air.trace("shell initializing");  
				
                air.trace(this.idleThreshold);
                if (this.idleThreshold) {
                    var nativeApp = air.NativeApplication.nativeApplication;
                    nativeApp.idleThreshold = this.idleThreshold;
                    nativeApp.addEventListener(air.Event.USER_IDLE, $.proxy(onUserIdle, this));
                }
                
                //native air element init
                //native air element event attachment 
                this.stage.transform.perspectiveProjection.focalLength = 800;
                this.stage.addEventListener("keyDown", $.proxy(onKeyDown, this), true); 
				
				$.each(this.appDef.loaders(), $.proxy(function(key, HtmlLoader) { 
					var htmlLoader = new HtmlLoader();
					htmlLoader.bind("loaded", $.proxy(onHtmlLoaderLoad, this)); 
					
					
				}, this));
				
				$.each(this.bus.events, $.proxy(function(key, fn) { 
					this.eventBus.bind(key, $.proxy(fn, this)); 
				}, this)); 
			}, 
			dispose: function() {},
            
            stage: function(presenterKey, dependencies){
				var presenter = this.presenters(presenterKey);

				if(this.trail.length == 0) { this.trail.push({ })}
				this.trail.push()
				
				this.stack.push()
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
//				this.db.dispose();
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
	
	$air.app.Definition = function(partial) { 
		this.partial = $.extend({}, {  
			services: {},
			models: {}, 
			views: {}, 
			presenters: {}, 
			transitions: {},
			shell: {} 
		}, partial || {}); 
		
		this.full = { services: {}, models: {}, views: {}, loaders: {}, presenters: {}, transitions: {}, shell: {} }; 
	};
	$air.app.Definition.prototype = (function() {
		//Private methods    
		function augment(receivingClass, givingClass) {
	  		if(arguments[2]) { // Only give certain methods.
		    	for(var i = 2, len = arguments.length; i < len; i++) {
		      		receivingClass.prototype[arguments[i]] = givingClass.prototype[arguments[i]];
	    		}
		  	} 
		  	else { // Give all methods.
		    	for(methodName in givingClass.prototype) { 
		      		if(!receivingClass.prototype[methodName]) {
		        		receivingClass.prototype[methodName] = givingClass.prototype[methodName];
		      		}
	    		}
		  	}
		}
		
		function mixin(baseClass, proto) {
			function O() {}
			O.prototype = proto;
			
			augment(O, baseClass);
			
			return O;
		}
		
		function defineClasses(baseClasses) {
			$.each(baseClasses, $.proxy(function(key, baseClass) {
				air.trace(key + " init");
				
				$.each(this.partial[key], $.proxy(function(c, proto) {  
					air.trace(c+ " " + key + " init");  
					
					this.full[key][c] = mixin(baseClass, proto); //this.full["views"]["list"] = $air.app.View; (customized)  
					if(key === "views") {
						this.full["loaders"][c] = mixin($air.HtmlLoader, { path: proto.path }); 
					}
					
				}, this)); 
				
			}, this)); 
			
			this.full["shell"] = mixin($air.app.Shell, this.partial["shell"]);
		} 
		
		function buildClass(type, key) { var t = this.full[type], c = t[key]; return new c(); }
		function buildClasses(type) { 
			var classes = {}; 
			var t = this.full[type];
			$.each(t, function(key, c) { classes[key] = new c(); }); 
			return classes;
		}
		
		function getClass(type, key) { var t = this.full[type]; return t[key]; }
		function getClasses(type) { 
			var classes = {}; 
			var t = this.full[type]; 
			$.each(t, function(key, c) { classes[key] = c; });
			return classes;
		} 
		function lookup(type, key) {
			if(!key) { return getClasses.call(this, type); }
			return getClass.call(this, type, key);
		}
		
		return { 
			init: function() { 
				defineClasses.call(this, {
					"services": $air.app.Service, 
					"models": $air.app.Model,
					"views": $air.app.View,
					"presenters": $air.app.Presenter, 
					"transitions": $air.app.Transition,
					"shell": $air.app.Shell
				});
			}, 
			services: function(key) { return lookup.call(this, "services", key); },
			models: function(key) { return lookup.call(this, "models", key); },
			views: function(key) { return lookup.call(this, "views", key); },
			loaders: function(key) { return lookup.call(this, "loaders", key); }, 
			presenters: function(key) { return lookup.call(this, "presenters", key); },
			transitions: function(key) { return lookup.call(this, "transitions", key); },
			shell: function() { return lookup.call(this, "shell"); },
		};
	})();
	
    
    /* Application */
    $air.app.Application = function(partial){ 
		this.definition = new $air.app.Definition(partial);
		
        this.init();
    };
    $air.app.Application.prototype = (function(){
		//Private methods    
		
		//Private events  
		
        return { 
            //Initialization - events added/disposed
            toString: function(){ return "$air.app.Application"; },
            init: function(){ 
                air.trace("application initializing");  
				
//				air.trace("service init");
//				$.each(this.def.services, $.proxy(function(key, desc) { this.classes["services"][key] = define($air.app.Service, desc); }, this));  
//
//            	air.trace("model init");  
//				$.each(this.def.models, $.proxy(function(key, desc) { this.classes["models"][key] = define($air.app.Model, desc); }, this)); 
//                
//                air.trace("view init");  
////                this.shell.loadCount = 0;
////                this.shell.viewCount = $air.hash.getKeyCount(this.def.views);
//				$.each(this.def.views, $.proxy(function(key, desc){ this.classes["views"][key] = define($air.app.View, desc); }, this));  
//				
//				air.trace("presenter init");  
//				$.each(this.def.presenters, $.proxy(function(key, desc) { this.classes["presenters"][key] = define($air.app.Presenter, desc); }, this));  
//				
//				air.trace("transition init");
//				$.each(this.def.transitions, $.proxy(function(key, desc) { this.classes["transitions"][key] = define($air.app.Transition, desc); }, this));  
				
				air.trace("shell init"); 
				var Shell = this.definition.shell();
				this.shell = new Shell(); 
				this.shell.go();
                
                //air.trace("db init");
				
				//var dbConfig = { tables: {} };
				//dbConfig.tables[modelKey] = model.toTable();
                //this.db = new $air.db.Database(this.config.key, dbConfig);
                
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
			} 
        };
    })();
    
    
    /*** jquery.air ***/ 
	$.air.bounds = $air.bounds;
	$.air.data = $air.data;  
	
    $.air.mvp = function(definition) {
        air.trace("return new air application"); 
		return new $air.app.Application(definition);
    };
})(jQuery);
