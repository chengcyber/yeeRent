import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import './main.html';

// Meteor.startup(() => {
//
// });

var key = Meteor.settings.public.amapKey;
console.log(key);

Template.test.helpers({
  amapKey : () => {
    return key || 'no key setting'
  }

});

// Template.body.onCreated(() => {
//   var map = new AMap.Map('container', {
//       center: [117.000923, 36.675807],
//       zoom: 6
//   });
// });

// Template.hello.onCreated(function helloOnCreated() {
//   // counter starts at 0
//   this.counter = new ReactiveVar(0);
// });
//
// Template.hello.helpers({
//   counter() {
//     return Template.instance().counter.get();
//   },
// });
//
// Template.hello.events({
//   'click button'(event, instance) {
//     // increment the counter when button is clicked
//     instance.counter.set(instance.counter.get() + 1);
//   },
// });
