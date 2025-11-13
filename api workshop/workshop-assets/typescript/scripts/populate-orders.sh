#!/bin/bash
echo "Populating orders..."

BATCH_SIZE=50
BATCH_START=1

while [ $BATCH_START -le $BATCH_SIZE ]; do
    BATCH_END=$((BATCH_START + 24))
    if [ $BATCH_END -gt $BATCH_SIZE ]; then
        BATCH_END=$BATCH_SIZE
    fi
    
    ITEMS=""
    for i in $(seq $BATCH_START $BATCH_END); do
        if [ -n "$ITEMS" ]; then
            ITEMS="$ITEMS,"
        fi
        ITEMS="$ITEMS{
            \"PutRequest\": {
                \"Item\": {
                    \"orderId\": {\"S\": \"$i\"},
                    \"customerName\": {\"S\": \"John Doe\"},
                    \"orderStatus\": {\"S\": \"Pending\"},
                    \"orderDate\": {\"S\": \"2024-10-29\"},
                    \"restaurantName\": {\"S\": \"Sushi Restaurant\"},
                    \"orderItems\": {\"L\": [
                        {\"M\": {\"name\": {\"S\": \"Sushi Roll\"}, \"quantity\": {\"N\": \"2\"}}},
                        {\"M\": {\"name\": {\"S\": \"Miso Soup\"}, \"quantity\": {\"N\": \"1\"}}}
                    ]},
                    \"restaurantId\": {\"S\": \"$((i % 10))\"}
                }
            }
        }"
    done
    
    aws dynamodb batch-write-item \
        --request-items "{\"OrdersWorkshop\": [$ITEMS]}" \
        --no-cli-pager
    
    echo "Inserted batch ending at $BATCH_END orders..."
    BATCH_START=$((BATCH_START + 25))
done

echo "Done! Inserted $BATCH_SIZE orders."
