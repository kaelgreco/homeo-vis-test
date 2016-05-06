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
  var chart1 = d3.select("body")
      .append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
      .append("g")
          .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

  var chart2 = d3.select("body")
      .append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
      .append("g")
          .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

  // initialize some empty data
  var data = [];
  for (var i=0; i<40; i++) {
      data.push({'time':i, 'bri':132.0, 'colorHex':'0x000000'});
  }

  // Scale the range of the data
  x.domain(d3.extent(data, function(d) { return d.time; }));
  y.domain([0, 255]);

  // Main color gradient for lights
  var grad1 = chart1.append("linearGradient")
      .attr("id", "hue-gradient1")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", "0%").attr("y1", 0)
      .attr("x2", "100%").attr("y2", 0);
  var grad2 = chart2.append("linearGradient")
      .attr("id", "hue-gradient2")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", "0%").attr("y1", 0)
      .attr("x2", "100%").attr("y2", 0);

  // Color gradient hack to add pseudo brightness to yaxis
  var gradBW = chart1.append("linearGradient")
      .attr("id", "bw-gradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0).attr("y1", "0%")
      .attr("x2", 0).attr("y2", "100%");

  var gradData1 = [];
  var gradData2 = [];
  var colorRamp = d3.scale.linear().domain([0,100]).range(["red","blue"]);
  for (var i=0; i<data.length; i++) {
    var gPercent = Math.round((i/data.length)*100);
    gradData1.push({offset:gPercent+"%", colorHex: colorRamp(gPercent)});
    gradData2.push({offset:gPercent+"%", colorHex: colorRamp(gPercent)});
  }

  var gradDataBW = [
    {offset:"0%", colorHex: "#FFFFFF"},
    {offset:"49%", colorHex: "#FFFFFF"},
    {offset:"50%", colorHex: "#000000"},
    {offset:"100%", colorHex: "#000000"}
  ];

  var stopsBW = gradBW.selectAll("stop")
    .data(gradDataBW);

  stopsBW.enter().append('stop');
  stopsBW
    .attr('offset', function(d) { return d.offset; })
    .attr('stop-color', function(d) { return d.colorHex; })
    .attr('stop-opacity', function(d,ind) {
      var sOp = (ind==0 || ind==3) ? "1" : "0";
      return sOp;
    });

  // Get the elements on the page
  chart1.append("path")
      .attr("class", "line")
      .attr("id", "line1")
      .attr("d", valueline(data));
  chart1.append("path")
      .datum(data)
      .attr("class", "areaColor")
      .attr("id", "area1")
      .attr("d", areaColor);
  chart1.append("path")
      .datum(data)
      .attr("class", "areaBW")
      .attr("id", "areaBW1")
      .attr("d", areaColor);
  chart1.append("g")
      .attr("class", "x axis")
      .attr("id", "xaxis1")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);
  chart1.append("g")
      .attr("class", "y axis")
      .attr("id", "yaxis1")
      .call(yAxis);



  chart2.append("path")
      .attr("class", "line")
      .attr("id", "line2")
      .attr("d", valueline(data));
  chart2.append("path")
      .datum(data)
      .attr("class", "areaColor")
      .attr("id", "area2")
      .attr("d", areaColor);
  chart2.append("path")
      .datum(data)
      .attr("class", "areaBW")
      .attr("id", "areaBW2")
      .attr("d", areaColor);
  chart2.append("g")
      .attr("class", "x axis")
      .attr("id", "xaxis2")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);
  chart2.append("g")
      .attr("class", "y axis")
      .attr("id", "yaxis2")
      .call(yAxis);

  // Simple function to poll database and update plot value
  // (Currently only grabbing first light!)
  var pollDB = function(cb) {
    socket.emit('pollDB', 'test', function(result) {
      data = result.entities;
      // tCount: integer time right now. Should store actual timestamps.
      var tCount = 0;
      var gradData1 = [];
      var gradData2 = [];
      var dataChart1 = [];
      var dataChart2 = [];

      data.forEach(function(d,i) {
        var bri = parseInt(d['1'].state.bri);
        var sat = parseInt(d['1'].state.sat);
        var hue = parseInt(d['1'].state.hue);
        var colorX = d['1'].state.xy[0];
        var colorY = d['1'].state.xy[1];
        // xyToHex currently only works if x,y is already in supported color space
        //var colorHex = utils.xyToHex(colorX, colorY, d.bri);
        var colorHex = '#' + utils.hslToHex(hue/65280.0, sat/255.0, 0.5);
        var time = tCount;
        var gPercent = Math.round((i/data.length)*100);
        gradData1.push({offset:gPercent+"%", colorHex: colorHex});
        dataChart1.push({
          bri:bri,
          sat: sat,
          hue: hue,
          time: time
        });

        bri = parseInt(d['2'].state.bri);
        sat = parseInt(d['2'].state.sat);
        hue = parseInt(d['2'].state.hue);
        colorX = d['2'].state.xy[0];
        colorY = d['2'].state.xy[1];
        colorHex = '#' + utils.hslToHex(hue/65280.0, sat/255.0, 0.5);
        time = tCount++;
        gradData2.push({offset:gPercent+"%", colorHex: colorHex});
        dataChart2.push({
          bri:bri,
          sat: sat,
          hue: hue,
          time: time
        });
      });

      // Scale the range of the data again
      x.domain(d3.extent(dataChart1, function(d) { return d.time; }));

      // Update the gradients
      var grad = d3.select("body").select("#hue-gradient1");
      var stops = grad1.selectAll("stop")
        .data(gradData1);
      stops.enter().append('stop');
      stops
        .attr('offset', function(d) { return d.offset; })
        .attr('stop-color', function(d,i) {return d.colorHex; });
      stops.exit().remove();

      grad = d3.select("body").select("#hue-gradient2");
      stops = grad2.selectAll("stop")
        .data(gradData2);
      stops.enter().append('stop');
      stops
        .attr('offset', function(d) { return d.offset; })
        .attr('stop-color', function(d,i) {return d.colorHex; });
      stops.exit().remove();


      // Select the section we want to apply our changes to
      var svg = d3.select("body").transition();

      // Make the changes
      svg.select("#line1")
          .duration(750)
          .attr("d", valueline(dataChart1));
      svg.select("#area1")
          .duration(750)
          .attr("d", areaColor(dataChart1));
      svg.select("#areaBW1")
          .duration(750)
          .attr("d", areaColor(dataChart1));
      svg.select("#xaxis1")
          .duration(750)
          .call(xAxis);
      svg.select("#yaxis1")
          .duration(750)
          .call(yAxis);

      svg.select("#line2")
          .duration(750)
          .attr("d", valueline(dataChart2));
      svg.select("#area2")
          .duration(750)
          .attr("d", areaColor(dataChart2));
      svg.select("#areaBW2")
          .duration(750)
          .attr("d", areaColor(dataChart2));
      svg.select("#xaxis2")
          .duration(750)
          .call(xAxis);
      svg.select("#yaxis2")
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
