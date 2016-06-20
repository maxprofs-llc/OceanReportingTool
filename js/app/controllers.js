'use strict';


angular.module('myApp.controllers', ["pageslide-directive"])


    .controller('ModalController', function ($scope, metaurl, close) {

        $scope.metadataurl = metaurl;
        $scope.close = function (result) {
            close(result, 500); // close, but give 500ms for to animate
        };

    })
    .controller('submitModalController', function ($scope, close) {

        $scope.close = function (result) {
            close(result, 500); // close, but give 500ms for to animate
        };

    })

    .controller('printCtrl', ['AOI', '$scope','$http','$timeout', function (AOI, $scope,$http,$timeout) {
        $scope.AOI = AOI;
        $http.get('CEConfig.json')
            .then(function (res) {
                $scope.CEConfig = res.data;
            });
        $http.get('emconfig.json')
            .then(function (res) {
                $scope.emconfig = res.data;
            });
        $scope.$on('$viewContentLoaded', function () {
            // document is ready, place  code here
            $timeout(function () {
        AOI.loadWindChart();
            }, 1000);
        });
        $scope.exportMyPDF = function (divtoExport) {
            console.log(divtoExport);
            html2canvas(document.getElementById(divtoExport), {
                allowTaint: true,
                //taintTest: false,
                onrendered: function(canvas) {
                    var imgData = canvas.toDataURL(
                        'image/png');

                    window.open(imgData);
                    var doc = new jsPDF('p', 'mm');
                    doc.addImage(imgData, 'PNG', 10, 10);
                    doc.save('Ocean_Report.pdf');
                }
            });
        };
    }])

    .controller('AOICtrl', ['AOI', '$scope','$http', function (AOI, $scope,$http) {
        $scope.AOI = AOI;
        $http.get('CEConfig.json')
            .then(function (res) {
                $scope.CEConfig = res.data;
            });
        AOI.layer.on("load", function (evt) {
            // create a new empty Leaflet bounds object

            var mbounds = L.latLngBounds([]);
            // loop through the features returned by the server

            AOI.layer.eachFeature(function (layer) {
                // get the bounds of an individual feature
                var layerBounds = layer.getBounds();
                // extend the bounds of the collection to fit the bounds of the new feature
                mbounds.extend(layerBounds);
            });

            try {
                map.fitBounds(mbounds);
                //console.log("here?");
                AOI.layer.off('load'); // unwire the event listener so that it only fires once when the page is loaded or again on error
            }
            catch (err) {
                //for some reason if we are zoomed in elsewhere and the bounds of this object are not in the map view, we can't read bounds correctly.
                //so for now we will zoom out on error and allow this event to fire again.
                // console.log("AOI bounds out of bounds, zooming out");
                map.setView([33.51, -78.3], 6); //it should try again.
            }


            $scope.mout($scope.AOI.ID);
        });

    }])
    .controller('SearchCtrl', ['AOI', '$scope', function (AOI, $scope) {
        //$scope.AOI = AOI;
        document.getElementById("bigmap").style.width = '100%';
        $scope.off();
        map.invalidateSize();

        // console.log("draw mode "+ $scope.drawtoolOn);

        var arcgisOnline = L.esri.Geocoding.arcgisOnlineProvider();

        searchControl = L.esri.Geocoding.geosearch({
            expanded: true,
            collapseAfterResult: false,
            providers: [
                arcgisOnline,

                new L.esri.Geocoding.FeatureLayerProvider({
                    url: ortMapServer + ortLayerAOI,
                    searchFields: ['AOI_NAME'],
                    label: 'Known Areas',
                    bufferRadius: 5000,
                    formatSuggestion: function (feature) {
                        return feature.properties.AOI_NAME;
                    }
                })
            ]
        }).addTo(map);

        searchControl.on('results', function (response) {
            if (response.results[0].properties.AOI_NAME !== undefined) {
                console.log(response.results[0])
            }
        });


    }])


    .controller('MyCtrl2', ['$scope', '$timeout', 'AOI', '$http', function ($scope, $timeout, AOI, $http) {
        $scope.AOI = AOI;

        $scope.name = "controller 2";
        $http.get('emconfig.json')
            .then(function (res) {
                $scope.emconfig = res.data;
            });

        $scope.$on('$viewContentLoaded', function () {
            // document is ready, place  code here
            $timeout(function () {

                AOI.loadWindChart();

                smallmap = L.map('map').setView([45.526, -122.667], 1);
                L.esri.basemapLayer('Oceans').addTo(smallmap);
                L.esri.basemapLayer('OceansLabels').addTo(smallmap);
                //console.log("AOI_ID =" + $scope.AOI.ID + "");
                var minicLayer;
                if (AOI.ID === -9999) {
                    minicLayer = L.geoJson(AOI.drawLayerShape, {
                        color: '#EB660C',
                        weight: 3,
                        fillOpacity: .3,
                    }).addTo(smallmap);
                    AOI.minibounds = minicLayer.getBounds();
                    smallmap.fitBounds(minicLayer.getBounds(), {
                        padding: [50, 50]
                    });

                } else {
                    minicLayer = L.esri.featureLayer({
                        url: ortMapServer + ortLayerAOI,
                        where: "AOI_ID =" + $scope.AOI.ID + "",
                        color: '#EB660C',
                        weight: 3,
                        fillOpacity: .3,
                        //simplifyFactor: 5.0,
                        //precision: 3
                        //,            pane: 'miniAOIfeature'
                    }).addTo(smallmap);


                    //console.log(" minicLayer loaded " + typeof (minicLayer.getBounds));


                    minicLayer.on("load", function (evt) {
                        // create a new empty Leaflet bounds object
                        //             var geoJsonBounds = minicLayer.getBounds();
                        //             map.fitBounds(geoJsonBounds);

                        var bounds = L.latLngBounds([]);
                        // loop through the features returned by the server
                        minicLayer.eachFeature(function (layer) {
                            // get the bounds of an individual feature

                            var layerBounds = layer.getBounds();
                            // extend the bounds of the collection to fit the bounds of the new feature
                            bounds.extend(layerBounds);
                        });

                        // once we've looped through all the features, zoom the map to the extent of the collection
                        AOI.minibounds = bounds;
                        smallmap.fitBounds(bounds);

                        console.log("first small map fitbounds");

                        // unwire the event listener so that it only fires once when the page is loaded
                        minicLayer.off('load');
                    });
                }
                smallmap.invalidateSize();

            }, 1000);
        });

        //document.getElementById("togglefull").addEventListener("click", function () {
        //    toggleFull = !toggleFull;
        //    $scope.toggleFull = toggleFull;
        //
        //
        //    if (toggleFull) {
        //
        //        // the following should be changed to a more angularjs friendly approach. not supposed to be do DOM manipulation here.
        //        document.getElementById("slide1").style.width = '100%';
        //        document.getElementById("togglefull").style.marginLeft = '0px';
        //        document.getElementById("togglefull").style.WebkitTransform = "rotate(180deg)";
        //        document.getElementById("togglefull").style.msTransform = "rotate(180deg)";
        //        document.getElementById("togglefull").style.transform = "rotate(180deg)";
        //
        //        var elems = document.getElementsByClassName('AOItabClass2');
        //        for (var i = 0; i < elems.length; i++) {
        //            elems[i].style.display = 'inline-block';
        //        }
        //        ;
        //        var elems = document.getElementsByClassName('sliderbutton');
        //        for (var i = 0; i < elems.length; i++) {
        //            elems[i].style.visibility = "hidden";
        //        }
        //        ;
        //        smallmap.invalidateSize();
        //        smallmap.fitBounds($scope.minibounds);
        //        console.log("second small map fitbounds");
        //        document.getElementById('slbuttxt0').style.visibility = "hidden";
        //    } else {
        //
        //        document.getElementById("togglefull").style.marginLeft = "-25px";
        //
        //        document.getElementById("slide1").style.width = '50%';
        //        var elems = document.getElementsByClassName('AOItabClass2');
        //        for (var i = 0; i < elems.length; i++) {
        //            elems[i].style.display = 'none';
        //        }
        //        ;
        //        var elems = document.getElementsByClassName('sliderbutton');
        //        for (var i = 0; i < elems.length; i++) {
        //            elems[i].style.visibility = "visible";
        //        }
        //        ;
        //        document.getElementById('slbuttxt0').style.visibility = "visible";
        //        // Code for Chrome, Safari, Opera
        //        document.getElementById("togglefull").style.WebkitTransform = "rotate(0deg)";
        //        // Code for IE9
        //        document.getElementById("togglefull").style.msTransform = "rotate(0deg)";
        //        document.getElementById("togglefull").style.transform = "rotate(0deg)";
        //
        //    }
        //});


    }])

    .controller('pageslideCtrl', ['$scope', 'AOI', 'ModalService', '$state','usSpinnerService', function ($scope, AOI, ModalService, $state, usSpinnerService) { //this one loads once on start up

        $scope.AOI = AOI;
        $scope.baseMapControlOn = false;

        var baseMapControl = L.control.layers(baseMaps,mapOverlay,{
            position: 'topleft',
            collapsed:false
        });
        $scope.box = [];
        var len = 2000;
        for (var i = 0; i < len; i++) {
            $scope.box.push({
                myid: i,
                isActive: false,
                level: 0,
                future: true
            });
        }
        $scope.drawenabled = false;
        $scope.drawlocked = false;
        $scope.zoomlevel = map.getZoom();
        $scope.drawOrSubmitCommand = "DRAW";


        map.on('zoomend', function () {
            $scope.zoomlevel = map.getZoom();
            // console.log("zoomlevel "+ $scope.zoomlevel);

            if ($scope.drawtoolOn) {
                $scope.drawenabled = $scope.zoomLevelGood();
                $scope.$apply();
            }
            //console.log("zoom draw mode " + $scope.drawtoolOn);
        });

        $scope.zoomLevelGood = function () {
            $scope.zoomlevel = map.getZoom();
            if (($scope.zoomlevel <= 12) && ($scope.zoomlevel >= 10 )) {
                return true;
            } else {
                return false;
            }
        };


        $scope.checked = true; // This will be binded using the ps-open attribute

        $scope.drawOff = function () {
            map.setMinZoom(1);
            map.setMaxZoom(12);
            map.dragging.enable(); // panning
            map.touchZoom.enable(); // 2 finger zooms from touchscreens
            map.doubleClickZoom.enable();
            map.boxZoom.enable(); // shift mouse drag zooming.
            //map.zoomControl.enable(); //https://github.com/Leaflet/Leaflet/issues/3172
            map.dragging.enable();
            searchControl.enable();
            $scope.drawlocked = false;
            $scope.drawOrSubmitCommand = "DRAW";
            map.pm.disableDraw('Poly');

        }
        $scope.drawOn = function () {
            map.setMinZoom(map.getZoom()); //lock map view at current zoom level
            map.setMaxZoom(map.getZoom());
            map.dragging.disable(); //no panning
            map.touchZoom.disable(); //no 2 finger zooms from touchscreens
            map.doubleClickZoom.disable();
            map.boxZoom.disable(); //no shift mouse drag zooming.
            //map.zoomControl.disable(); //https://github.com/Leaflet/Leaflet/issues/3172
            searchControl.disable()
            $scope.drawlocked = true;
            $scope.drawOrSubmitCommand = "Drawing";
            if ($scope.polylayer)  map.removeLayer($scope.polylayer);
            map.pm.enableDraw('Poly');
        }

        $scope.showSubmitModal = function () {

            ModalService.showModal({
                templateUrl: "modalDraw.html",
                controller: "submitModalController",
            }).then(function (modal) {
                modal.close.then(function (result) {
                    $scope.customResult = "All good!";
                });
            });

        };

        $scope.startSpin = function(){
            usSpinnerService.spin('spinner-1');
        }
        $scope.stopSpin = function(){
            usSpinnerService.stop('spinner-1');
        }
        var myGPService = L.esri.GP.service({
            url: "http://54.201.166.81:6080/arcgis/rest/services/temp/ORTReport_Draw/GPServer/E%26M%20Draw%20Area",
            //url: "http://54.201.166.81:6080/arcgis/rest/services/temp/ORTReport_Draw_CE/GPServer/CE%20Draw%20Area",
            useCors: false,
            async: true,
            path: 'submitJob',
            asyncInterval: 1
        });
        var myGPTask = myGPService.createTask();

        $scope.baseMapSwitch = function() {
            console.log("basemap " + $scope.baseMapControlOn);
            if ($scope.baseMapControlOn) {
                map.removeControl(baseMapControl);
                $scope.baseMapControlOn=false;

            }else {
                baseMapControl.addTo(map);
                $scope.baseMapControlOn=true;
            }
        }


        $scope.drawIt = function () {
            // console.log("drawIt clicked " + $scope.zoomlevel + " enl?" + $scope.drawenabled);
            switch ($scope.drawOrSubmitCommand.substring(0, 4)) {

                case "DRAW":
                    if ($scope.drawenabled) {
                        if ($scope.drawlocked) {
                            $scope.drawOff();
                        } else {
                            $scope.drawOn();
                        }
                    }
                    break;
                case "Subm":

                    //console.log("submit");
                    //console.log($scope.polylayer);
                    $scope.drawOrSubmitCommand = "Working";
                    var myGPTask = myGPService.createTask();
                    myGPTask.setParam("Report_Boundary", $scope.polylayer.toGeoJSON());
                    myGPTask.setOutputParam("Output_Report");

                    $scope.startSpin();

                    myGPTask.run(function (error, geojson, response) {
                        console.log(response);
                        if (error) {
                            $scope.drawOrSubmitCommand = "Error " + error;
                        }
                        else if (geojson) {
                            $scope.drawOrSubmitCommand = "Complete";
                            AOI.featureCollection = geojson.Output_Report;
                            AOI.drawLayerShape = $scope.polylayer.toGeoJSON();
                        }
                        $scope.stopSpin();
                        $scope.$apply();
                    });

                    break;
                case "Work":
                    $scope.showSubmitModal();
                    break;
                case "Erro":
                    console.log("Error pressed");
                    $scope.drawOrSubmitCommand = "Submit";
                    break;
                case "Comp":
                    $scope.drawOff();
                    map.removeLayer($scope.polylayer);
                    map.removeControl(searchControl);
                    $scope.drawtoolOn = false;
                    $scope.drawOrSubmitCommand = "DRAW";
                    $state.go('CEview');
                    $scope.paneon();
                    document.getElementById("bigmap").style.width = '50%';
                    map.invalidateSize();
                    //AOI.zoomTo();
                    AOI.loadData(AOI.featureCollection.features[0].attributes.AOI_ID, AOI.featureCollection.features[0].attributes.AOI_NAME);
                    break;

            }
        };


        map.on('pm:create', function (e) {
            //console.log(e);
            $scope.polylayer = e.layer;
            $scope.drawOrSubmitCommand = "Submit";
            $scope.$apply();
        });

        $scope.toggle = function () { //toggles slider pane but does nothing about the AOI
            $scope.checked = !$scope.checked;
        };

        $scope.t_menu_box = function (id, levl) {
            $scope.box[id].level = levl;

            $scope.box[id].isActive = !$scope.box[id].isActive;
            for (i = 0; i < len; i++) {
                if ((i != id) && (levl <= $scope.box[i].level)) {
                    $scope.box[i].isActive = false;
                }
            }
            //console.log($scope.box[id].myid + " "+id+" is " +$scope.box[id].isActive);
        };


        $scope.reset = function () { //unloads AOI but leaves slider pane on


            $scope.AOIoff();
            $scope.paneon();
            AOI.unloadData();
            $scope.stopSpin();
            if ($scope.baseMapControlOn) {
                map.removeControl(baseMapControl);
                $scope.baseMapControlOn = false;
            }

            for (i = 0; i < len; i++) {
                $scope.box[i].isActive = false;
            }
            if ($scope.polylayer)  map.removeLayer($scope.polylayer);

            if ($scope.drawtoolOn) {
                $scope.drawOff();
                document.getElementById("bigmap").style.width = '50%';
                map.removeControl(searchControl);
                $scope.drawtoolOn = false;
                $scope.drawOrSubmitCommand = "DRAW";

                map.invalidateSize();
            }
            map.setView([33.51, -78.3], 6);
        };

        $scope.off = function () { //unloads AOI and turns off slider pane
            $scope.AOIoff();
            $scope.paneoff();
            AOI.unloadData();
            //map.fire('zoomend');

            $scope.drawenabled = $scope.zoomLevelGood();

            $scope.drawtoolOn = true;

        };

        $scope.on = function (AOI, AOI_id) {//turns on AOI and slider pane
            $scope.AOIon();
            $scope.paneon();
            //console.log(AOI);
            //$scope.Cur_AOI = AOI;
            //$scope.AOI_ID = AOI_id;


            //console.log($scope.AOI_ID);
        };

        $scope.mover = function (AOI_id) {//turns on poly on mouse over in menu

            if (!mouseLayer) {
                mouseLayer = L.esri.featureLayer({ //AOI poly (7)
                    url: ortMapServer + ortLayerAOI,
                    //where: "AOI_NAME='" + $scope.Cur_AOI + "'",
                    where: "AOI_ID =" + AOI_id + "",
                    color: '#EB660C', weight: 3, fillOpacity: .3,
                    //pane: 'AOIfeature',
                    simplifyFactor: 2.0,
                    // precision: 2
                }).addTo(map);
                //console.log(" mouseLayer loaded " + AOI_id);
            }
            ;

            // console.log(AOI_id);

        };
        $scope.mout = function (AOI_id) {//turns on poly on mouse over in menu

            if (mouseLayer) {
                map.removeLayer(mouseLayer);
                mouseLayer = null;
                //console.log(" mouseLayer UNloaded " + AOI_id);
            }
            //console.log("mouselayer = " + mouseLayer )
            // console.log(AOI_id);

        };

        $scope.AOIoff = function () {
            // there is probably a better place for this
            toggle = false;
        };

        $scope.AOIon = function () {
            $scope.checkifAOI = true;
        };

        $scope.paneoff = function () {
            $scope.checked = false;
            toggleFull = false;
        };

        $scope.paneon = function () {
            $scope.checked = true;
            document.getElementById("slide1").style.width = '50%';
            toggleFull = false;
        };

        $scope.aoismenu = [];
        $scope.aoistates = [];


        var query = L.esri.query({
            url: ortMapServer + ortLayerAOI

        });

        query.returnGeometry(false).where("KNOWN_AREA='Special Interest Areas'").run(function (error, featureCollection, response) {

            var ba = 0;

            for (var i = 0, j = featureCollection.features.length; i < j; i++) {

                $scope.aoismenu[ba] = {
                    AOI_NAME: featureCollection.features[i].properties.AOI_NAME,
                    COMMON_NM: featureCollection.features[i].properties.COMMON_NM,
                    REPORT_TYPE: featureCollection.features[i].properties.REPORT_TYPE,
                    AOI_ID: featureCollection.features[i].properties.AOI_ID,
                    DATASET_NM: featureCollection.features[i].properties.DATASET_NM,
                    DESC_: featureCollection.features[i].properties.DESC_
                };
                ba++;

            }
            //console.log($scope.aoismenu);
            $scope.aoismenu.sort(function (a, b) {
                //return parseFloat(a.AOI_NAME) - parseFloat(b.AOI_NAME);
                return a.AOI_NAME.localeCompare(b.AOI_NAME);
            });
        });


        query.returnGeometry(false).where("KNOWN_AREA='Other Areas by State'").run(function (error, featureCollection, response) {
                var ba = 0;
                for (var i = 0, j = featureCollection.features.length; i < j; i++) {
                    $scope.aoistates[ba] = {
                        AOI_NAME: featureCollection.features[i].properties.AOI_NAME,
                        COMMON_NM: featureCollection.features[i].properties.COMMON_NM,
                        REPORT_TYPE: featureCollection.features[i].properties.COMMON_NM,
                        AOI_ID: featureCollection.features[i].properties.AOI_ID,
                        DATASET_NM: featureCollection.features[i].properties.DATASET_NM,
                        DESC_: featureCollection.features[i].properties.DESC_
                    };
                    ba++;
                }
                //console.log($scope.aoistates);
                $scope.aoistates.sort(function (a, b) {
                    return a.AOI_NAME.localeCompare(b.AOI_NAME);
                });
                //console.log($scope.aoistates);
            }
        );

    }
    ])
;


angular.element(document).ready(function () {

    c = angular.element(document.querySelector('#controller-demo')).scope();
});

// Test
angular.element(document).ready(function () {
    // if (console.assert)
    //     console.assert(document.querySelectorAll('body > .ng-pageslide').length == 12, 'Made all of them')
});
