
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
	
	
    