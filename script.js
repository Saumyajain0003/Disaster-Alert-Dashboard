// Constants
const USGS_API_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
const MOCK_HELP_CENTERS = [
    { name: 'Central Emergency Center', lat: 34.0522, lng: -118.2437 },
    { name: 'North Medical Facility', lat: 34.0622, lng: -118.2537 },
    { name: 'South Relief Station', lat: 34.0422, lng: -118.2337 }
];

// State
let map;
let markers = [];
let currentAlerts = [];

// DOM Elements
const alertsList = document.getElementById('alertsList');
const totalAlertsEl = document.getElementById('totalAlerts');
const recentEventsEl = document.getElementById('recentEvents');
const helpCentersCountEl = document.getElementById('helpCentersCount');
const searchInput = document.getElementById('search');
const searchBtn = document.getElementById('searchBtn');
const filterBtns = document.querySelectorAll('.filter-btn');

// Initialize Map
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 4,
        center: { lat: 39.8283, lng: -98.5795 }, // Center of USA
        styles: [
            { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
            {
                featureType: 'administrative.locality',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#d59563' }]
            },
            {
                featureType: 'water',
                elementType: 'geometry',
                stylers: [{ color: '#17263c' }]
            },
            {
                featureType: 'water',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#515c6d' }]
            },
            {
                featureType: 'road',
                elementType: 'geometry',
                stylers: [{ color: '#38414e' }]
            }
        ]
    });

    // Add help centers to map
    MOCK_HELP_CENTERS.forEach(center => {
        new google.maps.Marker({
            position: { lat: center.lat, lng: center.lng },
            map: map,
            title: center.name,
            icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            }
        });
    });
}

// Fetch Earthquake Data
async function fetchEarthquakeData() {
    try {
        const response = await fetch(USGS_API_URL);
        const data = await response.json();
        currentAlerts = data.features;
        updateDashboard();
    } catch (error) {
        console.error('Error fetching earthquake data:', error);
        alertsList.innerHTML = `
            <div class="alert-item" style="text-align: center;">
                <h3>Error loading earthquake data</h3>
                <p>Please try again later</p>
            </div>
        `;
    }
}

// Update Dashboard
function updateDashboard() {
    clearMarkers();
    updateAlertsList();
    updateStats();
    addEarthquakeMarkers();
}

// Clear existing markers
function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

// Update Alerts List
function updateAlertsList() {
    alertsList.innerHTML = '';
    currentAlerts.forEach(alert => {
        const magnitude = alert.properties.mag;
        const location = alert.properties.place;
        const time = new Date(alert.properties.time).toLocaleString();
        const isSignificant = magnitude >= 4.5;

        const alertElement = document.createElement('div');
        alertElement.className =` alert-item ${isSignificant ? 'significant' : ''}`;
        alertElement.innerHTML = `
            <h3>Magnitude ${magnitude}</h3>
            <p>${location}</p>
            <small>${time}</small>
        `;

        alertsList.appendChild(alertElement);
    });
}

// Add Earthquake Markers
function addEarthquakeMarkers() {
    currentAlerts.forEach(alert => {
        const coords = alert.geometry.coordinates;
        const magnitude = alert.properties.mag;
        
        const marker = new google.maps.Marker({
            position: { lat: coords[1], lng: coords[0] },
            map: map,
            title:` Magnitude ${magnitude} - ${alert.properties.place}`,
            icon: {
                url: magnitude >= 4.5 ? 
                    'http://maps.google.com/mapfiles/ms/icons/red-dot.png' :
                    'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png'
            }
        });

        markers.push(marker);
    });
}

// Update Statistics
function updateStats() {
    totalAlertsEl.textContent = currentAlerts.length;
    recentEventsEl.textContent = currentAlerts.filter(alert => 
        Date.now() - alert.properties.time < 24 * 60 * 60 * 1000
    ).length;
    helpCentersCountEl.textContent = MOCK_HELP_CENTERS.length;
}

// Event Listeners
searchBtn.addEventListener('click', () => {
    const searchTerm = searchInput.value.toLowerCase();
    currentAlerts = currentAlerts.filter(alert => 
        alert.properties.place.toLowerCase().includes(searchTerm)
    );
    updateDashboard();
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        filterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        const magnitude = e.target.dataset.magnitude;
        if (magnitude === 'all') {
            fetchEarthquakeData();
        } else if (magnitude === 'significant') {
            currentAlerts = currentAlerts.filter(alert => alert.properties.mag >= 4.5);
            updateDashboard();
        } else {
            currentAlerts = currentAlerts.filter(alert => alert.properties.mag >= parseFloat(magnitude));
            updateDashboard();
        }
    });
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    fetchEarthquakeData();
    // Fetch new data every 5 minutes
    setInterval(fetchEarthquakeData, 5 * 60 * 1000);
});
