// import { ReactiveVar } from 'meteor/reactive-var';


import './main.html';

Meteor.startup(() => {
  console.log('startup:call amap load');
  AmapAPI.load({plugin: 'AMap.ArrivalRange'});
});

/**
 * helpers
 */
Template.mapApp.helpers({
  time: function() {return Math.round(Session.get('slider'))}
});

/**
 * Render
 */

Template.mapApp.onRendered(function() {
  var self = this;
  self.autorun(function(c) {
    if (AmapAPI.loaded()) {
      // AmapAPI.map.on('click', function(e) {
      //       var lngX=$("#lngX");
      //       var latY=$("#latY");
      //       lngX.val(e.lnglat.getLng());
      //       latY.val(e.lnglat.getLat());
      //       addCenterMarker(e.lnglat.getLng(),e.lnglat.getLat());
      //       // addPolygon();
      // });

      /*
       * create contextmenu
       */
      var centerMarker = null;
      var mapContextMenu = new AMap.ContextMenu();
      mapContextMenu.addItem('Add Location', function(e){
        // console.log(centerMarker !== null);
        if(centerMarker !== null){
          centerMarker.setMap(null);
        }
        centerMarker = new AMap.Marker({
            map: AmapAPI.map,
            position: mapContextMenuPositon
        });
      }, 0);
      /**
       * bind contextmenu to rightclick
       */
      AmapAPI.map.on('rightclick', function(e){
        mapContextMenu.open(AmapAPI.map, e.lnglat);
        mapContextMenuPositon = e.lnglat;
      });

      /**
       * [arrivalRange description]
       * @type {AMap} Amap Object
       */
      var arrivalRange = new AMap.ArrivalRange(), x, y, t, v,centerMarker,polygonArray=[];
      Session.set('isChanged',false);
      Session.set("slider", 60);
      self.$('#single-slider').noUiSlider({
        start: Session.get("slider"),
        connect: 'lower',
        range: {
          min: 1,
          max: 100
        }
      }).on('slide', function (ev, val) {
      // set real values on 'slide' event
        Session.set('slider', val);
        // console.log(Math.round(Session.get('slider')));
      }).on('change', function (ev, val) {
        // round off values on 'change' event
        // Session.set('slider', [Math.round(val[0]), Math.round(val[1])]);
      });

      c.stop();
    }
  });
});


/**
 * Functions
 */
function addCenterMarker(x,y){
  if(typeof centerMarker !== null){
    centerMarker.setMap(null);
  }
  centerMarker= new AMap.Marker({
    map: AmapAPI.map,
    position: [x,y]
  });
}


  //添加多边形覆盖物
function addPolygon() {
    x=$("input[name='x']").val();
    y=$("input[name='y']").val();
    t=$("#t").val();
    v=$("#v").val();
    addCenterMarker(x,y);
    arrivalRange.search([x,y],t, function(status,result){
        delPolygon();
        if(result.bounds){
            for(var i=0;i<result.bounds.length;i++){
               var polygon = new AMap.Polygon({
                    map:map,
                    fillColor:"#3366FF",
                    fillOpacity:"0.4",
                    strokeColor:"#00FF00",
                    strokeOpacity:"0.5",
                    strokeWeight:1
                });
                polygon.setPath(result.bounds[i]);
                polygonArray.push(polygon);
            }
            map.setFitView();
        }
    },{
        policy:v
    });
}
  //
  // function delPolygon(){
  //     map.remove(polygonArray);
  //     polygonArray=[];
  // }
  //

  // addPolygon();
  // window.setInterval(function(){//防止在移动滑动条时频繁触发请
  //         if(isChanged){
  //            addPolygon();
  //            isChanged=false;
  //        }
  // },1000)
