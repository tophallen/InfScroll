# InfScroll
#### The Simple library agnostic infinite scroller

Infinity is a simple scroller that works with any library and has no strict dependencies, it works out of the box with signalr, jQuery, and angular. It also has built in support for commonJS modules/AMD loaders. It works by calculating the bounding box of the scroller's innards vs the window height, adjusting based on the configuration's padding setting and fetching more data when the threshold is met.

####How To Use:
For the simple case you can simply instantiate with a config and then initialize:
```js
var dataset = [];
var sc = new InfScroll({
  node: 'infinite-holder',
  url: 'myurl'
});
sc.initialize(dataset);
```
And your html:
```html
<ol id="infinite-holder">
  <li>
    <!-- some html -->
  </li>
</ol>
```
This will work, however if you don't provide some sort of data-binding template generator then it will be stuck in a call loop until all results have been received, as it doesn't inherently know how to update the DOM.

You could also build a simple directive around it in angular and have the innards be an ng-repeat:
```js
myModule.directive('infinity', function($parse, InfScroll, $http) {
    var result = {
      scope: {
        config: '=infinity',
        array: '=ngModel'
      },
      restrict: 'A',
      require: '^ngModel',
      link: function(scope, element, attr, bindModel) {
        scope.config.node = element[0];
        scope.config.ajax = $http;
        scope.scroller = new InfScroll(scope.config);
        scope.scroller.bind('onfire', function (data) {
          bindModel.$commitViewValue();
        });      
        scope[id].initialize(scope.array);
      }
    };
    return result;
  }
});
```
Your Controller:
```js
app.controller('MainCtrl', function() {
  this.dataset = [];
  this.config = {
    mode: 'ajax',
    node: 'infinite-holder',
    url: 'testdata.json',
    padding: '20%',
    debug: true
  };
});
```
All you would need to have as HTML
```html
<ol id="ang-infinite-holder" infinity="my.config" ng-model="my.dataset">
  <li ng-repeat="repo in my.dataset">
    <!-- some html content -->
  </li>
</ol>
```

That seems simple enough, so let's get into the workings and events and how to manage the life-cycle of the scroller.

###The Configuration

The configuration is what will get passed into the constructor, anything that is not there when build will not be used.

####Properties:

 - `len`: this is the length property, it should be a positive number, as it is the number of items that get called next, we will cover your options around this later. `default: 5`
 - `mode`: specified the operation mode to run in, as it supports `custom`, `ajax`(XMLHttpRequest), and `custom`. you must provide a custom function that resolves or rejects a $q style promise when in custom, and for signalR, signalr must be bound to the global scope under `$.connection`. `default: 'ajax'`
 - `hub`: this is the name of the hub to call for a signalR configuration, it should exist in your proxy. `default: ''`
 - `method`: this is the method name to call on the `[hubName].server` category, it should be a hub call that takes two properties, index and length - the names are configurable though. `default: ''`
 - `url`: this is the route to call when in ajax mode, it should either be a same domain get method, or you should have an interceptor bound to the xhr requester that can correct that. `default: ''`
 - `node`: this is the node that the infinity scroller operates within. it will use this to calculate bounding boxes and other things against the DOM and the `window`. it will also lock the caller when `display:none` is applied to this element or one of it's parent elements, so you don't waste API calls. `default: null`
 - `scrollingNode`: the bounding container to check onscroll against. this can be useful if you are scrolling within a portion of the screen. `default: window`
 - `padding`: this is the buffer before you reach the end of the feed to call for more data, it can be a percent(`%`), pixel(`px`) or straight numerical value. `default: 0`
 - `custom`: provide your own implementation that returns a `Q` style promise [see here](https://github.com/kriskowal/q). This will work so long as it resolves to an array of data. `default: noop`
 - `indexProp`: the name of the index parameter for the api calls `default: 'index'`
 - `lengthProp`: the name of the length parameter for the api calls. if set to a falsey value it will not be added to the calls. `default: 'length'`
 - `startIndex`: set this to start at a specific index in the calls. `default: 0`
 - `isLengthIndependentOfIndex`: set this to true for the index value to be based on call count and not on the length of the previous results. Note that you will have to manually check and lock when you have reached the end of the dataset. a good use-case for this would be when calling pages rather than item counts, i.e. `?page=1`. `default: false`
 - `withConfig`: specify custom configuration options to send when making xhr requests, such as xhr callbacks or authorization headers. `default: {}`
 - `paramsOnFirstCall`: specify that you don't want to pass parameters for your first call, useful if bad parameters or unneeded parameters return a `404` on your API. `default:true`
 - `pagingRequestType`: specify if the paging request should be in the `body` or as `query` params - uses query regardless if the request method is 'GET'. `default: 'query'` 
 - `debug`: this will add some logging to the console for you. `default: false`
 - `verbose`: this can only be used when debug is set to true, and will log all event, calculations and api details. _Warning: this is very noisy as on scroll gets called a lot and on resize gets called a lot._
 
These members are exposed to you to set on the config.

####The Instance
You have some members exposed to you once you have the instance as well.

 - `disable`: allows you to get or set whether the scroller is in lockdown, when disable is `true`, no more API calls will be made, and it stops calculating if it needs to get more, set to false to re-enable.
 - `config`: gets a copy of the active config object
 - `state`: gets a copy of the active state object
 - `extend(/*deep, target, arguments*/)`: exposes the extend method built into this library which also supports getters and setters and property attributes. including passing getters down the chain, just be careful with getters and closures.
 - `initialize(array)`: this kicks off the scroller, getting the state in order, detecting the method of API calls, calculating bounding boxes etc. This function can also be used to re-initialize the object, clearing all existing data.
 - `bind(name, callback)`: binds an event to the given name (_see the events section for more details_)
 - `unbind(name, callback)`: unbinds an event from the given event name (_see the events section for more details_)

###Events
There are currently four exposed event handles in the Scroller, `onFire`, `beforeFire`,`afterFire`, and `onError`

 - `beforeFire(config, event)` is called before the API call is made and gives you a chance to look at the configuration before the call is made, it passes the config to you, and some event data, which allows you to cancel the API call by calling `preventDefault()`.
 - `onFire(data, event)` is called as soon as the api result is returned, before any data normalization or manipulation has occurred, it also allows you to intercept and modify the data being used as it passes you the data, and uses the return, or the original if you return undefined. if you prevent default, no further data processing happens and you need to manually unlock the state when you are done with your manipulation.
 - `afterFire(data, event)` is called after all the data manipulation and state changes have occurred
 - `onError(err)` is a hook for any errors that occur, rather than throwing errors it will pass the errors to the attached eventHandlers and move on. Note that when an error occurs it locks the instance. you can unlock it by setting disable to false on the instance.