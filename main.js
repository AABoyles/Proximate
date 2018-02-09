var counties, showResult, findNeighbors, restyle, countyLayer, neighbors, zoomToFeature;

var map = new L.Map('map-wrapper', { center: new L.LatLng(39.828175, -98.5795), zoom: 5 });
L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);

$.getJSON('data/counties.json', function(data){
  counties = data;

  countyLayer = L.geoJSON(data, {
    onEachFeature: function(feature, layer){
      layer.on({
        click: function(e){
          $('#loading-cover').fadeIn(function(e2){
            zoomToFeature(e.target.feature);
            showResult(e.target.feature);
            findNeighbors(e.target.feature);
            $('#loading-cover').fadeOut();
          });
        }
      });
    }
  })
  .bindPopup(function(layer){return layer.feature.properties.NAME + ', ' + layer.feature.properties.USPS;})
  .bindTooltip(function(layer){return layer.feature.properties.NAME + ', ' + layer.feature.properties.USPS;}, {sticky: 1})
  .addTo(map);

  new Awesomplete($('#search')[0], {
    list: counties.features.map(function(c){return c.properties.NAME + ', ' + c.properties.USPS;})
  });

  $('#search').on('awesomplete-selectcomplete', function(){
    let county, state;
    [county, state] = this.value.split(', ');
    let feature = counties.features.find(function(c){return c.properties.NAME == county && c.properties.USPS == state});
    zoomToFeature(feature);
    showResult(feature);
    findNeighbors(feature);
    $('#loading-cover').fadeOut();
  });

  zoomToFeature = function(feature){
    map.setView(L.latLng(feature.properties.LAT, feature.properties.LON), 8);
  };

  showResult = function(n){
    $('#result').slideUp(function(){
      $(this).html(
        '<tr>' +
        ['NAME', 'USPS'].map(function(v){return '<td>' + n.properties[v] + '</td>'}).join('') +
        ['POPULATION', 'HU10', 'CENSUSAREA'].map(function(v){return '<td>' + n.properties[v].toLocaleString() + '</td>' }).join('') +
        '</tr>'
      ).slideDown();
    });
    $('#export').attr('download', 'Neighbors_of_' + n.properties.NAME.replace(/ /g, '_') + '_' + n.properties.USPS + '.csv');
  };

  findNeighbors = function(feature){
    neighbors = counties.features.filter(function(c){return turf.booleanOverlap(c, feature);});
    $('#neighbors').slideUp(function(){
      $(this).html(
        neighbors.map(function(n){
          return '<tr>' +
          ['NAME', 'USPS'].map(function(v){
            return '<td>' + n.properties[v] + '</td>'
          }).join('') +
          ['POPULATION', 'HU10', 'CENSUSAREA'].map(function(v){
            return '<td>' + n.properties[v].toLocaleString() + '</td>'
          }).join('') +
          '</tr>';
        }).join('\n')
      ).slideDown();
    })
  };

}).done(function(e){
  $('#loading-cover').fadeOut();
});

$('#export').on('mousedown', function(e){
  let headers = 'NAME,STATE,POPULATION,HOUSINGUNITS,AREA(SQMI)';
  let content = $('#neighbors tr').map(function(){
    return $(this).find('td').map(function(){
      return $(this).text().replace(/,/g,'')
    }).get().join(',')
  }).get().join('\r\n');
  $(this).attr('href', 'data:text/csv;charset=utf-8,' + headers + '\n' + content);
});
