;jQuery.air || (function($) {
	
    $.air = {};

    /*** jQuery.air.crypto - utlity ***/
	
    $.air.crypto = (function(){
        var ELS_RGN_ITEM_NAME = "Random Generated Number";
        var BYTE_LENGTH = 32;
        
        function random(){
            var i, value = air.EncryptedLocalStore.getItem(ELS_RGN_ITEM_NAME); //	 Getting the RN from ELS to generate the first key as the first time
            
            if (value === null) {
                //		This is the first Key generation and no RN was stored in ELS
                //		Generate a new RN with the flash RNG 
                
                value = new air.ByteArray();
                value.length = BYTE_LENGTH; //32 bytes 
                for (i = 0; i < BYTE_LENGTH; i++) {
                    value[i] = Math.floor(Math.random() * 256);
                }
                
                //	Step 5: Store the random number from step one in ELS
                //  in order to be able to rebuild the key later, with the propper pass
                air.EncryptedLocalStore.setItem(ELS_RGN_ITEM_NAME, value);
            }
            
            return value;
        }
        
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
    $.air.bounds = {
        get: function(el){ 
			var $el = el.selector ? el : $(el), 
				offset = $el.offset(), 
				width = $el.width(), 
				height = $el.height();

			el = $el.get(0);
			var htmlLoader = el.ownerDocument.defaultView.htmlLoader;
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
	
    /*** jQuery.air.urlLoader - utility ***/ 
	$.air.urlLoader = { 

	}; 
	
    /*** jQuery.air.htmlLoader - utility ***/ 
	$.air.htmlLoader = {
		create: function(config) { 
			config =  $.extend({}, {
				filters: {},   
				x: 20, y: 20,  
				paintsDefaultBackground: false, 
				visible: false,  
			}, config || {});  
	
            var loader = new air.HTMLLoader();
            loader.x = config.x;
            loader.y = config.y;
            loader.paintsDefaultBackground = config.paintsDefaultBackground;
            loader.visible = config.visible;
            
			var filterFactory = new $.air.filterFactory(), filters = [];
			$.each(config.filters, function(filterKey, filterConfig) {   
				var filter = filterFactory.create(filterKey, filterConfig); 
				if(filter) { filters.push(filter); }
			}); 
            loader.filters = filters; 
            
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
	
	/*** jQuery.air.files - file utility ***/
	$.air.files = { 
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
		}
	}; 
	
	/*** jQuery.air.images - image utility ***/
	$.air.images = {
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
				if (!$.air.files.write(resized, bytes)) { onResize(false); }
				
				onResize(true, resized);
			};
			function onError(event) {
				loader.contentLoaderInfo.removeEventListener(air.Event.COMPLETE, onComplete);
				
				onResize(false);
			};
			loader.contentLoaderInfo.addEventListener(air.Event.COMPLETE, onComplete);
			loader.contentLoaderInfo.addEventListener(air.IOErrorEvent.IO_ERROR, onError); 
			loader.load(new air.URLRequest(orig.url));
		}
	}; 
	
	/*** jQuery.air.clipboard - clipboard utilitiy ***/
	$.air.clipboard = function() {
		this._native = air.Clipboard.generalClipboard;
	};
	$.air.clipboard.prototype = { 
		hasData: function(format) {
			return this._native.hasFormat(format);
		},
		setData: function(format, data) {
			this._native.setData(format, data);
		},
		setDataHandler: function(format, fn) {
			this._native.setDataHandler(format, fn);
		},
		getData: function(format, transferMode) {
			this._native.getData(format, transferMode);
		},
		clearData: function(format) {
			this._native.clearData(format);
		},
		clear: function() {
			this._native.clear();
		}
	};
	
	/*** jQuery.air.systemMenu ***/
	$.air.systemMenu = function() {
		this._native = null;
		
		if(air.NativeWindow.supportsMenu) {
			if(nativeWindow.systemChrome != air.NativeWindowSystemChrome.NONE) { 
				this._native = new air.NativeMenu();
				nativeWindow.menu = this._native;
			} else {
				this._native = air.NativeApplication.nativeApplication.menu;
			}
		}
	};
	$.air.systemMenu.prototype = (function() { 

	    function find(text){
			var menu = this._native;
			if(!menu) { return null; }
			if(!menu.items) { return null; }
			
	        for(var i = 0, len = menu.items.length; i < len; i++){
	            if(menu.items[i]['label'] == text) {
	                return menu.items[i];
	            }
	        }
	        return null;
	    }


		return {
			add: function(options) { //text, actions, mindex){
				var config = $.extend({}, {
						text: "",
						mnemonicIndex: 0, 
						actions: []
					}, options || {})
					text = config.text,
					mnemonicIndex = 0, 
					actions = config.actions, 
					item = find(text);

	            if(!item){
	                item = this._native.addItem(new air.NativeMenuItem(text));
	                item.mnemonicIndex = mnemonicIndex; 
	                item.submenu = new air.NativeMenu();
				}
				
				$.each(actions, function(i, action) {
					
					var actionConfig = $.extend({}, {
							isSeparator: false,
							text: "", 	
							callback: function() {}
						}, action || {}),
						menuItem = !actionConfig.isSeparator ? new air.NativeMenuItem(actionConfig.text) : new air.NativeMenuItem("", true);
					menuItem.addEventListener(air.Event.SELECT, actionConfig.callback); 
					
					item.submenu.addItem(menuItem);
				}); 
				
	            return item.submenu;
	        }
		};
	})();

	/*** jQuery.air.systemTray ***/
	$.air.systemTray = function(config) {
		this.config = $.extend({}, {
			icon: null, 
			iconBitmaps: [], 
			tooltip: "", 
			menu: []
		}, config || {});
		
		this.app = air.NativeApplication.nativeApplication;
		this.isWindows = false;
		this.icon = null;
		this.iconBitmaps = [];
		
		//windows
		if(air.NativeApplication.supportsSystemTrayIcon) {
            this.isWindows = true;
            this.icon = this.app.icon;
        }
    
		// mac
        if(air.NativeApplication.supportsDockIcon) {
            this.icon = this.app.icon;
        }
		
		this.init();
	};
	$.air.systemTray.prototype = (function() {
		
		function onIconClick() {
			this.trigger("activated");
		};
		
		return {
			init: function() {
				if(!this.config.icon) { return; } 
				
				var self = this, config = self.config, loader = new air.Loader(), menu = new air.NativeMenu();
				loader.contentLoaderInfo.addEventListener(air.Event.COMPLETE, function(e){
					var bitmaps = new runtime.Array(e.target.content.bitmapData);
					self.iconBitmaps = bitmaps; 
				});
				loader.load(new air.URLRequest(config.icon));
				if(config.tooltip && $.air.supportsSystemTrayIcon) {
					this.app.icon.tooltip = config.tooltip;
				} 
				
				$.each(config.menu, function(i, item) { 
					var itemConfig = $.extend({}, {
							isSeparator: false,
							text: "", 	
							events: {}
						}, item || {}), 
						isSeparator = itemConfig.isSeparator, 
						menuItem = isSeparator ? new air.NativeMenuItem("", true) : new air.NativeMenuItem(itemConfig.text);
					
					menu.addItem(menuItem);
					if(!isSeparator) {
						$.each(itemConfig.events, function(key, callback) {
							key = key.toLowerCase();
							switch(key) {
								case "click":
								case "select":
								menuItem.addEventListener(air.Event.SELECT, $.proxy(callback, self));	
								break;
							}
						});					
					} 
	
					self.icon.menu = menu; 
				});   
				
				self.icon.addEventListener("click", $.proxy(onIconClick, this));  
			}, 
			
			trigger: function(event, args) {
				$(this).trigger(event, [this, args]);
			}, 
			
			hideIcon : function(){
				if(!this.icon){ return; }
				
				this.icon.bitmaps = [];
			},
			showIcon : function(){
				if(!this.icon){ return; }
				
				this.icon.bitmaps =  this.iconBitmaps;
			},
			bounceIcon: function(priority) {
				if(!this.icon){ return; }
				
				this.icon.bounce(priority);
			}
		};
	})();
  
    /*** jQuery.air.window ***/
	$.air.supportsDockIcon = air.NativeApplication.supportsDockIcon;
	$.air.supportsSystemTrayIcon = air.NativeApplication.supportsSystemTrayIcon;
	$.air.systemWindow = function(config) {
		this.config = $.extend({}, {
			isNative: false, 
			transparent: false,
			chrome: "standard", 
			type: "normal", 
			align: "", 
			x: 0,
			y: 0,
			width: 600,
			height: 400,
			visible: false,
			alwaysInFront: false,  
			resizable: true, 
			minimizable: false,
			minimizeToTray: false, 
			html: "", 
			tray: { 
				icon: "", 
				tooltip: "", 
				menu: []
			}
		}, config || {});
		
		this.instance = null;
				
		this.trayed = false;
		this.systemTray = null; 
		
		this.init();
	};
	$.air.systemWindow.prototype = (function() {
		
		
		//Native window events
		function onDisplayStateChanging(e) { 
			switch(e.afterDisplayState) {
				case "minimized":
				e.preventDefault();
				this.hide();
				this.systemTray.showIcon();
				this.trayed = true; 
				
				 $(this).trigger("minimized");
				break;
			}
		};

		return {
			
			init: function() { 
				var config = this.config;
				
				this.instance = config.isNative ? window.nativeWindow : null;  
			
				if (!this.instance) {
					var nativeOptions = new air.NativeWindowInitOptions();
					nativeOptions.systemChrome = config.chrome;
					nativeOptions.type = config.type;
					nativeOptions.resizable = config.resizable;
					nativeOptions.minimizable = config.minimizable;
					nativeOptions.maximizable = config.maximizable;
					nativeOptions.transparent = config.transparent; 

					this.instance = new air.NativeWindow(nativeOptions);
				} 
		
				var win = this.instance,
					alwaysInFront = config.alwaysInFront,   
					visible = config.visible, 
					width = Math.max(config.width, 100),
					height = Math.max(config.height, 100),
					align = config.align.toLowerCase(), 
					bounds = air.Screen.mainScreen.visibleBounds,
					centerX = bounds.x + ((bounds.width/2)-(width/2)),
					centerY = bounds.y + ((bounds.height/2)-(height/2)),
					x = config.x || 0,
					y = config.y || 0;
				
				win.alwaysInFront = alwaysInFront;
				win.visible = visible;
				win.width = width; 
				win.height = height; 
				win.stage.stageWidth = width;
				win.stage.stageHeight = height; 
				

				switch(align) {
					case "tl":
					x = 0; 
					y = 0;
					break;
					case "tr":
					x = bounds.width - win.width; 
					y = 0;
					break;
					case "bl":
					x = 0; 
					y = bounds.height - win.height;
					break;
					case "br":
					x = bounds.width - win.width; 
					y = bounds.height - win.height;
					break;
				}
				win.x = x;
				win.y = y;
				
				win.stage.scaleMode = window.runtime.flash.display.StageScaleMode.NO_SCALE; 
				win.stage.align = window.runtime.flash.display.StageAlign.TOP_LEFT; 

				if(!config.minimizeToTray) { return; }

				this.systemTray = new $.air.systemTray(config.tray); 
				$(this.systemTray).bind({
					"activated": $.proxy(function() { $(this).trigger("activated"); }, this), 
					"exited": $.proxy(function() { $(this).trigger("exited"); }, this) 
				});
				
				
				this.instance.addEventListener("displayStateChanging", $.proxy(onDisplayStateChanging, this));   
			},

			addHtmlLoader: function(htmlLoader) { 
				this.instance.stage.addChild(htmlLoader);
			}, 
			
			getCenterXY: function() {
				var config = this.config, 
					width = config.width, 
					height = config.height, 
					bounds = air.Screen.mainScreen.visibleBounds;
				return { 
					x: b.x + ((b.width/2) - (width/2)),
					y: b.y + ((b.height/2) - (height/2))
				};
			}, 
			show: function() {
				if(this.trayed) { 
					if (this.systemTray) {
						this.systemTray.hideIcon();
					}

					this.trayed = false;
				}
				
				this.instance.visible = true;
			}, 
			hide: function() {
				this.instance.visible = false;
			}, 
			close: function() {
				this.instance.close();
			},
			activate: function() { 
				this.show();
				this.instance.activate();  
			},
			isVisible: function() {
				return this.instance.visible;
			},
			isMinimized: function() {
				return this.instance.displayState == air.NativeWindowDisplayState.MINIMIZED;
			}, 
			isMaximized: function() {
				return this.instance.displayState == air.NativeWindowDisplayState.MAXIMIZED;
			}, 
			moveTo: function(x, y) {
				this.config.x = this.instance.x = x;
				this.config.y = this.instance.y = y;	
			}, 
			
			resize : function(width, height){
				this.config.width = this.instance.width = width;
				this.config.height = this.instance.height = height;	
			},
			fullscreen: function(nonInteractive) {
				var SDS = runtime.flash.display.StageDisplayState;
				this.instance.stage.displayState = nonInteractive ? SDS.FULL_SCREEN : SDS.FULL_SCREEN_INTERACTIVE; 
			},
			
			bringToFront: function() {
				this.instance.orderToFront();
			}, 
			bringInFrontOf: function(win) {
				this.instance.orderInFrontOf(win.instance ? win.instance : win);
			}, 
			sendToBack: function() {
				this.instance.orderToBack();
			}, 
			sendBehind: function(win) {
				this.instance.orderInBackOf(win.instance ? win.instance : win);
			},
			
			bringChildToFront: function(child) { 
				this.instance.stage.setChildIndex(child, this.instance.stage.numChildren - 1);
			},
			sendChildToBack: function(child) {
				this.instance.stage.setChildIndex(child, 0);
			},
			focusChild: function(child) {
				this.instance.stage.focus = child;
			},
			
			unregister : function(){
//				Ext.air.NativeWindowManager.unregister(this);
			}
		};
	})();

	/*** jQuery.air.request ***/
	$.air.request = function(url, onSuccess, onFailure) {
		this.url = url;
		
		this.loader = null;
	};
	$.air.request.prototype = (function() { 

		return {
			send: function(onSuccess, onFailure) { 
				var request = new air.URLRequest(this.url);
				
				this.loader = new air.URLLoader();

//				function onHTTPStatus() {} 
//				function onProgress() {}
				
				function onIOError(e) { alert(e); onFailure(); }
				
				function onSecurityError() { alert("Security Error"); onFailure(); }
				
				function onComplete(e) {  
					var loaded = e.target;
					if (loaded != null && loaded.data != null)
					{
						if(!onSuccess) { return; }

						onSuccess({data: JSON.parse(loaded.data)});  
					}
					else
					{
						if(!onFailure) { return; }
						
						onFailure(); 
					}
				} 
				
//		        this.loader.addEventListener(air.HTTPStatusEvent.HTTP_STATUS, $.proxy(onHTTPStatus, this));
//		        this.loader.addEventListener(air.ProgressEvent.PROGRESS, $.proxy(onProgress, this));
		        this.loader.addEventListener(air.IOErrorEvent.IO_ERROR, $.proxy(onIOError, this));
		        this.loader.addEventListener(air.SecurityErrorEvent.SECURITY_ERROR, $.proxy(onSecurityError, this)); 
		        this.loader.addEventListener(air.Event.COMPLETE, $.proxy(onComplete, this));
				
		        this.loader.load(request);		 
			}
		};
	})();

	/*** 
	 * jQuery.air filters 
	 * 
	 * jQuery.air.filterFactory
	 * 
	 ***/ 
    
    /* Filter factory */
    $.air.filterFactory = function(){};
    $.air.filterFactory.prototype = {
        create: function(type, config){
			type = type.toLowerCase();
			config = $.extend({}, { 
					blurX: 20,
					blurY: 20
				}, config || {});

			var filter;
            switch (type) {
				case "blur": 
				filter = new runtime.flash.filters.BlurFilter();
                break;
				
                case "dropshadow":
                case "drop-shadow":  
        		filter = new runtime.flash.filters.DropShadowFilter();
				break;
				
				case "glow": 
        		filter = new runtime.flash.filters.GlowFilter();
				break;
				
				case "bevel": 
        		filter = new runtime.flash.filters.BevelFilter();
                break;
				case "gradientglow":
				case "gradient-glow": 
        		filter = new runtime.flash.filters.GradientGlowFilter();
                break;
				
				case "gradientbevel":
				case "gradient-bevel": 
				filter = new runtime.flash.filters.GradientBevelFilter();
				break;
						
				case "colormatrix":
				case "color-matrix": 
				filter = new runtime.flash.filters.ColorMatrixFilter(this.config.matrix);
                break;
				
				case "convolution":  
        		filter = new runtime.flash.filters.ConvolutionFilter();
				break;
			
				case "displacementmap":	
				case "displacement-map":		 
				
        		filter = new runtime.flash.filters.DisplacementMapFilter();
				break;
					
				default:
				return;
            }
			
			$.each(config, function(key, value) {
				if(!value) { return; }
				filter[key] = value;
			});
			
			return filter;
        }
    };
    
    /***   
     * jQuery.air animation 
     * 
     * jQuery.air.animation
     * jQuery.air.tween
     * jQuery.air.rotation
     *
     ***/
    $.air.animation = {
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
    
    /* tween */
    $.air.tween = function(config){
		this.config = $.extend({}, { effect: $.air.animation.ease }, config || {}); 
		
        this.reversed = false;
        this.running = false;
        this.interval = null; 
    };
    $.air.tween.fps = 30;
    $.air.tween.prototype = (function(){
    
        return {   
            start: function(reversed){
                if (this.running) { this.finish(false); }

                this.reversed = reversed;
                this.running = true;
                
                var begin = this.config.begin, end = this.config.end;
                var transitionEffect = this.config.effect, currentEffect = 0;
                var duration = this.config.duration, fps = $.air.tween.fps, startTime = new Date().getTime();
                
				$(this).trigger("started");


				currentEffect = transitionEffect(0, begin, end - begin, duration);
				$(this).trigger("tweening", [currentEffect, 0]);
				 
                var self = this;
                this.interval = setInterval(function() {
                    var newTime = new Date().getTime(), 
						deltaTime = newTime - startTime;
                    currentEffect = transitionEffect(deltaTime, begin, end - begin, duration); 
					$(self).trigger("tweening", [currentEffect, deltaTime / duration]);
					
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
                clearInterval(this.interval);
                this.interval = null;
                this.running = false;
				
				$(this).trigger("finished", [interactive]); 
            }
        };
    })();
    
	/* rotation */
    $.air.rotation = function(target){
        this.target = target;
		
        this.setCenter();
    };
    $.air.rotation.prototype = (function(){
    
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
    
    /*** 
     * jQuery.air html loader fx - 3d & Blender 
     * 
     * jQuery.air.effect
     * jQuery.air.flipEffect
     * jQuery.air.singleFlipEffect
     * jQuery.air.zoomEffect
     * jQuery.air.effectFactory
     * jQuery.air.blenderEffect
     * jQuery.air.blenderEffectFactory
     * 
     ***/  
    /* effect */
    $.air.effect = function(config){
        this.config = $.extend({}, {
            htmlLoader: null,
			secondHtmlLoader: null, 
            axis: null,
            duration: 200
        }, config || {});

        this.tween = null;  
    };
    $.air.effect.prototype = { 
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

	/* flipEffect */
    $.air.flipEffect = function(config){
        $.air.effect.call(this, config);

		this.firstFace = this.config.htmlLoader;
		this.secondFace = this.config.secondHtmlLoader; 
		this.firstFaceRotation = new $.air.rotation(this.firstFace); 
		this.secondFaceRotation = new $.air.rotation(this.secondFace); 
		this.axis = this.config.axis;
		this.duration = this.config.duration; 
		this.startValue = 0; 
		this.endValue = -180; 
		this.switchValue = (this.startValue + this.endValue) / 2; 
		this.flipped = false;
        
        this.tween = new $.air.tween({
			begin: this.startValue,
			end: this.endValue,
			duration: this.duration,
			effect: $.air.animation.linear
		}); 
		
		$(this.tween)
			.bind("started", $.proxy(function() {
	            this.firstFace.stage.mouseChildren = false;
	            this.secondFace.stage.mouseChildren = false;
	            
	            this.firstFace.visible = !this.tween.reversed;
	            this.secondFace.visible = this.tween.reversed;
	            
	            this.flipped = false;
			}, this))
			.bind("tweening", $.proxy(function(e, value, percent) { 
	            var shouldFlipLoaders = percent > 0.5;
				var reversed = this.tween.reversed;
	            var rotation = !reversed ? value : this.endValue - (value - this.startValue);
	            
	            this.firstFaceRotation.rotate(rotation, this.axis);
	            this.secondFaceRotation.rotate(rotation + 180, this.axis);

	            if (shouldFlipLoaders && !this.flipped) {
	                this.firstFace.visible = reversed;
	                this.secondFace.visible = !reversed;
	                this.flipped = true;
	            }
			}, this))
			.bind("finished", $.proxy(function(e, interactive) {
	            this.firstFaceRotation.reset();
	            this.secondFaceRotation.reset();
	            this.firstFace.stage.mouseChildren = true;
	            this.secondFace.stage.mouseChildren = true;
				
				$(this)
					.trigger("finished")
					.unbind();
			}, this)); 
    };
    $.air.flipEffect.prototype = new $.air.effect();
    $.air.flipEffect.prototype.constructor = $.air.flipEffect; 
    
	/* singleFlipEffect */
    $.air.singleFlipEffect = function(config){
        $.air.effect.call(this, config);

		this.firstFace = this.config.htmlLoader, 
		this.firstFaceParent = null; 
		this.firstFaceRotation = new $.air.rotation(this.firstFace);  
        this.firstFaceRotation.rotationCenter.z = this.firstFace.width / 2; 
		this.secondFace = null;
		this.secondFaceRotation = null; 
		this.axis = this.config.axis; 
		this.duration = this.config.duration; 
		this.startValue = 0; 
		this.endValue = -90;
		this.flipped = false;
		this.oldFilters;
		this.filteredSprite; 
        
        this.tween = new $.air.tween({
			begin: this.startValue,
			end: this.endValue,
			duration: this.duration,
			effect: $.air.animation.linear
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
	            
	            this.secondFace = $.air.htmlLoader.copyAsBitmap(this.firstFace); 
	            this.filteredSprite.addChild(this.secondFace);
	            this.secondFaceRotation = new $.air.rotation(this.secondFace); 
	            this.secondFaceRotation.position = this.firstFaceRotation.position;
	            this.secondFaceRotation.rotationCenter.z = this.secondFace.width / 2;
	            
				this.flipped = false;
			}, this))
			.bind("tweening", $.proxy(function(e, value, percent) { 
	            var shouldFlipLoaders = percent > 0.5;
				var reversed = this.tween.reversed;
	            var rotation = !reversed ? value : this.endValue - (value - this.startValue);
	            
	            if (reversed) {
	                this.firstFaceRotation.rotate(rotation, this.axis);
	                this.secondFaceRotation.rotate(rotation + 90, this.axis);
	            }
	            else {
	                this.firstFaceRotation.rotate(rotation + 90, this.axis);
	                this.secondFaceRotation.rotate(rotation, this.axis);
	            }
	            if (this.shouldFlipLoaders && !this.flipped) {
	                this.filteredSprite.swapChildren(this.firstFace, this.secondFace);
	                this.flipped = true;
	            }
			}, this))
			.bind("finished", $.proxy(function(e, interactive) {
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
				
				$(this)
					.trigger("finished")
					.unbind();
			}, this));  
    };
    $.air.singleFlipEffect.prototype = new $.air.effect();
    $.air.singleFlipEffect.prototype.constructor = $.air.singleFlipEffect; 
    
	/* zoomEffect */
    $.air.zoomEffect = function(config){
        $.air.effect.call(this, config); 
		
        this.firstFace = this.config.htmlLoader, 
		this.duration = this.config.duration; 
		this.originalBounds = {
            x: this.firstFace.x,
            y: this.firstFace.y,
            width: this.firstFace.width,
            height: this.firstFace.height
        };
			
        this.tween = new $.air.tween({
			begin: 0,
			end: 1,
			duration: this.duration,
			effect: $.air.animation.linear
		}); 
		$(this.tween)
			.bind("started", $.proxy(function() {
				var reversed = this.tween.reversed; 
	            this.firstFace.stage.mouseChildren = false;
	            
	            if (!reversed) {
	                this.firstFace.visible = true;
	            }
				
				$(this).trigger("starting"); 
			}, this))
			.bind("tweening", $.proxy(function(e, value, percent) { 
				var reversed = this.tween.reversed;
	            var transition = reversed ? value : 1 - value;

	            var newBounds = $.air.bounds.resize(transition, this.tween.bounds, this.originalBounds);
	            this.firstFace.x = newBounds.x;
	            this.firstFace.y = newBounds.y;
	            this.firstFace.scaleX = newBounds.width / this.originalBounds.width;
	            this.firstFace.scaleY = newBounds.height / this.originalBounds.height;
	            this.firstFace.alpha = 1 - transition;
			}, this))
			.bind("finished", $.proxy(function(e, interactive) {

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
				
				$(this)
					.trigger("finished")
					.unbind();
			}, this)); 
    };
    $.air.zoomEffect.prototype = new $.air.effect();
    $.air.zoomEffect.prototype.constructor = $.air.zoomEffect; 
    
    /* effectFactory */
    $.air.effectFactory = function() { };
    $.air.effectFactory.prototype = (function() { 
        return {
            create: function(type, config){
                if (!type) { throw new Error("fx type required"); }
                type = type.toLowerCase();
                switch (type) {
                    case "flip":
                        return new $.air.flipEffect($.extend({}, { 
							axis: air.Vector3D.X_AXIS, 
							duration: 200 
						}, config || {}));
                    case "singleflip":
                    case "single-flip":
                        return new $.air.singleFlipEffect($.extend({}, {
							axis: air.Vector3D.Y_AXIS, 
							duration: 300
						}, config || {}));
                    case "zoom":
                        return new $.air.zoomEffect($.extend({}, {
							duration: 300
						}, config || {}));
                }
            }
        };
    })();
    
    /* blenderEffect */
    $.air.blenderEffect = function(config){ 
		
        this.config = $.extend({}, {
            htmlLoader: null,
            url: "",
            shader: null,
            shaderConfig: {},
            axis: null,
            duration: 200,
            transition: $.air.animation.linear
        }, config || {}); 
		
		this.isLoaded = false;
		
		this.firstFace = this.config.htmlLoader;
		this.shader = this.config.shader;
		this.shaderConfig = this.config.shaderConfig; 
		
        this.keepTheEffect = false;
        this.hideOnFinish = false;
        this.disableInteraction = false; 
        
        this.tween = new $.air.tween({
			begin: 0,
			end: 1,
			duration: this.config.duration,
			effect: this.config.transition
		});
		
		this.init();
    };
    $.air.blenderEffect.prototype = (function(){ 
        //Private methods
		function resetFilters(target, filters) {
            var oldFilters = target.filters;
            for (var i = 0; i < oldFilters.length; i++) {
                var oldFilter = oldFilters[i];
                if (typeof oldFilter.shader == 'undefined') {
                    filters.push(oldFilter);
                }
            }

            target.filters = filters;
		}
		
		function applyShader(target, shader, shaderConfig) {
	        if (!shader) { return; }
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
		function onLoad(e) {
			var loader = e.target; 
			this.shader = new air.Shader(loader.data); 
			
			this.isLoaded = true;
			
			$(this).trigger("loaded");
		}
		
		function onStart() { $(this).trigger("starting"); }
		function onTween(e, value, percent) {
            // apply the blender effct
			var reversed = this.tween.reversed;
            var transition = reversed ? 1 - value : value;
			
			var shaderConfig = $.extend({}, {
                transition: transition
            }, this.shaderConfig || {}); 

			applyShader(this.firstFace, this.shader, shaderConfig);
		}
		function onFinish(e, interactive) {
            if (this.hideOnFinish) {
                this.firstFace.visible = false;
            }
            
            if (!this.keepTheEffect) {
                resetFilters(this.firstFace, []); 
            }
            
            if (this.disableInteraction) {
                window.htmlLoader.stage.mouseChildren = true;
            }
				
			$(this)
				.trigger("finished")
				.unbind();
		}
        
        return { 
			init: function() {
				if(this.config.url === "") return; 
				
        		var loader = new air.URLLoader();
        		loader.dataFormat = air.URLLoaderDataFormat.BINARY;	
				loader.addEventListener(air.Event.COMPLETE, $.proxy(onLoad, this)); 
				loader.load(new air.URLRequest(this.config.url));
				
				$(this.tween)
					.bind("started", $.proxy(onStart, this))
					.bind("tweening", $.proxy(onTween, this))
					.bind("finished", $.proxy(onFinish, this)); 
				
//				var request = new $.air.request({ 
//				 	responseType: air.URLLoaderDataFormat.BINARY, 
//					url: this.config.url 
//				});
//				request
//					.bind("air.complete", $.proxy(onLoad, this))
//					.load();
					
//				this.tween
//					.bind("started", $.proxy(onStart, this))
//					.bind("tweening", $.proxy(onTween, this))
//					.bind("finished", $.proxy(onFinish, this));					
			}, 
	        start: function(reversed) {
				if(!this.tween) return;

				if(!this.isLoaded) { 
					$(this).bind("loaded", $.proxy(function() { 
						this.tween.start(reversed); 
					}, this));
					return;
				}
			    this.tween.start(reversed);
	        },
	        stop: function() {
				if(!this.tween) return;
				
                this.tween.stop();
	        }
        };
    })();
    
    /* blenderEffectFactory */
    $.air.blenderEffectFactory = function(){};
    $.air.blenderEffectFactory.prototype = (function(){
    
        return {
            create: function(type, config){
                if (!type) {
                    throw new Error("blender effect type required");
                }
                type = type.toLowerCase();
                
                switch (type) {
                    case "dissolve":
                        return new $.air.blenderEffect($.extend({}, {
				            url: "app:/lib/pixelblender/disolve.pbj",
				            duration: 500,
				            transition: $.air.animation.linear
				        }, config || {}));
                    case "page":
                        return new $.air.blenderEffect($.extend({}, {
				            url: "app:/lib/pixelblender/page.pbj",
				            duration: 1200,
				            transition: $.air.animation.ease
				        }, config || {}));
                    case "waves":
                        return new $.air.blenderEffect($.extend({}, {
				            url: "app:/lib/pixelblender/waves.pbj",
							shaderConfig: { waves: 2, weight: 0.9 }, 
				            duration: 1200,
				            transition: $.air.animation.linear
				        }, config || {}));
                    case "shake": 
                        return new $.air.blenderEffect($.extend({}, {
            				url: "app:/lib/pixelblender/shake.pbj",
							shaderConfig: { waves: 2, weight: 0.9 }, 
            				duration: 1000
						}, config || {}));
                    default:
                        throw new Error("unregistered blender effect");
                }
            }
        };
    })();
	
	/*** 
	 * jQuery.air SQLite support
	 * 
	 * jQuery.air.query
	 * jQuery.air.table
	 * jQuery.air.datbase
	 * 
	 ***/
	
	$.air.query = function(connection){
        this.connection = connection; 
    };
    $.air.query.prototype = (function(){
        //Private methods
        function setParm(key, value){ 
			if (!$.isFunction(value)) { 
				this.statement.parameters[":" + key] = value;
			}
        }
        
		function addListeners() {
			this.statement.addEventListener(air.SQLEvent.RESULT, $.proxy(onSuccess, this));
			this.statement.addEventListener(air.SQLErrorEvent.ERROR, $.proxy(onError, this));    
		}
		
		function removeListeners() {
			this.statement.removeEventListener(air.SQLEvent.RESULT, $.proxy(onSuccess, this));
			this.statement.removeEventListener(air.SQLErrorEvent.ERROR, $.proxy(onError, this));
		}
		
        //Private events				
        function onSuccess(){ 
            var result = this.statement.getResult(); 
            $(this).trigger("success", [result]);
            
			removeListeners.call(this);
		}
        function onError(error){  
			air.trace(error);
            $(this).trigger("error", [error]);
            
			removeListeners.call(this);
		}
        
        return { 
            execute: function(sql, parms) { 
		        this.statement = new air.SQLStatement();
		        this.statement.sqlConnection = this.connection;
                this.statement.text = sql;
                this.statement.clearParameters();
                $.each(parms, $.proxy(setParm, this)); 
				
				addListeners.call(this);
				this.statement.execute(); 
            }
        };
    })();
    
    $.air.table = function(name, connection){
        this.name = name; 
        this.connection = connection;
		
		this.columns = {};

        this.init();
    };
    $.air.table.prototype = (function(){
        //Private methods
		function createColumn(column) { 
			column = column || {};
		
			var type = column.type || "string", 
				typeMap = { 
					"varchar" : "varchar",
					"nvarchar" : "nvarchar",
					"string" : "varchar", 
					"text" : "text",
					"int" : "integer", 
	  				"integer" : "integer",
					"number" : "integer", 
					"key" : "integer", 
	  				"float" : "float",
					"bool" : "integer", 
	  				"boolean" : "integer",
					"clob" : "clob",
	  				"blob" : "blob",
					"file" : "blob", 
					"image" : "blob", 
	  				"datetime" : "datetime",
	  				"timestamp" : "datetime",
					"vc" : "varying character",
					"varying character" : "varying character",
	  				"nvc" : "national varying character", 
	  				"nationalvaryingcharacter" : "national varying character",  
	  				"national varying character" : "national varying character"
				};
			
			column.type = typeMap[type.toLowerCase()];
		
			switch (type) {
				case "key":
				column.primaryKey = true
				column.autoIncrement = true;
				break; 
			}
		
			return column;
		};

        function executeQuery(sql, parms, successCallback, failureCallback){ 
            var query = new $.air.query(this.connection);

            if (successCallback) { 
				function onSuccess(e, result) {  
					successCallback(e, result);
					
					$(query).unbind("success", onSuccess);
				}
                $(query).bind("success", onSuccess);
            }
            if (failureCallback) {
				function onFailure(e, result) { 
					failureCallback(e, result);
					
                	$(query).unbind("failure", onFailure);
				}
            	$(query).bind("failure", onFailure);
            } 
            query.execute(sql, parms);
        };
        
        //Private events
        
        return {
            init: function() {},
			create: function(columns, onSuccess, onFailure) { 
                
				var columnDefinitions = [];
                for (var columnName in columns) {
                    var column = createColumn(columns[columnName]),
						columnDefinition = columnName + " " + column.type;
						
                    if (column.size) { columnDefinition += "(" + column.size + ")"; }
                    if (column.primaryKey === true) { columnDefinition += " PRIMARY KEY "; }
                    if (column.autoIncrement === true) { columnDefinition += " AUTOINCREMENT "; }
					
					if(column.defaultValue) { columnDefinition += " DEFAULT " + column.defaultValue }
					
                    columnDefinitions.push(columnDefinition); 
					
					this.columns[columnName] = column;
                }

	            var query = new $.air.query(this.connection),
					sql = "CREATE TABLE IF NOT EXISTS " + this.name + " ( " + columnDefinitions.join() + ")",  
					parms = {}; 

				executeQuery.call(this, sql, parms, onSuccess, onFailure); 
			},
			filterParms: function(parms) { 
				var tableColumns = this.columns, filtered = {};
				
				$.each(parms, function(key, value) {  
					if(!tableColumns[key]) { return; }
					filtered[key] = value; 
				}); 
				
				return filtered;
			}, 
            get: function(parms, onSuccess, onFailure){ 
				var query = new $.air.query(this.connection),
					sql = "SELECT * FROM " + this.name,
					
					where = parms.where || "", 
					clauses = [], 
					
					orderBy = parms.orderBy ? " ORDER BY " + parms.orderBy : "", 
					limit = parms.limit ? " LIMIT " + parms.limit : "",
					sqlParms = {};
				
				if($.isArray(where)) {
					$.each(where, function(i, clause) { clauses.push(clause); });
				} else if(where.length) {
					clauses.push(where);
				}
					
				delete parms["where"];
				delete parms["orderBy"];
				delete parms["limit"];
					
                if (!$.isEmptyObject(parms)) {
					sqlParms = this.filterParms(parms); 
					$.each(sqlParms, function(key, value) {  
						switch(key) {   
							default:
							clauses.push(key + "= :" + key);
							break;
						}
					});
                } 
				
				if (clauses.length > 0) {
					sql += " WHERE " + clauses.join(" AND ") + " ";
				}
				sql += orderBy;
				sql += limit; 

				executeQuery.call(this, sql, sqlParms, onSuccess, onFailure); 
            },
            set: function(parms, onSuccess, onFailure){ 
                if ($.isEmptyObject(parms)) {
					air.trace("set parms empty");
                    return;
                }  
				var sqlParms = this.filterParms(parms),
					query = new $.air.query(this.connection), sql = "";
				
                if (!parms.id) {
                    sql = "INSERT INTO " + this.name + " ";

					delete sqlParms["id"];
                    var columns = [], values = [];
					$.each(sqlParms, function(key, value) { 
						if($.isFunction(value)) { return; } 

						columns.push(key);
						values.push(":" + key); 
					});
					
                    sql += "(" + columns.join(",") + ") VALUES (" + values.join(",") + ")"; 
                }
                else {
                    sql = "UPDATE " + this.name + " SET "; 
					
                    var tableColumns = this.columns, columns = [];
					$.each(sqlParms, function(key, value) { 
						if($.isFunction(value)) { return; }
						
						columns.push(key + " = :" + key);
					});
                    
                    sql += columns.join(",") + " WHERE id = :id"; 
                }  

				executeQuery.call(this, sql, sqlParms, onSuccess, onFailure); 
            },
            del: function(parms, onSuccess, onFailure){ 
				var query = new $.air.query(this.connection), 
					sql = "DELETE FROM " + this.name,
					sqlParms = {};
				if (parms.id) {
					sqlParms["id"] = parms.id;
					
					sql = sql + " WHERE id = :id";
				} 
				
				executeQuery.call(this, sql, sqlParms, onSuccess, onFailure); 
            }
        };
    })();
    
    $.air.database = function(key, config){
        this.key = key;
        this.config = $.extend({}, {
            tables: {} 
        }, config || {});
        
        this.file = air.File.applicationStorageDirectory.resolvePath(this.key); 

        this.connection = new air.SQLConnection();
        
        this.table = {};
		this.tableCount = 0;
		this.readyCount = 0;
        
        this.init();
    };
    $.air.database.prototype = (function(){
        //Private methods 
        
        //Private events
        function onTableReady(result){  
			this.readyCount++;
			if (this.tableCount === this.readyCount) { $(this).trigger("opened"); }
        }
        function onTableError(result){ $(this).trigger("error"); };				
				
        function onOpen(event){  
			for(var tableKey in this.config.tables) { 
				var table = new $.air.table(tableKey, this.connection);  
				this.tables(tableKey, table);
				this.tableCount++;
				
				var tableConfig = this.config.tables[tableKey];
				var columns = tableConfig.columns;
				table.create(columns, $.proxy(onTableReady, this), $.proxy(onTableError, this));
			}

			if(this.tableCount == this.readyCount) {
				$(this).trigger("opened");
			}
        }
        function onError(event){ 
            $(this).trigger("openError", [{ error: event.text }]);
        }
        
        return { 
            init: function(){ 
                this.connection.addEventListener(air.SQLEvent.OPEN, $.proxy(onOpen, this));
                this.connection.addEventListener(air.SQLErrorEvent.ERROR, $.proxy(onError, this)); 
            },
            dispose: function(){ 
				this.connection.removeEventListener(air.SQLEvent.OPEN, $.proxy(onOpen, this));
				this.connection.removeEventListener(air.SQLErrorEvent.ERROR, $.proxy(onError, this));
                
				if (!this.connection.connected) {
                    return;
                }
                this.connection.close();
            },
            open: function(pwd, onSuccess, onFailure){
				if($.isFunction(onSuccess)) {
					$(this).bind("opened", onSuccess);
				}
				if($.isFunction(onFailure)) {
					$(this).bind("openError", onFailure);
				}
				
				pwd = typeof pwd === "string" ? $.air.crypto.encrypt(pwd) : null;
				
                this.connection.openAsync(this.file, air.SQLMode.CREATE, null, false, 1024, pwd);
            },
            
            isInitialized: function(){
                return this.file.exists;
            },
            
            tables: function(name, table) {
                if (!table) { 
                    return this.table[name];
                }
                if (!this.table[name]) {
                    this.table[name] = table;
                }
            } 
        };
    })();
	 
    
    /*** 
     * jQuery.air.mvp  
     * 
     * jQuery.air.fxCache
     * $.air.model
     * $.air.view
     * $.air.presenter
     * $.air.shell
     * $.air.appDefinition
     * $.air.application
     * $.air.mvp
     * 
     ***/ 
	 
	/* fxCache */ 
    $.air.fxCache = function(){
        this.fx = {};
    };
    $.air.fxCache.prototype = (function(){
    
        return { 
            get3DEffect: function(key, type, config) {
               	key = key + "-3D-" + type; 
                if (!this.fx[key]) {
                    var factory = new $.air.effectFactory();
                    this.fx[key] = factory.create(type, config);
				}
                return this.fx[key];
            },
            getBlenderEffect: function(key, type, config) {
				key = key + "-blender-" + type;
               	if (!this.fx[key]) {
                    var factory = new $.air.blenderEffectFactory();
                    this.fx[key] = factory.create(type, config);
				}
                return this.fx[key];
            }
        };
    })();
    
    /* model */
    $.air.model = function(){ };
    $.air.model.prototype = (function(){
        //Private methods 
        
        //Private events
        
        return {  
            build: function(props) {
                var obj = {};
				for(var key in this) {  
					var val = this[key];
					if ($.isFunction(val)) continue;
					
					if(val.defaultValue) continue; 
					obj[key] = (props && props[key]) ? props[key] : this.getDefaultPropertyValue(val.type);
				} 

                return obj;
            },

			getDefaultPropertyValue: function(type){
	            type = type.toLowerCase();
	            switch (type) {
	                case "int":
	                case "integer":
	                case "long":
					case "bool":
					case "boolean":
	                    return 0;
					case "float":
					return 0.0; 
	                default:
	                    return "";
	            }
	        },
            
            toTable: function(){
                var table = {
                    columns: {}
                };
				for(var key in this) { 
					var val = this[key];
					if ($.isFunction(val)) continue;
					table.columns[key] = val; 
				}
                
                return table;
            }
        };
    })();
    
    /* view */
    $.air.view = function(loader){  
        this.htmlLoader = loader; 
        
        this.elements = {}; 
		
        this.init();
    };
    $.air.view.prototype = (function(){
        //Private methods 
        
        //Private events
        
        return {  
            toString: function(){ return "$.air.view"; },
            init: function(){},
            
			$: function(selector) {
				if(!this.elements[selector]) { this.elements[selector] = $(selector, this.htmlLoader.window.document); }
				return this.elements[selector];
			}
        };
    })();
	
	/* presenter */
	$.air.presenter = function(win, view, fxCache, dependencies) { 
		this.win = win; 
		this.view = view;  
		this.fxCache = fxCache; 
		
		if(dependencies) { 
			for(var key in dependencies) { 
				this[key] = dependencies[key]; 
			}
		}

		this.init();
	};
	$.air.presenter.prototype = (function() {
        
        //3D fx 
        function getFlipXEffect(to, config){
            var fxConfig = $.extend({}, { htmlLoader: this.view.htmlLoader, secondHtmlLoader: to.view.htmlLoader }, config || {} ); 
            return this.fxCache.get3DEffect(this.key, "flip", fxConfig);
        };
        function getSingleFlipYEffect(config){
            var fxConfig = $.extend({}, { htmlLoader: this.view.htmlLoader }, config || {} );  
            return this.fxCache.get3DEffect(this.key, "single-flip", fxConfig);
        };
        function getZoomEffect(config){
            var fxConfig = $.extend({}, { htmlLoader: this.view.htmlLoader }, config || {} ); 
			return this.fxCache.get3DEffect(this.key, "zoom", fxConfig);
        };
        
        //Blender fx
        function getDissolveEffect(config){
            var fxConfig = $.extend({}, { htmlLoader: this.view.htmlLoader }, config || {} );
            return this.fxCache.getBlenderEffect(this.key, "dissolve", fxConfig);
        };
        function getPageEffect(config){
            var fxConfig = $.extend({}, { htmlLoader: this.view.htmlLoader }, config || {} );
            return this.fxCache.getBlenderEffect(this.key, "page", fxConfig);
        };
        function getWavesEffect(config){
            var fxConfig = $.extend({}, { htmlLoader: this.view.htmlLoader }, config || {} ); 
            return this.fxCache.getBlenderEffect(this.key, "waves", fxConfig);
        };
        function getShakeEffect(config){
            var fxConfig = $.extend({}, { htmlLoader: this.view.htmlLoader }, config || {} ); 
            return this.fxCache.getBlenderEffect(this.key, "shake", fxConfig);
        };
		
		function parseSelector(selector) {
			if(selector === "window") { return this.view.htmlLoader.window; }
			else if(selector === "document") { return this.view.htmlLoader.window.document; }
			return selector;  
		};
		
		return {
			init: function() {   
				if(!this.events) { return; }
				
				for(var cat in this.events) { 
					var tempCat = cat.toLowerCase();
					
					switch (tempCat) {
						case "keydown":
						break;
						default:
						for(var selector in this.events[cat]) {
							var callback = this.events[cat][selector]; 
							this.view.$(parseSelector.call(this, selector)).live(tempCat, $.proxy(callback, this)); 
						}
						break;
					}
				} 
			}, 
			dispose: function() { 
				if(!this.events) { return; }
				
				$.each(this.events, $.proxy(function(type, eMap) { 
					type = type.toLowerCase();
					
					switch(type) {
						case "keydown":
						break;
						default:
						$.each(eMap, $.proxy(function(selector, callback) { 
							this.view.$(parseSelector.call(this, selector)).die(type); 
						}, this));
						break;
					}
				}, this)); 
				
				
			},
            
			go: function() {}, //Default is empty - expected to be specified in presenter proto  
			
			handleKeyDown: function(e) { 
				var events = this.events || {}, 
					keydownEvents = events["keydown"]; 
				if(!keydownEvents) { return; }
				
				var handled = false, defCallback = keydownEvents["def"];
				$.each(keydownEvents, $.proxy(function(selector, callback) {  
					var keyCode = selector.toUpperCase();
					switch(keyCode) {
						case "DEL":
						keyCode = "DELETE";
						break;
					}
					
					if(air.Keyboard[keyCode] === e.keyCode) { 
						callback.call(this);
						handled = true;
					}
				}, this));

				if(!handled && defCallback) { defCallback.call(this); }
			}, 
			
			trigger: function(e, args) {
				this.win.trigger(e, this, args); 
			}, 
			
			viewSource: function(config) { this.trigger("sourceViewed", config); }, 
			restore: function() { this.trigger("restored"); }, 
			maximize: function() { this.trigger("maximized"); }, 
			minimize: function() { this.trigger("minimized"); },
			exit: function() { this.trigger("exited"); },
			
			disable: function() { 
				this.view.htmlLoader.mouseChildren = false;
                this.view.htmlLoader.tabEnabled = false;
                this.view.htmlLoader.stage.focus = null;
			},
			enable: function() {
				this.view.htmlLoader.mouseChildren = true;
                this.view.htmlLoader.tabEnabled = true;
			}, 

            setX: function(x){ this.view.htmlLoader.x = x; },
            setY: function(y){ this.view.htmlLoader.y = y; },
            
            show: function(){
				this.enable();
				
                this.view.htmlLoader.visible = true;
				
				this.trigger("shown");
            }, 
            hide: function(){
                this.disable();
				
				this.view.htmlLoader.visible = false;
				
				this.trigger("hidden");
            },
			
			bringToFront: function() {
				this.win.bringChildToFront(this.view.htmlLoader); 
			}, 
			sendToBack: function() {
				this.win.sendChildToBack(this.view.htmlLoader);  
			},
			focus: function() {
				this.win.focusChild(this.view.htmlLoader);   
			},

            //FX methods 
            flipX: function(to, reversed){ 
                var effect = getFlipXEffect.call(this, to); 
				$(effect).bind("finished", $.proxy(function() {  
					if (reversed) {
						this.show();
						to.hide();
					} else {
						this.hide();
						to.show();
					}
				}, this));
				effect.start(reversed);
            }, 
            flipY: function(reversed, config){
                var effect = getSingleFlipYEffect.call(this, config);  
                effect.start(!reversed); 
            }, 

            flip3d: function(show){ 
                var effect = getPageEffect.call(this); 
				if(!show) {
					$(effect).bind("finished", $.proxy(function() { this.disable(); }, this));
	                effect.keepTheEffect = true; 
					effect.start(false);  
				} else {
					$(effect).bind("finished", $.proxy(function() { this.show(); }, this));
	                effect.keepTheEffect = false; 
					effect.start(true);  
				}
            },
			
            dissolve: function(){ 
                var effect = getDissolveEffect.call(this); 
				$(effect).bind("finished", $.proxy(function() { this.hide(); }, this));
                effect.hideOnFinish = true; 
				effect.start(false); 
            },
			
            appear: function(){
                var effect = getDissolveEffect.call(this); 
				$(effect).bind("finished", $.proxy(function() { this.show(); }, this));
                effect.hideOnFinish = false; 
				effect.start(true); 
            },
			
			ripple: function(show) {
                var effect = getWavesEffect.call(this); 
				if(!show) {
					$(effect).bind("finished", $.proxy(function() { this.hide(); }, this));
	                effect.hideOnFinish = true; 
					effect.start(true); 
				} else {
					$(effect).bind("starting", $.proxy(function() { this.show(); }, this));
	                effect.hideOnFinish = false; 
					effect.start(false);
				}
			},  
			
			zoom: function(show, el) {
                var blenderEffect = getPageEffect.call(this),
					effect = getZoomEffect.call(this),
					bounds = $.air.bounds.get(el); 
				
				if(!show) { 
	                blenderEffect.keepTheEffect = false; 
	                blenderEffect.start(true);
					
					$(effect).bind("finished", $.proxy(function() { this.hide(); }, this));
	                effect.tween.bounds = $.air.bounds.get(el); 
					effect.start(true);  
				} else { 
	                blenderEffect.tween.duration = 1500;
	                blenderEffect.keepTheEffect = false; 
	                blenderEffect.start(true);
				
					$(effect).bind("finished", $.proxy(function() { this.show(); }, this));
	                effect.tween.bounds = $.air.bounds.get(el); 
					effect.start(false); 
				}
			},  
            
            shake: function(){
                var effect = getShakeEffect.call(this); 
                effect.hideOnFinish = false;
                effect.tween.disableInteraction = true; 
				effect.start(false);
            }
		};
	})();
	
	/* transition */
	$.air.transition = function(from, to) {
		this.from = from;
		this.to = to; 
	};
	$.air.transition.prototype = (function() {
		
		return {
			play: function() {
				this.from.hide();
				this.to.show();
			}
		};
	})(); 
	
	/* window */
	$.air.window = function(eventBus) {
		this.eventBus = eventBus;
		
		this.systemWindow = null;
		 
		this.init();
	};
	$.air.window.prototype = (function() {  
		
		function onActivated() { this.trigger("activated", this); }
		function onMinimized() { this.trigger("minimized", this); }
		function onExit() { this.trigger("exited", this); };
		
		return {
			init: function() {  
				
				this.systemWindow = new $.air.systemWindow({ 
					isNative: this.isNative || false, 
					type: this.type ||"normal", 
					chrome: this.chrome || "standard", 
					transparent: this.transparent || false,
					align: this.align || "", 
					x: this.x || 0,
					y: this.y || 0,
					width: this.width ||600,
					height: this.height ||400,
					alwaysInFront: this.alwaysInFront || false, 
					visible: this.visible || false, 
					resizable: this.resizable || true, 
					minimizable: this.minimizable || false,
					minimizeToTray: this.minimizeToTray || false, 
					html: this.html || "", 
					tray: this.tray || { 
						icon: "", 
						tooltip: "", 
						menu: []
					}
				});  
				$(this.systemWindow).bind( {
					"activated": $.proxy(onActivated, this),					
					"minimized": $.proxy(onMinimized, this),
					"exited": $.proxy(onExit, this) 
				});
			},
			
			trigger: function(event, sender, args) {
				$(this.eventBus).trigger(event, [sender, args]);
			},
			
			show: function() {
				this.systemWindow.show();
			}, 
			hide: function() {
				this.systemWindow.hide();
			}, 
			close: function() {
				this.systemWindow.close();
			},
			activate: function() {
				this.systemWindow.activate();
			},
			isVisible: function() {
				return this.systemWindow.isVisible();
			},
			isMinimized: function() {
				return this.systemWindow.isMinimized();
			}, 
			isMaximized: function() {
				return this.systemWindow.isMaximized();
			}, 
			moveTo: function(x, y) {
				this.systemWindow.moveTo(x, y);	
			}, 
			getCenterXY: function() {
				return this.systemWindow.getCenterXY(); 
			}, 
			
			//System tray
			hasTray: function() { 
				return this.systemWindow.systemTray !== null;
			},
			hideTrayIcon: function() {
				if(!this.systemWindow.systemTray) { return; }
				this.systemWindow.systemTray.hideIcon();
			},
			showTrayIcon: function() { 
				if(!this.systemWindow.systemTray) { return; }
				this.systemWindow.systemTray.showIcon();
			}, 
			
			//Size
			resize : function(width, height){
				this.systemWindow.resize(width, height);
			},
			fullscreen: function(nonInteractive) {
				this.systemWindow.fullscreen(nonInteractive);
			}, 
			
			//Positioning in relation to other windows
			bringToFront: function() {
				this.systemWindow.bringToFront();
			}, 
			bringInFrontOf: function(win) {
				this.systemWindow.bringInFrontOf(win);
			}, 
			sendToBack: function() {
				this.systemWindow.sendToBack();
			}, 
			sendBehind: function(win) {
				this.systemWindow.sendBehind(win);
			}, 
			
			//Window children 
			addChild: function(htmlLoader) {
				this.systemWindow.addHtmlLoader(htmlLoader); 
			},  
			bringChildToFront: function(child) { 
				this.systemWindow.bringChildToFront(child);
			},
			sendChildToBack: function(child) {
				this.systemWindow.sendChildToBack(child);
			},
			focusChild: function(child) {
				this.systemWindow.focusChild(child);
			}  
		};
	})(); 
	
	/* service */
	$.air.service = function(dependencies) { 
		if(dependencies) { 
			for(var key in dependencies) { 
				this[key] = dependencies[key]; 
			}
		}
	};
	$.air.service.prototype = (function() { return {}; })();
	
	/* shell */
	$.air.shell = function(appDef) {  
		this._appDef = appDef;
		
		//Tracking/context
		this._history = []; 
		this._staged = {};
		this._context = null;
		
		//Windows
		this._nativeWindow = null;
		this._windows = {}; 
		this._presenterWindows = {};

		//HTML Loaders
		this._htmlLoaders = {};
		this._htmlLoaderCount = 0;
		this._loadCount = 0;
		
		//Effects Cache
		this._fxCache = new $.air.fxCache();  

		//Clipboard
		this._clipboard = new $.air.clipboard(); 
		
		//Eventing
		this.eventBus = {};
		this._events = $.extend({}, {
			hidden : function() { }, 
			shown : function() { }, 
			sourceViewed: function(args) { this.viewSource(args) }, 
			activated: function(args) { this.restore(args); }, 
			restored : function(args) { this.restore(args); }, 
			maxmized : function(args) { this.maximize(args); }, 
			minimized : function(args) { this.minimize(args); },
			exited : function(args) { this.exit(args); } 
		}, this.events || {});

		//Native
		this._env = air.NativeApplication.nativeApplication;
		
		this.init();
	};
	$.air.shell.prototype = (function() { 
        //Private methods     

        //Private events
        function onKeyDown(e){
			if(!this._context) { return; }
		 	
			if(e.target.stage.mouseChildren != true) { return; }

			this._context.handleKeyDown(e);  
        }
        
        function onUserIdle() {  
			
		}

		function onPresenterEvent(e, sender, data) { 
			switch(e.type) {  
				case "activated":
				sender.activate(); //sender is window here
				
			 	this._events["activated"].call(this); 
				break;
				
				case "hidden": 
				var presenter = this._staged[sender.key];
				if(!presenter) return;
				presenter.dispose();
				
				delete this._staged[sender.key];
				break; 
				case "shown": 

				sender.bringToFront(); 
				sender.focus(); 
				sender.win.activate(); 
 
				this._staged[sender.key] = sender; 
				this._context = sender;
				break;
				
				default: 
				data = data || {};
				if (!data.ghost) {
					this._context = sender;
				}  
				
				switch(e.type) {
					case "minimized":
					this._context.hide();
					break;
				}

			 	this._events[e.type].call(this, data); 
				break;
			}
		}

		return {
			init: function() {   
				//Windows 
				$.each(this._appDef.windows(), $.proxy(function(key, Window) { 
					var win = new Window(this.eventBus); 
					win.key = key;
					win.systemWindow.instance.stage.transform.perspectiveProjection.focalLength = 800;
					win.systemWindow.instance.stage.addEventListener("keyDown", $.proxy(onKeyDown, this), true); 
					
					if(win.isNative) {
						this._nativeWindow = win;
					}
					this._windows[key] = win;

					$.each(win.presenters, $.proxy(function(i, presenterKey) {
						this._presenterWindows[presenterKey] = win;
					}, this));
				}, this));
			
				//Load html loaders
				//Assign to appropriate window 
				$.each(this._appDef.htmlLoaders(), $.proxy(function(key, htmlLoaderConfig) { 
					var loader = $.air.htmlLoader.create(htmlLoaderConfig);
					loader.addEventListener(air.Event.COMPLETE, $.proxy(function(e) {
						var target = e.target;
						$.air.htmlLoader.fitToContent(target);  

						this._presenterWindows[key].addChild(target); 
			
			            this._loadCount++;
			
			            if (this._loadCount === this._htmlLoaderCount) { this.go(); }
					}, this)); 
					
					this._htmlLoaders[key] = loader;
					this._htmlLoaderCount++;

					loader.load(new air.URLRequest(htmlLoaderConfig.path)); 
				}, this)); 

				//Event binding
				//User idle
				//Keydown
				//Custom 
                if (this.idleThreshold) { 
                    this._env.idleThreshold = this.idleThreshold;
                    this._env.addEventListener(air.Event.USER_IDLE, $.proxy(onUserIdle, this));
                }  
				
				for(var type in this._events) {  
					$(this.eventBus).bind(type, $.proxy(onPresenterEvent, this)); 
				} 
			}, 
			dispose: function() { 
                if (this.idleThreshold) { 
                    this._env.removeEventListener(air.Event.USER_IDLE, $.proxy(onUserIdle, this));
                }
				
//              this.stage.removeEventListener("keyDown", $.proxy(onKeyDown, this));  
				
				$(this.eventBus).unbind(); 
			},

            models: function(key) {
				var Model = this._appDef.models(key) || $.air.model;
				return new Model();
			},
			views: function(key) { 
				var View = this._appDef.views(key) || $.air.view;  
				
				var view = new View(this.htmlLoaders(key));
				view.key = key;
				return view;
			}, 
			presenters: function(key, dependencies) { 
				var current = this.active(key);
				if(current) {  
					if(!dependencies) return current;

					for(var key in dependencies) {  
						current[key] = dependencies[key]; 
					} 
					return current; 
				}
			
				var Presenter = this._appDef.presenters(key) || $.air.presenter;
				  
				var presenter = new Presenter(this._presenterWindows[key], this.views(key), this._fxCache, dependencies); 
				presenter.key = key; 
				
				return presenter;
			}, 
			transitions: function(from, to) {
				var Transition = this._appDef.transitions(from.key, to.key) || $.air.transition; 
				return new Transition(from, to);
			}, 
			
			htmlLoaders: function(key) {
				return this._htmlLoaders[key];
			},
			
			windows: function(key) { 
				return this._windows[key];
			}, 
			
			services: function(key, dependencies) { 
				var Service = this._appDef.services(key) || $.air.service;
				return new Service(dependencies);
			},
            
			go: function() {}, //Default is empty - expected to be specified in shell proto 
			
			active: function(key) { return this._staged[key]; }, 
			present: function(key, dependencies){ 
				var presenter = this.presenters(key, dependencies);
				presenter.go();

				var breadCrumb = { from: this.context ? this.context.key : "start", to: presenter.key };
				this._history.push(breadCrumb); 
				
				//if first time presentation or call to new window presenter
				if (!this._context || 
					this._context.key == presenter.key ||
					!this._context.win ||
					this._context.win.key !== presenter.win.key) {  
					presenter.show();
					
					return;
				}

				//otherwise play defined/default transition
				var transition = this.transitions(this._context, presenter); 
				transition.play();  
            },
			viewSource: function(args) { 
				var sv = air.SourceViewer.getDefault()
					config = $.extend({}, {
						exclude : [],
					}, args || {});
					
				sv.setup(config);
				sv.viewSource(); 
			},
			restore: function() { 
				if(!this._nativeWindow) { return; } 
				this._nativeWindow.restore(); 
			}, 
			maximize: function() { 
				if(!this._nativeWindow) { return; } 
				this._nativeWindow.maximize(); 
			}, 
			minimize: function() { 
				if(!this._nativeWindow) { return; } 
				this._nativeWindow.minimize(); 
			}, 
			exit: function() { 
				if (this._nativeWindow && this._nativeWindow.hasTray()) {
					this._nativeWindow.hideTrayIcon();
				}
				
				this.dispose(); 
				
				this._env.exit();
			}
		};
	})(); 
	
	/* appDefinition */
	$.air.appDefinition = function(partial) { 
		this.partial = $.extend({}, { 
			models: {}, 
			views: {}, 
			presenters: {}, 
			transitions: {}, 
			windows: {}, 
			services: {},
			shell: {} 
		}, partial || {}); 
		
		this.full = {
			models: {}, 
			views: {}, 
			presenters: {}, 
			transitions: {}, 
			windows: {}, 
			services: {}, 
			shell: {}, 
			htmlLoaders: {} 
		}; 
	
		this.init();
	};
	$.air.appDefinition.prototype = (function() {
		//Private methods 
		function createClass(baseClass, proto) {  
			function O(){
				baseClass.apply(this, arguments);
			} 
			
			var orig = baseClass.prototype;
			for(var origProp in orig) { 
				var val = orig[origProp];
				O.prototype[origProp] = val;
			}
			
			for(var newProp in proto) {
				var val = proto[newProp];
				O.prototype[newProp] = val;
			}

			return O;
		};
		
		function defineClasses(classMappings) {
			$.each(classMappings, $.proxy(function(key, baseClass) {
				key = key.toLowerCase(); 
				for(var c in this.partial[key]) { 
					switch(key) {  
						case "views": 	
						
						var viewProto = this.partial[key][c];
						var htmlLoaderConfig = {};
						for (var prop in viewProto) {
							var val = viewProto[prop];
							
							switch (prop) {
								case "win":
								case "filters":
								case "path":
								case "x":
								case "y":
								case "paintsDefaultBackground":
									htmlLoaderConfig[prop] = val;
									break;
								case "position":  
									htmlLoaderConfig.x = val.x || 0;  
									htmlLoaderConfig.y = val.y || 0; 
									break;
							}
						}

						this.full[key][c] = createClass(baseClass, viewProto); //this.full["transitions"]["list"]["detail"] = $.air.transition; (customized);
						this.full["htmlLoaders"][c] = htmlLoaderConfig;  //this.full["htmlLoaders"]["list"] = { path: "".... 
						
						break; 
						
						case "transitions":
							
						//transitions 
						this.full[key][c] = {}; 
						
						var transitionProto = this.partial[key][c];
						for(var prop in transitionProto) {
							var val = transitionProto[prop];
					
							this.full[key][c][prop] = createClass(baseClass, { play: val }); //this.full["transitions"]["list"]["detail"] = $.air.transition; (customized);
						}

						break;
						
						default:
						var proto = this.partial[key][c];
						this.full[key][c] = createClass(baseClass, proto); //this.full["presenters"]["list"] = $.air.presenter; (customized)
						break;
					} 
				}
			}, this));
			
			this.full["shell"] = createClass($.air.shell, this.partial["shell"]);
		};
		
		function getClass(type, key) {} 
		function lookup(type, key) { 
			 var t = this.full[type];
			 if(!key) return t;
			 return t ? t[key] : t; 
		}
		
		return { 
			init: function() { 
				defineClasses.call(this, {
					"models": $.air.model,
					"views": $.air.view,
					"presenters": $.air.presenter, 
					"transitions": $.air.transition,
					"windows": $.air.window, 
					"services": $.air.service 
				});
			}, 
			models: function(key) { return lookup.call(this, "models", key); },
			views: function(key) { return lookup.call(this, "views", key); }, 
			presenters: function(key) { return lookup.call(this, "presenters", key); },
			transitions: function(fromKey, toKey) { var from = lookup.call(this, "transitions", fromKey); if(!from) { return; } return from[toKey]; },
			services: function(key) { return lookup.call(this, "services", key); },
			windows: function(key) { return lookup.call(this, "windows", key); },
			shell: function() { return this.full["shell"]; }, 
			htmlLoaders: function(key) { return lookup.call(this, "htmlLoaders", key); }
		};
	})();
	
    /* application */
    $.air.application = function(partial){ 
		this.def = new $.air.appDefinition(partial);
		
        this.init();
    };
    $.air.application.prototype = (function(){
		//Private methods    
		
		//Private events  
		
        return { 
            //Initialization - events added/disposed
            toString: function(){ return "$.air.application"; },
            init: function() {  
                //custom fx loading?     
				
				var Shell = this.def.shell();    
				this.shell = new Shell(this.def);  
            }
        };
    })();

	/* mvp */
    $.air.mvp = function(definition) { return new $.air.application(definition); };
	
})(jQuery); 
