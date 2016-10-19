// import { ReactiveVar } from 'meteor/reactive-var';
// import {Tracker} from 'meteor/tracker'

import './main.html';

/**
 * FlowRouter-BlazeLayout
 */
BlazeLayout.setRoot('body');

/**
 * DEBUG
 */
const DEBUG = true;

/**
 * Declarations
 */
var centerMarker,
    geoCoder,
    mapContextMenu,
    citySearch,
    currentCity = '上海市',
    auto,
    placeSearch,
    poiMarkers = [],
    arrivalRange,
    polygon,
    wherePositions = {},
    cnt_geoCoder = 0,
    totalGeoCoder = 0,
    houseInfoWin,
    houseMarkers = [],
    houseMarkerCluster,
    houseMarkerListners = [],
    routeTransfer;

/**
 * Sessions
 */
Session.setDefault('isChanged',false);
Session.setDefault('slider', 30);
Session.setDefault('policy', 'BUS,SUBWAY');
Session.setDefault('housesLoaded', false);
Session.setDefault('wherePositionsPrepared', false);
Session.setDefault('statusNow', '初始化...');

/**
 * SUBSCRIBE
 */

Meteor.subscribe('houses', {
  // skip: 9000,
  // limit: 3000
}, function() {
  Session.set('housesLoaded', true);
  if (DEBUG) {
    console.log('subscribe callback');
  }
  statusNow('加载房源数据完毕');

  if (AmapAPI.loaded()) {
    getAllwhere();
  }

});

/**
 * startup
 */
Meteor.startup(() => {

});

/**
 * helpers
 */
Template.mapApp.helpers({
  time: function() {return Session.get('slider');},
  btn_status: function() {
    return (Session.get('housesLoaded') && Session.get('wherePositionsPrepared'))?'btn-show':'btn-hide';
  },
  statusNow: function() {
    return Session.get('statusNow');
  }
});

/**
 * Render
 */
Template.mapApp.onRendered(function() {
  var self = this;
  self.autorun(function(c) {
    if (AmapAPI.loaded()) {
      statusNow('加载地图API完成');

      initSilder();

      initCitySearch();
      initAutoComplete();
      // initGeoCoder();
      initContextMenu();
      initMarkerCluster();


      c.stop();
    }
  });
});


/**
 * Functions
 */
function initCitySearch() {
  citySearch = new AMap.CitySearch();
  if (DEBUG) {
    console.log('citySearch created');
  }
  citySearch.getLocalCity(function(stat, res) {
    if (stat === 'complete' && res.info === 'OK') {
      if (res && res.city) {
        console.log('citySearch result: ', res.city);
        currentCity = res.city;
        auto.setCity(currentCity);
        placeSearch.setCity(currentCity);
        // if (geoCoder) {
        //   geoCoder.setCity(currentCity);
        // }
        if (DEBUG) {
          console.log('city search successful');
        }
      }
    } else {
      if (DEBUG) {
        console.log('city search failed');
        console.log(res.info);
      }
    }

    // citysearch callback -> get wherePositions
    if (Session.equals('housesLoaded', true)) {
      getAllwhere();
    }

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
    if (routeTransfer) {
      routeTransfer.clear();
    }
    // markAddrPosition(e.poi.name);
    placeSearch.setCity(currentCity);
    placeSearch.search(e.poi.name, function(stat, res, poiList) {
      if (stat === 'complete' && res.info === 'OK') {
        // search call back
        if (DEBUG) {
          console.log('placeSearch successful');
        }
        if (res.poiList) {
          // console.log(res.poiList);
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
        if (DEBUG) {
          console.log('placeSearch failed');
        }
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
  Session.set('centerMarkerPosition', position);
}
/**
 * unbindPoiMarkers if mark is done, unbind all event to pois, prepare for clear them
 */
function unbindPoiMarkers() {
  poiMarkers.forEach(function(item, index, arr) {
    // TO-DO according to the doc, maybe useless
    AMap.event.removeListener(item, 'click', _markerInfoWindow);
  })
}


/**
 * initialize geocoder
 */
function initGeoCoder() {
  // create geoCoder
  geoCoder = new AMap.Geocoder({
    city: currentCity,
  });
  if (DEBUG) {
    console.log('geoCoder created');
  }
}

/**
 * initialize context menu
 */
function initContextMenu() {
  /*
   * create contextmenu
   */
  mapContextMenu = new AMap.ContextMenu();
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
  }).on('change', function (ev, val) {
    // round off values on 'change' event
    // Session.set('slider', [Math.round(val[0]), Math.round(val[1])]);
  });
}

/**
 * [initMarkerCluster description]
 */
function initMarkerCluster() {
  AmapAPI.map.plugin(["AMap.MarkerClusterer"], function() {
      houseMarkerCluster = new AMap.MarkerClusterer(AmapAPI.map);
  });
}

/**
 * [initTransfer description]
 */
function initTransfer() {
  AmapAPI.map.plugin(["AMap.Transfer"], function() {
      var policy,curPolicy = Session.get('policy');
      if (curPolicy && curPolicy.search(/SUBWAY/i) < 0) {
        policy = AMap.TransferPolicy.NO_SUBWAY;
      } else {
        policy = AMap.TransferPolicy.LEAST_TIME;
      }
      routeTransfer = new AMap.Transfer({
        map: AmapAPI.map,
        city: currentCity,
        policy: policy,
        panel: 'transferResultPanel'
      });
      if (DEBUG) {
        // console.log(routeTransfer);
        console.log('routeTransfer created');
      }
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
    icon: 'http://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
    animation: 'AMAP_ANIMATION_DROP',
    position: position
  });
  // console.log(AmapAPI.map.getAllOverlays());
}

function clearCenterMarker(){
  // clear placesearch result
  placeSearch.clear();
  // clear map
  AmapAPI.map.remove(poiMarkers);

  //clear the only centerMarker
  if(centerMarker){
    centerMarker.setMap(null);
  }
}

  //添加多边形覆盖物
function showArrivalRange() {

  arrivalRange = new AMap.ArrivalRange();
  if (DEBUG) {
    console.log(centerMarker);
    console.log(Session.get('slider'));
    console.log(Session.get('policy'));
  }
  if (!centerMarker) {
    if (DEBUG) {
      console.log('NO marker now');
    }
    statusNow('未设置标记,请重试.');
    return;
  }
  arrivalRange.search(centerMarker.getPosition(), Session.get('slider'), function(stat, res) {
    if (stat === 'complete' && res.info === 'OK') {
      if (DEBUG) {
        console.log('arrivalRange successful');
      }
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
      if (DEBUG) {
        console.log('arrivalRange failed');
        console.log(stat);
        console.log(res.info);
      }
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

function showHouseMarkersCluster() {
  var houses = HouseColl.find().fetch();
  clearHouseMarkersCluster();
  var whereMarked = {};
  houses.forEach(function(item, index, arr) {
    var where = item.where;
    if (!wherePositions[where]) return;
    var extDataObj = {
      title: item.title,
      link: item.link,
      rooms: item.rooms,
      area: item.area,
      price: item.price
    }
    // check houseMarker of somewhere
    if (!whereMarked.hasOwnProperty(where)) {
      var hsMarker = new AMap.Marker({
        map: AmapAPI.map,
        title: where,
        topWhenMouseOver: true,
        extData: [
          extDataObj
        ],
        position: wherePositions[where]
      });
      // store the index of each houseMarker
      whereMarked[where] = houseMarkers.length;
      houseMarkers.push(hsMarker);
      houseMarkerCluster.addMarker(hsMarker);
      //unbind events
      houseMarkerListners.push(AMap.event.addListener(hsMarker, 'click', _markerHouseInfoWindow));
    } else {
      houseMarkers[whereMarked[where]].getExtData().push(extDataObj); // shallow copy of extData
    }
  });
}

/**
 * show info window when click poimarkers
 * @param  {[Object]} e [event]
 */
function _markerHouseInfoWindow(e){
  // create info window
  houseInfoWin = new AMap.InfoWindow({
    offset: new AMap.Pixel(0, -30)
  });
  // handle content
  var extDataObj = e.target.getExtData();
  var contentArr = [];
  extDataObj.forEach(function(item) {
    _.map(item, function(value, key) {
      var contentHtml = '';
      switch (key) {
        case 'title' :
          contentHtml = '<div class="info-title">' + value + '</div>'; break;
        case 'link' :
          contentHtml = '<div><a target="_blank" href="' + value + '" >去看房</a></div>'; break;
        case 'rooms' :
          contentHtml = '<div>房型: ' + value + '</div>'; break;
        case 'area' :
          contentHtml = '<div>面积: ' + value + '</div>'; break;
        case 'price' :
          contentHtml = '<div>价格: ' + value + '</div>'; break;
        default :
          contentHtml = 'default'; break;
      }
      contentArr.push(contentHtml);
    });
  });

  // add button for mark
  contentArr.push('<button class="btn-transferSearch js-transferSearch">路线查询</button>');
  houseInfoWin.setContent(contentArr.join(''));
  // houseInfoWin.setContent(contentArr.join('<br/>'));
  var position = e.target.getPosition();
  Session.set('curPosition', position);
  houseInfoWin.open(AmapAPI.map, position);
}

function clearHouseMarkersCluster() {
  // clear markers
  houseMarkerCluster.removeMarkers(houseMarkers);
  houseMarkers = [];
  //unbind events
  houseMarkerListners.forEach(function(item) {
    AMap.event.removeListener(item);
  });
  houseMarkerListners = [];
}

/**
 * After houes loaded, get all where position by AMap geocoder
 * @return {[type]} [description]
 */
function getAllwhere() {
  if (!Session.get('housesLoaded')) return;
  if (!AmapAPI.loaded) return;

  // init geoCoder
  initGeoCoder();

  // get all where
  var allWhere = _.uniq(HouseColl.find({},{fields: {where: 1}}).fetch().
    map(function(item){
      return item.where;
    }));
  // console.log(allWhere);
  // geoCoder.setCity(currentCity);
  totalGeoCoder = allWhere.length;
  Session.set('wherePositionsPrepared', false);
  statusNow('查询位置信息中...请耐心等待');
  allWhere.forEach(function(item) {
    getAddrPosition(item);
  });
}

/**
 * ADDR -> lnglat
 * @param  {[string]} addr
 * @return {[lnglat]} lnglat
 */
function getAddrPosition(addr) {
  // console.log(addr);
  geoCoder.getLocation(addr, function(stat, res) {
    cnt_geoCoder++;
    if (stat === 'complete' && res.info === 'OK') {
      if (res.geocodes.length >= 1) {
        // console.log(res.geocodes);
        wherePositions[addr] = res.geocodes[0].location;
      }
    } else {
      if (DEBUG) {
        console.log('getLocation failed. ', addr);
      }
    }
    if (cnt_geoCoder === totalGeoCoder) {
      if (DEBUG) {
        console.log('all wherePositions OK');
      }
      statusNow('查询位置信息完成.')
      Session.set('wherePositionsPrepared', true);
      // console.log(wherePositions);
    }
  });
}

function statusNow(str) {
  Session.set('statusNow', str);
}


/**
 * EVENT
 */
Template.mapApp.events({
  'click .js-setCenterMarker': function(e) {
    e.preventDefault();
    unbindPoiMarkers();
    addCenterMarker(Session.get('centerMarkerPosition'));
  },
  'click .js-showArrivalRange': function(e) {
    e.preventDefault();
    clearArrivalRange();
    showArrivalRange();
  },
  'click .js-clearArrivalRange': function(e) {
    e.preventDefault();
    clearArrivalRange();
  },
  'change .js-changePolicySelect': function(e){
    var curPolicy = $(e.target).find('option:selected').attr('value')
    Session.set('policy', curPolicy);
    if(routeTransfer) {
      if (curPolicy.search(/SUBWAY/i) < 0) {
        routeTransfer.setPolicy(AMap.TransferPolicy.NO_SUBWAY);
      } else {
        routeTransfer.setPolicy(AMap.TransferPolicy.LEAST_TIME);
      }
    }
    // console.log(Session.get('policy'));
  },
  'click .js-displayHouseMarkers': function(e) {
    e.preventDefault();
    statusNow('加载所有房源信息中...');
    showHouseMarkersCluster();
    statusNow('加载所有房源信息完成');
    // ready for transferSearch after display houses
    initTransfer();
  },
  'click .js-clearRouteTransfer': function(e) {
    e.preventDefault();
    routeTransfer.clear();
    statusNow('');
  },
  'click .js-transferSearch': function(e) {
    e.preventDefault();
    // clear current search result
    if (routeTransfer) {
      routeTransfer.clear();
    }
    // close houseInfoWin
    if (houseInfoWin) {
      houseInfoWin.close();
    }

    if(!centerMarker) {
      // lack terminal center marker`
      if (DEBUG) {
        console.log('Search failed: lack of info');
      }
      statusNow('未设置标记,请重试.')
    } else {
      var curPosition = Session.get('curPosition');
      routeTransfer.search([curPosition.lng, curPosition.lat], centerMarker.getPosition(), function(stat, res) {
        if (stat === 'complete' && res.info === 'OK') {
          if (DEBUG) {
            console.log('Search complete');
          }
          statusNow('查询路线成功');
        } else {
          if (DEBUG) {
            console.log('Search failed');
            console.log('stat ', stat);
            console.log('res ', res);
          }
          statusNow('查询路线失败');
        }
      });

    }
  }
});
