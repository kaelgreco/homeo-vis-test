var utils = require('./utils.js');
var socket = require('socket.io-client')('http://localhost:8080');

window.onload = function() {
  // Set the dimensions of the canvas / graph
  var margin = {top: 30, right: 50, bottom: 30, left: 50},
      width = this.innerWidth - margin.left - margin.right,
      height = 270 - margin.top - margin.bottom;

  // Set the ranges
  var x = d3.scale.linear().range([0, width]);
  var y = d3.scale.linear().range([height, 0]);

  // Define the axes
  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .innerTickSize(-height)
    .outerTickSize(0)
    .tickPadding(10);

  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .innerTickSize(-width)
    .outerTickSize(0)
    .tickPadding(10);

  // Define the line
  var valueline = d3.svg.line()
      .x(function(d) { return x(d.time); })
      .y(function(d) { return y(d.bri); });

  // Define the fill area
  var areaColor = d3.svg.area()
      .x(function(d) { return x(d.time); })
      .y0(height)
      .y1(function(d) { return y(d.bri); });

  // Adds the svg canvas
  var svg = d3.select("body")
      .append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
      .append("g")
          .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");


  // initialize some empty data
  var data = [];
  for (var i=0; i<10; i++) {
      data.push({'time':i, 'bri':10.0, 'colorHex':'0xffffff'});
  }
  // Scale the range of the data
  x.domain(d3.extent(data, function(d) { return d.time; }));
  y.domain([0, d3.max(data, function(d) { return d.bri; })]);

  // Main color gradient for lights
  var grad = svg.append("linearGradient")
      .attr("id", "hue-gradient")
      .attr("gradientUnits", "userSpaceOnUse")

  // Color gradient hack to add pseudo brightness to yaxis
  var gradBW = svg.append("linearGradient")
      .attr("id", "bw-gradient")
      .attr("gradientUnits", "userSpaceOnUse")

  grad
    .attr("x1", "0%").attr("y1", 0)
    .attr("x2", "100%").attr("y2", 0);

  gradBW
    .attr("x1", 0).attr("y1", "0%")
    .attr("x2", 0).attr("y2", "100%");


  var gradData = [];
  var colorRamp = d3.scale.linear().domain([0,100]).range(["red","blue"]);
  for (var i=0; i<data.length; i++) {
    var gPercent = Math.round((i/data.length)*100);
    gradData.push({offset:gPercent+"%", color: colorRamp(gPercent)});
  }

  var gradDataBW = [
    {offset:"0%", color: "white"},
    {offset:"49%", color: "white"},
    {offset:"50%", color: "black"},
    {offset:"100%", color: "black"}
  ];

  var stopsBW = gradBW.selectAll("stop")
    .data(gradDataBW);

  stopsBW.enter().append('stop');
  stopsBW
    .attr('offset', function(d) { return d.offset; })
    .attr('stop-color', function(d) { return d.color; })
    .attr('stop-opacity', function(d,ind) {
      var sOp = (ind==0 || ind==3) ? "1" : "0";
      return sOp;
    });

  // Get the elements on the page
  svg.append("path")
      .attr("class", "line")
      .attr("d", valueline(data));
  svg.append("path")
      .datum(data)
      .attr("class", "areaColor")
      .attr("d", areaColor);
  svg.append("path")
      .datum(data)
      .attr("class", "areaBW")
      .attr("d", areaColor);
  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);
  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis);

  // Simple function to poll database and update plot value
  // (Currently only grabbing first light!)
  var pollDB = function(cb) {
    socket.emit('pollDB', 'test', function(result) {
      data = result.entities;
      // tCount: integer time right now. Should store actual timestamps.
      var tCount = 0;
      var gradData = []
      data.forEach(function(d,i) {
        d.bri = parseInt(d['1'].state.bri);
        d.sat = parseInt(d['1'].state.sat);
        d.hue = parseInt(d['1'].state.hue);
        var colorX = d['1'].state.xy[0];
        var colorY = d['1'].state.xy[1];
        // xyToHex currently only works if x,y is already in supported color space
        //var colorHex = utils.xyToHex(colorX, colorY, d.bri);
        var colorHex = utils.hslToHex(d.hue/65280.0, d.sat/255.0, 0.5);
        d.colorHex = '#' + colorHex;
        d.time = tCount++;
        var gPercent = Math.round((i/data.length)*100);
        gradData.push({offset:gPercent+"%", color: d.colorHex});
      })

      // Scale the range of the data again
      x.domain(d3.extent(data, function(d) { return d.time; }));
      y.domain([0, d3.max(data, function(d) { return d.bri; })]);

      // Update the gradient
      var stops = grad.selectAll("stop")
        .data(gradData);
      stops.enter().append('stop');
      stops
        .attr('offset', function(d) { return d.offset; })
        .attr('stop-color', function(d,i) { return data[i].colorHex; });
      stops.exit().remove();

      // Select the section we want to apply our changes to
      var svg = d3.select("body").transition();

      // Make the changes
      svg.select(".line")
          .duration(750)
          .attr("d", valueline(data));
      svg.select(".areaColor")
          .duration(750)
          .attr("d", areaColor(data));
      svg.select(".areaBW")
          .duration(750)
          .attr("d", areaColor(data));
      svg.select(".x.axis")
          .duration(750)
          .call(xAxis);
      svg.select(".y.axis")
          .duration(750)
          .call(yAxis);
      });
      cb();
  }


  var promise = new Promise(function (resolve) {
    pollDB(resolve);
  });
  setInterval(function () {
      promise = promise.then(function () {
          return new Promise(function (resolve) {
              pollDB(resolve);
          });
      });
  }, 4000);

};
