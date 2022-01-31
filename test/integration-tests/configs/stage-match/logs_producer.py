import json


def handler(event, _):
    print("Event", event)
    body = {
        "message": "Go Serverless! Your function executed successfully!",
        "input": event
    }
    response = {
        "statusCode": 200,
        "body": json.dumps(body)
    }
    return response
