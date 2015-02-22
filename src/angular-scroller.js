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

var infinityModule = angular.module('infScroll',[]);

var service = {
  name:'infScroll',
  dependencies: [],
  definition: function () {
    return InfScroll;
  }
};
var directive = {
  name: 'infinity',
  dependencies: ['$parse', 'infScroll', '$http'],
  definition: function($parse, InfScroll, $http) {
    var result = {
      scope: {
        config: '=infinity',
        array: '=ngModel'
      },
      restrict: 'A',
      require: '^ngModel',
      link: function(scope, element, attr, bindModel) {
        var id = 'scroller';
        scope.config.node = element[0];
        scope.config.ajax = $http;
        scope[id] = new InfScroll(scope.config);
        scope[id].bind('onfire', function (data) {
          bindModel.$commitViewValue();
        });
        scope[id].initialize(scope.array);
      }
    };
    return result;
  }
};

infinityModule.factory(service.name, service.dependencies.concat(service.definition));
infinityModule.directive(directive.name, directive.dependencies.concat(directive.definition));