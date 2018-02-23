var map, counties, showResult, findNeighbors, countyLayer, zoomToFeature, round;

$(function(){
  $('#loading-warning').fadeIn();

  map = new L.Map('map-wrapper', { center: new L.LatLng(39.828175, -98.5795), zoom: 5 });
  L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);

  $.getJSON('counties.json', function(data){
    counties = data;

    countyLayer = L.geoJSON(counties, {
      onEachFeature: function(feature, layer){
        layer.on({
          click: function(e){
            zoomToFeature(e.target.feature);
            showResult(e.target.feature);
          }
        });
      }
    })
    .bindTooltip(function(layer){return layer.feature.properties.NAME + ', ' + layer.feature.properties.USPS;}, {sticky: 1})
    .addTo(map);

    new Awesomplete($('#search')[0], {
      list: counties.features.map(function(c){return c.properties.NAME + ', ' + c.properties.USPS;})
    });

    $('#search').on('awesomplete-selectcomplete', function(){
      var county, state;
      [county, state] = this.value.split(', ');
      var feature = counties.features.find(function(c){return c.properties.NAME == county && c.properties.USPS == state});
      zoomToFeature(feature);
      showResult(feature);
      $('#loading-cover').fadeOut();
    });

    zoomToFeature = function(feature){
      var ll = L.latLng(feature.properties.LAT, feature.properties.LON);
      map.setView(ll, 8);
      L.popup()
        .setLatLng(ll)
        .setContent(feature.properties.NAME + ', ' + feature.properties.USPS)
        .openOn(map);
    };

    showResult = function(feature){
      $('#neighbor-stats').slideUp(function(){
        var neighbors = counties.features.filter(function(c){return feature.properties.neighbors.includes(c.properties.STATE + c.properties.COUNTY);});
        $(this).find('tbody').html(
          '<tr style="font-style:italic">' +
            ['NAME', 'USPS'].map(function(v){return '<td>' + feature.properties[v] + '</td>'}).join('') +
            ['POPULATION', 'CENSUSAREA'].map(function(v){return '<td>' + feature.properties[v].toLocaleString() + '</td>' }).join('') +
            '<td>' + round(feature.properties.POPULATION/feature.properties.CENSUSAREA, 1) + '</td>' +
          '</tr>' +
          neighbors.map(function(n){
            return '<tr>' +
              ['NAME', 'USPS'].map(function(v){return '<td>' + n.properties[v] + '</td>'}).join('') +
              ['POPULATION', 'CENSUSAREA'].map(function(v){return '<td>' + n.properties[v].toLocaleString() + '</td>'}).join('') +
              '<td>' + round(n.properties.POPULATION/n.properties.CENSUSAREA, 1) + '</td>' +
            '</tr>';
          }).join('\n')
        );
        $(this).slideDown();
      });
      $('#export').attr('download', 'Neighbors_of_' + feature.properties.NAME.replace(/ /g, '_') + '_' + feature.properties.USPS + '.csv');
    };


  }).done(function(e){
    $('#loading-cover').fadeOut();
  });

  $('#export').on('mousedown', function(e){
    var headers = 'NAME,STATE,POPULATION,AREA(SQMI),DENSITY';
    var content = $('#neighbors tr').map(function(){
      return $(this).find('td').map(function(){
        return $(this).text().replace(/,/g,'')
      }).get().join(',')
    }).get().join('\r\n');
    $(this).attr('href', 'data:text/csv;charset=utf-8,' + headers + '\n' + content);
  });

  round = function(number, precision) {
    var factor = Math.pow(10, precision);
    var tempNumber = number * factor;
    var roundedTempNumber = Math.round(tempNumber);
    return roundedTempNumber / factor;
  };

});

if (!String.prototype.includes) {
  String.prototype.includes = function(search, start) {
    'use strict';
    if (typeof start !== 'number') start = 0;
    if (start + search.length > this.length) {
      return false;
    } else {
      return this.indexOf(search, start) !== -1;
    }
  };
}
