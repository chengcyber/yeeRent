import { Meteor } from 'meteor/meteor';

Meteor.startup(() => {
  // code to run on server at startup
});

Meteor.defer(()=> {

})

/**
 * PUBLISH
 */
Meteor.publish("houses", function(options){
  return HouseColl.find({},options);
});

// Meteor.methods({
//   "getTotalHouseNum": function () {
//     return HouseColl.find().count();
//   }
// });
