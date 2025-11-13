#!/bin/bash

# Simple and reliable seeding script
set -e

echo "🌱 Seeding DynamoDB tables..."

# Add remaining drivers
echo "Adding drivers..."

aws dynamodb put-item --table-name powertools-ride-workshop-Drivers --item '{
    "driverId": {"S": "driver-002"},
    "name": {"S": "Maria Garcia"},
    "email": {"S": "maria.garcia@example.com"},
    "phone": {"S": "+1-555-0102"},
    "licenseNumber": {"S": "DL987654321"},
    "vehicleInfo": {
        "M": {
            "make": {"S": "Honda"},
            "model": {"S": "Civic"},
            "year": {"N": "2021"},
            "color": {"S": "White"},
            "licensePlate": {"S": "XYZ789"}
        }
    },
    "status": {"S": "available"},
    "currentLocation": {"S": "{\"address\":\"Mission District\",\"latitude\":37.7599,\"longitude\":-122.4148}"},
    "acceptedPaymentMethods": {"SS": ["pm-credit-card", "pm-somecompany-pay", "pm-cash"]},
    "rating": {"N": "4.9"},
    "totalRides": {"N": "289"},
    "createdAt": {"S": "2024-01-20T09:30:00Z"},
    "updatedAt": {"S": "2024-08-22T15:00:00Z"},
    "lastUpdated": {"S": "2024-08-22T15:00:00Z"}
}'

aws dynamodb put-item --table-name powertools-ride-workshop-Drivers --item '{
    "driverId": {"S": "driver-003"},
    "name": {"S": "David Chen"},
    "email": {"S": "david.chen@example.com"},
    "phone": {"S": "+1-555-0103"},
    "licenseNumber": {"S": "DL456789123"},
    "vehicleInfo": {
        "M": {
            "make": {"S": "Tesla"},
            "model": {"S": "Model 3"},
            "year": {"N": "2023"},
            "color": {"S": "Black"},
            "licensePlate": {"S": "TES123"}
        }
    },
    "status": {"S": "available"},
    "currentLocation": {"S": "{\"address\":\"SOMA\",\"latitude\":37.7849,\"longitude\":-122.4094}"},
    "acceptedPaymentMethods": {"SS": ["pm-credit-card", "pm-somecompany-pay", "pm-google-pay"]},
    "rating": {"N": "4.7"},
    "totalRides": {"N": "156"},
    "createdAt": {"S": "2024-02-01T10:15:00Z"},
    "updatedAt": {"S": "2024-08-22T15:00:00Z"},
    "lastUpdated": {"S": "2024-08-22T15:00:00Z"}
}'

aws dynamodb put-item --table-name powertools-ride-workshop-Drivers --item '{
    "driverId": {"S": "driver-004"},
    "name": {"S": "Sarah Johnson"},
    "email": {"S": "sarah.johnson@example.com"},
    "phone": {"S": "+1-555-0104"},
    "licenseNumber": {"S": "DL789123456"},
    "vehicleInfo": {
        "M": {
            "make": {"S": "Nissan"},
            "model": {"S": "Leaf"},
            "year": {"N": "2022"},
            "color": {"S": "Silver"},
            "licensePlate": {"S": "NIS456"}
        }
    },
    "status": {"S": "available"},
    "currentLocation": {"S": "{\"address\":\"Castro\",\"latitude\":37.7609,\"longitude\":-122.4350}"},
    "acceptedPaymentMethods": {"SS": ["pm-credit-card", "pm-cash"]},
    "rating": {"N": "4.6"},
    "totalRides": {"N": "203"},
    "createdAt": {"S": "2024-01-25T14:20:00Z"},
    "updatedAt": {"S": "2024-08-22T15:00:00Z"},
    "lastUpdated": {"S": "2024-08-22T15:00:00Z"}
}'

aws dynamodb put-item --table-name powertools-ride-workshop-Drivers --item '{
    "driverId": {"S": "driver-005"},
    "name": {"S": "Ahmed Hassan"},
    "email": {"S": "ahmed.hassan@example.com"},
    "phone": {"S": "+1-555-0105"},
    "licenseNumber": {"S": "DL321654987"},
    "vehicleInfo": {
        "M": {
            "make": {"S": "Chevrolet"},
            "model": {"S": "Bolt"},
            "year": {"N": "2021"},
            "color": {"S": "Red"},
            "licensePlate": {"S": "CHV789"}
        }
    },
    "status": {"S": "available"},
    "currentLocation": {"S": "{\"address\":\"Richmond\",\"latitude\":37.7806,\"longitude\":-122.4644}"},
    "acceptedPaymentMethods": {"SS": ["pm-credit-card", "pm-somecompany-pay", "pm-google-pay", "pm-cash"]},
    "rating": {"N": "4.5"},
    "totalRides": {"N": "378"},
    "createdAt": {"S": "2024-01-10T11:45:00Z"},
    "updatedAt": {"S": "2024-08-22T15:00:00Z"},
    "lastUpdated": {"S": "2024-08-22T15:00:00Z"}
}'
aws dynamodb put-item --table-name powertools-ride-workshop-Drivers --item '{
    "driverId": {"S": "driver-006"},
    "name": {"S": "Emma Thompson"},
    "email": {"S": "emma.thompson@example.com"},
    "phone": {"S": "+1-555-0106"},
    "licenseNumber": {"S": "DL654321789"},
    "vehicleInfo": {
        "M": {
            "make": {"S": "BMW"},
            "model": {"S": "i3"},
            "year": {"N": "2020"},
            "color": {"S": "Blue"},
            "licensePlate": {"S": "BMW321"}
        }
    },
    "status": {"S": "available"},
    "currentLocation": {"S": "{\"address\":\"Nob Hill\",\"latitude\":37.7928,\"longitude\":-122.4161}"},
    "acceptedPaymentMethods": {"SS": ["pm-credit-card", "pm-somecompany-pay", "pm-google-pay"]},
    "rating": {"N": "4.8"},
    "totalRides": {"N": "245"},
    "createdAt": {"S": "2024-01-15T08:30:00Z"},
    "updatedAt": {"S": "2024-08-22T15:00:00Z"},
    "lastUpdated": {"S": "2024-08-22T15:00:00Z"}
}'

aws dynamodb put-item --table-name powertools-ride-workshop-Drivers --item '{
    "driverId": {"S": "driver-007"},
    "name": {"S": "Carlos Rodriguez"},
    "email": {"S": "carlos.rodriguez@example.com"},
    "phone": {"S": "+1-555-0107"},
    "licenseNumber": {"S": "DL147258369"},
    "vehicleInfo": {
        "M": {
            "make": {"S": "Hyundai"},
            "model": {"S": "Kona Electric"},
            "year": {"N": "2022"},
            "color": {"S": "Orange"},
            "licensePlate": {"S": "HYU147"}
        }
    },
    "status": {"S": "available"},
    "currentLocation": {"S": "{\"address\":\"Haight-Ashbury\",\"latitude\":37.7692,\"longitude\":-122.4481}"},
    "acceptedPaymentMethods": {"SS": ["pm-credit-card", "pm-cash", "pm-google-pay"]},
    "rating": {"N": "4.4"},
    "totalRides": {"N": "167"},
    "createdAt": {"S": "2024-02-10T16:20:00Z"},
    "updatedAt": {"S": "2024-08-22T15:00:00Z"},
    "lastUpdated": {"S": "2024-08-22T15:00:00Z"}
}'

aws dynamodb put-item --table-name powertools-ride-workshop-Drivers --item '{
    "driverId": {"S": "driver-008"},
    "name": {"S": "Lisa Wang"},
    "email": {"S": "lisa.wang@example.com"},
    "phone": {"S": "+1-555-0108"},
    "licenseNumber": {"S": "DL369258147"},
    "vehicleInfo": {
        "M": {
            "make": {"S": "Volkswagen"},
            "model": {"S": "ID.4"},
            "year": {"N": "2023"},
            "color": {"S": "Gray"},
            "licensePlate": {"S": "VW369"}
        }
    },
    "status": {"S": "available"},
    "currentLocation": {"S": "{\"address\":\"Chinatown\",\"latitude\":37.7941,\"longitude\":-122.4078}"},
    "acceptedPaymentMethods": {"SS": ["pm-credit-card", "pm-somecompany-pay"]},
    "rating": {"N": "4.9"},
    "totalRides": {"N": "312"},
    "createdAt": {"S": "2024-01-05T12:10:00Z"},
    "updatedAt": {"S": "2024-08-22T15:00:00Z"},
    "lastUpdated": {"S": "2024-08-22T15:00:00Z"}
}'

aws dynamodb put-item --table-name powertools-ride-workshop-Drivers --item '{
    "driverId": {"S": "driver-009"},
    "name": {"S": "Michael Brown"},
    "email": {"S": "michael.brown@example.com"},
    "phone": {"S": "+1-555-0109"},
    "licenseNumber": {"S": "DL852963741"},
    "vehicleInfo": {
        "M": {
            "make": {"S": "Ford"},
            "model": {"S": "Mustang Mach-E"},
            "year": {"N": "2022"},
            "color": {"S": "Green"},
            "licensePlate": {"S": "FRD852"}
        }
    },
    "status": {"S": "available"},
    "currentLocation": {"S": "{\"address\":\"Pacific Heights\",\"latitude\":37.7886,\"longitude\":-122.4324}"},
    "acceptedPaymentMethods": {"SS": ["pm-credit-card", "pm-somecompany-pay", "pm-google-pay", "pm-cash"]},
    "rating": {"N": "4.3"},
    "totalRides": {"N": "189"},
    "createdAt": {"S": "2024-02-15T13:45:00Z"},
    "updatedAt": {"S": "2024-08-22T15:00:00Z"},
    "lastUpdated": {"S": "2024-08-22T15:00:00Z"}
}'

aws dynamodb put-item --table-name powertools-ride-workshop-Drivers --item '{
    "driverId": {"S": "driver-010"},
    "name": {"S": "Anna Kowalski"},
    "email": {"S": "anna.kowalski@example.com"},
    "phone": {"S": "+1-555-0110"},
    "licenseNumber": {"S": "DL741852963"},
    "vehicleInfo": {
        "M": {
            "make": {"S": "Audi"},
            "model": {"S": "e-tron"},
            "year": {"N": "2021"},
            "color": {"S": "Purple"},
            "licensePlate": {"S": "AUD741"}
        }
    },
    "status": {"S": "available"},
    "currentLocation": {"S": "{\"address\":\"Russian Hill\",\"latitude\":37.8014,\"longitude\":-122.4186}"},
    "acceptedPaymentMethods": {"SS": ["pm-credit-card", "pm-somecompany-pay"]},
    "rating": {"N": "4.7"},
    "totalRides": {"N": "234"},
    "createdAt": {"S": "2024-01-30T09:15:00Z"},
    "updatedAt": {"S": "2024-08-22T15:00:00Z"},
    "lastUpdated": {"S": "2024-08-22T15:00:00Z"}
}'

aws dynamodb put-item --table-name powertools-ride-workshop-Drivers --item '{
    "driverId": {"S": "driver-011"},
    "name": {"S": "James Wilson"},
    "email": {"S": "james.wilson@example.com"},
    "phone": {"S": "+1-555-0111"},
    "licenseNumber": {"S": "DL963741852"},
    "vehicleInfo": {
        "M": {
            "make": {"S": "Kia"},
            "model": {"S": "EV6"},
            "year": {"N": "2023"},
            "color": {"S": "Yellow"},
            "licensePlate": {"S": "KIA963"}
        }
    },
    "status": {"S": "available"},
    "currentLocation": {"S": "{\"address\":\"Sunset District\",\"latitude\":37.7431,\"longitude\":-122.4660}"},
    "acceptedPaymentMethods": {"SS": ["pm-credit-card", "pm-google-pay", "pm-cash"]},
    "rating": {"N": "4.2"},
    "totalRides": {"N": "145"},
    "createdAt": {"S": "2024-02-05T14:30:00Z"},
    "updatedAt": {"S": "2024-08-22T15:00:00Z"},
    "lastUpdated": {"S": "2024-08-22T15:00:00Z"}
}'

aws dynamodb put-item --table-name powertools-ride-workshop-Drivers --item '{
    "driverId": {"S": "driver-012"},
    "name": {"S": "Sofia Petrov"},
    "email": {"S": "sofia.petrov@example.com"},
    "phone": {"S": "+1-555-0112"},
    "licenseNumber": {"S": "DL159357246"},
    "vehicleInfo": {
        "M": {
            "make": {"S": "Polestar"},
            "model": {"S": "2"},
            "year": {"N": "2022"},
            "color": {"S": "Gold"},
            "licensePlate": {"S": "POL159"}
        }
    },
    "status": {"S": "available"},
    "currentLocation": {"S": "{\"address\":\"Bernal Heights\",\"latitude\":37.7441,\"longitude\":-122.4153}"},
    "acceptedPaymentMethods": {"SS": ["pm-credit-card", "pm-somecompany-pay", "pm-google-pay"]},
    "rating": {"N": "4.8"},
    "totalRides": {"N": "276"},
    "createdAt": {"S": "2024-01-12T07:45:00Z"},
    "updatedAt": {"S": "2024-08-22T15:00:00Z"},
    "lastUpdated": {"S": "2024-08-22T15:00:00Z"}
}'

aws dynamodb put-item --table-name powertools-ride-workshop-Drivers --item '{
    "driverId": {"S": "driver-013"},
    "name": {"S": "Robert Kim"},
    "email": {"S": "robert.kim@example.com"},
    "phone": {"S": "+1-555-0113"},
    "licenseNumber": {"S": "DL357159246"},
    "vehicleInfo": {
        "M": {
            "make": {"S": "Genesis"},
            "model": {"S": "GV70 Electrified"},
            "year": {"N": "2023"},
            "color": {"S": "Bronze"},
            "licensePlate": {"S": "GEN357"}
        }
    },
    "status": {"S": "available"},
    "currentLocation": {"S": "{\"address\":\"Glen Park\",\"latitude\":37.7336,\"longitude\":-122.4339}"},
    "acceptedPaymentMethods": {"SS": ["pm-credit-card", "pm-somecompany-pay"]},
    "rating": {"N": "4.6"},
    "totalRides": {"N": "198"},
    "createdAt": {"S": "2024-02-20T11:20:00Z"},
    "updatedAt": {"S": "2024-08-22T15:00:00Z"},
    "lastUpdated": {"S": "2024-08-22T15:00:00Z"}
}'

aws dynamodb put-item --table-name powertools-ride-workshop-Drivers --item '{
    "driverId": {"S": "driver-014"},
    "name": {"S": "Isabella Martinez"},
    "email": {"S": "isabella.martinez@example.com"},
    "phone": {"S": "+1-555-0114"},
    "licenseNumber": {"S": "DL246159357"},
    "vehicleInfo": {
        "M": {
            "make": {"S": "Rivian"},
            "model": {"S": "R1T"},
            "year": {"N": "2022"},
            "color": {"S": "Forest Green"},
            "licensePlate": {"S": "RIV246"}
        }
    },
    "status": {"S": "available"},
    "currentLocation": {"S": "{\"address\":\"Potrero Hill\",\"latitude\":37.7587,\"longitude\":-122.4015}"},
    "acceptedPaymentMethods": {"SS": ["pm-credit-card", "pm-google-pay", "pm-cash"]},
    "rating": {"N": "4.5"},
    "totalRides": {"N": "167"},
    "createdAt": {"S": "2024-01-28T15:10:00Z"},
    "updatedAt": {"S": "2024-08-22T15:00:00Z"},
    "lastUpdated": {"S": "2024-08-22T15:00:00Z"}
}'

aws dynamodb put-item --table-name powertools-ride-workshop-Drivers --item '{
    "driverId": {"S": "driver-015"},
    "name": {"S": "Thomas Anderson"},
    "email": {"S": "thomas.anderson@example.com"},
    "phone": {"S": "+1-555-0115"},
    "licenseNumber": {"S": "DL468135792"},
    "vehicleInfo": {
        "M": {
            "make": {"S": "Lucid"},
            "model": {"S": "Air Dream"},
            "year": {"N": "2023"},
            "color": {"S": "Platinum"},
            "licensePlate": {"S": "LUC468"}
        }
    },
    "status": {"S": "available"},
    "currentLocation": {"S": "{\"address\":\"Marina District\",\"latitude\":37.8006,\"longitude\":-122.4429}"},
    "acceptedPaymentMethods": {"SS": ["pm-credit-card", "pm-somecompany-pay", "pm-google-pay", "pm-cash"]},
    "rating": {"N": "4.9"},
    "totalRides": {"N": "89"},
    "createdAt": {"S": "2024-02-25T10:05:00Z"},
    "updatedAt": {"S": "2024-08-22T15:00:00Z"},
    "lastUpdated": {"S": "2024-08-22T15:00:00Z"}
}'
echo "✅ All drivers added!"


echo ""
echo "🎉 Database seeding completed!"
echo ""
echo "📊 Summary:"
echo "  • 5 drivers added to powertools-ride-workshop-Drivers (with accepted payment methods)"
echo "  • Pricing rules are built into the service code"
echo "  • Transaction tables (Rides, Payments, Pricing) remain empty for demo generation"
echo ""
echo "🚀 Ready for Load generator!"
