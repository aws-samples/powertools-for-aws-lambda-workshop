/**
 * Custom Resource Lambda to seed Drivers table
 * Runs during CDK deployment to populate initial driver data
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Vehicle makes and models
const VEHICLES = [
    { make: 'Toyota', model: 'Prius', colors: ['White', 'Silver', 'Blue', 'Black'] },
    { make: 'Honda', model: 'Civic', colors: ['White', 'Silver', 'Red', 'Black'] },
    { make: 'Tesla', model: 'Model 3', colors: ['White', 'Black', 'Blue', 'Red'] },
    { make: 'Nissan', model: 'Leaf', colors: ['Silver', 'White', 'Blue'] },
    { make: 'Chevrolet', model: 'Bolt', colors: ['Red', 'White', 'Silver'] },
    { make: 'BMW', model: 'i3', colors: ['Blue', 'White', 'Black'] },
    { make: 'Hyundai', model: 'Kona Electric', colors: ['Orange', 'White', 'Gray'] },
    { make: 'Volkswagen', model: 'ID.4', colors: ['Gray', 'White', 'Blue'] },
    { make: 'Ford', model: 'Mustang Mach-E', colors: ['Green', 'Blue', 'Red'] },
    { make: 'Audi', model: 'e-tron', colors: ['Purple', 'Black', 'White'] },
];

// First names
const FIRST_NAMES = [
    'John', 'Maria', 'David', 'Sarah', 'Ahmed', 'Emma', 'Carlos', 'Lisa',
    'Michael', 'Anna', 'James', 'Sofia', 'Robert', 'Isabella', 'Thomas',
    'Jennifer', 'William', 'Patricia', 'Richard', 'Linda', 'Joseph', 'Elizabeth',
    'Charles', 'Barbara', 'Christopher', 'Susan', 'Daniel', 'Jessica', 'Matthew',
    'Karen', 'Anthony', 'Nancy', 'Mark', 'Betty', 'Donald', 'Helen', 'Steven',
    'Sandra', 'Paul', 'Donna', 'Andrew', 'Carol', 'Joshua', 'Ruth', 'Kenneth',
    'Sharon', 'Kevin', 'Michelle', 'Brian', 'Laura',
];

// Last names
const LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
    'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
    'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
    'Carter', 'Roberts',
];

// San Francisco neighborhoods with coordinates
const SF_LOCATIONS = [
    { name: 'Financial District', lat: 37.7946, lon: -122.3999 },
    { name: 'Mission District', lat: 37.7599, lon: -122.4148 },
    { name: 'SOMA', lat: 37.7849, lon: -122.4094 },
    { name: 'Castro', lat: 37.7609, lon: -122.4350 },
    { name: 'Richmond', lat: 37.7806, lon: -122.4644 },
    { name: 'Nob Hill', lat: 37.7928, lon: -122.4161 },
    { name: 'Haight-Ashbury', lat: 37.7692, lon: -122.4481 },
    { name: 'Chinatown', lat: 37.7941, lon: -122.4078 },
    { name: 'Pacific Heights', lat: 37.7886, lon: -122.4324 },
    { name: 'Russian Hill', lat: 37.8014, lon: -122.4186 },
    { name: 'Sunset District', lat: 37.7431, lon: -122.4660 },
    { name: 'Bernal Heights', lat: 37.7441, lon: -122.4153 },
    { name: 'Glen Park', lat: 37.7336, lon: -122.4339 },
    { name: 'Potrero Hill', lat: 37.7587, lon: -122.4015 },
    { name: 'Marina District', lat: 37.8006, lon: -122.4429 },
];

const PAYMENT_METHODS = [
    ['pm-credit-card', 'pm-somecompany-pay', 'pm-google-pay', 'pm-cash'],
    ['pm-credit-card', 'pm-somecompany-pay', 'pm-google-pay'],
    ['pm-credit-card', 'pm-somecompany-pay'],
    ['pm-credit-card', 'pm-cash'],
    ['pm-credit-card', 'pm-google-pay', 'pm-cash'],
];

function generateDriver(index) {
    const vehicle = VEHICLES[index % VEHICLES.length];
    const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
    const lastName = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
    const location = SF_LOCATIONS[index % SF_LOCATIONS.length];
    const color = vehicle.colors[index % vehicle.colors.length];
    const paymentMethods = PAYMENT_METHODS[index % PAYMENT_METHODS.length];

    const driverId = `driver-${String(index + 1).padStart(3, '0')}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
    const phone = `+1-555-${String(index + 100).padStart(4, '0')}`;
    const licenseNumber = `DL${Math.floor(Math.random() * 1000000000)}`;
    const licensePlate = `${vehicle.make.substring(0, 3).toUpperCase()}${String(index + 100).padStart(3, '0')}`;
    const rating = (4.0 + Math.random() * 1.0).toFixed(1);
    const totalRides = Math.floor(50 + Math.random() * 400);
    const year = 2020 + (index % 4);

    const createdDate = new Date(2024, 0, 1 + (index % 60));
    const updatedDate = new Date(2024, 7, 22);

    return {
        driverId,
        name: `${firstName} ${lastName}`,
        email,
        phone,
        licenseNumber,
        vehicleInfo: {
            make: vehicle.make,
            model: vehicle.model,
            year,
            color,
            licensePlate,
        },
        status: 'available',
        currentLocation: JSON.stringify({
            address: location.name,
            latitude: location.lat,
            longitude: location.lon,
        }),
        acceptedPaymentMethods: paymentMethods,
        rating: parseFloat(rating),
        totalRides,
        createdAt: createdDate.toISOString(),
        updatedAt: updatedDate.toISOString(),
        lastUpdated: updatedDate.toISOString(),
    };
}

async function seedDrivers(tableName, count) {
    console.log(`Seeding ${count} drivers to table ${tableName}...`);

    const drivers = [];
    for (let i = 0; i < count; i++) {
        drivers.push(generateDriver(i));
    }

    // DynamoDB BatchWrite can handle max 25 items at a time
    const batchSize = 25;
    let successCount = 0;

    for (let i = 0; i < drivers.length; i += batchSize) {
        const batch = drivers.slice(i, i + batchSize);

        const params = {
            RequestItems: {
                [tableName]: batch.map((driver) => ({
                    PutRequest: {
                        Item: driver,
                    },
                })),
            },
        };

        try {
            await docClient.send(new BatchWriteCommand(params));
            successCount += batch.length;
            console.log(`Seeded ${successCount}/${count} drivers...`);
        } catch (error) {
            console.error(`Error seeding batch starting at index ${i}:`, error);
            throw error;
        }
    }

    console.log(`✅ Successfully seeded ${successCount} drivers!`);
    return successCount;
}

export const handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    const requestType = event.RequestType;
    const tableName = event.ResourceProperties.TableName;
    const driverCount = parseInt(event.ResourceProperties.DriverCount || '200');

    try {
        if (requestType === 'Create' || requestType === 'Update') {
            const count = await seedDrivers(tableName, driverCount);

            return {
                Status: 'SUCCESS',
                PhysicalResourceId: `seed-drivers-${tableName}`,
                Data: {
                    DriversSeeded: count,
                },
            };
        } else if (requestType === 'Delete') {
            // On delete, we don't need to do anything
            // The table will be deleted by CDK if needed
            console.log('Delete request - no action needed');

            return {
                Status: 'SUCCESS',
                PhysicalResourceId: `seed-drivers-${tableName}`,
            };
        }

        // This should never happen, but handle unknown request types
        throw new Error(`Unknown request type: ${requestType}`);
    } catch (error) {
        console.error('Error:', error);
        return {
            Status: 'FAILED',
            Reason: error instanceof Error ? error.message : String(error),
            PhysicalResourceId: `seed-drivers-${tableName}`,
        };
    }
};
