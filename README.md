# yeeRent
meteor application for easy renting house
## Dependency
* [高德地图API](http://lbs.amap.com/api/javascript-api/example/map/map-show/)
* [rcy:nouislider](https://github.com/rcy/meteor-nouislider)

## How to use
```
npm start
```

## House Detail

### Structure in DB
```
{
  "_id" : ObjectId("5805f3fd8e9f1f86325fd413"),
  "city" : "sh",
  "title" : "采光好，上门实拍，交通便利，在租四房",
  "link" : "http://sh.lianjia.com/zufang/shz3424678.html",
  "where" : "共康六村",
  "rooms" : "4室2厅  ",
  "area" : "76平  ",
  "price" : "9000"
}
```

### MongoDB import JSON
```
mongoimport --db <db-name> --port <port-num> --collection <coll-name> --type json --file foo.json --jsonArray
```
