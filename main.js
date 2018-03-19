var states;

$(function(){
  'use strict';

  $('#loading-warning').fadeIn();

  var map = new L.Map('map-wrapper', {
    'center': new L.LatLng(39.828175, -98.5795),
    'zoom': 5
  });
  L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
    'maxZoom': 18
  }).addTo(map);

  var neighbors = [];

  $.getJSON('states.json', function(s){
    states = s;
    L.geoJSON(states, {
      'style': function(feature){
        return {
          'fill': false
        };
      }
    }).addTo(map);
  });

  $.getJSON('counties.json', function(counties){

    var countyLayer = L.geoJSON(counties, {
      'style': function(feature){
        return {
          'weight': 1,
          'fillOpacity': 0
        };
      },
      'onEachFeature': function(feature, layer){
        layer.on({
          'click': function(e){
            restyle(e.target.feature);
            zoomToFeature(e.target.feature);
            showResult(e.target.feature);
          }
        });
      }
    }).bindTooltip(function(layer){
        return layer.feature.properties.NAME + ', ' + layer.feature.properties.USPS;
      }, {
        sticky: 1
    }).addTo(map);

    new Awesomplete($('#search').get(0), {
      'list': counties.features.map(
        function(c){
          return c.properties.NAME + ', ' + c.properties.USPS;
        })
    });

    $('#search').on('awesomplete-selectcomplete', function(){
      var feature;
      for(var i = counties.features.length-1; i >= 0; i--){
        if(this.value === counties.features[i].properties.NAME + ', ' + counties.features[i].properties.USPS){
          feature = counties.features[i];
          break;
        }
      }
      if(feature){
        restyle(feature);
        zoomToFeature(feature);
        showResult(feature);
      }
    });

    function zoomToFeature(feature){
      var ll = L.latLng(feature.properties.LAT, feature.properties.LON);
      map.setView(ll, 8);
      L.popup()
        .setLatLng(ll)
        .setContent(feature.properties.NAME + ', ' + feature.properties.USPS)
        .openOn(map);
    }

    function restyle(feature){
      var fips = feature.properties.STATE + '' + feature.properties.COUNTY;
      countyLayer.setStyle(function(f){
        return {
          'weight': 1,
          'fillOpacity': f === feature ? 0.3 : (f.properties.neighbors.indexOf(fips) > -1 ? 0.3 : 0),
          'fillColor': f === feature ? '#ff0000' : '#ffff00'
        };
      });
    };

    function showResult(feature){
      $('#neighbor-stats').fadeOut(function(){
        neighbors = counties.features.filter(function(c){
          return feature.properties.neighbors.indexOf(c.properties.STATE + c.properties.COUNTY) !== -1;
        });
        $(this).find('tbody').html(
          '<tr style="font-style:italic">' +
            ['NAME', 'USPS'].map(function(v){
              return '<td>' + feature.properties[v] + '</td>';
            }).join('') +
            ['POPULATION', 'CENSUSAREA'].map(function(v){
              return '<td>' + feature.properties[v].toLocaleString() + '</td>';
            }).join('') +
            '<td>' + round(feature.properties.POPULATION/feature.properties.CENSUSAREA, 1) + '</td>' +
          '</tr>' +
          neighbors.map(function(n){
            return '<tr>' +
              ['NAME', 'USPS'].map(function(v){
                return '<td>' + n.properties[v] + '</td>';
              }).join('') +
              ['POPULATION', 'CENSUSAREA'].map(function(v){
                return '<td>' + n.properties[v].toLocaleString() + '</td>';
              }).join('') +
              '<td>' + round(n.properties.POPULATION/n.properties.CENSUSAREA, 1) + '</td>' +
            '</tr>';
          }).join('\n')
        );
        $(this).fadeIn();
      });
    }

  }).done(function(e){
    $('#loading-cover').fadeOut();
  });

  $('#export').click(function(e){
    var headers = 'NAME,STATE,POPULATION,AREA(SQMI),DENSITY';
    var content = neighbors.map(function(county){
      return ['NAME', 'USPS', 'POPULATION', 'CENSUSAREA'].map(function(field){
        return (county.properties[field] + '').replace(/,/g,'');
      }).join(',') + ',' + county.properties.POPULATION/county.properties.CENSUSAREA;
    }).join('\r\n');
    var blob = new Blob([headers + '\r\n' + content], {type: 'data:text/csv;charset=utf-8'});
    saveAs(blob, 'adjacentCounties.csv');
  });

  function round(number, precision) {
    var factor = Math.pow(10, precision);
    var tempNumber = number * factor;
    var roundedTempNumber = Math.round(tempNumber);
    return roundedTempNumber / factor;
  }
});
