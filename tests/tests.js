describe("The Scoller object", function() {
  
  var config = {
      mode: 'ajax',
      node: 'infinite-holder',
      url: 'testdata.json',
      padding: '25%',
      lengthProp: null,
      indexProp: 'page',
      length: 1,
      startIndex: 1,
      isLengthIndependentOfIndex: true,
      paramsOnFirstCall: true,
      debug: true
    };
  
  it("should have the following as a prototype", function() {

    var scroller = window.InfScroll;
    expect(scroller.prototype).toEqual({});
  });

  it("should have the following instance members with default values", function() {
    var scroll = new window.InfScroll();
    expect(scroll.disable).toBe(false);
    expect(scroll.state.$indexName).toBe('index');
    expect(scroll.state.$lengthName).toBe('length');
    expect(scroll.state.$index).toBe(0);
    expect(scroll.state.$length).toBe(5);
    expect(scroll.state.$locked).toBe(false);
    expect(scroll.state.$isFrozen).toBe(false);
    expect(scroll.disable).toBe(false);
    expect(scroll.config).toEqual({});
    expect(typeof(scroll.extend)).toBe('function');
    expect(typeof(scroll.initialize)).toBe('function');
  });

  it('should have changed state from default on config', function() {
    var scroll = new window.InfScroll(config);
    //the state property should actually be unchanged until
    //initialize is called, the config however should 
    //reflect the combined changes from defaults overwritten by
    //the given config
    expect(scroll.disable).toBe(false);
    expect(scroll.state.$indexName).toBe('page');
    expect(scroll.state.$lengthName).toBeNull();
    expect(scroll.state.$index).toBe(0);
    expect(scroll.state.$length).toBe(5);
    expect(scroll.state.$locked).toBe(false);
    expect(scroll.state.$isFrozen).toBe(false);
    expect(scroll.disable).toBe(false);
    expect(scroll.config.scrollingNode).toBe(window);
    expect(scroll.config.len).toBe(5);
  });
  
  it('should make many changes to state on initalize', function() {
    var scroll = new window.InfScroll(config);
    var myData = [];
    var initialized = scroll.initialize(myData);
    expect(initialized).toBe(undefined);
    expect(scroll.state.$index).toBe(1);
  });
  
  it('should parse params into urls when the type is params', function () {
    var scroll = new window.InfScroll(config);
    var myData = [];
    scroll.initialize(myData);
    
    var privateMembers = scroll.$$forTestLibrary;
    
    expect(privateMembers._helpers.buildUrl('testdata.json', { index: 0, length: 5}))
      .toEqual('testdata.json?index=0&length=5');
    expect(privateMembers._helpers.buildUrl('testdata.json?q=dates', { index: 0, length: 5}))
      .toEqual('testdata.json?q=dates&index=0&length=5');
  });
  
  it('should log messages with and ISO timestamp', function () {
    var scroll = new window.InfScroll(config);
    var myData = [];
    scroll.initialize(myData);
    
    var privateMembers = scroll.$$forTestLibrary;
    privateMembers.activeConfig = {
      debug: true
    };
    expect(privateMembers._logger('something...')[0])
      .toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\].*/);
  });
  
  it('should build an ajax config to match $.ajax', function () {
    var scroll = new window.InfScroll(config);
    var myData = [];
    scroll.initialize(myData);
    
    var privateMembers = scroll.$$forTestLibrary;

    var testConfig = privateMembers._helpers.extend(true, {}, privateMembers.DEFAULT_CONFIG, config);
    var xhr = privateMembers._helpers.buildAjaxRequest(testConfig);
    
    expect(xhr.type).toEqual('GET');
    expect(xhr.url).toEqual('testdata.json?page=1');
  });
});