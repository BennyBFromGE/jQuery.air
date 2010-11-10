



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