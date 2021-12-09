
'use strict';

const AWS = require('aws-sdk'); // Import AWS SDK
const { Console } = require('console');
let dynamo = new AWS.DynamoDB.DocumentClient(); // Instance DynamoDB to manage WEB Socket lyfecycle 

// Import API Gateway library to AWS SDK
require('aws-sdk/clients/apigatewaymanagementapi');

// Name of DynamoDB table
const CHATCONNECTION_TABLE = 'ordersTable';

// Successfull response body by default
const successfullResponse = {
  statusCode: 200,
  headers: {
    "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
    "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS 
  },
  body: 'Everything is alright!'
};

// connectionHandler --> Manage CONNECT and DISCONNECT events
module.exports.connectionHandler = (event, context, callback) => {

  console.log(event);
  console.log(context.domainName)
  console.log(context.stage)

  if (event.requestContext.eventType === 'CONNECT') {
    
    // Handle connection
    addConnection(event.requestContext.connectionId)

      .then(() => {
        console.log('New connection: ' + event.requestContext.connectionId);
        callback(null, successfullResponse);
      })

      .catch(err => {
        console.log(err);
        callback(null, JSON.stringify(err));
      });

  } else if (event.requestContext.eventType === 'DISCONNECT') {
    
    // Handle disconnection
    deleteConnection(event.requestContext.connectionId)

      .then(() => {
        console.log('Socket client disconnected... ' + event.requestContext.connectionId);
        callback(null, successfullResponse);
      })

      .catch(err => {
        console.log(err);
        callback(null, {
          statusCode: 500,
          body: 'Failed to connect: ' + JSON.stringify(err)
        });
      });
  }
};

// Save CONNECT document into DynamoDB
const addConnection = connectionId => {


  const params = {
    TableName: CHATCONNECTION_TABLE,
    Item: {
      connectionId: connectionId 
    }
  };

  return dynamo.put(params).promise();
};

// Delete DISCONNECT document from DynamoDB
const deleteConnection = connectionId => {
  const params = {
    TableName: CHATCONNECTION_TABLE,
    Key: {
      connectionId: connectionId 
    }
  };

  return dynamo.delete(params).promise();
};

// defaultHandler --> THIS ONE DOESNT DO ANYHTING
module.exports.defaultHandler = (event, context, callback) => {
  console.log('defaultHandler was called');
  console.log(event);

  callback(null, {
    statusCode: 200,
    body: 'defaultHandler'
  });
};

// sendMessageHandler --> Send orders to all our subscribers
module.exports.sendMessageHandler = (event, context, callback) => {

  console.log("event into sendMessageHandler => " + JSON.stringify(event));

  sendMessageToAllConnected(event).then(() => {
    console.log("antes sendMessage")
    callback(null, successfullResponse)
  
  }).catch (err => {
    callback(null, JSON.stringify(err));
  });
}

const sendMessageToAllConnected = (event) => {
  console.log("entro sendMessage")
  return getConnectionIds().then(connectionData => {

    return connectionData.Items.map(connectionId => {
      return send(event, connectionId.connectionId);
    });
  });
}

const getConnectionIds = () => {  

  const params = {
    TableName: CHATCONNECTION_TABLE,
    ProjectionExpression: 'connectionId'
  };

  return dynamo.scan(params).promise();
}

const send = (event, connectionId) => {
try{
  const body = event.messages;
  
  console.log("body => " + JSON.stringify(body));

  let buff = new Buffer(JSON.stringify(body[0].data), 'base64'); 
  

  const postData = buff.toString('ascii');
   
  console.log("postData into send => " + postData);
  

  const endpoint = "kjcu849td9.execute-api.us-east-2.amazonaws.com/dev";

  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: "2018-11-29",
    endpoint: endpoint
  });

  const params = {
    ConnectionId: connectionId,
    Data: postData
  };

  return apigwManagementApi.postToConnection(params).promise();
}catch(error){
  console.log("ingrese al catch")
  console.log(error)}
};
 
