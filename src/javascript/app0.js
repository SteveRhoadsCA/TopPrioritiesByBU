Ext.define("TopPriorities", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'search_filters',tpl:'Hello, <tpl>{_refObjectName}</tpl>'},
        {xtype:'container',itemId:'display_box'}
    ],

    integrationHeaders : {
        name : "TopPriorities"
    },

    launch: function() {
        var me = this;
        this.model = "PortfolioItem/SolutionEpic";
        this.compliance = "";
        this.state_filters = "";

        this._doLayout();
    },
    _doLayout: function(){
      this.down('#search_filters').add({
        xtype: 'container', // define top row container for filters/pulldowns
        layout: {
          type: 'hbox',
          width: '300px'
          },
          items: [
            {xtype: "rallyportfolioitemtypecombobox",
              padding: 5,
              itemId: 'cbPortfolioItemType',
              storeConfig: {
                filters: Rally.data.wsapi.Filter.or(
                 [
                   {property:'TypePath',operator:'=',value:'PortfolioItem/SolutionEpic'},
                   {property:'TypePath',operator:'=',value:'PortfolioItem/PortfolioEpic'},
                 ]
                )
                },
                listeners: {
                  change: this._onTypeChange,
                  scope: this
                  }
                },
            {xtype: 'rallyfieldvaluecombobox',
              fieldLabel: 'Compliance:',
              id: 'cbCompliance',
              labelAlign: 'right',
              model: this.model,
              field: 'Compliance',
              allowClear: true,
              padding: 5,
              listeners: {
                change: this._onComplianceChange,
                scope: this
                }
               },
            {xtype: 'rallyfieldvaluecombobox',
              fieldLabel: 'State:',
              id: 'piState',
              labelAlign: 'right',
              model: this.model,
              field: 'State',
              multiSelect: true,  // changing to a multi-select
              valueField: 'Name',
              padding: 5,
              listeners: {
                ready: function(cb){
                  cb.setValue([]); // prevents the "No Entry" from auto-selecting
                },
                change: this._onStateChange,
                scope: this
                }
              }
      ],
      });

      // chain to next function
      this._getData();
    },
    _getData: function(){
      var me = this;
      var model_name = 'PortfolioItem/SolutionEpic',
          field_names = ['Name','State','Project','PreliminaryEstimate','RefinedEstimate'];

      this.setLoading("Loading stuff...");

      this._loadAStoreWithAPromise(model_name, field_names).then({
          scope: this,
          success: function(store) {
              this._displayBoard(store,field_names);
          },
          failure: function(error_message){
              alert(error_message);
          }
      }).always(function() {
          me.setLoading(false);
      });
    },
    _loadAStoreWithAPromise: function(model_name, model_fields){
      console.log("1. Model_name=",model_name, " Fields: ", model_fields);

        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        this.logger.log("Starting load:",model_name,model_fields);

        Ext.create('Rally.data.wsapi.Store', {
            model: model_name,
            fetch: model_fields
        }).load({
            callback : function(records, operation, successful) {
                if (successful){
                    deferred.resolve(this);
                } else {
                    me.logger.log("Failed: ", operation);
                    deferred.reject('Problem loading: ' + operation.error.errors.join('. '));
                }
            }
        });
        return deferred.promise;
    },
    _onTypeChange: function( cb, newValue, oldValue, eOpts ){
			console.log("_onTypeChange(old,new,modelname): ",oldValue, newValue, cb.getRecord().get('TypePath'));
			this.model = cb.getRecord().get('TypePath');
			//this._createGridBoard(this.model);
		},
		_onComplianceChange: function( cb, newValue, oldValue, eOpts ){
			console.log("_onComplianceChange(old,new): ",oldValue, newValue);
      this.compliance = newValue;
			//this._createGridBoard(this.model);
		},
		_onStateChange: function( cb, newValue, oldValue, eOpts ){
			console.log("_onStateChange: ",oldValue, newValue);
      this.state_filters = newValue;
			//this._createGridBoard(this.model);
		},
    _getQueryFilter: function() {
			var me = this;

			var queries = [];
      // Save filters?
      // state_filters is an array, but can be empty
      var _state_filters = _.map(me.state_filters,function(state_value){
        if (state_value === ""){
          state_value = null;
        }
        return {property:"State",value:state_value};
      });

      // if the array is empty or just one, we don't need an OR
      if (_state_filters.length > 0){
        if (_state_filters.length > 1){
          _state_filters = Rally.data.wsapi.Filter.or(_state_filters);
        }
        if (_state_filters.length === 1){
          _state_filters = Ext.create('Rally.data.wsapi.Filter',_state_filters[0]);
        }
        console.log("_getQueryFilter: ", _state_filters.toString());
        queries.push(_state_filters);
      }
      // Compliance is a Drop-down list (should be a Boolean).
      // the current valid values are: "Yes", "No"
      var compliance_filter = "";
      switch(me.compliance){
        case "Yes":
          compliance_filter = "(Compliance = \"" + me.compliance + "\")";
          break;
        case "No":
          compliance_filter = "(Compliance = \"" + me.compliance + "\")";
          break;
        default:
      }
      if (compliance_filter != ""){
        queries.push(Rally.data.QueryFilter.fromQueryString(compliance_filter));
      }

      // get the query from the App Settings
			if(me.getSetting('query')) {
				queries.push(Rally.data.QueryFilter.fromQueryString(me.getSetting('query')));
			}
      if (queries.length > 1){
        return Rally.data.wsapi.Filter.and(queries);
      }
      console.log("_getQueryFilter(queries): ", queries);
			return queries;
		},
    _getBusinessUnitProjects: function() { //function(model,filters)
      var me = this;
			Ext.create('Rally.data.WsapiDataStore', {
				model: 'Project',
				autoLoad: true,
				fetch: ['Name', 'ObjectID'],
				filters: [{ // all of the direct child projects of the current context
					property: 'Parent.ObjectID',
					value: this.getContext().getProject().ObjectID
				}],
				listeners: {
					load: this._onBusUnitProjectLoad,
					scope: this
				}
			});
		},
    _onBusUnitProjectLoad: function(store, data) {
      var me = this;

      var hdrTmp = me._getHdrTemplate();
      var context = me.getContext();
      var pcolumns = [];
      // Check to see if parent needs to be included as a column
      if (me.getSetting('showParent') === true) {
        pcolumns.push({
          xtype: 'rallycardboardcolumn',
          value: "/project/" + me.getContext().getProject().ObjectID,
          columnHeaderConfig: {
            headerTpl: 'PARENT: {project}',
            headerData: {
              project: me.getContext().getProject().Name
            }
          }
        });
      } // end of: getScopedProject (in addition to its children)
      // Load direct children projects into (Business Unit/Project) column array
      Ext.Array.each(data, function(busUnitProj) {
        // COUNT Team (Leaf) PROJECTS
        console.log("BusUnitProject:", busUnitProj.get('_refObjectName'));
        // set data for the BusUnit column header tpl (template)
        var width = 90;
        var pdone = Math.random();
        var progress = pdone * width;
        pdone = parseInt(pdone * 100) + '%';

        pcolumns.push({
          xtype: 'rallycardboardcolumn',
          value: "/project/" + busUnitProj.get('ObjectID'),
          columnHeaderConfig: {
            headerTpl: hdrTmp,
            headerData: {
              project: busUnitProj.get('Name'),
              pdone:	pdone,
              width: width,
              progress: progress //,
              // teamCount: childTeamCount
            }
          }
        });
      });

      var piModels = [];
      piModels.push(me.model);
      // sr this.getStore(pcolumns, piModels);
    },

    _displayBoard: function(store,field_names){
        var me = this;
        this.down('#display_box').add({
            xtype: 'rallycardboard',
            store: store,
            columnCfgs: field_names
        });
    },

    _loadWsapiRecords: function(config){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        var default_config = {
            model: 'PortfolioItem/SolutionEpic',
            fetch: ['ObjectID']
        };
        this.logger.log("Starting load:",config.model);
        Ext.create('Rally.data.wsapi.Store', Ext.Object.merge(default_config,config)).load({
            callback : function(records, operation, successful) {
                if (successful){
                    deferred.resolve(records);
                } else {
                    me.logger.log("Failed: ", operation);
                    deferred.reject('Problem loading: ' + operation.error.errors.join('. '));
                }
            }
        });
        return deferred.promise;
    },
    getSettingsFields: function() {
			var values = [
			{
					xtype: 'rallynumberfield',
					margin: '0 0 0 0',
					labelWidth: 50,
					fieldLabel: 'Max Number of Items:',
					name: 'iMax'
				},
				{
					xtype: 'rallycheckboxfield',
					margin: '0 0 0 0',
					labelWidth: 200,
					fieldLabel: 'Show Scoped Project:',
					name: 'showParent'
				},
				{
					xtype: 'label',
					forId: 'myFieldId4',
					text: 'Swimlanes:',
					margin: '0 0 0 0'
				},
				{
					xtype: 'rallyradiofield',
					fieldLabel: 'Expedite',
					margin: '0 0 0 20',
					name: 'Swimlane',
					inputValue: 'Expedite'
				},
				{
					xtype: 'rallyradiofield',
					fieldLabel: 'Compliance',
					margin: '0 0 0 20',
					name: 'Swimlane',
					inputValue: 'Compliance'
				},
				{
					xtype: 'rallyradiofield',
					margin: '0 0 15 20',
					fieldLabel: 'None',
					name: 'Swimlane',
					inputValue: ''
				},
				{
					type: 'query'
				}
			];
			return values;
		},
		config: {
			defaultSettings: {
        iMax: 5,      // top x items in rank order
				Swimlane: 'None', // no swimlane
				incPE: false,  // include PortfolioEpics
				incSE: true, // include SolutionEpics
				incF: false,  // include Features
				showParent: false // include the starting project folder in columns
			}
		},
    _getHdrTemplate: function(){ // for templates in cardboard columns s
      var col_hdr_template = '<strong>{project}</strong><br/>';
      //col_hdr_template += '<div class="progress-bar-container field-calc" style="';
      //col_hdr_template += ' top: 50px; background-color: gray; width: {width}%; height: 20px; line-height: 20px; display: inline-block">';
      //col_hdr_template += '<div class="rly-progress-bar" style="background-color: blue; width: {progress}%; "></div>';
      //col_hdr_template += '<div class="progress-bar-label">';
      //col_hdr_template += '{pdone}';
      //col_hdr_template += '</div>';
      //col_hdr_template += '</div>'
      //col_hdr_template += '<div>Teams: {teamCount}</div>';
      return col_hdr_template;
    },

    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },

    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },

    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    }

});
