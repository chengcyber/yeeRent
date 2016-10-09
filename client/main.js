// import { ReactiveVar } from 'meteor/reactive-var';


import './main.html';

/**
 * Declarations
 */
var centerMarker,
    geoCoder,
    citySearch,
    currentCity,
    auto,
    placeSearch,
    poiMarkers = [],
    arrivalRange,
    polygon,
    houseMarkers = [];

/**
 * Sessions
 */
Session.setDefault('isChanged',false);
Session.setDefault('slider', 30);
Session.setDefault('policy', 'BUS,SUBWAY');

Meteor.startup(() => {
  console.log('startup:call amap load');
  AmapAPI.load({
    plugin: 'AMap.ArrivalRange,AMap.Autocomplete,AMap.Geocoder,AMap.CitySearch,AMap.PlaceSearch',
  });
});

/**
 * helpers
 */
Template.mapApp.helpers({
  time: function() {return Session.get('slider');}
});

/**
 * Render
 */

Template.mapApp.onRendered(function() {
  var self = this;
  self.autorun(function(c) {
    if (AmapAPI.loaded()) {

      initAutoComplete();
      initCitySearch();
      initSilder();
      initContextMenu();

      c.stop();
    }
  });
});


/**
 * Functions
 */
function initCitySearch() {
  citySearch = new AMap.CitySearch();
  console.log('citySearch created');
  citySearch.getLocalCity(function(stat, res) {
    if (stat === 'complete' && res.info === 'OK') {
      if (res && res.city) {
        currentCity = res.city;
        auto.setCity(currentCity);
        placeSearch.setCity(currentCity);
        console.log('city search successful');
      }
    } else {
      console.log('city search failed');
      console.log(res.info);
    }

    // initAutoComplete();
  });
}

function initAutoComplete() {
  /*
   * create autocomplete
   */
  auto = new AMap.Autocomplete({
    input : 'addr',
    city: currentCity,
    cityLimit: true
  });
  placeSearch = new AMap.PlaceSearch({
    // map: AmapAPI.map,
    city: currentCity,
    cityLimit: true
  });
  /* bind to select */
  AMap.event.addListener(auto, "select", function(e) {
    clearCenterMarker();
    // markAddrPosition(e.poi.name);
    placeSearch.setCity(currentCity);
    placeSearch.search(e.poi.name, function(stat, res, poiList) {
      if (stat === 'complete' && res.info === 'OK') {
        // search call back
        console.log('placeSearch successful');
        if (res.poiList) {
          console.log(res.poiList);
          var pois = res.poiList.pois;
          pois.forEach(function(item, index, arr) {
            // console.log(item);
            // mark result pois
            var poiMarker = new AMap.Marker({
              map : AmapAPI.map,
              title: item.name,
              extData: {
                '名称': item.name,
                '地址': item.address,
                '电话': item.tel
                // '类型': item.type
              },
              position: item.location
            });
            poiMarkers.push(poiMarker);
            // bind click event to marker
            AMap.event.addListener(poiMarker, 'click', _markerInfoWindow);
          });
          // sole result, mark it automatically
          if (poiMarkers.length === 1) {
            addCenterMarker(poiMarkers[0].getPosition());
          }
          AmapAPI.map.setFitView();
        }
      } else {
        // search failed.
        console.log('placeSearch failed');
      }
    });
  });

}

/**
 * show info window when click poimarkers
 * @param  {[Object]} e [event]
 */
function _markerInfoWindow(e){
  // create info window
  var infoWin = new AMap.InfoWindow({
    offset: new AMap.Pixel(0, -30)
  });
  // handle content
  var contentArr = _.map(e.target.getExtData(), function(value, key) {
    if (value) {return key + ': ' + value;}
  });
  // filter if useless data (ex. tel : '')
  contentArr = contentArr.filter(function(n) {return n;});
  // add button for mark
  contentArr.push('<button class="btn-setCenterMarker js-setCenterMarker">设置标记</button>');
  infoWin.setContent(contentArr.join('<br/>'));
  var position = e.target.getPosition();
  infoWin.open(AmapAPI.map, position);
  Session.set('curPosition', position);
}

/**
 * unbindPoiMarkers if mark is done, unbind all event to pois, prepare for clear them
 */
function unbindPoiMarkers() {
  poiMarkers.forEach(function(item, index, arr) {
    AMap.event.removeListener(item, 'click', _markerInfoWindow);
  })
}

/**
 * ADDR -> lnglat
 * @param  {[string]} addr
 * @return {[lnglat]} lnglat
 */
function markAddrPosition(addr) {
  // create geoCoder
  geoCoder = new AMap.Geocoder({
    city: currentCity,
  });
  console.log('geoCoder created');

  console.log(addr);
  geoCoder.getLocation(addr, function(status, result) {
    if (status === 'complete' && result.info === 'OK') {
      console.log(result.geocodes);
    } else {
      console.log('getLocation failed');
    }
  })
}

/**
 * initialize context menu
 */
function initContextMenu() {
  /*
   * create contextmenu
   */
  var mapContextMenu = new AMap.ContextMenu();
  mapContextMenu.addItem('设置标记', function(e){
    unbindPoiMarkers();
    addCenterMarker(mapContextMenuPositon);
  }, 0);
  /**
   * bind contextmenu to rightclick
   */
  AmapAPI.map.on('rightclick', function(e){
    mapContextMenu.open(AmapAPI.map, e.lnglat);
    mapContextMenuPositon = e.lnglat;
  });
}

/**
 * init ryc:silder
 */
function initSilder() {
  self.$('#single-slider').noUiSlider({
    start: Session.get("slider"),
    connect: 'lower',
    range: {
      min: 1,
      max: 60
    }
  }).on('slide', function (ev, val) {
  // set real values on 'slide' event
    Session.set('slider', Math.round(val));
    // console.log(Math.round(Session.get('slider')));
  }).on('change', function (ev, val) {
    // round off values on 'change' event
    // Session.set('slider', [Math.round(val[0]), Math.round(val[1])]);
  });
}

/**
 * add Center Marker
 * @param position new AMap.LngLat(116.39,39.9) or [116.39,39.9]
 */
function addCenterMarker(position){
  clearCenterMarker();
  centerMarker= new AMap.Marker({
    map: AmapAPI.map,
    animation: 'AMAP_ANIMATION_DROP',
    position: position
  });
  // console.log(AmapAPI.map.getAllOverlays());
}

function clearCenterMarker(){
  // clear placesearch result
  placeSearch.clear();
  // clear map
  AmapAPI.map.clearMap();

  //clear the only centerMarker
  if(centerMarker){
    centerMarker.setMap(null);
  }
}

  //添加多边形覆盖物
function showArrivalRange() {

  arrivalRange = new AMap.ArrivalRange();
  console.log(centerMarker);
  console.log(Session.get('slider'));
  console.log(Session.get('policy'));
  if (!centerMarker) {
    console.log('NO marker now');
    return;
  }
  arrivalRange.search(centerMarker.getPosition(), Session.get('slider'), function(stat, res) {
    if (stat === 'complete' && res.info === 'OK') {
      console.log('arrivalRange successful');
      clearArrivalRange();
      if (res.bounds) {
        var polygonArr = _.flatten(res.bounds, true);
        polygon = new AMap.Polygon({
          path: polygonArr,
          map: AmapAPI.map,
          fillColor: '#3366FF',
          fillOpacity: '0.4',
          strokeColor: '#00FF00',
          strokeOpacity: '0.5',
          strokeWeight: 1
        });
        AmapAPI.map.setFitView();
      }
    } else {
      console.log('arrivalRange failed');
      console.log(stat);
      console.log(res.info);
    }
  }, {
    policy: Session.get('policy')
  });
}

function clearArrivalRange(){
  if (polygon) {
    polygon.setMap(null);
  }
}


  // showArrivalRange();
  // window.setInterval(function(){//防止在移动滑动条时频繁触发请
  //         if(isChanged){
  //            showArrivalRange();
  //            isChanged=false;
  //        }
  // },1000)


/**
 * EVENT
 */
Template.mapApp.events({
  'click .js-setCenterMarker': function(e) {
    unbindPoiMarkers();
    addCenterMarker(Session.get('curPosition'));
  },
  'click .js-showArrivalRange': function(e) {
    showArrivalRange();
    e.preventDefault()
  },
  'click .js-clearArrivalRange': function(e) {
    clearArrivalRange();
    e.preventDefault();
  },
  'change .js-changePolicySelect': function(e){
    Session.set('policy', $(e.target).find('option:selected').attr('value'));
    // console.log(Session.get('policy'));
  }
});
