import { Meteor } from 'meteor/meteor';

Meteor.startup(() => {
  // code to run on server at startup

});

Meteor.defer(()=> {

})

/**
 * PUBLISH
 */
Meteor.publish("houses", function(){
  return HouseColl.find({});
});
