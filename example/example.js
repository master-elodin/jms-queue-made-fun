var script = document.createElement("script");
script.src = "jms-queues-amd.js",
document.getElementsByTagName("head")[0].appendChild(script)

setTimeout(function() {
    var getValue=function(a,b,c){return a.find("b:contains("+b+")")[0].parentNode.parentNode.nextElementSibling.childNodes[c].innerHTML.trim()}
        , options = {
        queues: [{
            name: 'PASSENGER',
            requestData: {
                env: 'QA',
                cxFactory: 'SomeConnectionFactory',
                queueName: 'PASSENGER.BRIDGE.QUEUE'
            }
        }],
        requestData: function(queueData, requestData) {
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
                var data = $(pageData)
                  , numPending = getValue(data, 'Num Msgs pending', 3)
                  , newTotalInbound = getValue(data, 'Total Inbound Messages', 3)
                  , previousTotalInbound = queueData.previousTotalInbound > -1 ? queueData.previousTotalInbound : newTotalInbound
                  , numProcessed = newTotalInbound - previousTotalInbound
                  , avgProcessedPerSec = Math.round((numProcessed / refreshInSec) * 100) / 100
                  , totalAvgProcessedPerSec = getLongAvg(queueData.totalAvgProcessedPerSec(), avgProcessedPerSec);
                queueData.previousTotalInbound = newTotalInbound;
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

    JmsQueueVisualizer(options);
}, 500);
