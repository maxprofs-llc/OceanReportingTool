'use strict';

/* Services */

angular.module('ortApp.services', [])
    .factory('Highcharts', function () {
        return window.Highcharts; // assumes Highcharts has already been loaded on the page
    })
    .factory('webService', function ($http) {

        var getData = function (urlInput) {


            // Angular $http() and then() both return promises themselves
            return $http({method: "GET", url: urlInput}).then(function (result) {

                // What we return here is the data that will be accessible
                // to us after the promise resolves


                return result.data;

            });
        };


        return {getData: getData};


    })
    .factory('_', function () {
        return window._; // assumes underscore has already been loaded on the page
    })
    .factory('L', function () {
        return window.L;
    })
    .provider('AOIConfig', function () {
        var config = {
            ortMapServer: '',
            ortLayerAOI: '',
            ortLayerData: '',
            ortReportExpires: '',
            ortEnergyGPService: '',
            ortCommonGPService: '',
            ortTranspoGPService: '',
            ortNaturalGPService: '',
            ortEconGPService: ''
        };

        return {
            set: function (value) {
                config = value;
            },
            $get: [function () {
                return config
            }]
        };
    })
    .factory('myGPService', ['L', '$q', function (L, $q) {
        var myGPService = function (url) {
            var gpService = L.esri.GP.service({
                url: url,
                useCors: false,
                async: true,
                path: 'submitJob',
                asyncInterval: 5
            });

            var task = gpService.createTask();
            return {
                run: function (shape) {
                    var deferred = $q.defer();


                    task.setParam("Report_Boundary", shape);
                    task.setOutputParam("Output_Report");

                    task.run(function (error, geojson, raw) {

                        if (error) deferred.resolve(error);
                        else {
                            geojson.Output_Report.jobId = geojson.jobId;
                            deferred.resolve(geojson.Output_Report)
                        }
                    });

                    return deferred.promise;

                }
            };
        };

        return myGPService;
    }])
    .factory('myQueryService', ['L', '$q', function (L, $q) {
        var myQueryService = function (url) {
            var leafletQuery = L.esri.query({
                url: url
            });

            return {
                query: function (where) {
                    var deferred = $q.defer();
                    leafletQuery.returnGeometry(false).where(where).run(function (error, featureCollection, response) {
                        if (error) deferred.reject(error);
                        else {
                            featureCollection.fields = response.fields;
                            deferred.resolve(featureCollection);
                        }
                    });
                    return deferred.promise;
                }
            }
        };
        return myQueryService;
    }])
    .factory('myGetService', ['L', '$q', 'AOIConfig', function (L, $q, AOIConfig) {
        return {
            get: function (url, jobId) {
                var deferred = $q.defer();
                L.esri.get(url + '/jobs/' + jobId + '/results/Output_Report', {}, function (error, response) {
                    if (error) deferred.reject(error);
                    else deferred.resolve(response);
                });
                return deferred.promise;
            }
        };
    }])
    .service('AOI', ['$rootScope', '$window', 'L', '$q', 'AOIConfig', 'myQueryService', 'myGetService', 'myGPService',
        function ($rootScope, $window, L, $q, AOIConfig, myQueryService, myGetService, myGPService) {
            var AOI = {
                toggleFullStyle: [],
                OceanJobContributionsSeries: [],
                drawAreaJobId: {},
                Shared: false,
                url: $window.location.href.split('#'),
                layer: null,
                feature: null,
                ID: null,
                name: null,
                added: false,
                EMWindPlanningArea: [],
                EMWindPlanningAreaSum: 0,
                metadata: [],
                EMActiveRenewableEnergyLeases: [],
                EMWindResourcePotential: [],
                EMOceanDisposalSites: [],
                EMMarineMineralsLeases: [],
                EMMarineHydrokineticProjects: [],
                CETribalLands: [],
                EMSurficialSediment: [],
                EMOceanWaveResourcePotential: [],
                EMTidalPower: [],
                EMCurrentPower: [],
                EMBeachNourishmentProjects: [],
                OGPlanA: [],
                OGLease: [],
                OGWells: [],
                OGresource: [],
                EMCoastalEnergyFacilities: [],
                CEElevation: [],
                EMWindResourceClassification: [],
                EMWindResourceArea: 0,
                CEAreaOfPoly: [],
                CEFedGeoRegs: [],
                CECongress: [],
                CEHouse: [],
                CESenate: [],
                CECoastalCounties: [],
                CEFederalAndState: [],
                CEFederalTotal: 0,
                CEStateTotal: 0,
                TISubmarine: [],
                TICoastal: [],
                TIDangerZones: [],
                NRCHabConcern: [],
                NRCCriticalHab: [],
                NRCMigratorySharks: [],
                NRCMigratoryFish: [],
                ECEcon: [],
                ECEconEmploy: [],
                ECEconGDP: [],
                ECEconWages: [],
                ECStateGDP: [],
                ECCountyGDP: [],
                CEPlaces: [],
                TIShipping: [],
                TIShippingTotal: 0,
                TIRightWhale: [],
                TIVessel: [],
                TIPrincipalPorts: [],
                NRCNearby: [],
                NRCSoftCoral: [],
                NRCStonyCoral: [],
                NRCReefs: [],
                NRCBarrier: [],
                ECCoastalCounties: [],
                ECFishRevenue: [],
                TIPilot: [],
                TIAnchorage: [],
                map: {},
                EMBeachName: [],
                EMBeachTOTAL_FUND: [],
                EMBeachSAND_VOL_C: [],
                EMBeachCLASS_CNT: [],
                EMBeachDist_Mi: [],

                toggleLayer: function (layer, isVisible) {
                    if (!isVisible) {
                        layer.addTo(AOI.map);
                        isVisible = true;
                    } else {
                        AOI.map.removeLayer(layer);
                        isVisible = false;
                    }
                    return isVisible;
                },
                display: function () {
                    AOI.map.isLoaded.then(function () {
                        if (AOI.ID === -9999) {
                            AOI.layer = L.geoJson(AOI.drawLayerShape, {
                                className: 'map-AOIfeature',
                                pane: 'AOIfeature'
                            }).addTo(AOI.map);
                            AOI.map.fitBounds(AOI.layer.getBounds(), {
                                padding: [1, 1]
                            });
                        } else {
                            AOI.layer = L.esri.featureLayer({
                                url: AOIConfig.ortMapServer + AOIConfig.ortLayerAOI,
                                className: 'map-AOIfeature',
                                where: "AOI_ID =" + AOI.ID + "",
                                pane: 'AOIfeature'
                            }).addTo(AOI.map);

                            AOI.layer.on("load", function (evt) {
                                // create a new empty Leaflet bounds object

                                var myBounds = L.latLngBounds([]);
                                // loop through the features returned by the server

                                AOI.layer.eachFeature(function (layer) {
                                    // get the bounds of an individual feature
                                    var layerBounds = layer.getBounds();
                                    // extend the bounds of the collection to fit the bounds of the new feature
                                    myBounds.extend(layerBounds);
                                });

                                try {
                                    AOI.map.fitBounds(myBounds);

                                    AOI.layer.off('load'); // unwire the event listener so that it only fires once when the page is loaded or again on error
                                }
                                catch (err) {
                                    //for some reason if we are zoomed in elsewhere and the bounds of this object are not in the map view, we can't read bounds correctly.
                                    //so for now we will zoom out on error and allow this event to fire again.

                                    AOI.map.setView([32.06, -78.3], 6); //it should try again.
                                }
                            });
                        }
                        AOI.isVisible = true;
                    });

                },
                hide: function () {

                    if (AOI.isVisible) {
                        AOI.map.removeLayer(AOI.layer);
                    }
                    AOI.isVisible = false;
                },
                isVisible: false,
                getReport: function () {
                    var allPromises = [];

                    var EMGPService = new myGPService(AOIConfig.ortEnergyGPService);
                    var CEGPService = new myGPService(AOIConfig.ortCommonGPService);
                    var TIGPService = new myGPService(AOIConfig.ortTranspoGPService);
                    var NRCGPService = new myGPService(AOIConfig.ortNaturalGPService);
                    var ECGPService = new myGPService(AOIConfig.ortEconGPService);

                    allPromises.push(EMGPService.run(AOI.drawLayerShape));
                    allPromises.push(CEGPService.run(AOI.drawLayerShape));
                    allPromises.push(TIGPService.run(AOI.drawLayerShape));
                    allPromises.push(NRCGPService.run(AOI.drawLayerShape));
                    allPromises.push(ECGPService.run(AOI.drawLayerShape));

                    console.log(EMGPService);
                    return $q.all(allPromises).then(function (results) {
                        AOI.featureCollection = {fields: null, features: []};

                        AOI.drawAreaJobId.EM = results[0].jobId;
                        AOI.drawAreaJobId.CE = results[1].jobId;
                        AOI.drawAreaJobId.TI = results[2].jobId;
                        AOI.drawAreaJobId.NRC = results[3].jobId;
                        AOI.drawAreaJobId.EC = results[4].jobId;

                        angular.forEach(results, function (result, i) {
                            if (!result.error) {
                                if (!AOI.featureCollection.fields) AOI.featureCollection.fields = result.fields;
                                AOI.featureCollection.features.push.apply(AOI.featureCollection.features, result.features);
                            }
                        });
                        if (AOI.viewName !== 'draw') $window.alert("Your custom report has finished running. Click OK to view it.");
                        AOI.unloadData();
                        AOI.loadData(-9999, '');
                    });

                },
                getSavedReport: function () {
                    var promises = [];

                    var shapeDeferred = $q.defer();
                    promises.push(shapeDeferred.promise);
                    L.esri.get(AOIConfig.ortCommonGPService + '/jobs/' + AOI.drawAreaJobId.CE + '/inputs/Report_Boundary', {}, function (error, response) {
                        if (error) {

                        } else {
                            AOI.drawLayerShape = {
                                type: "Feature",
                                geometry: {
                                    type: "Polygon",
                                    coordinates: response.value.features[0].geometry.rings
                                }
                            };
                            shapeDeferred.resolve();
                        }
                    });
                    AOI.featureCollection = {fields: null, features: []};
                    promises.push(myGetService.get(AOIConfig.ortCommonGPService, AOI.drawAreaJobId.CE));
                    promises.push(myGetService.get(AOIConfig.ortEnergyGPService, AOI.drawAreaJobId.EM));
                    promises.push(myGetService.get(AOIConfig.ortNaturalGPService, AOI.drawAreaJobId.NRC));
                    promises.push(myGetService.get(AOIConfig.ortTranspoGPService, AOI.drawAreaJobId.TI));
                    promises.push(myGetService.get(AOIConfig.ortEconGPService, AOI.drawAreaJobId.EC));


                    $q.all(promises).then(function (results) {
                        angular.forEach(results, function (result, i) {
                            if (result) {
                                if (!result.error) {
                                    if (!AOI.featureCollection.fields) AOI.featureCollection.fields = result.value.fields;
                                    AOI.featureCollection.features.push.apply(AOI.featureCollection.features, result.value.features);
                                }
                            }
                        });
                        AOI.loadData(-9999, '');
                    });
                },
                loadData: function (id, name) {
                    AOI.ID = id;
                    AOI.EMWindResourcePotentialLayer = L.esri.featureLayer({
                        url: AOIConfig.optionalLayers.EMWindResourcePotentialLayer.server + AOIConfig.optionalLayers.EMWindResourcePotentialLayer.num,
                        pane: 'EMWindResourcePotentialLayerPane',
                        style: function (feature) {
                            if (feature.properties.Speed_90 >= 8.8) {
                                return {color: '#0E3708', weight: 1, fillOpacity: .8};
                            } else if (feature.properties.Speed_90 >= 8.0) {
                                return {color: '#5C9227', weight: 1, fillOpacity: .8};
                            } else if (feature.properties.Speed_90 >= 7.5) {
                                return {color: '#A6C900', weight: 1, fillOpacity: .8};
                            } else if (feature.properties.Speed_90 >= 7.0) {
                                return {color: '#EFCF06', weight: 1, fillOpacity: .8};
                            } else if (feature.properties.Speed_90 >= 6.6) {
                                return {color: '#D96704', weight: 1, fillOpacity: .8};
                            } else if (feature.properties.Speed_90 < 6.6) {
                                return {color: '#A90306', weight: 1, fillOpacity: .8};
                            } else {
                                return {color: 'white', weight: 1, fillOpacity: .8};
                            }
                        }
                    });

                    AOI.EMActiveRenewableEnergyLeasesLayer = L.esri.featureLayer({
                        url: AOIConfig.optionalLayers.EMActiveRenewableEnergyLeasesLayer.server + AOIConfig.optionalLayers.EMActiveRenewableEnergyLeasesLayer.num,
                        pane: 'EMActiveRenewableEnergyLeasesLayerPane',
                        style: function (feature) {

                            return {color: 'white', weight: 1, fillOpacity: .5};
                        }
                    });
                    AOI.EMWindPlanningAreaLayer = L.esri.featureLayer({
                        url: AOIConfig.optionalLayers.EMWindPlanningAreaLayer.server + AOIConfig.optionalLayers.EMWindPlanningAreaLayer.num,
                        pane: 'EMWindPlanningAreaLayerPane',
                        style: function (feature) {

                            return {color: 'Black', weight: 1, fillOpacity: .5};
                        }
                    });
                    AOI.EMOceanDisposalSitesLayer = L.esri.featureLayer({
                        url: AOIConfig.optionalLayers.EMOceanDisposalSitesLayer.server + AOIConfig.optionalLayers.EMOceanDisposalSitesLayer.num,
                        pane: 'EMOceanDisposalSitesLayerPane',
                        style: function (feature) {
                            return {fillColor: '#FFA7A7', color: '#4A4A4A', weight: 1.5, fillOpacity: .5};
                        }
                    });
                    AOI.EMMarineMineralsLeasesLayer = L.esri.featureLayer({
                        url: AOIConfig.optionalLayers.EMMarineMineralsLeasesLayer.server + AOIConfig.optionalLayers.EMMarineMineralsLeasesLayer.num,
                        pane: 'EMMarineMineralsLeasesLayerPane',
                        style: function (feature) {
                            if (feature.properties.RuleID === 1) {
                                return {color: '#7300D9', weight: 2, fillOpacity: 0};
                            } else if (feature.properties.RuleID === 2) {
                                return {color: '#92D050', weight: 2, fillOpacity: 0};
                            } else if (feature.properties.RuleID === 3) {
                                return {color: '#FFC000', weight: 2, fillOpacity: 0};
                            } else if (feature.properties.RuleID === 4) {
                                return {color: '#0070C0', weight: 2, fillOpacity: 0};
                            } else {
                                return {color: 'white', weight: 3, fillOpacity: 0};
                            }
                        }
                    });


                    AOI.EMMarineHydrokineticProjectsLayer = L.esri.featureLayer({
                        url: AOIConfig.optionalLayers.EMMarineHydrokineticProjectsLayer.server + AOIConfig.optionalLayers.EMMarineHydrokineticProjectsLayer.num,
                        pane: 'EMMarineHydrokineticProjectsLayerPane',
                        pointToLayer: function (feature, latlng) {
                            return L.marker(latlng, {
                                icon: L.icon({
                                    iconUrl: 'img/HydrokineticLeasesGraphic.svg',
                                    iconSize: [32, 37],
                                    iconAnchor: [16, 37],
                                    popupAnchor: [0, -28]
                                })
                            });
                        }
                    });

                    AOI.EMOceanWaveResourcePotentialLayer = L.esri.featureLayer({
                        url: AOIConfig.optionalLayers.EMOceanWaveResourcePotentialLayer.server + AOIConfig.optionalLayers.EMOceanWaveResourcePotentialLayer.num,
                        pane: 'EMOceanWaveResourcePotentialLayerPane',
                        style: function (feature) {
                            if (feature.properties.ann_wef > 40) {
                                return {color: '#B0B497', weight: 1, fillOpacity: .8};
                            } else if (feature.properties.ann_wef > 30.0) {
                                return {color: '#B6BC9E', weight: 1, fillOpacity: .8};
                            } else if (feature.properties.ann_wef > 20.0) {
                                return {color: '#BBC1A4', weight: 1, fillOpacity: .8};
                            } else if (feature.properties.ann_wef > 15.0) {
                                return {color: '#C0C6A8', weight: 1, fillOpacity: .8};
                            } else if (feature.properties.ann_wef > 10.0) {
                                return {color: '#C9D0B1', weight: 1, fillOpacity: .8};
                            } else if (feature.properties.ann_wef > 8.0) {
                                return {color: '#D0D8B9', weight: 1, fillOpacity: .8};
                            } else if (feature.properties.ann_wef > 6) {
                                return {color: '#D5DDC0', weight: 1, fillOpacity: .8};
                            } else if (feature.properties.ann_wef > 4.0) {
                                return {color: '#DEE7C9', weight: 1, fillOpacity: .8};
                            } else if (feature.properties.ann_wef > 2.0) {
                                return {color: '#E4EFD2', weight: 1, fillOpacity: .8};
                            } else if (feature.properties.ann_wef < 2.01) {
                                return {color: '#EBF6D8', weight: 1, fillOpacity: .8};
                            } else {
                                return {color: 'white', weight: 1, fillOpacity: .8};
                            }
                        }
                    });

                    AOI.EMTidalPowerLayer = L.esri.dynamicMapLayer({
                        url: AOIConfig.optionalLayers.EMTidalPowerLayer.server,
                        pane: 'EMTidalPowerLayerPane',
                        layers: [AOIConfig.optionalLayers.EMTidalPowerLayer.num],
                        opacity: .8
                    });

                    AOI.EMCurrentPowerLayer = L.esri.dynamicMapLayer({
                        url: AOIConfig.optionalLayers.EMCurrentPowerLayer.server,
                        pane: 'EMCurrentPowerLayerPane',
                        layers: [AOIConfig.optionalLayers.EMCurrentPowerLayer.num],
                        opacity: .8
                    });

                    AOI.EMBeachNourishmentProjectsLayer = L.esri.featureLayer({
                        url: AOIConfig.optionalLayers.EMBeachNourishmentProjectsLayer.server + AOIConfig.optionalLayers.EMBeachNourishmentProjectsLayer.num,
                        pane: 'EMBeachNourishmentProjectsLayerPane',
                        style: function (feature) {
                            return {color: '#8B572A', weight: 4, fillOpacity: 0};
                        }
                    });

                    AOI.EMCoastalEnergyFacilitiesLayer = L.esri.featureLayer({
                        url: AOIConfig.optionalLayers.EMCoastalEnergyFacilitiesLayer.server + AOIConfig.optionalLayers.EMCoastalEnergyFacilitiesLayer.num,
                        pane: 'EMCoastalEnergyFacilitiesLayerPane',
                        onEachFeature: function (feature, layer) {
                            if (feature.properties) {
                                layer.bindPopup(function (feature) {
                                    return L.Util.template('<h3>{name}</h3><hr>{county}, {state}', feature.feature.properties);
                                }, {closeButton: false, offset: L.point(0, -5), autoPanPaddingTopLeft: L.point(0, 60)});
                                layer.on('mouseover', function () {
                                    layer.openPopup();
                                });
                                layer.on('mouseout', function () {
                                    layer.closePopup();
                                });
                            }
                        },
                        pointToLayer: function (feature, latlng) {
                            return L.marker(latlng, {
                                icon: L.icon({
                                    iconUrl: 'img/CoastalEnergyGraphic.svg',
                                    iconSize: [32, 37],
                                    iconAnchor: [16, 37],
                                    popupAnchor: [0, -28]
                                })
                            });
                        }
                    });

                    AOI.CEElevationLayer = L.esri.dynamicMapLayer({
                        url: AOIConfig.optionalLayers.CEElevationLayer.server,
                        pane: 'CEElevationLayerPane',
                        layers: [AOIConfig.optionalLayers.CEElevationLayer.num],
                        opacity: .8
                    });

                    AOI.TISubmarineLayer = L.esri.featureLayer({
                        url: AOIConfig.optionalLayers.TISubmarineLayer.server + AOIConfig.optionalLayers.TISubmarineLayer.num,
                        pane: 'TISubmarineLayerPane',
                        style: function (feature) {
                            return {color: '#880cf4', weight: 2, fillOpacity: 0};
                        }
                    });
                    AOI.TIDangerZonesLayer = L.esri.featureLayer({
                        url: AOIConfig.optionalLayers.TIDangerZonesLayer.server + AOIConfig.optionalLayers.TIDangerZonesLayer.num,
                        pane: 'TIDangerZonesLayerPane',

                        style: function (feature) {
                            if (feature.properties.agencyOfUse === 'NASA') {
                                return {color: '#1a5dad', weight: 1, fillOpacity: .7};
                            } else if (feature.properties.agencyOfUse === 'U.S. Air Force') {
                                return {color: '#7dc7ec', weight: 1, fillOpacity: .7};
                            } else if (feature.properties.agencyOfUse === 'U.S. Army') {
                                return {color: '#ffd800', weight: 1, fillOpacity: .7};
                            } else if (feature.properties.agencyOfUse === 'U.S. Marine Corps') {
                                return {color: '#b6100c', weight: 1, fillOpacity: .7};
                            } else if (feature.properties.agencyOfUse === 'U.S. Navy') {
                                return {color: '#1c2f6b', weight: 1, fillOpacity: .7};
                            } else if (feature.properties.agencyOfUse === 'U.S. Coast Guard') {
                                return {color: '#f3871a', weight: 1, fillOpacity: .7};
                            } else {
                                return {color: '#b1b1b1', weight: 1, fillOpacity: .7};
                            }
                        }
                    });

                    AOI.CEPlaceLayer = L.esri.featureLayer({
                        url: AOIConfig.optionalLayers.CEPlaceLayer.server + [AOIConfig.optionalLayers.CEPlaceLayer.num],
                        pane: 'CEPlaceLayerPane',
                        onEachFeature: function (feature, layer) {
                            if (feature.properties) {
                                layer.bindPopup(function (feature) {
                                    return L.Util.template('{NAME}, {ST}', feature.feature.properties);
                                }, {closeButton: false, offset: L.point(0, -5), autoPanPaddingTopLeft: L.point(0, 60)});
                                layer.on('mouseover', function () {
                                    layer.openPopup();
                                });
                                layer.on('mouseout', function () {
                                    layer.closePopup();
                                });
                            }
                        },
                        pointToLayer: function (feature, latlng) {
                            return L.marker(latlng, {
                                icon: L.icon({
                                    iconUrl: 'img/Map_marker.svg',
                                    iconSize: [32, 37],
                                    iconAnchor: [16, 37],
                                    popupAnchor: [0, -28]
                                })
                            })
                        }
                    });


                    AOI.TIPrincipalPortsLayer = L.esri.featureLayer({
                        url: AOIConfig.optionalLayers.TIPrincipalPortsLayer.server + [AOIConfig.optionalLayers.TIPrincipalPortsLayer.num],
                        pane: 'TIPrincipalPortsLayerPane',
                        pointToLayer: function (feature, latlng) {
                            return L.marker(latlng, {
                                icon: L.icon({
                                    iconUrl: 'img/transportation-anchor.svg',
                                    iconSize: [32, 37],
                                    iconAnchor: [16, 37],
                                    popupAnchor: [0, -28]
                                })
                            });
                        }
                    });
                    AOI.NRCReefsLayer = L.esri.featureLayer({
                        url: AOIConfig.optionalLayers.NRCReefsLayer.server + [AOIConfig.optionalLayers.NRCReefsLayer.num],
                        pane: 'NRCReefsLayerPane',
                        pointToLayer: function (feature, latlng) {
                            return L.marker(latlng, {
                                icon: L.icon({
                                    iconUrl: 'img/svg-elements_reefs.svg',
                                    iconSize: [24, 24],
                                    iconAnchor: [12, 12],
                                    popupAnchor: [0, -28]
                                })
                            });
                        }
                    });
                    AOI.CETribalLayer = L.esri.featureLayer({
                        url: AOIConfig.optionalLayers.CETribalLayer.server + AOIConfig.optionalLayers.CETribalLayer.num,
                        pane: 'CETribalLayerPane',
                        onEachFeature: function (feature, layer) {
                            if (feature.properties) {
                                layer.bindPopup(function (feature) {
                                    return L.Util.template('{NAMELSAD}', feature.feature.properties);
                                }, {closeButton: false, offset: L.point(0, -5), autoPanPaddingTopLeft: L.point(0, 60)});
                                layer.on('mouseover', function () {
                                    layer.setStyle({fillColor: '#969EA7', fillOpacity: 0.7});
                                    layer.openPopup();
                                });
                                layer.on('mouseout', function () {
                                    layer.setStyle({fillColor: '#ffffbe', weight: 1.5, fillOpacity: .5});
                                    layer.closePopup();
                                });
                            }
                        },
                        style: function (feature) {
                            return {fillColor: '#ffffbe', color: '#e69901', weight: 1.5, fillOpacity: .5};
                        }
                    });


                    AOI.NRCNearbyLayer = L.esri.featureLayer({
                        url: AOIConfig.optionalLayers.NRCNearbyLayer.server + AOIConfig.optionalLayers.NRCNearbyLayer.num,
                        pane: 'NRCNearbyLayerPane',
                        onEachFeature: function (feature, layer) {
                            if (feature.properties) {
                                layer.bindPopup(function (feature) {
                                    return L.Util.template('{Site_Name}', feature.feature.properties);
                                }, {closeButton: false, offset: L.point(0, -5), autoPanPaddingTopLeft: L.point(0, 60)});
                                layer.on('mouseover', function () {
                                    layer.setStyle({fillColor: '#969EA7', fillOpacity: 0.7});
                                    layer.openPopup();
                                });
                                layer.on('mouseout', function () {
                                    layer.setStyle({fillColor: '#75bc73', fillOpacity: .7});
                                    layer.closePopup();
                                });
                            }
                        },
                        style: function (feature) {
                            return {color: '#75bc73', weight: 1.5, fillOpacity: .7};
                        }
                    });
                    AOI.NRCBarrierLayer = L.esri.featureLayer({
                        url: AOIConfig.optionalLayers.NRCBarrierLayer.server + AOIConfig.optionalLayers.NRCBarrierLayer.num,
                        pane: 'NRCBarrierLayerPane',
                        style: function (feature) {
                            return {color: '#d6ce70', weight: 1.5, fillOpacity: .7};
                        }
                    });

                    AOI.TIVesselLayer = L.esri.dynamicMapLayer({
                        url: AOIConfig.optionalLayers.TIVesselLayer.server,
                        pane: 'TIVesselLayerPane',
                        layers: [AOIConfig.optionalLayers.TIVesselLayer.num],
                        opacity: .8
                    });

                    AOI.NRCSoftCoralLayer = L.esri.dynamicMapLayer({
                        url: AOIConfig.optionalLayers.NRCSoftCoralLayer.server,
                        pane: 'NRCSoftCoralLayerPane',
                        layers: [AOIConfig.optionalLayers.NRCSoftCoralLayer.num],
                        opacity: .8
                    });
                    AOI.NRCStoneyCoralLayer = L.esri.dynamicMapLayer({
                        url: AOIConfig.optionalLayers.NRCStoneyCoralLayer.server,
                        pane: 'NRCStoneyCoralLayerPane',
                        layers: [AOIConfig.optionalLayers.NRCStoneyCoralLayer.num],
                        opacity: .8
                    });
                    AOI.ECCoastalCountiesLayer = L.esri.featureLayer({
                        url: AOIConfig.optionalLayers.ECCoastalCountiesLayer.server + AOIConfig.optionalLayers.ECCoastalCountiesLayer.num,
                        pane: 'ECCoastalCountiesLayerPane',
                        onEachFeature: function (feature, layer) {
                            if (feature.properties) {
                                layer.bindPopup(function (feature) {
                                    return L.Util.template('{cntyname}, {st_abbr}', feature.feature.properties);
                                }, {
                                    closeButton: false,
                                    offset: L.point(0, -20),
                                    autoPanPaddingTopLeft: L.point(0, 60)
                                });
                                layer.on('mouseover', function () {
                                    layer.setStyle({fillOpacity: 0.7});
                                    layer.openPopup();
                                });
                                layer.on('mouseout', function () {
                                    layer.setStyle({fillOpacity: 0});
                                    layer.closePopup();
                                });
                            }
                        },
                        style: function (feature) {
                            return {color: '#b613ba', fillColor: '#969EA7', weight: 1.5, fillOpacity: 0};
                        }
                    });


                    if (AOI.ID === -9999) {
                        var featureCollection = JSON.parse(JSON.stringify(AOI.featureCollection));

                        var tempFeatureArray = [];
                        angular.forEach(featureCollection.features, function (feature) {
                            var tempFeatureObject = {};
                            angular.forEach(featureCollection.fields, function (field) {
                                tempFeatureObject[field.name] = feature.attributes[field.name];
                            });
                            tempFeatureArray.push(tempFeatureObject);
                        });

                        AOI.massageData(tempFeatureArray);
                        AOI.display();

                        if (AOI.CEPlaces.length > 0) {
                            if ((AOI.CEPlaces[0].Dist_Mi * 0.868976) > 3) {
                                AOI.name = (AOI.CEPlaces[0].Dist_Mi * 0.868976).toFixed(2) + " Nautical Miles from " + AOI.CEPlaces[0].Name + ", " + AOI.CEPlaces[0].ST;
                            } else AOI.name = "Near " + AOI.CEPlaces[0].Name;
                        }
                        else AOI.name = "My Report";


                    } else {
                        var queryService = new myQueryService(AOIConfig.ortMapServer + AOIConfig.ortLayerData);
                        queryService.query("AOI_ID =" + AOI.ID + "").then(function (featureCollection) {
                            AOI.name = featureCollection.features[0].properties.AOI_NAME;

                            var tempFeatureArray = [];
                            angular.forEach(featureCollection.features, function (feature) {
                                var tempFeatureObject = {};
                                angular.forEach(featureCollection.fields, function (field) {
                                    tempFeatureObject[field.name] = feature.properties[field.name];
                                });
                                tempFeatureArray.push(tempFeatureObject);
                            });
                            //the idea here is , since the two arrays that can make it to .massageData are organized differently, we need to parse them into a known structure.

                            AOI.massageData(tempFeatureArray);
                            AOI.display();
                        });
                    }

                    AOI.isLoaded = true;
                },
                massageData: function (featureCollection) {
                    angular.forEach(featureCollection, function (feature) {

                        switch (feature.DATASET_NM) {
                            case "Anchorage_Areas":
                                AOI.TIAnchorage.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    Name: (feature.Name || 'Unknown'),
                                    PERC_COVER: (feature.PERC_COVER || 0)
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "Pilot_Boarding_Areas":
                            case "PilotBoardingAreas":
                                AOI.TIPilot.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0)
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "SATL_FishRevenue_AllYrs":
                                AOI.ECFishRevenue.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    FishingRev_value_min: (feature.FishingRev_value_min || 0),
                                    FishingRev_value_max: (feature.FishingRev_value_max || 0),
                                    FishingRev_total: (feature.FishingRev_total || 0)
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "CBRAs":
                                AOI.NRCBarrier.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0)
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "ArtificialReefs":
                                AOI.NRCReefs.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0)
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "StonyCoralALL":
                                AOI.NRCStonyCoral.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    Coral_Suitability: (feature.Coral_Suitability || '')
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "SoftCoralALL":
                                AOI.NRCSoftCoral.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    Coral_Suitability: (feature.Coral_Suitability || '')
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "MPA_selected":
                                AOI.NRCNearby.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    Site_Name: (feature.Site_Name || 'Unknown'),
                                    URL: (feature.URL || '')
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "PrincipalPorts":
                                AOI.TIPrincipalPorts.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    PortName: (feature.PortName || 'Unknown'),
                                    Total: (feature.Total || 0),
                                    Dist_Mi: (feature.Dist_Mi || 0)
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "vesseltrafficatl":
                                AOI.TIVessel.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    all_2011_avg: (feature.all_2011_avg || 0),
                                    value_min: (feature.value_min || 0),
                                    value_max: (feature.value_max || 0),
                                    vessel_mean: (feature.vessel_mean || 0)
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "RightWhales":
                                AOI.TIRightWhale.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    PERC_COVER: (feature.PERC_COVER || 0)
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "ShippingLanes":
                                AOI.TIShipping.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    THEMELAYER: (feature.THEMELAYER || 'Unknown'),
                                    THEMELAYER_CNT: (feature.THEMELAYER_CNT || 'Unknown')
                                });
                                AOI.TIShippingTotal += feature.THEMELAYER_CNT;
                                AOI.addMetadata(feature);
                                break;
                            case "Places":
                                AOI.CEPlaces.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    Name: (feature.Name || 'Unknown'),
                                    ST: (feature.ST || 'Unknown'),
                                    Dist_Mi: (feature.Dist_Mi || 0),
                                    Census2010: ((feature.Census2010 === -1) ? ' ' : (feature.Census2010 || ' '))
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "CoastalStates":
                            case "Coastal_Shoreline_Counties_2010":
                            case "CoastalShorelineCounties2010":
                                AOI.ECCountyGDP.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    cntyname: (feature.cntyname || feature.st_name),
                                    MedHHInc: (feature.MedHHInc || 0),
                                    TotalHouses: (feature.TotalHouses || 0),
                                    Population: (feature.Population || 0),
                                    PercentTotGDP: (feature.PercentTotGDP || 0)
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "ENOW_2013":
                                AOI.ECEcon.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    Name: (feature.Name || 'Unknown'),
                                    cntyname: (feature.cntyname || 'Unknown'),
                                    st_name: (feature.st_name || 'Unknown'),
                                    OceanSector: (feature.OceanSector || 'Unknown'),
                                    Employment: (feature.Employment || 0),
                                    Wages: (feature.Wages || 0),
                                    GDP: (feature.GDP || 0),

                                    Emp_LivingResources: (feature.Emp_LivingResources || 0),
                                    Emp_MarineConstruction: (feature.Emp_MarineConstruction || 0),
                                    Emp_MarineTransp: (feature.Emp_MarineTransp || 0),
                                    Emp_OffshoreMineralExt: (feature.Emp_OffshoreMineralExt || 0),
                                    Emp_ShipAndBoatBuilding: (feature.Emp_ShipAndBoatBuilding || 0),
                                    Emp_TourismAndRec: (feature.Emp_TourismAndRec || 0),
                                    Wages_LivingResources: (feature.Wages_LivingResources || 0),
                                    Wages_MarineConstruction: (feature.Wages_MarineConstruction || 0),
                                    Wages_MarineTransp: (feature.Wages_MarineTransp || 0),
                                    Wages_OffshoreMineralExt: (feature.Wages_OffshoreMineralExt || 0),
                                    Wages_ShipAndBoatBuilding: (feature.Wages_ShipAndBoatBuilding || 0),
                                    Wages_TourismAndRec: (feature.Wages_TourismAndRec || 0),

                                    GDP_LivingResources: ((feature.GDP_LivingResources === -9999) ? 0 : (feature.GDP_LivingResources || 0)),
                                    GDP_MarineConstruction: ((feature.GDP_MarineConstruction === -9999) ? 0 : (feature.GDP_MarineConstruction || 0)),
                                    GDP_MarineTransp: ((feature.GDP_MarineTransp === -9999) ? 0 : (feature.GDP_MarineTransp || 0)),
                                    GDP_OffshoreMineralExt: ((feature.GDP_OffshoreMineralExt === -9999) ? 0 : (feature.GDP_OffshoreMineralExt || 0)),
                                    GDP_ShipAndBoatBuilding: ((feature.GDP_ShipAndBoatBuilding === -9999) ? 0 : (feature.GDP_ShipAndBoatBuilding || 0)),
                                    GDP_TourismAndRec: ((feature.GDP_TourismAndRec === -9999) ? 0 : (feature.GDP_TourismAndRec || 0))
                                });
                                switch (feature.OceanSector) {
                                    case "All Ocean Sectors":
                                        AOI.ECEconEmploy[AOI.ECEconEmploy.length] = [(feature.cntyname || feature.st_name), (feature.Employment || 0)];
                                        AOI.ECEconGDP[AOI.ECEconGDP.length] = [(feature.cntyname || feature.st_name), (feature.GDP || 0)];
                                        AOI.ECEconWages[AOI.ECEconWages.length] = [(feature.cntyname || feature.st_name), (feature.Wages || 0)];
                                        break;
                                }
                                AOI.addMetadata(feature);
                                break;
                            case "NMFS_HMS_Fish":
                                AOI.NRCMigratoryFish.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    LIFE_STAGE: (feature.LIFE_STAGE || 'Unknown'),
                                    SPECIES: (feature.SPECIES || 'Unknown'),
                                    PERC_COVER: (feature.PERC_COVER || 'Unknown')
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "NMFS_HMS_Sharks":
                                AOI.NRCMigratorySharks.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    LIFE_STAGE: (feature.LIFE_STAGE || 'Unknown'),
                                    SPECIES: (feature.SPECIES || 'Unknown'),
                                    PERC_COVER: (feature.PERC_COVER || 'Unknown')
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "NMFS_CHD_SouthAtl":
                                AOI.NRCCriticalHab.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    AREANAME: (feature.AREANAME || 'Unknown'),
                                    PERC_COVER: (feature.PERC_COVER || 'Unknown')
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "SERO_HAPC_PartK":
                                AOI.NRCHabConcern.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    AREA_NAME: (feature.AREA_NAME || 'Unknown'),
                                    PERC_COVER: (feature.PERC_COVER || 'Unknown')
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "Danger_Zones_and_Restricted_Areas":
                            case "DangerZonesandRestrictedAreas":
                                AOI.TIDangerZones.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    boundaryType: (feature.boundaryType || 'Unknown'),
                                    agencyOfUse: (feature.agencyOfUse || 'Unknown'),
                                    PERC_COVER: (feature.PERC_COVER || 'Unknown'),
                                    Style: 'c_' + (feature.agencyOfUse || 'Unknown').substr(-4, 4)
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "Coastal_Maintained_Channels":
                            case "CoastalMaintainedChannels":
                                AOI.TICoastal.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0)
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "SubmarineCables":
                                AOI.TISubmarine.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    Owner: (feature.Owner || 'Unknown'),
                                    STATUS: (feature.STATUS || 'Unknown'),
                                    OwnerStatus: (feature.Owner || 'Unknown') + " - " + (feature.STATUS || 'Unknown')
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "FederalAndStateWaters":
                                AOI.CEFederalAndState.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    jurisdiction: (feature.jurisdiction || 'Unknown'),
                                    perc_jurisdiction: (feature.perc_jurisdiction || 'Unknown'),
                                    Area_mi2: (feature.Area_mi2 || 'Unknown')
                                });
                                AOI.addMetadata(feature);
                                if (feature.TOTAL_CNT > 0) {
                                    if ((feature.jurisdiction.substring(0, 3)) === "Fed") {
                                        AOI.CEFederalTotal = parseInt(AOI.CEFederalTotal, 10) + parseInt(feature.Area_mi2, 10);
                                    } else  AOI.CEStateTotal = parseInt(AOI.CEStateTotal, 10) + parseInt(feature.Area_mi2, 10);
                                }
                                break;
                            case "CoastalCounties":
                                AOI.CECoastalCounties.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    cntyname: (feature.cntyname || 'Unknown'),
                                    st_abbr: (feature.st_abbr || 'Unknown'),
                                    ctystate: (feature.st_abbr || 'Unknown'),
                                    st_name: (feature.st_name || 'Unknown')
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "Coastal_State_Legislative_Districts_House":
                            case "StateLegislativeDistrictsHouse":
                                AOI.CEHouse.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    NAMELSAD: (feature.NAMELSAD || 'Unknown'),
                                    stateName: (feature.stateName || 'Unknown')
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "Coastal_State_Legislative_Districts_Senate":
                            case "StateLegislativeDistrictsSenate":
                                AOI.CESenate.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    NAMELSAD: (feature.NAMELSAD || 'Unknown'),
                                    stateName: (feature.stateName || 'Unknown')
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "Coastal_Congressional_Districts_114th":
                            case "CoastalCongressionalDistricts114th":
                                AOI.CECongress.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    NAMELSAD: (feature.NAMELSAD || 'Unknown'),
                                    stateName: (feature.stateName || 'Unknown')
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "FederalGeoRegulations":
                                AOI.CEFedGeoRegs.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    FederalGeoRegulationsName: (feature.FederalGeoRegulationsName || 'Unknown'),
                                    FederalGeoRegulationsID: (feature.FederalGeoRegulationsID || 'Unknown'),
                                    DescriptionURL: (feature.DescriptionURL || '')
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "AOI_input":
                                AOI.CEAreaOfPoly.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    Area_mi2: (feature.Area_mi2 || 'Unknown'),
                                    Area_km2: (feature.Area_km2 || 'Unknown'),
                                    Area_nm2: (feature.Area_nm2 || 'Unknown')
                                });
                                break;
                            case "crm_v1":
                                AOI.CEElevation.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    depth_min_m: (feature.depth_min_m || 'Unknown'),
                                    depth_max_m: (feature.depth_max_m || 'Unknown'),
                                    depth_mean_m: (feature.depth_mean_m || 'Unknown')
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "CoastalEnergyFacilities":
                                AOI.EMCoastalEnergyFacilities.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    Name: (feature.Name || 'None'),
                                    Type: (feature.Type || 'None'),
                                    CAPACITY: (feature.CAPACITY || 'None'),
                                    Dist_Mi: (feature.Dist_Mi || 'None')
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "OG_ResourcePotential":
                                AOI.OGresource.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    OCS_Play: (feature.OCS_Play || 'None'),
                                    UTRR_Oil: (feature.UTRR_Oil.toFixed(2) || 'None'),
                                    UTRR_Gas: (feature.UTRR_Gas.toFixed(2) || 'None'),
                                    UTRR_BOE: (feature.UTRR_BOE.toFixed(2) || 'None')
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "OG_Wells":
                                AOI.OGWells.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    COMPANY_NA: (feature.COMPANY_NA || 'None'),
                                    STATUS: (feature.STATUS || 'None')
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "al_20160301":
                                AOI.OGLease.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    Lease_Numb: (feature.Lease_Numb || 'None'),
                                    Lease_expt: (feature.Lease_expt || 'None')
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "OilandGasPlanningAreas":
                                AOI.OGPlanA.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    Region: (feature.Region || 'unknown')
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "BeachProjects":
                                AOI.EMBeachNourishmentProjects.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    BEACH_AREA: (feature.BEACH_AREA || 'unknown'),
                                    TOTAL_FUND: (feature.TOTAL_FUND || '0'),
                                    SAND_VOL_C: (feature.SAND_VOL_C || '0'),
                                    YEAR: (feature.YEAR || '19xx'),
                                    CLASS_CNT: (feature.CLASS_CNT || 0),
                                    Dist_Mi: ((feature.Dist_Mi === ' ') ? '0' : feature.Dist_Mi )
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "us_oc_ms":
                                AOI.EMCurrentPower.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    AVG_OCEAN_CURRENT: (feature.AVG_OCEAN_CURRENT || 0),
                                    SUITABILITY_OCEAN_SPEED: (feature.SUITABILITY_OCEAN_SPEED || 'NO')
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "usa_mc_wm":
                                AOI.EMTidalPower.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    AVG_TIDAL_CURRENT: (feature.AVG_TIDAL_CURRENT || 0),
                                    SUITABILITY_TIDAL_DEPTH: (feature.SUITABILITY_TIDAL_DEPTH || 'NO'),
                                    SUITABILITY_TIDAL_AREA: (feature.SUITABILITY_TIDAL_AREA || 'NO'),
                                    SUITABILITY_TIDAL_SPEED: (feature.SUITABILITY_TIDAL_SPEED || 'NO')
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "OceanWaveResourcePotential":
                                AOI.EMOceanWaveResourcePotential.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    AVG_WAVE_POWER: (feature.AVG_WAVE_POWER || 0),
                                    SUITABILITY_OCEAN_POWER: (feature.SUITABILITY_OCEAN_POWER || 'Unknown')
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "OceanDisposalSites":
                                AOI.EMOceanDisposalSites.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    PRIMARY_USE: (feature.primaryUse || 'Unknown')
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "MarineHydrokineticProjects":
                                if (feature.TOTAL_CNT > 0) {
                                    AOI.EMMarineHydrokineticProjects.push({
                                        TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                        PRIMARY_USE: (feature.energyType ) + ' projects'
                                    });
                                }
                                AOI.addMetadata(feature);
                                break;
                            case "ecstdb2014":
                                if (feature.TOTAL_CNT > 0) {
                                    AOI.EMSurficialSediment.push({
                                        TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                        PRIMARY_USE: ((feature.CLASSIFICA === ' ') ? 'Unknown' : feature.CLASSIFICA )
                                    });
                                }
                                AOI.addMetadata(feature);
                                break;
                            case "SandnGravelLeaseAreas":
                            case "Sand_n_GravelLeaseAreas": //aka Marine Minerals Leases
                                AOI.EMMarineMineralsLeases.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    RuleID: (feature.RuleID || 0)
                                });
                                AOI.addMetadata(feature);
                                break;
                            case "TribalLands":
                                AOI.CETribalLands.push({
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    NAMELSAD: (feature.NAMELSAD || 'Unknown'),
                                    Dist_Mi: (feature.Dist_Mi || 0)
                                });
                                AOI.addMetadata(feature);
                                break;
                            case  "BOEM_Wind_Planning_Areas":
                                AOI.EMWindPlanningArea.push({
                                    INFO: feature.INFO,
                                    PROT_NUMBE: feature.PROT_NUMBE,
                                    LINK1: feature.LINK1,
                                    LINK2: feature.LINK2,
                                    PERC_COVER: feature.PERC_COVER,
                                    TOTAL_BLOC: feature.TOTAL_BLOC,
                                    TOTAL_CNT: feature.TOTAL_CNT,
                                    METADATA_URL: feature.METADATA_URL
                                });
                                AOI.addMetadata(feature);
                                AOI.EMWindPlanningAreaSum += feature.PERC_COVER;
                                break;
                            case "ActiveRenewableEnergyLeases":
                                AOI.EMActiveRenewableEnergyLeases.push({
                                    Lease_Numb: feature.Lease_Numb,
                                    Company: feature.Company,
                                    INFO: feature.INFO,
                                    PROT_NUMBE: feature.PROT_NUMBE,
                                    LINK1: feature.LINK1,
                                    LINK2: feature.LINK2,
                                    PERC_COVER: (feature.PERC_COVER || 0),
                                    TOTAL_BLOC: (feature.TOTAL_BLOC || 0),
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    METADATA_URL: feature.METADATA_URL
                                });
                                AOI.addMetadata(feature);
                                break;
                            case  "WindResourcePotential":
                                AOI.EMWindResourcePotential.push({
                                    WIND_CLASS: (feature.WIND_CLASS),
                                    AVG_WGHT: (feature.AVG_WGHT || 0).toFixed(2),
                                    PERC_COVER: (feature.PERC_COVER || 0),
                                    HOUSES_SUM: (feature.HOUSES_SUM || 0).toLocaleString(),
                                    HOUSES_CAP: (feature.HOUSES_SUM || 0),
                                    CAPACITY: (feature.CAPACITY || 0).toLocaleString(),
                                    TOTAL_BLOC: (feature.TOTAL_BLOC || 0),
                                    TOTAL_CNT: (feature.TOTAL_CNT || 0),
                                    METADATA_URL: feature.METADATA_URL,
                                    AREA_KM2: (feature.Area_km2 || 0)
                                });
                                AOI.addMetadata(feature);


                                if (feature.TOTAL_CNT > 0) {
                                    switch (feature.WIND_CLASS.substring(0, 3)) { //make sure the stacked bar chart has the best classification at top and worst at bottom
                                        case "Sup":
                                            AOI.EMWindResourceClassification[0] = feature.PERC_COVER;
                                            AOI.EMWindResourceArea += feature.Area_km2;
                                            break;
                                        case "Out":
                                            AOI.EMWindResourceClassification[1] = feature.PERC_COVER;
                                            AOI.EMWindResourceArea += feature.Area_km2;
                                            break;
                                        case "Exc":
                                            AOI.EMWindResourceClassification[2] = feature.PERC_COVER;
                                            AOI.EMWindResourceArea += feature.Area_km2;
                                            break;
                                        case "Goo":
                                            AOI.EMWindResourceClassification[3] = feature.PERC_COVER;
                                            AOI.EMWindResourceArea += feature.Area_km2;
                                            break;
                                        case "Fai":
                                            AOI.EMWindResourceClassification[4] = feature.PERC_COVER;
                                            break;
                                        case "Uns":
                                            AOI.EMWindResourceClassification[5] = feature.PERC_COVER;
                                            break;
                                    }
                                }
                                break;
                        }
                    });

                    var y = 35;
                    var x = 35;
                    var chartrow = 1;
                    angular.forEach(AOI.ECEcon, function (myECEcon, index) {

                        if (index && (index % 3 === 0)) {
                            y += 120;
                            x = 35;
                            chartrow++;
                        } else if (index) x += 135;

                        AOI.OceanJobContributionsSeries[index] = {
                            center: [x, y],
                            "name": myECEcon.Name,
                            "showInLegend": (index === 0 ? true : false),
                            "data": [
                                ["Marine Construction", myECEcon.GDP_MarineConstruction],
                                ["Living Resources", myECEcon.GDP_LivingResources],
                                ["Marine Transportation", myECEcon.GDP_MarineTransp],
                                ["Offshore Mineral Extraction", myECEcon.GDP_OffshoreMineralExt],
                                ["Ship and Boat Building", myECEcon.GDP_ShipAndBoatBuilding],
                                ["Tourism and Recreation", myECEcon.GDP_TourismAndRec]
                            ],
                            title: {

                                style: {color: '#4a4a4a'},
                                align: 'center',
                                format: '{name}',
                                verticalAlign: 'top',
                                y: -20
                            }
                        }

                    });

                    AOI.OceanJobContributionsChartHeight = ((chartrow * 120) + 18);


                    if (AOI.EMOceanWaveResourcePotential.length > 0) {
                        if (AOI.EMOceanWaveResourcePotential[0].AVG_WAVE_POWER > 40) {
                            AOI.EMOceanWaveResourcePotential[0].COLOR = '#B0B497';
                        } else if (AOI.EMOceanWaveResourcePotential[0].AVG_WAVE_POWER > 30.0) {
                            AOI.EMOceanWaveResourcePotential[0].COLOR = '#B6BC9E';
                        } else if (AOI.EMOceanWaveResourcePotential[0].AVG_WAVE_POWER > 20.0) {
                            AOI.EMOceanWaveResourcePotential[0].COLOR = '#BBC1A4';
                        } else if (AOI.EMOceanWaveResourcePotential[0].AVG_WAVE_POWER > 15.0) {
                            AOI.EMOceanWaveResourcePotential[0].COLOR = '#C0C6A8';
                        } else if (AOI.EMOceanWaveResourcePotential[0].AVG_WAVE_POWER > 10.0) {
                            AOI.EMOceanWaveResourcePotential[0].COLOR = '#C9D0B1';
                        } else if (AOI.EMOceanWaveResourcePotential[0].AVG_WAVE_POWER > 8.0) {
                            AOI.EMOceanWaveResourcePotential[0].COLOR = '#D0D8B9';
                        } else if (AOI.EMOceanWaveResourcePotential[0].AVG_WAVE_POWER > 6) {
                            AOI.EMOceanWaveResourcePotential[0].COLOR = '#D5DDC0';
                        } else if (AOI.EMOceanWaveResourcePotential[0].AVG_WAVE_POWER > 4.0) {
                            AOI.EMOceanWaveResourcePotential[0].COLOR = '#DEE7C9';
                        } else if (AOI.EMOceanWaveResourcePotential[0].AVG_WAVE_POWER > 2.0) {
                            AOI.EMOceanWaveResourcePotential[0].COLOR = '#E4EFD2';
                        } else if (AOI.EMOceanWaveResourcePotential[0].AVG_WAVE_POWER < 2.01) {
                            AOI.EMOceanWaveResourcePotential[0].COLOR = '#EBF6D8';
                        } else {
                            AOI.EMOceanWaveResourcePotential[0].COLOR = 'white';
                        }
                    }
                    AOI.EMWindResourceClassification[6] = (AOI.EMWindResourceClassification.reduce(function (prev, cur) {
                        return prev.toFixed(2) - cur.toFixed(2);
                    }, 100));
                    if (AOI.EMWindPlanningArea[0] === null) {
                        AOI.EMWindPlanningArea[0] = {
                            INFO: "NA",
                            PROT_NUMBE: 0,
                            LINK1: "NA",
                            LINK2: "NA",
                            PERC_COVER: 0,
                            TOTAL_BLOC: 0,
                            TOTAL_CNT: 0
                        };
                    }
                    if (AOI.EMActiveRenewableEnergyLeases[0] === null) {
                        AOI.EMActiveRenewableEnergyLeases[0] = {
                            Lease_Numb: 0,
                            Company: "NA",
                            INFO: "NA",
                            PROT_NUMBE: 0,
                            LINK1: "NA",
                            LINK2: "NA",
                            PERC_COVER: 0,
                            TOTAL_BLOC: 0,
                            TOTAL_CNT: 0
                        };
                    }
                    AOI.TIPrincipalPorts.sort(function (a, b) {
                        return parseFloat(a.Dist_Mi) - parseFloat(b.Dist_Mi);
                    });
                    AOI.CEPlaces.sort(function (a, b) {
                        return parseFloat(a.Dist_Mi) - parseFloat(b.Dist_Mi);
                    });
                    AOI.EMWindPlanningArea.sort(function (a, b) {
                        return parseFloat(b.PERC_COVER) - parseFloat(a.PERC_COVER);
                    });
                    AOI.EMActiveRenewableEnergyLeases.sort(function (a, b) {
                        return parseFloat(b.PERC_COVER) - parseFloat(a.PERC_COVER);
                    });


                    if (AOI.EMBeachNourishmentProjects.length === 0) {
                        AOI.EMBeachHeight = 0;
                    } else {
                        AOI.EMBeachHeight = 127 + (38 * AOI.EMBeachNourishmentProjects.length);
                        AOI.EMBeachNourishmentProjects.sort(function (a, b) {
                            return parseFloat(a.Dist_Mi) - parseFloat(b.Dist_Mi);
                        });
                        angular.forEach(AOI.EMBeachNourishmentProjects, function (myBeachProjects, index) {
                            AOI.EMBeachName[AOI.EMBeachName.length] = (myBeachProjects.BEACH_AREA || 'unknown');
                            AOI.EMBeachTOTAL_FUND[AOI.EMBeachTOTAL_FUND.length] = (myBeachProjects.TOTAL_FUND || 0);
                            AOI.EMBeachSAND_VOL_C[AOI.EMBeachSAND_VOL_C.length] = (myBeachProjects.SAND_VOL_C || 0);
                            AOI.EMBeachCLASS_CNT[AOI.EMBeachCLASS_CNT.length] = (myBeachProjects.CLASS_CNT || 0);
                            AOI.EMBeachDist_Mi[AOI.EMBeachDist_Mi.length] = (myBeachProjects.Dist_Mi || 0);
                        });
                    }

                    AOI.loadWindChart();
                    AOI.loadStateChart();
                    AOI.loadOceanJobEmployeesChart();
                    AOI.loadOceanJobDollarsChart();
                    AOI.loadOceanJobContributionsChart();
                    AOI.loadBeachProjectsChart();

                }
                ,
                addMetadata: function (feature) {
                    if (feature.METADATA_URL !== null) {
                        AOI.metadata.push({
                            REPORT_CAT: feature.REPORT_CAT,
                            COMMON_NM: feature.COMMON_NM,
                            METADATA_URL: feature.METADATA_URL,
                            METADATA_OWNER: feature.METADATA_OWNER,
                            METADATA_OWNER_ABV: feature.METADATA_OWNER_ABV,
                            METADATA_SORT: feature.METADATA_SORT
                        });
                    }
                }
                ,
                unloadData: function () {

                    if (AOI.isLoaded) {
                        AOI.map.removeLayer(AOI.layer);
                        AOI.map.removeLayer(AOI.EMOceanDisposalSitesLayer);
                        AOI.map.removeLayer(AOI.EMMarineHydrokineticProjectsLayer);
                        AOI.map.removeLayer(AOI.EMWindPlanningAreaLayer);
                        AOI.map.removeLayer(AOI.EMActiveRenewableEnergyLeasesLayer);
                        AOI.map.removeLayer(AOI.EMWindResourcePotentialLayer);
                        AOI.map.removeLayer(AOI.EMMarineMineralsLeasesLayer);
                        AOI.map.removeLayer(AOI.EMOceanWaveResourcePotentialLayer);
                        AOI.map.removeLayer(AOI.EMTidalPowerLayer);
                        AOI.map.removeLayer(AOI.EMCurrentPowerLayer);
                        AOI.map.removeLayer(AOI.EMBeachNourishmentProjectsLayer);
                        AOI.map.removeLayer(AOI.EMCoastalEnergyFacilitiesLayer);
                        AOI.map.removeLayer(AOI.CEElevationLayer);
                        AOI.map.removeLayer(AOI.TISubmarineLayer);
                        AOI.map.removeLayer(AOI.TIDangerZonesLayer);
                        AOI.map.removeLayer(AOI.CEPlaceLayer);
                        AOI.map.removeLayer(AOI.CETribalLayer);
                        AOI.map.removeLayer(AOI.TIVesselLayer);
                        AOI.map.removeLayer(AOI.TIPrincipalPortsLayer);
                        AOI.map.removeLayer(AOI.NRCNearbyLayer);
                        AOI.map.removeLayer(AOI.NRCReefsLayer);
                        AOI.map.removeLayer(AOI.NRCSoftCoralLayer);
                        AOI.map.removeLayer(AOI.NRCStoneyCoralLayer);
                        AOI.map.removeLayer(AOI.NRCBarrierLayer);
                        AOI.map.removeLayer(AOI.ECCoastalCountiesLayer);

                        AOI.EMActiveRenewableEnergyLeasesLayerIsVisible = false;
                        AOI.EMWindResourcePotentialLayerIsVisible = false;
                        AOI.EMWindPlanningAreaLayerIsVisible = false;
                        AOI.EMOceanDisposalSitesLayerIsVisible = false;
                        AOI.EMMarineMineralsLeasesLayerIsVisible = false;
                        AOI.EMMarineHydrokineticProjectsLayerIsVisible = false;
                        AOI.EMOceanWaveResourcePotentialLayerIsVisible = false;
                        AOI.EMTidalPowerLayerIsVisible = false;
                        AOI.EMCurrentPowerIsVisible = false;
                        AOI.EMBeachNourishmentProjectsLayerIsVisible = false;
                        AOI.EMCoastalEnergyFacilitiesLayerIsVisible = false;
                        AOI.CEElevationIsVisible = false;
                        AOI.TISubmarineIsVisible = false;
                        AOI.TIDangerZonesIsVisible = false;
                        AOI.CEPlaceLayerIsVisible = false;
                        AOI.CETribalLayerIsVisible = false;
                        AOI.TIVesselLayerIsVisible = false;
                        AOI.TIPrincipalPortsIsVisible = false;
                        AOI.NRCNearbyLayerIsVisible = false;
                        AOI.NRCReefsLayerIsVisible = false;
                        AOI.NRCSoftCoralLayerIsVisible = false;
                        AOI.NRCStoneyCoralLayerIsVisible = false;
                        AOI.NRCBarrierLayerIsVisible = false;
                        AOI.ECCoastalCountiesLayerIsVisible = false;


                        AOI.EMWindResourcePotential.length = 0;
                        AOI.EMWindPlanningArea.length = 0;
                        AOI.EMWindPlanningAreaSum = 0;
                        AOI.metadata.length = 0;
                        AOI.EMWindResourceClassification.length = 0;
                        AOI.EMWindResourceArea = 0;
                        AOI.EMOceanDisposalSites.length = 0;
                        AOI.EMMarineMineralsLeases.length = 0;
                        AOI.EMMarineHydrokineticProjects.length = 0;
                        AOI.CETribalLands.length = 0;
                        AOI.EMSurficialSediment.length = 0;
                        AOI.EMOceanWaveResourcePotential.length = 0;
                        AOI.EMTidalPower.length = 0;
                        AOI.EMCurrentPower.length = 0;
                        AOI.EMBeachNourishmentProjects.length = 0;
                        AOI.OGPlanA.length = 0;
                        AOI.OGLease.length = 0;
                        AOI.OGWells.length = 0;
                        AOI.OGresource.length = 0;
                        AOI.EMCoastalEnergyFacilities.length = 0;
                        AOI.CEElevation.length = 0;
                        AOI.CEAreaOfPoly.length = 0;
                        AOI.CEFedGeoRegs.length = 0;
                        AOI.CECongress.length = 0;
                        AOI.CEHouse.length = 0;
                        AOI.CESenate.length = 0;
                        AOI.CECoastalCounties.length = 0;
                        AOI.CEFederalAndState.length = 0;
                        AOI.CEFederalTotal = 0;
                        AOI.CEStateTotal = 0;
                        AOI.TISubmarine.length = 0;
                        AOI.TICoastal.length = 0;
                        AOI.TIDangerZones.length = 0;
                        AOI.NRCHabConcern.length = 0;
                        AOI.NRCCriticalHab.length = 0;
                        AOI.NRCMigratoryFish.length = 0;
                        AOI.NRCMigratorySharks.length = 0;
                        AOI.ECEcon.length = 0;
                        AOI.ECEconEmploy.length = 0;
                        AOI.ECEconGDP.length = 0;
                        AOI.ECEconWages.length = 0;
                        AOI.ECStateGDP.length = 0;
                        AOI.ECCountyGDP.length = 0;
                        AOI.OceanJobContributionsSeries.length = 0;
                        AOI.Shared = false;
                        AOI.CEPlaces.length = 0;
                        AOI.TIShipping.length = 0;
                        AOI.TIShippingTotal = 0;
                        AOI.TIRightWhale.length = 0;
                        AOI.TIVessel.length = 0;
                        AOI.TIPrincipalPorts.length = 0;
                        AOI.NRCNearby.length = 0;
                        AOI.NRCReefs.length = 0;
                        AOI.NRCSoftCoral.length = 0;
                        AOI.NRCStonyCoral.length = 0;
                        AOI.NRCBarrier.length = 0;
                        AOI.ECCoastalCounties.length = 0;
                        AOI.ECFishRevenue.length = 0;
                        AOI.TIAnchorage.length = 0;
                        AOI.TIPilot.length = 0;
                        AOI.EMBeachName.length = 0;
                        AOI.EMBeachTOTAL_FUND.length = 0;
                        AOI.EMBeachSAND_VOL_C.length = 0;
                        AOI.EMBeachCLASS_CNT.length = 0;

                        AOI.hide();
                    }
                    AOI.isLoaded = false;
                }
                ,
                isLoaded: false,
                ECCoastalCountiesLayerIsVisible: false,
                toggleECCoastalCountiesLayer: function () {
                    AOI.ECCoastalCountiesLayerIsVisible = AOI.toggleLayer(AOI.ECCoastalCountiesLayer, AOI.ECCoastalCountiesLayerIsVisible);
                },
                NRCBarrierLayerIsVisible: false,
                toggleNRCBarrierLayer: function () {
                    AOI.NRCBarrierLayerIsVisible = AOI.toggleLayer(AOI.NRCBarrierLayer, AOI.NRCBarrierLayerIsVisible);
                },
                NRCStoneyCoralLayerIsVisible: false,
                toggleNRCStoneyCoralLayer: function () {
                    AOI.NRCStoneyCoralLayerIsVisible = AOI.toggleLayer(AOI.NRCStoneyCoralLayer, AOI.NRCStoneyCoralLayerIsVisible);
                },
                NRCSoftCoralLayerIsVisible: false,
                toggleNRCSoftCoralLayer: function () {
                    AOI.NRCSoftCoralLayerIsVisible = AOI.toggleLayer(AOI.NRCSoftCoralLayer, AOI.NRCSoftCoralLayerIsVisible);
                },
                NRCReefsLayerIsVisible: false,
                toggleNRCReefsLayer: function () {
                    AOI.NRCReefsLayerIsVisible = AOI.toggleLayer(AOI.NRCReefsLayer, AOI.NRCReefsLayerIsVisible);
                }
                ,
                NRCNearbyLayerIsVisible: false,
                toggleNRCNearby: function () {
                    AOI.NRCNearbyLayerIsVisible = AOI.toggleLayer(AOI.NRCNearbyLayer, AOI.NRCNearbyLayerIsVisible);
                }
                ,
                TIPrincipalPortsIsVisible: false,
                toggleTIPrincipalPorts: function () {
                    AOI.TIPrincipalPortsIsVisible = AOI.toggleLayer(AOI.TIPrincipalPortsLayer, AOI.TIPrincipalPortsIsVisible);
                }
                ,
                TIVesselLayerIsVisible: false,
                toggleTIVesselLayer: function () {
                    AOI.TIVesselLayerIsVisible = AOI.toggleLayer(AOI.TIVesselLayer, AOI.TIVesselLayerIsVisible);
                }
                ,
                CEPlaceLayerIsVisible: false,
                toggleCEPlaceLayer: function () {
                    AOI.CEPlaceLayerIsVisible = AOI.toggleLayer(AOI.CEPlaceLayer, AOI.CEPlaceLayerIsVisible);
                },
                CETribalLayerIsVisible: false,
                toggleCETribalLayer: function () {
                    AOI.CETribalLayerIsVisible = AOI.toggleLayer(AOI.CETribalLayer, AOI.CETribalLayerIsVisible);
                },

                EMActiveRenewableEnergyLeasesLayerIsVisible: false,
                toggleEMActiveRenewableEnergyLeasesLayer: function () {
                    AOI.EMActiveRenewableEnergyLeasesLayerIsVisible = AOI.toggleLayer(AOI.EMActiveRenewableEnergyLeasesLayer, AOI.EMActiveRenewableEnergyLeasesLayerIsVisible);
                }
                ,
                EMWindPlanningAreaLayerIsVisible: false,
                toggleEMWindPlanningAreaLayer: function () {
                    AOI.EMWindPlanningAreaLayerIsVisible = AOI.toggleLayer(AOI.EMWindPlanningAreaLayer, AOI.EMWindPlanningAreaLayerIsVisible);
                }
                ,
                EMOceanDisposalSitesLayerIsVisible: false,
                toggleEMOceanDisposalSitesLayer: function () {
                    AOI.EMOceanDisposalSitesLayerIsVisible = AOI.toggleLayer(AOI.EMOceanDisposalSitesLayer, AOI.EMOceanDisposalSitesLayerIsVisible);
                }
                ,
                EMMarineHydrokineticProjectsLayerIsVisible: false,
                toggleEMMarineHydrokineticProjectsLayer: function () {
                    AOI.EMMarineHydrokineticProjectsLayerIsVisible = AOI.toggleLayer(AOI.EMMarineHydrokineticProjectsLayer, AOI.EMMarineHydrokineticProjectsLayerIsVisible);
                }
                ,

                EMMarineMineralsLeasesLayerIsVisible: false,
                toggleEMMarineMineralsLeasesLayer: function () {
                    AOI.EMMarineMineralsLeasesLayerIsVisible = AOI.toggleLayer(AOI.EMMarineMineralsLeasesLayer, AOI.EMMarineMineralsLeasesLayerIsVisible);
                }
                ,
                EMOceanWaveResourcePotentialLayerIsVisible: false,
                toggleEMOceanWaveResourcePotentialLayer: function () {
                    AOI.EMOceanWaveResourcePotentialLayerIsVisible = AOI.toggleLayer(AOI.EMOceanWaveResourcePotentialLayer, AOI.EMOceanWaveResourcePotentialLayerIsVisible);
                }
                ,
                EMTidalPowerLayerIsVisible: false,
                toggleEMTidalPowerLayer: function () {
                    AOI.EMTidalPowerLayerIsVisible = AOI.toggleLayer(AOI.EMTidalPowerLayer, AOI.EMTidalPowerLayerIsVisible);
                }
                ,
                EMCurrentPowerIsVisible: false,
                toggleEMCurrentPower: function () {
                    AOI.EMCurrentPowerIsVisible = AOI.toggleLayer(AOI.EMCurrentPowerLayer, AOI.EMCurrentPowerIsVisible);
                }
                ,
                EMBeachNourishmentProjectsLayerIsVisible: false,
                toggleEMBeachNourishmentProjectsLayer: function () {
                    AOI.EMBeachNourishmentProjectsLayerIsVisible = AOI.toggleLayer(AOI.EMBeachNourishmentProjectsLayer, AOI.EMBeachNourishmentProjectsLayerIsVisible);
                }
                ,
                EMCoastalEnergyFacilitiesLayerIsVisible: false,
                toggleEMCoastalEnergyFacilitiesLayer: function () {
                    AOI.EMCoastalEnergyFacilitiesLayerIsVisible = AOI.toggleLayer(AOI.EMCoastalEnergyFacilitiesLayer, AOI.EMCoastalEnergyFacilitiesLayerIsVisible);
                }
                ,
                EMWindResourcePotentialLayerIsVisible: false,
                toggleEMWindResourcePotentialLayer: function () {
                    AOI.EMWindResourcePotentialLayerIsVisible = AOI.toggleLayer(AOI.EMWindResourcePotentialLayer, AOI.EMWindResourcePotentialLayerIsVisible);
                }
                ,
                CEElevationIsVisible: false,
                toggleCEElevation: function () {
                    AOI.CEElevationIsVisible = AOI.toggleLayer(AOI.CEElevationLayer, AOI.CEElevationIsVisible);
                }
                ,
                TISubmarineIsVisible: false,
                toggleTISubmarine: function () {
                    AOI.TISubmarineIsVisible = AOI.toggleLayer(AOI.TISubmarineLayer, AOI.TISubmarineIsVisible);
                }
                ,
                TIDangerZonesIsVisible: false,
                toggleTIDangerZones: function () {
                    AOI.TIDangerZonesIsVisible = AOI.toggleLayer(AOI.TIDangerZonesLayer, AOI.TIDangerZonesIsVisible);
                }
                ,
                toggleFull: false,
                toggleFullSlider: function () {
                    AOI.toggleFull = !AOI.toggleFull;
                    AOI.doFullSlider();
                }

                ,
                doFullSlider: function () {
                    if (AOI.toggleFull) {
                        AOI.sliderWidth = '100%';
                        AOI.toggleFullStyle.MarginLeft = '0px';
                        AOI.toggleFullStyle.WebkitTransform = "rotate(180deg)";
                        AOI.toggleFullStyle.msTransform = "rotate(180deg)";
                        AOI.toggleFullStyle.transform = "rotate(180deg)";
                    } else {
                        AOI.toggleFullStyle.MarginLeft = '-25px';
                        AOI.sliderWidth = '50%';
                        AOI.toggleFullStyle.WebkitTransform = "rotate(0deg)";
                        AOI.toggleFullStyle.msTransform = "rotate(0deg)";
                        AOI.toggleFullStyle.transform = "rotate(0deg)";
                    }
                }
                ,
                loadBeachProjectsChart: function () {
                    var loadDeferred = $q.defer();
                    if (AOI.BeachProjectsChart) AOI.BeachProjectsChart = null;
                    AOI.BeachProjectsChart = {
                        options: {
                            credits: {
                                enabled: false
                            },
                            exporting: {enabled: false},
                            legend: {
                                layout: 'vertical',
                                align: 'right',
                                verticalAlign: 'middle',
                                backgroundColor: '#f4f8fc',
                                shadow: false
                            },
                            tooltip: {
                                shared: true
                            },

                            chart: {
                                height: AOI.EMBeachHeight,
                                type: 'bar',
                                backgroundColor: '#f4f8fc',
                                events: {
                                    load: function () {
                                        loadDeferred.resolve();
                                    }
                                },
                                animation: !AOI.inPrintWindow
                            },
                            title: {
                                text: null
                            },


                            xAxis: {
                                categories: AOI.EMBeachName,
                                labels: {
                                    style: {

                                        fontSize: '10px'
                                    }
                                }
                            },
                            yAxis: [{
                                min: 0,
                                title: {
                                    text: 'Volume/Cost'
                                }
                            }, {
                                title: {
                                    text: 'Count'
                                },
                                opposite: true
                            }],
                            plotOptions: {
                                column: {
                                    grouping: false,
                                    shadow: false,
                                    borderWidth: 0,
                                    animation: !AOI.inPrintWindow
                                }

                            }

                        },
                        loading: false,
                        series: [{
                            name: 'Volume(cyd)',
                            color: 'rgba(192,67,73,1)',
                            data: AOI.EMBeachSAND_VOL_C,
                            pointWidth: 10,
                            pointPlacement: -0.2,
                            yAxis: 0,
                            zIndex: 100
                        }, {
                            name: 'Count',
                            color: 'rgba(76,127,193,1)',
                            data: AOI.EMBeachCLASS_CNT,
                            pointWidth: 33,
                            yAxis: 1,
                            zIndex: 50,

                        }, {
                            name: 'Cost(US$)',
                            color: 'rgba(155,190,74,1)',
                            data: AOI.EMBeachTOTAL_FUND,
                            tooltip: {
                                valuePrefix: '$',
                            },
                            pointWidth: 20,
                            pointPlacement: 0.2,
                            yAxis: 0,
                            zIndex: 75
                        }]

                    };

                    return loadDeferred.promise;
                }
                ,
                loadStateChart: function () {
                    var loadDeferred = $q.defer();
                    if (AOI.highchartsNGState) AOI.highchartsNGState = null;

                    AOI.highchartsNGState = {
                        options: {
                            credits: {
                                enabled: false
                            },
                            chart: {
                                plotBackgroundColor: '#f4f8fc',
                                plotBorderWidth: null,
                                plotShadow: false,
                                type: 'pie',
                                events: {
                                    load: function () {
                                        loadDeferred.resolve();
                                    }
                                },
                                animation: !AOI.inPrintWindow
                            },
                            legend: {
                                layout: 'vertical',
                                align: 'right',
                                verticalAlign: 'top',
                                floating: true,
                                backgroundColor: '#f4f8fc'
                            },
                            tooltip: {
                                pointFormat: '<b>{point.percentage:.1f}%</b>'
                            },
                            plotOptions: {
                                pie: {
                                    dataLabels: {
                                        enabled: false
                                    },
                                    showInLegend: true,
                                    animation: !AOI.inPrintWindow
                                }
                            }
                        },
                        series: [{
                            data: [{
                                color: '#4a4a4a',
                                y: AOI.CEFederalTotal,
                                name: 'Federal'
                            }, {
                                color: '#3284BC',
                                y: AOI.CEStateTotal,
                                name: 'State'
                            }]
                        }],
                        title: {
                            text: null
                        },
                        loading: false
                    }
                    return loadDeferred.promise;
                }
                ,
                loadOceanJobContributionsChart: function () {
                    var loadDeferred = $q.defer();
                    if (AOI.OceanJobContributionsChart) AOI.OceanJobContributionsChart = null;
                    AOI.OceanJobContributionsChart = {
                        options: {
                            credits: {
                                enabled: false
                            },
                            legend: {
                                enabled: true,
                                align: 'right',
                                layout: 'vertical',
                                verticalAlign: 'center',
                                itemStyle: {
                                    fontSize: '10px'
                                }
                            },
                            tooltip: {
                                pointFormat: '<b>{point.percentage:.1f}%</b>'
                            },
                            chart: {
                                height: AOI.OceanJobContributionsChartHeight,
                                type: 'pie',
                                events: {
                                    load: function () {
                                        loadDeferred.resolve();
                                    }
                                },
                                animation: !AOI.inPrintWindow
                            },
                            title: {
                                enabled: false,
                                text: null,
                                align: 'center'
                            },
                            exporting: {enabled: false},
                            colors: ['#4572a7', '#aa4643', '#89a54e', '#71588f', '#4198af', '#db843d', '#93a9cf'],
                            yAxis: {

                                title: {
                                    enabled: true
                                }
                            },
                            xAxis: {
                                type: 'category',
                                title: {
                                    enabled: true
                                },
                                labels: {
                                    enabled: true
                                }
                            },
                            plotOptions: {

                                pie: {
                                    allowPointSelect: false,
                                    cursor: 'pointer',
                                    size: 100,

                                    dataLabels: {
                                        enabled: false
                                    },
                                    point: {
                                        events: {
                                            legendItemClick: function (e) {
                                                e.preventDefault();
                                            }
                                        }
                                    },
                                    animation: !AOI.inPrintWindow
                                }
                            }
                        },
                        loading: false,
                        series: AOI.OceanJobContributionsSeries
                    };
                    return loadDeferred.promise;
                }
                ,
                loadOceanJobDollarsChart: function () {
                    var loadDeferred = $q.defer();
                    if (AOI.OceanJobDollarsChart) AOI.OceanJobDollarsChart = null;
                    AOI.OceanJobDollarsChart = {
                        options: {
                            credits: {
                                enabled: false
                            },
                            legend: {
                                enabled: true,
                                layout: 'horizontal',
                                x: 0,
                                y: 15,
                                align: 'right',
                                verticalAlign: 'top',
                                floating: true,
                                itemStyle: {

                                    fontSize: '10px',
                                    lineHeight: '10px'
                                }
                            },
                            tooltip: {
                                pointFormat: '<b>${point.y:,.2f}</b>'
                            },
                            chart: {
                                type: 'column',
                                events: {
                                    load: function () {
                                        loadDeferred.resolve();
                                    }
                                },
                                animation: !AOI.inPrintWindow
                            },
                            title: {
                                enabled: true,
                                text: "Contribution in Dollars",
                                align: 'left'
                            },
                            exporting: {enabled: false},
                            colors: ['#ffc000', '#92d050', '#A6C900', '#EFCF06', '#D96704', '#A90306', '#A1A1A1'],
                            yAxis: {
                                title: {
                                    enabled: false
                                }
                            },
                            xAxis: {
                                type: 'category',
                                title: {
                                    enabled: false
                                },
                                labels: {
                                    enabled: true
                                }

                            },
                            plotOptions: {
                                column: {
                                    animation: !AOI.inPrintWindow
                                }
                            }
                        },
                        loading: false,
                        series: [{
                            "name": 'Wages',
                            "data": AOI.ECEconWages
                        }, {
                            "name": 'Goods & Services',
                            "data": AOI.ECEconGDP
                        }
                        ]

                    };
                    return loadDeferred.promise;
                }
                ,
                loadOceanJobEmployeesChart: function () {
                    var loadDeferred = $q.defer();
                    if (AOI.OceanJobEmployeesChart) AOI.OceanJobEmployeesChart = null;
                    AOI.OceanJobEmployeesChart = {
                        options: {
                            credits: {
                                enabled: false
                            },
                            legend: {
                                enabled: false
                            },
                            tooltip: {
                                pointFormat: '<b>{point.y:,.0f}</b>'
                            },
                            chart: {
                                type: 'column',
                                events: {
                                    load: function () {
                                        loadDeferred.resolve();
                                    }
                                },
                                animation: !AOI.inPrintWindow
                            },
                            title: {
                                text: "Number of Employees",
                                align: 'left'
                            },
                            exporting: {enabled: false},
                            colors: ['#4f81bd', '#4f81bd', '#A6C900', '#EFCF06', '#D96704', '#A90306', '#A1A1A1'],
                            yAxis: {

                                title: {
                                    enabled: false
                                }
                            },
                            xAxis: {
                                type: 'category',
                                title: {
                                    enabled: false
                                },
                                labels: {
                                    enabled: true
                                }
                            },
                            plotOptions: {
                                column: {
                                    animation: !AOI.inPrintWindow
                                }
                            }

                        },
                        loading: false,
                        series: [{
                            "name": 'Employees',
                            "data": AOI.ECEconEmploy
                        }]

                    };

                    return loadDeferred.promise;
                }
                ,
                loadWindChart: function () {
                    var loadDeferred = $q.defer();
                    if (AOI.highchartsNG) AOI.highchartsNG = null;
                    AOI.highchartsNG = {
                        options: {
                            credits: {
                                enabled: false
                            },
                            chart: {
                                spacing: 0,
                                margin: 0,
                                type: 'column',
                                events: {
                                    load: function () {
                                        loadDeferred.resolve();
                                    }
                                },
                                animation: !AOI.inPrintWindow
                            },
                            title: {
                                text: null
                            },
                            exporting: {enabled: false},
                            colors: ['#0E3708', '#5C9227', '#A6C900', '#EFCF06', '#D96704', '#A90306', '#A1A1A1'],
                            xAxis: {
                                title: {
                                    enabled: false
                                },
                                labels: {
                                    enabled: false
                                },
                                tickLength: 0
                            },
                            yAxis: {
                                title: {
                                    enabled: false
                                },
                                labels: {
                                    enabled: false
                                },
                                TickLength: 0
                            },
                            plotOptions: {
                                series: {
                                    pointWidth: 190
                                },
                                column: {
                                    stacking: 'percent',
                                    animation: !AOI.inPrintWindow
                                }
                            }

                        },
                        loading: false,
                        series: [{
                            showInLegend: false,
                            name: '',
                            data: [AOI.EMWindResourceClassification[0]]
                        }, {
                            showInLegend: false,
                            name: '',
                            data: [AOI.EMWindResourceClassification[1]]
                        }, {
                            showInLegend: false,
                            name: '',
                            data: [AOI.EMWindResourceClassification[2]]
                        }, {
                            showInLegend: false,
                            name: '',
                            data: [AOI.EMWindResourceClassification[3]]
                        }, {
                            showInLegend: false,
                            name: '',
                            data: [AOI.EMWindResourceClassification[4]]
                        }, {
                            showInLegend: false,
                            name: '',
                            data: [AOI.EMWindResourceClassification[5]]
                        }, {
                            showInLegend: false,
                            name: '',
                            data: [AOI.EMWindResourceClassification[6]]
                        }
                        ]

                    };

                    return loadDeferred.promise;
                }
                ,
                reloadAbort: function () {
                    $window.location.reload();
                }
                ,
                reloadAllCharts: function () {
                    var allPromises = [];
                    allPromises.push(AOI.loadWindChart());
                    allPromises.push(AOI.loadStateChart());
                    allPromises.push(AOI.loadOceanJobEmployeesChart());
                    allPromises.push(AOI.loadOceanJobDollarsChart());
                    allPromises.push(AOI.loadOceanJobContributionsChart());
                    allPromises.push(AOI.loadBeachProjectsChart());

                    return $q.all(allPromises);
                }
                ,
                ShowURL: function () {
                    var shareURL = AOI.url[0] + '#/AOI?AOI=' + AOI.ID;
                    if (AOI.ID === -9999) {
                        AOI.modaltext = "This link will be active for " + AOIConfig.ortReportExpires + " from the time it was first generated. During this time anyone who uses this link will continue to see the same report generated here. Use Print Tool to export to PDF or print to save indefinitely.";
                        shareURL = shareURL +
                            '&TI=' + AOI.drawAreaJobId.TI +
                            '&EC=' + AOI.drawAreaJobId.EC +
                            '&CE=' + AOI.drawAreaJobId.CE +
                            '&NRC=' + AOI.drawAreaJobId.NRC +
                            '&EM=' + AOI.drawAreaJobId.EM
                    } else {
                        AOI.modaltext = "The link below will generate this same report for others to see.";
                    }
                    return (shareURL);
                }
            };

            return AOI;
        }]);

