// Script di inizializzazione per MongoDB
db = db.getSiblingDB('taw_flights');

// Crea utente admin per l'applicazione
db.createUser({
    user: "taw_user",
    pwd: "taw_password",
    roles: [{ role: "readWrite", db: "taw_flights" }]
});

// Inserisci dati di test
db.airlines.insertMany([
    {
        name: "ITA Airways",
        iataCode: "AZ",
        country: "Italy",
        active: true,
        createdAt: new Date()
    },
    {
        name: "Lufthansa",
        iataCode: "LH",
        country: "Germany",
        active: true,
        createdAt: new Date()
    }
]);

db.airports.insertMany([
    {
        name: "Leonardo da Vinci International Airport",
        iataCode: "FCO",
        city: "Roma",
        country: "Italy",
        coordinates: { lat: 41.8003, lng: 12.2389 }
    },
    {
        name: "Milano Malpensa",
        iataCode: "MXP",
        city: "Milano",
        country: "Italy",
        coordinates: { lat: 45.6306, lng: 8.7281 }
    }
]);

print("Dati di test inseriti con successo!");
