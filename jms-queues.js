(function(root, factory) {

  // Support AMD
  if (typeof define === 'function' && define.amd) {
    define([], factory);

  // Support CommonJS
  } else if (typeof exports === 'object') {
    var JmsQueueVisualizer = factory();

    // Support NodeJS & Component, which allow module.exports to be a function
    if (typeof module === 'object' && module && module.exports) {
      exports = module.exports = JmsQueueVisualizer;
    }

    // Support CommonJS 1.1.1 spec
    exports.JmsQueueVisualizer = JmsQueueVisualizer;

  // Support vanilla script loading
  } else {
    root.JmsQueueVisualizer = factory();
  }
}(this, function() {

    var JmsQueueVisualizer = function(options) {

        if(!options) {
            throw new Error('Cannot create Queue Visualizer with no options');
        } else if(!options.queues) {
            throw new Error('Cannot create Queue Visualizer with no queues');
        }

        // Add extenal libraries
        var scriptSources = [
          "//ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js",
          "https://cdnjs.cloudflare.com/ajax/libs/knockout/3.4.0/knockout-min.js",
          "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.3.0/Chart.min.js",
          "https://cdnjs.cloudflare.com/ajax/libs/randomcolor/0.4.4/randomColor.min.js"
        ]
        // add scripts
        for(var i=0;i<scriptSources.length;i++){
            var script=document.createElement("script");script.src=scriptSources[i],document.getElementsByTagName("head")[0].appendChild(script)
        }

        setTimeout(function(){
            // hack to let things load before starting
            start();
        }, 500);

        // HTML
        var currentImgIndexes = []
          , explosionSrc = 'https://media.giphy.com/media/DVWVJxLvLSc92/giphy.gif'
          , refreshInSec = options.refreshInSec || 15
          , refreshInMillis = refreshInSec * 1000
          , updatesPerMinute = (Math.floor(60/refreshInSec))
          , graphLengthMinutes = (options.graphLengthMinutes || 30) * updatesPerMinute;
        // FUNCTIONS
        var getRandomNum=function(a){return Math.floor(Math.random()*a)}
          , pad=function(a){return a<10?"0"+a:a}
          , getImageSources=function(){console.log("refreshing source..."),$.get("https://rawgit.com/master-elodin/jms-queue-made-fun/master/img-sources.txt").then(function(a){srcImg=a.split("\n"),""===srcImg[srcImg.length-1]&&srcImg.pop()})}
          , getRacerImg=function(a){for(var b=getRandomNum(srcImg.length);currentImgIndexes.indexOf(b)>-1;)b=getRandomNum(srcImg.length);return currentImgIndexes[a]=b,srcImg[b]}
          , createChartLine=function(a,b){b.dataset={label:b.name(),borderColor:b.color(),fill:!1,data:[]},a.data.datasets.push(b.dataset)}
          , updateChartArray=function(chartArray,newData){
              // Update data or labels (since they need to stay in sync)
              if(chartArray.length>graphLengthMinutes) {
                  // Remove old data as necessary
                  chartArray.shift();
              }
              chartArray.push(newData);
              }
          , moveRacer = function(racerChangeDiff, racer) {
              var racerEl = $('#' + racer.name)
                , racerWidth = racerEl.width()
                , windowWidth = $(window).width()
                , currentLeft = racerEl.css('left')
                , currentLeft = parseInt(currentLeft.substring(0, currentLeft.length - 2))
                , newLeft = currentLeft + (racerChangeDiff * racer.direction)
                , maxLeft = 10
                , maxRight = windowWidth - racerWidth - 20
                , trueNewLeft = Math.min(Math.max(newLeft, maxLeft), maxRight);
              if ((currentLeft > 0 && trueNewLeft === maxLeft) || trueNewLeft === maxRight) {
                  racer.direction = racer.direction * -1;
                  if (racer.direction === 1) {
                      setTimeout(function() {
                          racer.numLaps(racer.numLaps() + 1);
                      }, Math.max(refreshInMillis - 1000, 0));
                  }
                  // Delay switching image until side-to-side animation finishes
                  setTimeout(function() {
                      racer.sourceImage(explosionSrc);
                      setTimeout(function() {
                          racer.sourceImage(getRacerImg(racer.trackIndex));
                      }, 800);
                  }, Math.max(refreshInMillis - 1000, 0));
              }
              if (trueNewLeft < currentLeft) {
                  // Moving left
                  racerEl.css('transform', 'scaleX(-1)');
              } else {
                  // Moving right
                  racerEl.css('transform', 'scaleX(1)');
              }
              racerEl.stop(true, true);
              racerEl.animate({
                  'left': trueNewLeft + 'px'
              }, refreshInMillis);
          };
        function RunTime() {
            var instance = this;
            instance.numTimesRan = ko.observable(-1);
            instance.getTime = ko.pureComputed(function() {
                var totalSeconds = instance.numTimesRan() * refreshInSec
                  , totalMinutes = Math.floor(totalSeconds / 60)
                  , totalHours = Math.floor(totalMinutes / 60)
                  , modSeconds = totalSeconds % 60
                  , modMinutes = totalMinutes % 60
                  , displaySeconds = modSeconds + 's '
                  , displayMinutes = totalMinutes > 0 ? modMinutes + 'm ' : ''
                  , displayHours = totalHours > 0 ? totalHours + 'h ' : '';
                return 'Total run time: ' + displayHours + displayMinutes + displaySeconds;
            }, instance);
            instance.increment = function() {
                instance.numTimesRan(instance.numTimesRan() + 1);
            }
        }
        function Leader(type) {
            var instance = this;
            instance.type = ko.observable(type);
            instance.name = ko.observable('');
            instance.value = ko.observable(0);
            instance.leaderChanged = ko.observable(false);
            instance.getColor = ko.pureComputed(function() {
                return 'leaderboard__row--' + (instance.leaderChanged() ? 'changed' : 'no-change');
            }, instance);
            instance.check = function(newName, newValue, shouldClear) {
                if (newValue > instance.value()) {
                    instance.update(newName, newValue);
                }
            }
            instance.update = function(newName, newValue) {
                instance.leaderChanged(newName !== instance.name() || newValue > instance.value());
                instance.name(newName);
                instance.value(newValue);
            }
            instance.clearLeaderChange = function() {
                instance.leaderChanged(false);
            }
        }
        function Leaderboard() {
            var instance = this;
            instance.maxQueue = ko.observable(new Leader('Max Depth'));
            instance.bestAvg = ko.observable(new Leader('Processed/Sec (15 sec avg)'));
            instance.bestTotalAvg = ko.observable(new Leader('Processed/Sec (5 min avg)'));
            instance.clearLeaderChange = function() {
                instance.maxQueue().clearLeaderChange();
                instance.bestAvg().clearLeaderChange();
                instance.bestTotalAvg().clearLeaderChange();
            }
            instance.values = ko.observableArray([instance.maxQueue, instance.bestAvg, instance.bestTotalAvg]);
        }
        function QueueList(options) {
            var instance = this
              , numQueues = options.queues.length
              , labels = []
              , canvas = document.getElementById("chart")
              , ctx = canvas.getContext("2d")
              , chartSubContainer = $('#chart-sub-container');
            instance.queues = ko.observableArray([]);
            instance.leaderboard = ko.observable(new Leaderboard());
            instance.runtime = ko.observable(new RunTime());
            instance.useSimpleImg = ko.observable(false);
            instance.toggleImages = function() {
              instance.useSimpleImg(!instance.useSimpleImg());
            }
            instance.imageText = ko.pureComputed(function(){
              return instance.useSimpleImg() ? 'Use Fun Racers' : 'Use Boring Racers';
            }, instance);
            canvas.width = chartSubContainer.width();
            canvas.height = chartSubContainer.height();
            instance.chart = new Chart(ctx, {
                type: 'line',
                data: {
                  labels: [],
                  datasets: []
                },
                options: {
                  maintainAspectRatio: false,
                  responsive: true,
                  scales: {
                      gridLines: {
                          color: "rgba(255,255,255,1)"
                      },
                      scaleLabel: {
                          fontColor: "rgba(255,255,255,1)"
                      },
                      xAxes: [{
                          display: true
                      }]
                  }
                }
            });
            // hack to correct ChartJS frame positioning
            setTimeout(function() {
                $("iframe").css("height", "100%").css("position", "relative");
                setTimeout(function() {
                    $("iframe").css("height", 0);
                    $('#chart-sub-container').css('height', '200px').css('width', '600px').css('margin-left', '50px');
                }, 200);
            }, 200);

            for (var i = 0; i < options.queues.length; i++) {
                var queue = options.queues[i];
              var queueData = new QueueData(queue.name, queue.requestData, i)
              instance.queues.push(ko.observable(queueData));
              createChartLine(instance.chart, queueData);
            }
            instance.updateCount = 0;
            instance.update = function() {
                var deferred = $.Deferred()
                  , numLeft = numQueues;
                for (var i = 0; i < options.queues.length; i++) {
                    instance.queues()[i]().update(options.requestMethod, instance.runtime().numTimesRan(), options.refreshInSec).then(function() {
                        if (--numLeft === 0) {
                            deferred.resolve();
                        }
                    });
                }
                deferred.then(function() {
                    var bestCurrentAvg = 0
                      , bestCurrentAvgName = ''
                      , bestCurrentTotalAvg = 0
                      , bestCurrentTotalAvgName = '';
                    instance.leaderboard().clearLeaderChange();
                    $.each(instance.queues(), function(index, queue) {
                        var queueName = queue().name();
                        instance.leaderboard().maxQueue().check(queueName, queue().maxPending());
                        if (queue().avgProcessedPerSec() > bestCurrentAvg) {
                            bestCurrentAvg = queue().avgProcessedPerSec()
                            bestCurrentAvgName = queueName;
                        }
                        if (queue().totalAvgProcessedPerSec() > bestCurrentTotalAvg) {
                            bestCurrentTotalAvg = queue().totalAvgProcessedPerSec()
                            bestCurrentTotalAvgName = queueName;
                        }
                    });
                    instance.leaderboard().bestAvg().update(bestCurrentAvgName, bestCurrentAvg);
                    instance.leaderboard().bestTotalAvg().update(bestCurrentTotalAvgName, bestCurrentTotalAvg);
                    instance.runtime().increment();
                    // Only show update label for each minute change
                    var date = new Date()
                        , hourMinuteTime = pad(date.getHours()) + ":" + pad(date.getMinutes())
                        , updateTimeLabel = ((instance.updateCount++ * refreshInSec) % 60 === 0) ? hourMinuteTime : "";
                    updateChartArray(instance.chart.data.labels, updateTimeLabel);
                    instance.chart.update();
                });
            }
        }
        function QueueData(queueName, requestData, queueIndex) {
            var instance = this;
            instance.name = ko.observable(queueName);
            instance.requestData = requestData;
            instance.previousTotalInbound = -1;
            instance.color = ko.observable(randomColor({luminosity: 'light'}));
            instance.racer = ko.observable({
                name: 'racer-' + instance.name(),
                direction: 1,
                numLaps: ko.observable(0),
                sourceImage: ko.observable(getRacerImg(queueIndex++)),
                trackIndex: queueIndex
            });
            instance.numConsumers = ko.observable(0);
            instance.numPending = ko.observable(0);
            instance.maxPending = ko.observable(0);
            instance.numProcessed = ko.observable(0);
            instance.avgProcessedPerSec = ko.observable(0);
            instance.totalAvgProcessedPerSec = ko.observable(0);
            instance.update = function(requestMethod, numTimesRan, refreshInSec) {
                var deferred = $.Deferred();
                requestMethod(instance, instance.requestData, refreshInSec).then(function(newData) {
                    instance.numConsumers(newData.numConsumers);
                    instance.numPending(newData.numPending);
                    instance.maxPending(newData.maxPending);
                    instance.numProcessed(newData.numProcessed);
                    instance.avgProcessedPerSec(newData.avgProcessedPerSec);
                    instance.totalAvgProcessedPerSec(newData.totalAvgProcessedPerSec);

                    moveRacer(instance.avgProcessedPerSec() * 20, instance.racer());
                    updateChartArray(instance.dataset.data, {x: (numTimesRan+1)*refreshInSec, y: Math.floor(instance.avgProcessedPerSec())});

                    deferred.resolve();
                }).fail(function(error){
                  console.log('failed on refresh: ' + e);
                  clearInterval(updateInterval);
                });
                return deferred;
            }
        }
        var start = function() {
            getImageSources();
            setTimeout(function() {

                $('body').html('<div class=queue-overall-container id=container><table class=queue-list><thead><tr><th class="queue-list-header queue-list__name">Queue Name<th class="queue-list-header queue-list__consumers">Consumers<th class="queue-list-header queue-list__depth">Queue Depth<th class="queue-list-header queue-list__max-depth">Max Depth<th class="queue-list-header queue-list__proc">Processed<br>(15 sec)<th class="queue-list-header queue-list__avg-processed-sec-short">Processed/Sec<br>(15 sec avg)<th class="queue-list-header queue-list__avg-processed-sec-long">Processed/Sec<br>(5 min avg)<th class="queue-list-header queue-list__laps">Laps<tbody data-bind="foreach: queues"><tr data-bind="style: { color: color }"class=queue-list-entry__row><td data-bind="text: name"class=queue-list-entry__name><td data-bind="text: numConsumers"><td data-bind="text: numPending"><td data-bind="text: maxPending"><td data-bind="text: numProcessed"><td data-bind="text: avgProcessedPerSec"><td data-bind="text: totalAvgProcessedPerSec"><td data-bind="text: racer().numLaps"></table><div class=queue-combined-container><div class=runtime-toggle-container><div class=runtime-container data-bind="with: runtime"><span data-bind="text: getTime()"></span></div><div class=button-container><span data-bind="click: toggleImages, text: imageText"class=button></span></div></div><table class=leaderboard data-bind="with: leaderboard"><thead class=leaderboard-header><tr><th class=leaderboard-header__name>Queue<th class=leaderboard-header__category>Category<th>Points<tbody data-bind="foreach: values"><tr data-bind="style: { color: getColor() }"><td data-bind="text: name"><td data-bind="text: type"><td data-bind="text: value"></table><div class=graph-top-parent><div id=chart-sub-container><canvas height=200 id=chart width=600></canvas></div></div></div><div class=race-container data-bind="foreach: queues"><div class=racer-row><span data-bind="text: name"class=racer-row__name></span><div class=racer-row__racer-container data-bind="attr: { id: racer().name }"><img class="racer racer-image"data-bind="attr: {src: racer().sourceImage}, visible: !$root.useSimpleImg()"> <svg class="racer racer-dot"data-bind="visible: $root.useSimpleImg, style: {fill: color}"viewBox="0 0 100 100"xmlns=http://www.w3.org/2000/svg><circle cx=40 cy=40 r=40 /></svg></div></div></div></div>');

                var link  = document.createElement('link');
                link.rel  = 'stylesheet';
                link.type = 'text/css';
                link.href = 'https://rawgit.com/master-elodin/jms-queue-made-fun/master/assets/stylesheets/jms-queues.css';
                document.getElementsByTagName('head')[0].appendChild(link);

                var queueList = new QueueList(options);
                ko.applyBindings(queueList);
                queueList.update();
                var updateInterval = setInterval(function() {
                    console.log('Updating...');

                    queueList.update();
                    console.log('Finished updating');
                    if (queueList.runtime().numTimesRan() % 8 === 0) {
                        getImageSources();
                    }
                }, refreshInMillis);
            }, 500);
        }

    }

    return JmsQueueVisualizer;
}))
