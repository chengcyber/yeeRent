var setting = Meteor.settings.public.amapKey;
if (!setting) {
  console.log('error', 'Please Add amap setting');
}
/**
 * export AmapAPI
 * inspired by dburles/meteor-google-maps
 */
AmapAPI = {
  load : _.once(function(options) {
    console.log('loading...');
    options = _.extend({v : 1.3, key: setting}, options);
    var params = _.map(options, function(value, key) {return key + '=' + value;}).join('&');
    var script = document.createElement('script');
    // script.type = 'text/javascript';
    script.src = 'http://webapi.amap.com/maps?' + params + '&callback=initialize';
    document.body.appendChild(script);
    console.log('script appended');
  }),

  _loaded: new ReactiveVar(false),

  loaded: function() {
    return this._loaded.get();
  },

  initialize: function() {
    console.log('initializing');
    this._loaded.set(true);
    console.log('loaded');
    _.each(this.utilityLibraries, function(path) {
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = path;
      document.body.appendChild(script);
    });
    // this.create();
  },

  utilityLibraries: [],

  loadUtilityLibrary: function(path) {
    this.utilityLibraries.push(path);
  },

  create: function(el) {
    var self = this;
    self.map = new AMap.Map(el, {
      zoom:12
      // center: [116.397428, 39.90923]
    });
    self.map.plugin(["AMap.ToolBar"], function() {
      self.map.addControl(new AMap.ToolBar());
    });
    // self.map.on('click', function(){console.log('hello')});
  },

  map:{}

};

Template.gaodeMap.onRendered(function() {
  var self = this;
  self.autorun(function(c) {
    console.log('gaode wait for loaded');
    if (AmapAPI.loaded()) {
      AmapAPI.create('map-canvas');
      console.log('create amap successful');
      c.stop();
    }
  });
});
