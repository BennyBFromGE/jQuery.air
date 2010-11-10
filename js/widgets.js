
	
	
    
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