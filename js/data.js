goog.require('goog.net.XhrIo');
goog.require('goog.json');
goog.provide('lnkr.data');

lnkr.data.drawCharts = function() {

  var http = new goog.net.XhrIo();
  http.send('/data/creation', 'GET');
  goog.events.listen(http, goog.net.EventType.COMPLETE, function(e) {
    if (this.isSuccess()) {
      var x = this.getResponseJson();

      if (x.data && x.data.length > 0) {
        var chartData = Array();
        var sumOf = 0;
        var numDays = 0;
        var dayMap = {};
        for (var i = 0; i < x.data.length; i++) {
          if (x.data[i][0] && x.data[i][0] != 'ZZ') {
            var row = Array();
            row.push(x.data[i][0]);
            row.push(x.data[i][1]);
            chartData.push(row);
          }
          if (i > 0) {
            if (!dayMap[x.data[i][2]]) {
              dayMap[x.data[i][2]] = 0;
              numDays++;
            }
            sumOf += x.data[i][1];
            dayMap[x.data[i][2]] += x.data[i][1];
          }
        }

        var avgCreations = new Number(sumOf / numDays);
        var avgText = avgCreations.toFixed(2);
        var elt = document.querySelector('#viz-creation-rate');
        elt.innerHTML = '<span style="font-size: 1.7em;"><b>' +
                        avgText + '</b> Short Links created per day.</span>';

        var data = google.visualization.arrayToDataTable(chartData);
        var elt = document.querySelector('#viz-creation');
        var geochart = new google.visualization.GeoChart(elt)
        geochart.draw(data, {width: elt.clientWidth-10, height: 312});
      }
    }
    else {
      console.log('Error fetching data for creation.');
    }
  });

  var http2 = new goog.net.XhrIo();
  http2.send('/data/use', 'GET');
  goog.events.listen(http2, goog.net.EventType.COMPLETE, function(e) {
    if (this.isSuccess()) {
      var x = this.getResponseJson();

      if (x.data && x.data.length > 0) {
        var chartData = Array();
        for (var i = 1; i < x.data.length; i++) {
          if (x.data[i][0] && x.data[i][0] != 'ZZ') {
            var row = {
              country: x.data[i][0],
              countnotcached: x.data[i][1],
              countcached: x.data[i][2]
            };
            chartData.push(row);
          }
        }

        var dataForChart = Array();
        dataForChart.push(['country', 'count']);
        for (var i = 0; i < chartData.length; i++) {
          var row = chartData[i];
          dataForChart.push([row.country, parseInt(row.countnotcached) + parseInt(row.countcached)]);
        }

        var data = google.visualization.arrayToDataTable(dataForChart);
        var elt = document.querySelector('#viz-use');
        var geochart = new google.visualization.GeoChart(elt);
        geochart.draw(data, {width: elt.clientWidth-10, height: 312});
      }
    }
    else {
      console.log('Error fetching data for use.');
    }
  });

  var http3 = new goog.net.XhrIo();
  http3.send('/data/linkspace', 'GET');
  goog.events.listen(http3, goog.net.EventType.COMPLETE, function(e) {
    if (this.isSuccess()) {
      var x = this.getResponseJson();

      if (x.data && x.data.length > 0) {
        var elt = document.querySelector('#viz-linkspace');
        var saturation = new Number(x.data[1][0] / x.data[1][1] * 100);
        elt.innerHTML = '<span style="font-size: 1.7em;"><b>' +
                        x.data[1][2] + '</b> bytes used by Short Links <br /><b>' +
                        saturation.toFixed(15) + '%</b> of links are used.</span>' +
                        '<br/>(That\'s ' + x.data[1][0] + '/' + x.data[1][1] + ')';
      }
    }
    else {
      console.log('Error fetching data for use.');
    }
  });
};
