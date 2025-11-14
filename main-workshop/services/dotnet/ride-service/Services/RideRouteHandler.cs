using System.Text.Json;

public static class RideRouteHandler
{
    public static bool IsCreateRideRequest(APIGatewayProxyRequest request)
    {
        return request.HttpMethod.Equals("POST", StringComparison.CurrentCultureIgnoreCase) && request.Path == "/rides";
    }

    public static APIGatewayProxyResponse HandleError()
    {
        return new APIGatewayProxyResponse
        {
            StatusCode = 500,
            Body = JsonSerializer.Serialize(new
            {
                error = "Internal Server Error"
            })
        };
    }

    public static APIGatewayProxyResponse Created(object? data) => CreateResponse(201, data);
    public static APIGatewayProxyResponse BadRequest(string message) => CreateResponse(400, new { error = message });
    public static APIGatewayProxyResponse NotFound(string message) => CreateResponse(404, new { error = message });

    private static APIGatewayProxyResponse CreateResponse(int statusCode, object? data)
    {
        return new APIGatewayProxyResponse
        {
            StatusCode = statusCode,
            Body = JsonSerializer.Serialize(data,
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
        };
    }
}