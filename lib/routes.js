/**
 * File: routes.js
 * Flow-router configure file
 */



// FlowRouter.route('/', {
//   action: function() {
//     BlazeLayout.render('LayoutTemplate', {
//       //  top: 'navBar',
//       center: 'mapApp'
//     });
//   }
// });

FlowRouter.route('/', {
  action: function(params, queryParams) {
    BlazeLayout.render('LayoutTemplate', {
      top: 'navBar',
      center: 'homePage'
    });
  }
});

FlowRouter.route('/rent', {
  action: function(params, queryParams) {
    BlazeLayout.render('LayoutTemplate', {
      top: 'navBar',
      center: 'mapApp'
    })
  }
})

FlowRouter.notFound = {
  action : function() {
    console.log('Page Not Found');
  }
}
