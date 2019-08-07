Ext.define("TopPrioritiesByBU", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'search_filters',tpl:'Hello, <tpl>{_refObjectName}</tpl>'},
        {xtype:'container',itemId:'display_box'}
    ],

    integrationHeaders : {
        name : "template"
    },

    launch: function() {
        this.model = "PortfolioItem/SolutionEpic";
        this.compliance = "";
        this.state_filters = "";

        this._doLayout();
    },
    _doLayout:function(){
      var me = this;
      //this.down('#search_filters').update(this.getContext().getUser());
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
                  //ready: this._onPICombobox,
                  //change: this._onTypeChange,
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
                //ready: this._onPICombobox,
                //change: this._onComplianceChange,
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
                //ready: function(cb){
                //  cb.setValue([]); // prevents the "No Entry" from auto-selecting
                //},
                //change: this._onStateChange,
                scope: this
                }
              }
      ],
			});

      this._getData();
    },
    _getData:function(){
      var me = this;

      this.setLoading("Loading stuff...");

      var model_name = 'PortfolioItem/SolutionEpic',
          field_names = ['Name','State','PreliminaryEstimate','RefinedEstimate'];

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
    _loadWsapiRecords: function(config){
        var me = this;

        var deferred = Ext.create('Deft.Deferred');
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

    _loadAStoreWithAPromise: function(model_name, model_fields){
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

    _displayBoard: function(store,field_names){
        this.down('#display_box').add({
            xtype: 'rallycardboard',
            store: store,
            columnCfgs: field_names
        });
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
