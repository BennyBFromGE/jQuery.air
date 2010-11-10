
	
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