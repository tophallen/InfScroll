/*
The MIT License (MIT)
Copyright (c) 2015 Chris Allen
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

(function(global, angular, $, factory) {
  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = global.document ? factory(global, angular, $, true) :
      function(w) {
        return factory(w, angular, $);
    };
  } else {
    factory(global, angular, $);
  }

  // Pass this if window is not defined yet
})(typeof window !== undefined ? window : this, typeof angular !== 'undefined' ? angular : undefined, typeof $ !== 'undefined' ? $ : undefined, function(global, angular, $, noGlobal, undefined) {
  'use strict';

  var InfScroll = function(configuration) {
    var self = this,
      nop = function() {},
      DEFAULT_CONFIG = {
        get len() {
          return _state.$length;
        },
        set len(value) {
          _state.$length = value;
        },
        hub: '',
        method: '',
        url: '',
        node: null,
        scrollingNode: window,
        mode: 'ajax', //signalr, ajax, custom
        isLengthIndependentOfIndex: false,
        withConfig: {},
        startIndex: 0,
        paramsOnFirstCall: true,
        pagingRequestType: 'query',
        padding: 0,
        custom: nop,
        get indexProp() {
          return _state.$indexName;
        },
        set indexProp(value) {
          _state.$indexName = value;
        },
        get lengthProp() {
          return _state.$lengthName;
        },
        set lengthProp(value) {
          _state.$lengthName = value;
        },
        ajax: $ && $.ajax ? $.ajax : undefined, //by default, assume jQuery is available
        get defaultAjaxConfig() {
          var xhrConfig = _helpers.extend({}, _activeConfig.withConfig);
          if ((_activeConfig.ajax == $.ajax) || (!angular && !$http)) {
            //jQuery/other land
            xhrConfig.type = xhrConfig.type || 'GET';
            xhrConfig.url = xhrConfig.url || '';
            xhrConfig.dataType = xhrConfig.dataType || 'json';

          } else if (angular || $http) {
            //angular land
            xhrConfig.method = xhrConfig.method || 'GET';
            xhrConfig.url = xhrConfig.url || '';

          }
          //common headers here
          return xhrConfig;
        }
      },
      _state = {
        $index: 0,
        $indexName: 'index',
        $length: 5,
        $lengthName: 'length',
        $latest: [],
        $data: [],
        $isFrozen: false,
        $locked: false
      },
      _activeConfig = {},
      _logger = function( /* args */ ) {
        var msg;
        if (_activeConfig.debug) {
          var _l = console.debug ? console.debug : console.log;
          if (arguments.length > 0 && typeof arguments[0] === 'boolean') {
            if (_activeConfig.verbose) {
              var timestamp = (new Date()).toISOString();
              if (arguments.length == 2) {
                msg = ['[' + timestamp + '] ' + arguments[1]]
                console.info.apply(console, msg);
              } else {
                msg = ['[' + timestamp + ']'].concat(Array.prototype.slice.call(arguments, 1));
                console.info.apply(console, msg);
              }
            }
          } else {
            if (arguments.length > 0) {
              var timestamp = (new Date()).toISOString();
              if (arguments.length == 1) {
                msg = ['[' + timestamp + '] ' + arguments[0]];
                _l.apply(console, msg);
              } else {
                msg = ['[' + timestamp + ']'].concat(Array.prototype.slice.call(arguments));
                _l.apply(console, msg);
              }
            }
          }
        }
        return msg;
      },
      _createEvent = function(name, data) {
        var ev = {};
        Object.defineProperties(ev, {
          'preventDefault': {
            value: function() {
              ev.defaultPrevented = true;
            },
            configurable: false,
            writable: false
          },
          'eventName': {
            value: name,
            writable: false,
            configurable: false
          },
          'eventData': {
            value: data,
            configurable: false
          }
        });
        return ev;
      };

    if ((angular || typeof $http !== 'undefined') && typeof DEFAULT_CONFIG.ajax !== 'function') {
      //try get the angular object because there was no jquery, and angular is defined
      //or there is an object called $http, which we will just assume is some sort of
      //XmlHttpRequest object wrapper - don't worry though, if all this fails, the user
      //can pass their own wrapper, assuming it uses promises and has syntax similar to
      //jQuery/angular for the calls
      try {
        DEFAULT_CONFIG.ajax = typeof $http !== 'undefined' ? $http : angular.injector(['ng']).get('$http');
      } catch (e) {
        //log?
        _logger(e);
      }
    }

    //now we build out some functionality
    var _helpers = {
      extend: function( /*deep, target, arguments*/ ) {
        //This extend function honors get/set and other object property attributes, 
        //allowing for ES5/6 objects to work normally, and maintain references to 
        //outside objects if needed.
        var deep = arguments.length > 0 ? arguments[0] : false;
        var target = arguments.length > 1 ? arguments[1] : {};
        //is deep a bool? if so it is calling for deep copy
        var isDeep = typeof deep === 'boolean' ? deep : false;
        //if deep copy is bool, then we want target to be target, otherwise deep is the target
        target = typeof deep === 'boolean' ? target : deep;
        //when getting the rest of the args, should we skip one or two params?
        var skip = typeof deep === 'boolean' ? 2 : 1;
        ///get the args from after the given params to the end
        var args = Array.prototype.slice.call(arguments);
        args.splice(0, skip);
        for (var i = 0; i < args.length; i++) {
          if (typeof args[i] === 'object') {
            var keys = Object.getOwnPropertyNames(args[i]);
            for (var t = 0; t < keys.length; t++) {
              var prop = keys[t];
              if (args[i][prop] === window) {
                target[prop] = window;
              } else {
                var attributes = typeof args[i] === 'object' ? Object.getOwnPropertyDescriptor(args[i], prop) : null;
                if (!attributes || attributes === null) {
                  if (typeof args[i][prop] === 'object' && isDeep) {
                    //array check first
                    if (Object.prototype.toString.call(args[i][prop]) === '[object Array]') {
                      if (Object.prototype.toString.call(target[prop]) !== '[object Array]') {
                        target[prop] = [];
                      }
                      for (var innerCount = 0; innerCount < args[i][prop].length; innerCount++) {
                        target[prop].push(_helpers.extend(true, {}, args[i][prop][innerCount]));
                      }
                    } else {

                      if (typeof target[prop] !== 'object') {
                        target[prop] = {};
                      }
                      _helpers.extend(isDeep, target[prop], args[i][prop]);
                    }
                  } else {
                    //no deep copy, just copy the object into the new object
                    target[prop] = args[i][prop];
                  }
                } else {
                  var targetAttributes = Object.getOwnPropertyDescriptor(target, prop);
                  if ( !! targetAttributes && (targetAttributes.set || targetAttributes.writable)) {
                    //if there are target attributes already, lets not apply them, 
                    //lets just update the value
                    //if it is set or writable, we can just set the property value.
                    target[prop] = args[i][prop];
                  } else {
                    Object.defineProperty(target, prop, attributes);
                  }
                }
              }
            }
          } else {
            target = args[i];
          }
        }
        return target;
      },
      calculatePosition: function(config) {
        _logger( /*verbose:*/ true, 'Calculating Position...');
        try {
          var called = false;
          if (!config.node || !config.node.getBoundingClientRect) return called;
          //get the current top position of the node that holds the infinity
          var topPos = config.node.getBoundingClientRect().top;
          //calculate the padding
          var pad = config.padding.toString();
          var percent = 0;
          if (pad.indexOf('px') !== -1) {
            pad = parseFloat(pad.substr(0, pad.length - 2));
          } else if (pad.indexOf('%') !== -1) {
            percent = parseFloat(pad.substr(0, pad.length - 1)) / 100;
            pad = window.innerHeight * percent;
          } else {
            pad = parseFloat(pad);
          }
          //be done calculating the padding
          //get the bottom of the node containing infinity 
          //it should be somewhere below the window innerHeight
          var bottomPos = config.node.getBoundingClientRect().bottom;
          //get the window height taking the pad into consideration
          //we add the pad to the window because when the window height 
          //plus the pad is around the height of the bottom of the bounding box
          //for the infinity node, then we are at the point we should load more 
          //entities
          var windowPos = window.innerHeight + pad;

          _logger(true, bottomPos, windowPos);

          if (bottomPos <= windowPos && !_state.$locked && !_state.$isFrozen) {
            //if this is true, we can see the bottom of the collection and should try to get more items
            called = true;
          }
          return called;
        } catch (e) {
          _events.onError(e);
        }
        return false;
      },
      canDisplay: function(node) {
        _logger( /*verbose:*/ true, 'Checking if can display list...');
        var checkingNode = node;
        while ( !! checkingNode && checkingNode.tagName !== 'BODY') {
          if (typeof checkingNode.style === 'object' && checkingNode.style['display'] === 'none') {
            return false;
          }
          checkingNode = checkingNode.parentNode;
        }
        return true;
      },
      buildWindowOnScrollWatch: function(el, callback) {
        if (!el.onscroll || el.onscroll.name != 'infinityCallback') {
          var infinityCallback = function infinityCallback() {
            InfScroll._windowOnScrollCallbacks.forEach(function(item) {
              item();
            });
          };
          el.onscroll = infinityCallback;
        }
        InfScroll._windowOnScrollCallbacks.push(callback);
      },
      buildWindowOnResizeWatch: function(callback) {
        if (!window.onresize || window.onresize.name != 'infinityCallback') {
          var infinityCallback = function infinityCallback() {
            InfScroll._windowOnResizeCallbacks.forEach(function(item) {
              item();
            });
          };
          window.onresize = infinityCallback;
        }
        InfScroll._windowOnResizeCallbacks.push(callback);
      },
      buildAjaxRequest: function(config) {
        var xhr = config.defaultAjaxConfig;
        xhr.url = config.url;
        if (_state.$index > config.startIndex || !! config.paramsOnFirstCall) {
          if (config.pagingRequestType === 'query' || (xhr.type == 'GET' || xhr.method == 'GET')) {
            //if the request is saying put the paging data as query params
            //or the method is get, where we can only query param, build the url
            var params = {};
            params[config.indexProp] = _state.$index;
            if ( !! config.lengthProp)
              params[config.lengthProp] = _state.$length;

            xhr.url = _helpers.buildUrl(xhr.url, params);
          } else {
            //build the data part
            xhr.data = xhr.data || {};
            xhr.data[config.indexProp] = _state.$index;
            if ( !! config.lengthProp)
              xhr.data[config.lengthProp] = _state.$length;
          }
        }
        _logger('getting the xhr config...', xhr);
        return xhr;
      },
      buildUrl: function(url, params) {
        var result = '';
        var keys = Object.keys(params);
        for (var i = 0; i < keys.length; i++) {
          if (result.length > 0) {
            result += '&';
          }
          result += keys[i] + '=' + params[keys[i]];
        }

        if (url.indexOf('?') === -1) {
          //there was no existing query on the url
          url += '?';
        }
        if (url.indexOf('?') < url.length - 1) {
          //if the question mark 
          //is somewhere less than the length
          url += '&';
        }
        //finally append our params
        url += result;

        return url;
      }
    };
    var protocols = {
      signalr: function(config) {
        _logger('Calling signalR...');
        if ($ && $.connection) {
          return $.connection[config.hub].server[config.method](_state.$index, _state.$length)
            .then(_events.onDone, _events.onError);
          //we return despite the fact that we might not want it
          //to be chainable... we hold the key at a higher level
        }
      },
      xhr: function(config) {
        _logger('Calling xhr...');
        var xhrConfig = _helpers.buildAjaxRequest(config);
        //all of the callers we support use chainable callbacks
        var promise = config.ajax(xhrConfig);
        if (!promise) throw new Error("given xhr object does not return chainable callbacks, aborting.");
        if (typeof promise.then === 'function') {
          promise.then(_events.onDone, _events.onError);
        } else if (typeof promise.success === 'function') {
          promise.success(_events.onDone);
          if (typeof promise.fail === 'function') {
            promise.fail(_events.onError);
          } else if (typeof promise.error === 'function') {
            promise.error(_events.onError);
          }
        }
        _logger('Hooked onto the return promise after handing the call off to the xhr provider...');
        return promise;
      },
      custom: function(config) {
        _logger('Calling custom...');
        try {
          var promise = config.custom(_state.$index, state.$length);
          if (typeof promise.then === 'function') {
            promise.then(_events.onDone, _events.onError);
          } else if (typeof promise.success === 'function') {
            promise.success(_events.onDone);
            if (typeof promise.fail === 'function') {
              promise.fail(_events.onError);
            } else if (typeof promise.error === 'function') {
              promise.error(_events.onError);
            }
          }
          _logger('Hooked into the return on the provided custom paging provider...');
          return promise;
        } catch (e) {
          s.events.onError(e);
        }
      }
    };
    var _callers = {
      onFire: [],
      onError: [],
      beforeFire: [],
      afterFire: []
    };
    var _events = {
      getNext: function(config) {
        _logger('Fetching next, with start index: ' + _state.$index + ' and length ' + _state.$length + '...');
        try {
          if (_state.$locked) return;
          _state.$locked = true;
          if ((!config.hub || !config.method) && !config.url && config.mode !== 'custom') {
            throw new Error('Scroller object must have a hubName and a methodName, a custom promise, or a URL to invoke the API.');
          }
          var ev = _createEvent('beforefire', _helpers.extend(true, {}, config));
          _events.beforeFire(_helpers.extend(true, {}, config), ev);
          if (!ev.defaultPrevented) {
            if (config.mode === 'signalr') {
              if ($.connection.hub.state !== 1) {
                $.connection.hub.start()
                  .done(function() {
                    protocols.socket(config);
                  });
              } else {
                protocols.socket(config);
              }
            } else if (config.mode === 'ajax') {
              protocols.xhr(config);
            } else if (config.mode === 'custom') {
              protocols.custom(config);
            }
          }
          _logger('Completed the get next generator without error.');
        } catch (e) {
          _events.onError(e);
        }
      },
      onDone: function(data) {
        _logger('Successfully got data with this response...', data);
        try {
          var ev = _createEvent('onfire', _helpers.extend(true, {}, _state));
          data = _events.onFire(data, ev) || data;
          if ( !! data.data && data.headers) data = data.data;
          if (!ev.defaultPrevented && data) {
            if (Object.prototype.toString.call(data) !== '[object Array]') {
              data = [data];
            }

            if (_activeConfig.isLengthIndependentOfIndex) {
              _state.$index++;
            } else {
              _state.$index += data.length;
            }
            _state.$latest = data.splice();
            for (var tl = 0; tl < data.length; tl++) {
              _state.$data.push(data[tl]);
            }
            _state.$latest = data;
            if (data.length < _state.$length) {
              //don't let it call the API if it starts returning 
              //less data then called for as it means that is the end of the data.
              _state.$isFrozen = true;
            }
            var aft = _createEvent('afterfire', _helpers.extend(true, {}, _state));
            _events.afterFire(data, ev);
          }
          _state.$locked = false;
          _logger('Successfully completed data fetch...');
          _logger('checking if more data should be aquired...');
          _events._onScroll(_activeConfig);
        } catch (e) {
          _events.onError(e);
        }
      },
      onFire: function(data) {
        var args = Array.prototype.slice.call(arguments);
        for (var index = 0; index < _callers.onFire.length; index++) {
          data = _callers.onFire[index].apply(this, args) || data;
        }
        return data;
      },
      beforeFire: function() {
        var args = Array.prototype.slice.call(arguments);
        for (var index = 0; index < _callers.beforeFire.length; index++) {
          _callers.beforeFire[index].apply(this, args);
        }
      },
      afterFire: function() {
        var args = Array.prototype.slice.call(arguments);
        for (var index = 0; index < _callers.afterFire.length; index++) {
          _callers.afterFire[index].apply(this, args);
        }
      },
      onError: function(e) {
        _logger('recieved an error...', e);
        var args = Array.prototype.slice.call(arguments);
        if (_callers.onError.length === 0) throw e;
        for (var index = 0; index < _callers.onError.length; index++) {
          _callers.onError[index].apply(this, args);
        }
        _state.$locked = true;
      },
      _onScroll: function(config) {
        if (!_helpers.canDisplay(config.node)) {
          _state.$locked = true;
          _state.$isFrozen = true;
          return;
        }
        try {
          if (_helpers.calculatePosition(config) && !_state.$locked) {
            _events.getNext(config);
          }
        } catch (e) {
          _events.onError(e);
        }
      }
    };

    Object.defineProperties(self, {
      'disable': {
        get: function() {
          return _state.$locked;
        },
        set: function(value) {
          _state.$locked = !! value;
        },
        configurable: false
      },
      'bind': {
        value: function(name, cb) {
          var lcName = name.toLowerCase();
          if (typeof cb !== 'function')
            throw new Error('event callback was not type of function!');
          switch (lcName) {
            case 'beforefire':
              _callers.beforeFire.push(cb);
              break;
            case 'afterfire':
              _callers.afterFire.push(cb);
              break;
            case 'onfire':
              _callers.onFire.push(cb);
              break;
            case 'onerror':
              _callers.onError.push(cb);
              break;
            default:
              break;
          }
          _logger('bound new event handler to eventtype ' + name + '...');
        },
        writable: false,
        configurable: false
      },
      'unbind': {
        value: function(name, cb) {
          var lcName = name.toLowerCase();
          var index = -1;
          switch (lcName) {
            case 'beforefire':
              index = _callers.beforeFire.indexOf(cb);
              if (index > -1) _callers.beforeFire.splice(index, 1);
              break;
            case 'afterfire':
              index = _callers.afterFire.indexOf(cb);
              if (index > -1) _callers.afterFire.splice(index, 1);
              break;
            case 'onfire':
              index = _callers.onFire.indexOf(cb);
              if (index > -1) _callers.onFire.splice(index, 1);
              break;
            case 'onerror':
              index = _callers.onError.indexOf(cb);
              if (index > -1) _callers.onError.splice(index, 1);
              break;
            default:
              break;
          }
          _logger('unbound event handler from eventtype ' + name + '...');
        },
        writable: false,
        configurable: false
      },
      'initialize': {
        value: function(array) {
          _logger('Initializing...');
          try {
            _state.$index = _activeConfig.startIndex || 0;
            _state.$locked = false;
            _state.$isFrozen = false;
            _state.$data = array || [];
            if (_activeConfig.mode === 'ajax' && (!_activeConfig.url || !_activeConfig.ajax)) {
              _events.onError(new Error('The requested mode was xhr but there was no provider or route found!'));
              return;
            }
            if (_activeConfig.mode === 'signalr' && (!$ || !$.connection)) {
              _events.onError(new Error('The requested mode was signalR but either jQuery or signalR was not found!'));
              return;
            }
            if (_activeConfig.mode === 'signalr' && (!_activeConfig.method || !_activeConfig.hub)) {
              _events.onError(new Error('The requested mode was signalR but either no hub or no method was given!'));
              return;
            }

            if (typeof(_activeConfig.node) === 'string') {
              _activeConfig.node = document.getElementById(_activeConfig.node);
            }
            if (typeof(_activeConfig.scrollingNode) === 'string') {
              _activeConfig.scrollingNode = document.getElementById(_activeConfig.scrollingNode);
            }
            _helpers.buildWindowOnScrollWatch(_activeConfig.scrollingNode, function() {
              _logger( /*verbose:*/ true, 'Triggering node scroll event...');
              _events._onScroll(_activeConfig);
            });
            _helpers.buildWindowOnResizeWatch(function() {
              _logger( /*verbose:*/ true, 'Triggering Window resize event...');
              _events._onScroll(_activeConfig);
            });
            _logger('Starting the Scroller data fetch watcher...');
            var _interval = typeof($interval) === 'undefined' ? (function() {
              var i = setInterval;
              i.cancel = function(handle) {
                clearInterval(handle);
              };
              return i;
            })() : $interval;

            var interval = _interval(function() {
              if (_helpers.calculatePosition(_activeConfig)) {
                _events._onScroll(_activeConfig);
              } else {
                var success = _interval.cancel(interval);
              }
              //debugging
              //interval.cancel(interval);
            }, 250);
          } catch (e) {
            _events.onError(e);
          }
          _logger('Completed Initialization...');
        },
        configurable: false,
        writable: false
      },
      'config': {
        get: function() {
          return _helpers.extend(true, {}, _activeConfig);
        },
        configurable: false
      },
      'state': {
        get: function() {
          return _helpers.extend(true, {}, _state);
        },
        configurable: false
      },
      'extend': {
        value: _helpers.extend,
        configurable: false,
        writable: false
      },
      'url': {
        get: function() {
          return _activeConfig.url;
        },
        set: function(value) {
          _activeConfig.url = value;
        },
        //configurable: false
      },
      'restart': {
        value: function() {
          _logger('restarting connection...');
          _state.$data.splice(0, _state.$data.length);
          _state.$latest.splice(0, _state.$latest.length);
          _logger('clearing datasets...');
          _events._onScroll(_activeConfig);
        },
        writable: false,
        configurable: false
      }
    });
    if (typeof(global.jasmine) !== 'undefined' && global.jasmine.version) {
      console.log('testing library found, including internals for unit tests...');
      Object.defineProperty(self, '$$forTestLibrary', {
        value: {
          nop: nop,
          self: self,
          DEFAULT_CONFIG: DEFAULT_CONFIG,
          _state: _state,
          _activeConfig: _activeConfig,
          _logger: _logger,
          _createEvent: _createEvent,
          _helpers: _helpers,
          protocols: protocols,
          _callers: _callers,
          _events: _events
        },
        configurable: false,
        writable: false
      });
    }

    if (!configuration) {
      console.warn('There was no configuration provided, your scroller instance will not load.');
      return undefined;
    }

    _activeConfig = _helpers.extend(true, DEFAULT_CONFIG, configuration);

  }; //end of scroller
  InfScroll.prototype = {};
  InfScroll._windowOnScrollCallbacks = [];
  InfScroll._windowOnResizeCallbacks = [];

  var
  // Map over InfScroll in case of overwrite
  _InfScroll = window.InfScroll;
  InfScroll.noConflict = function(deep) {

    if (deep && window.InfScroll === InfScroll) {
      window.InfScroll = _InfScroll;
    }

    return InfScroll;
  };

  if (typeof define === "function" && define.amd) {
    define("infScroll", [], function() {
      return InfScroll;
    });
  }

  // Expose InfScroll identifier, even in AMD
  // and CommonJS for browser emulators
  if (!noGlobal) {
    window.InfScroll = InfScroll;
  }

  return InfScroll;
});
