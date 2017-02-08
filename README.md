# jms-queue-made-fun

Simple setup if using browser dev tools:

1. Include script:

```
var script = document.createElement("script");
script.src = "https://rawgit.com/master-elodin/jms-queue-made-fun/master/jms-queues.min.js",
document.getElementsByTagName("head")[0].appendChild(script)
```

2. Set up options

  * ```queues``` - list of queues
    * ```name``` - for display purposes
    * ```requestData``` - any required information used in ```requestMethod``` (queue name, connectino factory, etc)
  * ```requestMethod``` - method for retrieving queue information

Example options:

```
var options = {
    queues: [{
        name: 'PASSENGER',
        requestData: {
            env: 'QA',
            cxFactory: 'SomeConnectionFactory',
            queueName: 'PASSENGER.BRIDGE.QUEUE'
        }
    },{
        name: 'FLIGHTS',
        requestData: {
            env: 'QA',
            cxFactory: 'OtherConnectionFactory',
            queueName: 'FLIGHT.BRIDGE.QUEUE'
        }
    }],
    requestMethod: function(queueData, requestData, refreshInSec) {
        var deferred = $.Deferred();
        return $.ajax({
            url: 'https://jmsviewer.mycompany.com/SearchQueue.jsp',
            type: "GET",
            data: {
                selectedEnv: requestData.env,
                cFactory: requestData.cxFactory,
                queueName: requestData.queueName,
                fromViewerPage: true
            }
        }).then(function(data) {
            deferred.resolve({
                numConsumers: data.numConsumers,
                numPending: data.numPending,
                maxPending: data.maxPending,
                numProcessed: data.numProcessed,
                avgProcessedPerSec: data.avgProcessedPerSec,
                totalAvgProcessedPerSec: data.totalAvgProcessedPerSec
            });
        });
        return deferred;
    }
}
```

3. Run!

```
JmsQueueVisualizer(options);
```

**Full example**

```
// Add script (if using via browser dev tools)
var script = document.createElement("script");
script.src = "jms-queues-amd.js",
document.getElementsByTagName("head")[0].appendChild(script)


var getValue= function(a,b,c){return a.find("b:contains("+b+")")[0].parentNode.parentNode.nextElementSibling.childNodes[c].innerHTML.trim()}
    , options = {
    queues: [{
        name: 'PASSENGER',
        requestData: {
            env: 'QA',
            cxFactory: 'SomeConnectionFactory',
            queueName: 'PASSENGER.BRIDGE.QUEUE'
        }
    }],
    requestMethod: function(queueData, requestData) {
        var deferred = $.Deferred();
        $.ajax({
            url: 'https://jmsviewer.mycompany.com/SearchQueue.jsp',
            type: "GET",
            data: {
                selectedEnv: requestData.env,
                cFactory: requestData.cxFactory,
                queueName: requestData.queueName,
                fromViewerPage: true
            }
        }).then(function(pageData) {
            // Requesting data returns full state HTML, so traverse the returned DOM to find the necessary elements
            var data = $(pageData)
              , numPending = getValue(data, 'Num Msgs pending', 3)
              , newTotalInbound = getValue(data, 'Total Inbound Messages', 3)
              , previousTotalInbound = queueData.previousTotalInbound > -1 ? queueData.previousTotalInbound : newTotalInbound
              , numProcessed = newTotalInbound - previousTotalInbound
              , avgProcessedPerSec = Math.round((numProcessed / refreshInSec) * 100) / 100
              , totalAvgProcessedPerSec = getLongAvg(queueData.totalAvgProcessedPerSec(), avgProcessedPerSec);
            queueData.previousTotalInbound = newTotalInbound;
            // Return necessary data
            deferred.resolve({
                numConsumers: getValue(data, 'Num consumers', 1),
                numPending: numPending,
                maxPending: Math.max(numPending, queueData.maxPending()),
                numProcessed: numProcessed,
                avgProcessedPerSec: avgProcessedPerSec,
                totalAvgProcessedPerSec: totalAvgProcessedPerSec
            });
        });
        return deferred;
    }
}

// Initialize with options
JmsQueueVisualizer(options);
```
