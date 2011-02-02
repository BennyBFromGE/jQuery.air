
;( function (A,$) {
    A.ui = {};
	
	$.widget("ui.modelForm", { 
		options: { 
			disabled: false
		}, 
		_create: function(){
			var self = this, 
				options = self.options;
				
				
		},
		destroy: function() {
		
			$.Widget.prototype.destroy.call( this );
		},
		_setOption: function( key, value ) {
			$.Widget.prototype._setOption.apply( this, arguments );
			if ( key === "source" ) {
				this._initSource();
			} 
		},
		_initSource: function() { 
			var self = this,
				array,
				url;
				
			if ($.isArray(this.options.source)) {
				array = this.options.source;
				this.source = function( request, response ) {
					response( $.ui.autocomplete.filter(array, request.term) );
				};
			} else if ( typeof this.options.source === "string" ) {
				url = this.options.source;
				this.source = function( request, response ) {
					if (self.xhr) {
						self.xhr.abort();
					}
					self.xhr = $.ajax({
						url: url,
						data: request,
						dataType: "json",
						success: function( data, status, xhr ) {
							if ( xhr === self.xhr ) {
								response( data );
							}
							self.xhr = null;
						},
						error: function( xhr ) {
							if ( xhr === self.xhr ) {
								response( [] );
							}
							self.xhr = null;
						}
					});
				};
			} else {
				this.source = this.options.source;
			}
		}
	});
    
	/* Form */
//    A.ui.Form = function(config){
//        A.ui.Widget.call(this, config);
//    };
//    A.ui.Form.prototype = new A.ui.Widget();
//    A.ui.Form.prototype.constructor = A.ui.Form;
//    A.ui.Form.prototype.toString = function(){
//        return "$.air.widgets.Form";
//    };
//    A.ui.Form.prototype.build = function(){
//		this.el = this.view.get(this.config.id);
//    };
//    A.ui.Form.prototype.populate = function(model){
//        var view = this.view;
//        $.each(model, function(key, value){
//			if (!$.isFunction(value)) {
//				var el = view.get(key);
//				if (el) {
//					var nodeName = el.nodeName.toLowerCase();
//					switch (nodeName) {
//						case "img":
//							break;
//							case "td":
//							case "th":
//							case "label":
//							case "span":
//							case "div":
//							$(el).html(value);
//						default:
//							$(el).val(value);
//							break;
//					}
//				}
//			}
//        });
//    };
//    A.ui.Form.prototype.read = function(model){
//        var view = this.view, obj = {};
//        $.each(model, function(key, value){
//			if ($.isFunction(value)) {
//				obj[key] = value;
//			}
//			else {
//				obj[key] = ""; 
//				var el = view.get(key);
//				if (el) {
//					var nodeName = el.nodeName.toLowerCase();
//					switch (nodeName) {
//						case "img":
//							break;
//						default:
//							obj[key] = $(el).val();
//							air.trace(key);
//							break;
//					}
//				}
//			}
//        });
//		
//		return obj;
//    };  

	$.widget("ui.video", { 
		options: { 
		
		},
		
		_create: function() { 
			var self = this,
				options = self.options;
				
		},
		 
		destroy: function() { 
			this.element.unbind();
		
			$.Widget.prototype.destroy.call( this );
		},
		
		_setOption: function( key, value ) {
			$.Widget.prototype._setOption.apply( this, arguments );
			
			switch(key) {
				
			} 
		}
	});


	$.widget("ui.audio", { 
		options: {
			disabled: false,
			length: 0, 
			position: 0,
			volume: 100, 
			url: ""
		}, 
		
		_create: function() {
			var self = this,
				options = self.options;
				
			self.transform = new air.SoundTransform(1, 0);
			
			//add header
			self.header = $('<span id="audio.header"></span>')
				.appendTo(this.element)
				.addClass("ui-widget-header ui-corner-all");
			
			//add artist info display
			self.info = $('<div id="audio.info"></div>')
				.appendTo(this.element)
				.addClass("ui-widget-content");
			
			//add progress slider 
			self.durationSlider = $("<div></div>")
				.appendTo(this.element)
				.addClass("duration")
				.slider( { 
					min: 0, 
					max: options.length,
					value: options.position, 
					
					change: function(e, ui) {
						
					}
				}); 
				
			//add toolbar
			self.toolbar = 
				$("<span></span>")
					.appendTo(this.element)
					.addClass("ui-widget-header ui-corner-all");
					 

			$('<button id="audio.beginning"></button>')
				.appendTo(this.toolbar)
				.button({
					text: false,
					label: "beginning",
					icons: { primary: "ui-icon-seek-start" }
				});
						
			$('<button id="audio.rewind"></button>')
				.appendTo(this.toolbar)
				.button({
					text: false,
					label: "rewind",
					icons: { primary: "ui-icon-seek-prev" }
				});
			
			$('<button id="audio.play"></button>')
				.appendTo(this.toolbar)
				.button({
					text: false,
					label: "play", 
					icons: { primary: "ui-icon-play" }
				});
			
			$('<button id="audio.stop"></button>')
				.appendTo(this.toolbar)
				.button({
					text: false,
					label: "stop", 
					icons: { primary: "ui-icon-stop" }
				});
					
			$('<button id="audio.forward"></button>')
				.appendTo(this.toolbar)
				.button({
					text: false,
					label: "forward", 
					icons: { primary: "ui-icon-seek-next" }
				});
					
			$('<button id="audio.end"></button>')
				.appendTo(this.toolbar)
				.button({
					text: false,
					label: "end",
					icons: {
						primary: "ui-icon-seek-end"
					}
				}); 

			self.toolbar.bind("click.audio", function(e) {
				var target = $(e.currentTarget);	
				
				if(!target.hasClass("ui-button")) { return; }
				
				var action = target.text();
				switch(action) { 
					case "beginning":
					break;
					case "rewind":
					break;
					case "play":
					
					target
						.button( "option", {
							label: "pause",
							icons: { primary: "ui-icon-pause" }
						});
					break;
					case "pause":
					
					target
						.button( "option", {
							label: "play",
							icons: { primary: "ui-icon-play" }
						});
					break;
					case "stop":
					
					$("#audio.play")
						.button("option", {
							label: "play",
							icons: { primary: "ui-icon-play" }
						});
					
					break;
					case "forward":
					break;
					case "end":
					break;
				}
			}); 
		},
		destroy: function() { 
			this.header.remove();
			
			this.info.remove();
		
			this.toolbar.unbind();
			this.toolbar.remove();
			
			this.element.unbind("audio");
		
			$.Widget.prototype.destroy.call( this );
		},

		hasChannel: function() {
			return !!this.channel;
		}, 
		adjustVolume: function(percent){  
			this._setOption("volume", percent);
			return this;
		},
		stop: function() {  
			this._stop(); 
			
			return this;
		},
		pause: function() {  
			this._stopChannel();

			if(this.hasChannel()) {
				this._setOption("position", this.channel.position);	
			}
			
			return this;
		},
		play: function(url) { 
			this._setOption("url", url);
			this._setOption("position", 0);

			return this;
		},
		
		skipTo: function(pos) { 
			this._setOption("position", pos);
			return this;
		}, 
		
		_setOption: function( key, value ) {
			if (key === "length") {
				this.options.length = value;
				this._refreshLength();
				
			} else if(key === "position") {
				this.options.position = value;
				this._refreshPosition();

				if (this._position() === this.options.length ) {
					this._trigger("complete");
				}
			} else if(key === "volume") {
				this.options.volume = value;
				this._refreshVolume();
			} else if(key === "url") {
				this.options.url = value; 
				
				this._killChannel();
				this._play();
			}
			
			$.Widget.prototype._setOption.apply( this, arguments );
		}, 
		
		_refreshVolume: function() { 
			this.transform.volume = this.options.volume;
			
			if (!this.hasChannel()) { return; } 
					
			this.channel.soundTransform = this.transform;		
		},  
		
		_refreshLength: function() {
			this.durationSlider.slider({min:0, max: this.options.length, value: this.options.position});
		}, 
		
		_position: function() {
			var pos = this.options.position;
			
			return pos;
		}, 
		
		_movePosition: function() {
			if(!this.sound) { return; }

			this._stopChannel();
			this._startChannel();
			
			this.durationSlider.slider("value", this.options.position);
			
			this._trigger("skip", { channel: this.channel, sound: this.sound });
		}, 
		
		_refreshPosition: function() { 
			if (!this.hasChannel()) { return; } 
			
			this.durationSlider.slider("value", this.options.position);
			
			var playbackPercent = 100 * (this.channel.position / this.sound.length); 
			if (playbackPercent > 99.7) {
				this._onSoundFinished();				
			} else {
				this._trigger("progress", { channel: this.channel, sound: this.sound }); 
			}	
		}, 
		
		_play: function() {
			this._stop();	

			var url = this.options.url, 
				req = new air.URLRequest(url);
			
			this.sound = new air.Sound();
			this.sound.addEventListener(air.Event.SOUND_COMPLETE, $.proxy(this._onSoundFinished, this));						
			this.sound.addEventListener(air.Event.COMPLETE, $.proxy(this._onSoundLoad, this));			
			this.sound.addEventListener(air.Event.ID3, $.proxy(this._onID3Load, this));
			this.sound.load(req);
		}, 
		
		_stop: function() { 
			this._stopChannel();
		
			this.sound.removeEventListener(air.Event.SOUND_COMPLETE, $.proxy(this._onSoundFinished, this));
			this.sound.removeEventListener(air.Event.COMPLETE, $.proxy(this._onSoundLoad, this));
			this.sound.removeEventListener(air.Event.ID3, $.proxy(this._onID3Load, this));	 
		}, 

		_startChannel: function() { 
			var self = this;
			
			this.soundInterval = setInterval(function() { self._setOption("position", self._position() + 1); }, 1000);
			this.channel = this.sound.play(this._position());	
			this.channel.soundTransform = this.transform;		
		}, 

		_stopChannel: function() { 
			if (!this.hasChannel()) { return; } 
			
			clearInterval(this.soundInterval);
			 
		 	this.channel.stop();	
		},
		
		_killChannel: function() { 
			this._stopChannel();
					
			this.channel = null;  
		}, 
		
		_onSoundLoad: function() {
			this._setOption("length", this.sound.length);
			
			this._startChannel();

			this._trigger("load", { channel: this.channel, sound: this.sound }); 
		},
		_onSoundFinished: function() {
			this._trigger("complete");
		}, 
		_onID3Load: function(e) { 
			this.sound.removeEventListener(air.Event.ID3, $.proxy(this._onID3Load, this));		
			
			var info = e.target.id3;

			this._trigger("id3", { id3: info });
		}
	}); 
    
	/* List */
	$.widget("ui.modelList", { 
		options: {
			disabled: false, 
			circular: false, 
			template: function(item) { return item.toString(); }
		}, 
		
		_create: function() {
			var self = this,
				options = self.options;

			this.element
				.addClass("ui-list ui-widget ui-helper-reset")
				.bind("click.modelList", $.proxy(function(e) {
					var item = $(e.target).closest(".ui-list-item");
					if(!item.length) { return; }
					
					self.select(e);
				}, this));  
				
			this._initSource();
		
			this.response = function() { return self._response.apply( self, arguments ); };
		},
		destroy: function() { 
			this.element.unbind();
		
			$.Widget.prototype.destroy.call( this );
		},
		_setOption: function( key, value ) {
			$.Widget.prototype._setOption.apply( this, arguments );
			if ( key === "source" ) {
				this._initSource();
			}
		},
		
		_initSource: function() { 
			var self = this,
				data,
				url;
			if (typeof this.options.source === "string" ) {
				url = this.options.source;
				this.source = function( request, response ) {
					if (self.xhr) {
						self.xhr.abort();
					}
					self.xhr = $.ajax({
						url: url,
						data: request,
						dataType: "json",
						success: function( data, status, xhr ) {
							if ( xhr === self.xhr ) {
								response( data );
							}
							self.xhr = null;
						},
						error: function( xhr ) {
							if ( xhr === self.xhr ) {
								response( [] );
							}
							self.xhr = null;
						}
					});
				};
			} else {
				//todo: filter with request.term
				
				var data = this.options.source;
				this.source = function( request, response ) {
					response(data);
				};
			}
		}, 

		_response: function( content ) {
			if (content && content.length) { 
				this._render(content);
				
				this._trigger("open");
			} else {
				this.close();
			}
		},

		_render: function(items) { 
			var self = this,
				options = self.options;

			self.element.empty();
			$.each(items, function(index, item) { 
				var listItem = 
					$("<div></div>")
						.addClass("ui-list-item ui-helper-reset")
						.data( "item.modelList", item)
						.append(self._renderItem(item, options))
						.mouseenter(function( event ) {
							self.activate(event, $(this));
						})
						.mouseleave(function() {
							self.deactivate();
						});
				self.element.append(listItem);
			}); 

		},
		
		_renderItem: function(item, options) {
			var template = options.template(item);
			
			return $(template);
		},
		

		display: function() {
			this.source(null, this.response);
		}, 
		
		filter: function(callback) {
			this.element.find("div.ui-list-item").show().each(function() {
				var item = $(this);
				if(!callback(item)) { item.hide(); }
			});
		},

		activate: function(event, item) {
			this.deactivate();
			
			if (this.hasScroll()) {
				var offset = item.offset().top - this.element.offset().top,
					scroll = this.element.attr("scrollTop"),
					elementHeight = this.element.height();
				
				if (offset < 0) {
					this.element.attr("scrollTop", scroll + offset);
				} else if (offset >= elementHeight) {
					this.element.attr("scrollTop", scroll + offset - elementHeight + item.height());
				}
			}
			
			this.active = item.eq(0)
				.attr("id", "ui-active-listitem");
				
			this._trigger("focus", event, { item: this.active });
		},
	
		deactivate: function() {
			if (!this.active) { return; }

			this.active
				.removeAttr("id");
			
			this._trigger("blur");
			
			this.active = null;
		},
	
		next: function(e) {
			return this.move("next", ".ui-list-item:first", e);
		},
	
		previous: function(e) {
			return this.move("prev", ".ui-list-item:last", e);
		},
	
		first: function() {
			return this.active && !this.active.prevAll(".ui-list-item").length;
		},
	
		last: function() {
			return this.active && !this.active.nextAll(".ui-list-item").length;
		},
	
		move: function(direction, edge, e) { 
			if (!this.active) {
				this.activate(e, this.element.children(edge));
				return;
			}
			var next = this.active[direction + "All"](".ui-list-item").eq(0); 
			if (next.length) {
				this.activate(e, next);
			} else if(this.options.circular){
				this.activate(e, this.element.children(edge));
			} 
			
			this.highlight();
			
			return this.active;
		}, 
	
		hasScroll: function() {
			return this.element.height() < this.element.attr("scrollHeight");
		},
		
		highlight: function() {
			this.element.find("div.selected").removeClass("selected");
			this.active.addClass("selected");
		},
		
		find: function(value) {
			var self = this;
			
			this.element.children().each(function(index, item) {
				var $item = $(item);
				if($item.data("item.modelList").id == value.id) {
					self.activate(null, $item); 
				}
			});
			
			this.highlight();
		}, 
	
		select: function(e) {  
			this.highlight();
			this._trigger("select", e, { item: this.active });
		}
	}); 
	
}) (jQuery.air, jQuery);
	
	
    