#####
# imports - app.py
#####
import json
import boto3
from boto3.dynamodb.conditions import Key
from uuid import uuid4
from decimal import Decimal

#####
# Classes, functions and instances - app.py
#####
dynamodb = boto3.resource('dynamodb')
orders_table = dynamodb.Table('OrdersWorkshop')

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

#####
# Get all orders method - app.py
#####
def get_all_orders(event):
    response = orders_table.scan()
    
    if len(response['Items']) > 0:
        return {
            'statusCode': 200,
            'body': json.dumps(response['Items'], cls=DecimalEncoder)
        }
    else:
        return {
            'statusCode': 200,
            'body': json.dumps({"message": "No orders found"})
        }

#####
# Get order method - app.py
#####
def get_order(event):
    order_id = event['queryStringParameters']['orderId']
    response = orders_table.get_item(Key={'orderId': order_id})
    
    if 'Item' in response:
        return {
            'statusCode': 200,
            'body': json.dumps(response['Item'], cls=DecimalEncoder)
        }
    else:
        return {
            'statusCode': 200,
            'body': json.dumps({"message": "Order not found"})
        }

#####
# Lambda handler - app.py
#####
def lambda_handler(event, context):
    http_method = event['httpMethod']
    
    if http_method == 'GET' and event["queryStringParameters"] is None and event["path"] == "/orders":
        return get_all_orders(event)
    if http_method == 'GET' and event["path"] == "/orders":
        return get_order(event)
    else:
        return {
            'statusCode': 400,
            'body': json.dumps({"message": "Unsupported HTTP method"})
        }
