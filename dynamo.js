const AWS = require('aws-sdk'); // Import AWS SDK
let dynamo = new AWS.DynamoDB.DocumentClient();
const CHATCONNECTION_TABLE = 'ordersTable';
export async function searchItem(id){


var params = {
    TableName:CHATCONNECTION_TABLE,
    Key:{
        id:id
    }
};
let data = dynamo.get(params, function(err, data ){
    if (err) {
        console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
    }
    
} )
return data.Item;



}
